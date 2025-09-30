// controllers/AuthController.js
// Authentication controller 

const bcrypt = require('bcryptjs');
const { UserManagement, UserCustomer, Role, Customer } = require('../models');
const { generateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

class AuthController {
  // Universal login - auto-detect admin/customer
  static universalLogin = asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    // First try admin login (user_management)
    const adminUser = await UserManagement.findOne({ username })
      .populate('role_id')
      .select('+password');

    if (adminUser) {
      const isPasswordValid = await adminUser.comparePassword(password);
      
      if (isPasswordValid) {
        const token = generateToken(adminUser._id);
        const userResponse = adminUser.toObject();
        delete userResponse.password;

        return res.status(200).json({
          success: true,
          message: 'Admin login successful',
          data: {
            user: userResponse,
            token,
            tokenType: 'Bearer',
            userType: 'admin'
          }
        });
      }
    }

    // If not admin, try customer login (user_customer)
    const customerUser = await UserCustomer.findOne({ username })
      .populate('customer_id')
      .select('+password');

    if (customerUser) {
      const isPasswordValid = await customerUser.comparePassword(password);
      
      if (isPasswordValid) {
        const token = generateToken(customerUser._id);
        const userResponse = customerUser.toObject();
        delete userResponse.password;

        return res.status(200).json({
          success: true,
          message: 'Customer login successful',
          data: {
            user: userResponse,
            token,
            tokenType: 'Bearer',
            userType: 'customer'
          }
        });
      }
    }

    // If neither admin nor customer found or password invalid
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  });

  // Admin login - user_management collection
  static loginAdmin = asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    // Find user trong user_management collection
    const user = await UserManagement.findOne({ username })
      .populate('role_id')
      .select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = generateToken(user._id);

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        token,
        tokenType: 'Bearer'
      }
    });
  });

  // Customer login - user_customer collection
  static loginCustomer = asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    // Find user trong user_customer collection
    const userCustomer = await UserCustomer.findOne({ username })
      .populate('customer_id')
      .select('+password');

    if (!userCustomer) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Compare password
    const isPasswordValid = await userCustomer.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = generateToken(userCustomer._id);

    // Remove password from response
    const userResponse = userCustomer.toObject();
    delete userResponse.password;

    res.status(200).json({
      success: true,
      message: 'Customer login successful',
      data: {
        user: userResponse,
        token,
        tokenType: 'Bearer'
      }
    });
  });

  // Register customer
  static registerCustomer = asyncHandler(async (req, res) => {
    const { username, password, customer_data } = req.body;
    const { customer_id, name, email, phone_number } = customer_data;

    // Validate required fields
    if (!username || !password || !customer_id || !name || !email || !phone_number) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Check if username already exists trong user_customer
    const existingUserCustomer = await UserCustomer.findOne({ username });
    if (existingUserCustomer) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }

    // Check if customer_id already exists
    const existingCustomer = await Customer.findOne({ customer_id });
    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        message: 'Customer ID already exists'
      });
    }

    // Check if email already exists
    const existingEmail = await Customer.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Check if phone number already exists
    const existingPhone = await Customer.findOne({ phone_number });
    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number already exists'
      });
    }

    // Create customer first
    const customer = new Customer({
      customer_id,
      name,
      email,
      phone_number
    });

    await customer.save();

    // Create user_customer
    const userCustomer = new UserCustomer({
      username,
      password, // Will be hashed by pre-save middleware
      customer_id: customer._id
    });

    await userCustomer.save();

    // ✅ Tự động tạo ranking "Thành viên Đồng" cho customer mới
    try {
      const { CustomerRanking, Ranking } = require('../models');
      
      // Tìm ranking "Thành viên Đồng" (min_spending = 0)
      const defaultRanking = await Ranking.findOne({ min_spending: 0 });
      
      if (defaultRanking) {
        const customerRanking = new CustomerRanking({
          customer_id: customer._id,
          rank_id: defaultRanking._id,
          total_spending: 0,
          created_at: new Date(),
          updated_at: new Date()
        });
        
        await customerRanking.save();
        console.log(`✅ Auto-created ranking for new customer: ${customer.name} - ${defaultRanking.rank_name}`);
      } else {
        console.log('⚠️ Default ranking not found - customer will get ranking when first accessing ranking API');
      }
    } catch (error) {
      console.error('❌ Error creating default ranking for new customer:', error);
      // Don't fail registration if ranking creation fails
    }

    // Generate JWT token
    const token = generateToken(userCustomer._id);

    // Populate customer data for response
    await userCustomer.populate('customer_id');

    res.status(201).json({
      success: true,
      message: 'Customer registered successfully',
      data: {
        user: {
          _id: userCustomer._id,
          username: userCustomer.username,
          customer_id: userCustomer.customer_id
        },
        token,
        tokenType: 'Bearer'
      }
    });
  });

  // Get current user profile
  static getProfile = asyncHandler(async (req, res) => {
    try {
      // req.user already populated by auth middleware
      // Just return the user data as is
      res.status(200).json({
        success: true,
        data: {
          user: req.user
        }
      });
    } catch (error) {
      console.error('Error in getProfile:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  });

  // Change password
  static changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    // Find user with password
    const user = await UserManagement.findById(req.user._id).select('+password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password (will be hashed by pre-save middleware)
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  });
}

module.exports = AuthController;
