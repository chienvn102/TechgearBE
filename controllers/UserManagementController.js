// controllers/UserManagementController.js
// CRUD controller cho user_management collection 

const { UserManagement, Role } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');

class UserManagementController {
  // GET /api/v1/user-management - Get all users with pagination
  static getAllUsers = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const { search, role_id } = req.query;

    // Build query object
    let query = {};
    
    if (search) {
      query.$or = [
        { id: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } }
      ];
    }

    if (role_id) {
      query.role_id = role_id;
    }

    // Get total count for pagination
    const total = await UserManagement.countDocuments(query);

    // Get users with populate role_id
    const users = await UserManagement.find(query)
      .populate('role_id', 'role_id role_name')
      .select('-password') // Exclude password theo security rules
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/user-management/:id - Get user by ID
  static getUserById = asyncHandler(async (req, res) => {
    const user = await UserManagement.findById(req.params.id)
      .populate('role_id', 'role_id role_name')
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { user }
    });
  });

  // POST /api/v1/user-management - Create new user
  static createUser = asyncHandler(async (req, res) => {
    const { id, username, password, name, role_id } = req.body;

    // Validate required fields theo schema
    if (!id || !username || !password || !name || !role_id) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Check if id already exists (unique constraint)
    const existingId = await UserManagement.findOne({ id });
    if (existingId) {
      return res.status(400).json({
        success: false,
        message: 'User ID already exists'
      });
    }

    // Check if username already exists
    const existingUsername = await UserManagement.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }

    // Validate role_id exists
    const role = await Role.findById(role_id);
    if (!role) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role_id'
      });
    }

    // Create user (password will be hashed by pre-save middleware)
    const user = new UserManagement({
      id,
      username,
      password,
      name,
      role_id
    });

    await user.save();

    // Populate role for response
    await user.populate('role_id', 'role_id role_name');

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { user: userResponse }
    });
  });

  // PUT /api/v1/user-management/:id - Update user
  static updateUser = asyncHandler(async (req, res) => {
    const { id, username, name, role_id } = req.body;

    const user = await UserManagement.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check unique constraints if changed
    if (id && id !== user.id) {
      const existingId = await UserManagement.findOne({ id });
      if (existingId) {
        return res.status(400).json({
          success: false,
          message: 'User ID already exists'
        });
      }
    }

    if (username && username !== user.username) {
      const existingUsername = await UserManagement.findOne({ username });
      if (existingUsername) {
        return res.status(400).json({
          success: false,
          message: 'Username already exists'
        });
      }
    }

    // Validate role_id if provided
    if (role_id && role_id !== user.role_id.toString()) {
      const role = await Role.findById(role_id);
      if (!role) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role_id'
        });
      }
    }

    // Update fields
    if (id) user.id = id;
    if (username) user.username = username;
    if (name) user.name = name;
    if (role_id) user.role_id = role_id;

    await user.save();

    // Populate role for response
    await user.populate('role_id', 'role_id role_name');

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: { user: userResponse }
    });
  });

  // DELETE /api/v1/user-management/:id - Delete user
  static deleteUser = asyncHandler(async (req, res) => {
    const user = await UserManagement.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await UserManagement.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  });

  // GET /api/v1/user-management/by-role/:roleId - Get users by role
  static getUsersByRole = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const roleId = req.params.roleId;

    // Validate role exists
    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    const total = await UserManagement.countDocuments({ role_id: roleId });

    const users = await UserManagement.find({ role_id: roleId })
      .populate('role_id', 'role_id role_name')
      .select('-password')
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });
}

module.exports = UserManagementController;
