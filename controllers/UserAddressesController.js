// controllers/UserAddressesController.js
// CRUD controller cho user_addresses collection 

const { UserAddresses, UserCustomer } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');

class UserAddressesController {
  // GET /api/v1/user-addresses - Get all user addresses
  static getAllUserAddresses = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const { user_id, is_default, city, district } = req.query;

    let query = {};
    
    if (user_id) {
      query.uc_id = user_id;
    }

    if (is_default !== undefined) {
      query.is_default = is_default === 'true';
    }

    if (city) {
      query.city = { $regex: city, $options: 'i' };
    }

    if (district) {
      query.district = { $regex: district, $options: 'i' };
    }

    const total = await UserAddresses.countDocuments(query);

    const userAddresses = await UserAddresses.find(query)
      .populate('uc_id', 'uc_name uc_email uc_phone')
      .sort({ is_default: -1, created_at: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        userAddresses,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/user-addresses/:id - Get user address by ID
  static getUserAddressById = asyncHandler(async (req, res) => {
    const userAddress = await UserAddresses.findById(req.params.id)
      .populate('uc_id', 'uc_name uc_email uc_phone');

    if (!userAddress) {
      return res.status(404).json({
        success: false,
        message: 'User address not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { userAddress }
    });
  });

  // POST /api/v1/user-addresses - Create new user address
  static createUserAddress = asyncHandler(async (req, res) => {
    const { 
      uc_id, 
      address_line1, 
      address_line2, 
      district, 
      city, 
      postal_code, 
      country,
      is_default = false 
    } = req.body;

    if (!uc_id || !address_line1 || !district || !city) {
      return res.status(400).json({
        success: false,
        message: 'User ID, address line 1, district, and city are required'
      });
    }

    // Verify user exists
    const user = await UserCustomer.findById(uc_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // If this is set as default, unset other default addresses for this user
    if (is_default) {
      await UserAddresses.updateMany(
        { uc_id, is_default: true },
        { is_default: false }
      );
    } else {
      // If no default address exists for this user, make this the default
      const existingDefault = await UserAddresses.findOne({ uc_id, is_default: true });
      if (!existingDefault) {
        // This will be the first address, make it default
        req.body.is_default = true;
      }
    }

    const userAddress = new UserAddresses({
      uc_id,
      address_line1,
      address_line2: address_line2 || '',
      district,
      city,
      postal_code: postal_code || '',
      country: country || 'Vietnam',
      is_default: req.body.is_default || is_default,
      created_at: new Date()
    });

    await userAddress.save();

    // Populate for response
    await userAddress.populate('uc_id', 'uc_name uc_email');

    res.status(201).json({
      success: true,
      message: 'User address created successfully',
      data: { userAddress }
    });
  });

  // PUT /api/v1/user-addresses/:id - Update user address
  static updateUserAddress = asyncHandler(async (req, res) => {
    const { 
      address_line1, 
      address_line2, 
      district, 
      city, 
      postal_code, 
      country,
      is_default 
    } = req.body;

    const userAddress = await UserAddresses.findById(req.params.id);
    if (!userAddress) {
      return res.status(404).json({
        success: false,
        message: 'User address not found'
      });
    }

    // If setting as default, unset other default addresses for this user
    if (is_default === true) {
      await UserAddresses.updateMany(
        { uc_id: userAddress.uc_id, _id: { $ne: userAddress._id }, is_default: true },
        { is_default: false }
      );
    }

    // Update fields
    if (address_line1) userAddress.address_line1 = address_line1;
    if (address_line2 !== undefined) userAddress.address_line2 = address_line2;
    if (district) userAddress.district = district;
    if (city) userAddress.city = city;
    if (postal_code !== undefined) userAddress.postal_code = postal_code;
    if (country) userAddress.country = country;
    if (is_default !== undefined) userAddress.is_default = is_default;

    await userAddress.save();

    // Populate for response
    await userAddress.populate('uc_id', 'uc_name uc_email');

    res.status(200).json({
      success: true,
      message: 'User address updated successfully',
      data: { userAddress }
    });
  });

  // DELETE /api/v1/user-addresses/:id - Delete user address
  static deleteUserAddress = asyncHandler(async (req, res) => {
    const userAddress = await UserAddresses.findById(req.params.id);
    
    if (!userAddress) {
      return res.status(404).json({
        success: false,
        message: 'User address not found'
      });
    }

    const wasDefault = userAddress.is_default;
    const userId = userAddress.uc_id;

    await UserAddresses.findByIdAndDelete(req.params.id);

    // If deleted address was default, set another address as default
    if (wasDefault) {
      const remainingAddress = await UserAddresses.findOne({ uc_id: userId });
      if (remainingAddress) {
        remainingAddress.is_default = true;
        await remainingAddress.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'User address deleted successfully'
    });
  });

  // GET /api/v1/user-addresses/user/:userId - Get addresses for specific user
  static getUserAddresses = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { page, limit, skip } = req.pagination;

    // Verify user exists
    const user = await UserCustomer.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const total = await UserAddresses.countDocuments({ uc_id: userId });

    const userAddresses = await UserAddresses.find({ uc_id: userId })
      .sort({ is_default: -1, created_at: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        user: {
          _id: user._id,
          uc_name: user.uc_name,
          uc_email: user.uc_email
        },
        userAddresses,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // PUT /api/v1/user-addresses/:id/set-default - Set address as default
  static setDefaultAddress = asyncHandler(async (req, res) => {
    const userAddress = await UserAddresses.findById(req.params.id);
    
    if (!userAddress) {
      return res.status(404).json({
        success: false,
        message: 'User address not found'
      });
    }

    // Unset current default address for this user
    await UserAddresses.updateMany(
      { uc_id: userAddress.uc_id, is_default: true },
      { is_default: false }
    );

    // Set this address as default
    userAddress.is_default = true;
    await userAddress.save();

    res.status(200).json({
      success: true,
      message: 'Address set as default successfully',
      data: { userAddress }
    });
  });

  // GET /api/v1/user-addresses/statistics - Get user address statistics
  static getUserAddressStatistics = asyncHandler(async (req, res) => {
    const totalAddresses = await UserAddresses.countDocuments();

    // Users with addresses count
    const usersWithAddresses = await UserAddresses.distinct('uc_id');
    const totalUsers = await UserCustomer.countDocuments();
    const usersWithoutAddresses = totalUsers - usersWithAddresses.length;

    // City distribution
    const cityStats = await UserAddresses.aggregate([
      {
        $group: {
          _id: '$city',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // District distribution
    const districtStats = await UserAddresses.aggregate([
      {
        $group: {
          _id: { city: '$city', district: '$district' },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 15 }
    ]);

    // Country distribution
    const countryStats = await UserAddresses.aggregate([
      {
        $group: {
          _id: '$country',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Users with multiple addresses
    const multipleAddressStats = await UserAddresses.aggregate([
      {
        $group: {
          _id: '$uc_id',
          address_count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$address_count',
          user_count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalAddresses,
        totalUsers,
        usersWithAddresses: usersWithAddresses.length,
        usersWithoutAddresses,
        cityDistribution: cityStats,
        districtDistribution: districtStats,
        countryDistribution: countryStats,
        addressCountPerUser: multipleAddressStats
      }
    });
  });

  // POST /api/v1/user-addresses/bulk-create - Bulk create addresses for user
  static bulkCreateAddresses = asyncHandler(async (req, res) => {
    const { uc_id, addresses } = req.body;

    if (!uc_id || !addresses || !Array.isArray(addresses)) {
      return res.status(400).json({
        success: false,
        message: 'User ID and addresses array are required'
      });
    }

    // Verify user exists
    const user = await UserCustomer.findById(uc_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user has existing default address
    const hasDefaultAddress = await UserAddresses.findOne({ uc_id, is_default: true });

    let created = 0;
    let errors = [];
    const createdAddresses = [];

    for (let i = 0; i < addresses.length; i++) {
      try {
        const addressData = addresses[i];
        
        if (!addressData.address_line1 || !addressData.district || !addressData.city) {
          errors.push({
            index: i,
            error: 'Address line 1, district, and city are required'
          });
          continue;
        }

        // If no default address exists and this is the first address, make it default
        const is_default = !hasDefaultAddress && created === 0 ? true : (addressData.is_default || false);

        const userAddress = new UserAddresses({
          uc_id,
          address_line1: addressData.address_line1,
          address_line2: addressData.address_line2 || '',
          district: addressData.district,
          city: addressData.city,
          postal_code: addressData.postal_code || '',
          country: addressData.country || 'Vietnam',
          is_default,
          created_at: new Date()
        });

        await userAddress.save();
        createdAddresses.push(userAddress);
        created++;

      } catch (error) {
        errors.push({
          index: i,
          error: error.message
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Bulk creation completed. ${created} addresses created`,
      data: {
        created,
        errors,
        createdAddresses,
        total_requested: addresses.length
      }
    });
  });
}

module.exports = UserAddressesController;
