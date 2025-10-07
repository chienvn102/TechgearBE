// controllers/UserCustomerController.js
// Controller cho user_customer management 

const asyncHandler = require('express-async-handler');
const UserCustomer = require('../models/UserCustomer');
const Customer = require('../models/Customer');
const bcrypt = require('bcryptjs');

class UserCustomerController {
  // GET /api/v1/user-customers - Get all user customers
  static getAllUserCustomers = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const { search } = req.query;

    let matchQuery = {};
    
    if (search) {
      // Search in related customer info
      const customers = await Customer.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone_number: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      
      const customerIds = customers.map(c => c._id);
      
      matchQuery = {
        $or: [
          { username: { $regex: search, $options: 'i' } },
          { customer_id: { $in: customerIds } }
        ]
      };
    }

    const total = await UserCustomer.countDocuments(matchQuery);

    const userCustomers = await UserCustomer.find(matchQuery)
      .populate({
        path: 'customer_id',
        select: 'customer_id name email phone_number',
        populate: {
          path: 'addresses',
          model: 'CustomerAddress',
          select: 'name phone_number address'
        }
      })
      .select('-password') // Don't return password
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        userCustomers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/user-customers/:username - Get user customer by username
  static getUserCustomerByUsername = asyncHandler(async (req, res) => {
    const { username } = req.params;
    
    const userCustomer = await UserCustomer.findOne({ username })
      .populate('customer_id', 'customer_id name email phone_number')
      .select('-password'); // Don't return password

    if (!userCustomer) {
      return res.status(404).json({
        success: false,
        message: 'User customer not found'
      });
    }

    // Get customer addresses
    const CustomerAddress = require('../models/CustomerAddress');
    const addresses = await CustomerAddress.find({ customer_id: userCustomer.customer_id._id })
      .sort({ _id: 1 }); // First address is default according to business rules

    // Get order statistics
    const Order = require('../models/Order');
    const orderStats = await Order.aggregate([
      { $match: { customer_id: userCustomer.customer_id._id } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$order_total' }
        }
      }
    ]);

    const stats = orderStats.length > 0 ? orderStats[0] : {
      totalOrders: 0,
      totalSpent: 0
    };

    res.status(200).json({
      success: true,
      data: { 
        userCustomer: {
          ...userCustomer.toObject(),
          customer_id: {
            ...userCustomer.customer_id.toObject(),
            addresses: addresses,
            total_orders: stats.totalOrders,
            total_spent: stats.totalSpent
          }
        }
      }
    });
  });

  // PUT /api/v1/user-customers/:username - Update user customer
  static updateUserCustomer = asyncHandler(async (req, res) => {
    const { username } = req.params;
    const { new_username, password, customer_info } = req.body;

    const userCustomer = await UserCustomer.findOne({ username })
      .populate('customer_id');

    if (!userCustomer) {
      return res.status(404).json({
        success: false,
        message: 'User customer not found'
      });
    }

    // Check if new username already exists
    if (new_username && new_username !== username) {
      const existingUser = await UserCustomer.findOne({ username: new_username });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Username already exists'
        });
      }
      userCustomer.username = new_username;
    }

    // Update password if provided
    if (password) {
      userCustomer.password = password; // Will be hashed by pre-save middleware
    }

    // Update customer info if provided
    if (customer_info && userCustomer.customer_id) {
      const customer = userCustomer.customer_id;
      
      if (customer_info.name) customer.name = customer_info.name;
      if (customer_info.email) {
        // Check if email already exists
        const existingEmail = await Customer.findOne({ 
          email: customer_info.email,
          _id: { $ne: customer._id }
        });
        if (existingEmail) {
          return res.status(400).json({
            success: false,
            message: 'Email already exists'
          });
        }
        customer.email = customer_info.email;
      }
      if (customer_info.phone_number) customer.phone_number = customer_info.phone_number;
      
      await customer.save();
    }

    await userCustomer.save();

    // Return updated data without password
    const updatedUserCustomer = await UserCustomer.findById(userCustomer._id)
      .populate('customer_id', 'customer_id name email phone_number')
      .select('-password');

    res.status(200).json({
      success: true,
      message: 'User customer updated successfully',
      data: { userCustomer: updatedUserCustomer }
    });
  });

  // PUT /api/v1/user-customers/:username/password - Update password only
  static updatePassword = asyncHandler(async (req, res) => {
    const { username } = req.params;
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    const userCustomer = await UserCustomer.findOne({ username });

    if (!userCustomer) {
      return res.status(404).json({
        success: false,
        message: 'User customer not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await userCustomer.comparePassword(current_password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    userCustomer.password = new_password; // Will be hashed by pre-save middleware
    await userCustomer.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  });

// Admin reset password - không cần mật khẩu cũ
static adminResetPassword = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const { new_password } = req.body;

  console.log(`🔧 Admin resetting password for user: ${username}`);

  if (!new_password) {
    return res.status(400).json({
      success: false,
      message: 'New password is required'
    });
  }

  const userCustomer = await UserCustomer.findOne({ username });

  if (!userCustomer) {
    return res.status(404).json({
      success: false,
      message: 'User customer not found'
    });
  }

  // Admin có thể reset password mà không cần mật khẩu cũ
  userCustomer.password = new_password; // Will be hashed by pre-save middleware
  await userCustomer.save();

  console.log(`✅ Password reset successfully for user: ${username}`);

  res.status(200).json({
    success: true,
    message: 'Password reset successfully by admin',
    data: {
      username: userCustomer.username,
      updated_at: new Date().toISOString()
    }
  });
});

// POST /api/v1/user-customers/change-password - Customer changes their own password
static changePassword = asyncHandler(async (req, res) => {
  const { old_password, new_password, confirm_password } = req.body;
  const userId = req.user._id; // From auth middleware

  // Validation
  if (!old_password || !new_password || !confirm_password) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng điền đầy đủ thông tin (mật khẩu cũ, mật khẩu mới, xác nhận mật khẩu)'
    });
  }

  if (new_password !== confirm_password) {
    return res.status(400).json({
      success: false,
      message: 'Mật khẩu mới và xác nhận mật khẩu không khớp'
    });
  }

  if (new_password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Mật khẩu mới phải có ít nhất 6 ký tự'
    });
  }

  if (old_password === new_password) {
    return res.status(400).json({
      success: false,
      message: 'Mật khẩu mới phải khác mật khẩu cũ'
    });
  }

  // Get user with password field
  const userCustomer = await UserCustomer.findById(userId).select('+password');
  
  if (!userCustomer) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy tài khoản'
    });
  }

  // Verify old password
  const isPasswordValid = await bcrypt.compare(old_password, userCustomer.password);
  
  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      message: 'Mật khẩu cũ không đúng'
    });
  }

  // Update password
  userCustomer.password = new_password; // Will be hashed by pre-save middleware
  await userCustomer.save();

  console.log(`✅ Password changed successfully for user: ${userCustomer.username}`);

  res.status(200).json({
    success: true,
    message: 'Đổi mật khẩu thành công',
    data: {
      username: userCustomer.username,
      updated_at: new Date().toISOString()
    }
  });
});

}

module.exports = UserCustomerController;
