// controllers/RoleController.js
// CRUD controller cho role collection 

const { Role, UserManagement, RolePermission, Permission } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');

class RoleController {
  // GET /api/v1/roles - Get all roles
  static getAllRoles = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const { search } = req.query;

    let query = {};
    
    if (search) {
      query.$or = [
        { role_id: { $regex: search, $options: 'i' } },
        { role_name: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Role.countDocuments(query);

    const roles = await Role.find(query)
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        roles,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/roles/:id - Get role by ID
  static getRoleById = asyncHandler(async (req, res) => {
    const role = await Role.findById(req.params.id);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { role }
    });
  });

  // POST /api/v1/roles - Create new role
  static createRole = asyncHandler(async (req, res) => {
    const { role_id, role_name } = req.body;

    if (!role_id || !role_name) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Check if role_id already exists
    const existingRole = await Role.findOne({ role_id });
    if (existingRole) {
      return res.status(400).json({
        success: false,
        message: 'Role ID already exists'
      });
    }

    const role = new Role({
      role_id: role_id.toUpperCase(),
      role_name
    });

    await role.save();

    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: { role }
    });
  });

  // PUT /api/v1/roles/:id - Update role
  static updateRole = asyncHandler(async (req, res) => {
    const { role_id, role_name } = req.body;

    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    // Check unique constraint if role_id changed
    if (role_id && role_id !== role.role_id) {
      const existingRole = await Role.findOne({ role_id });
      if (existingRole) {
        return res.status(400).json({
          success: false,
          message: 'Role ID already exists'
        });
      }
    }

    if (role_id) role.role_id = role_id.toUpperCase();
    if (role_name) role.role_name = role_name;

    await role.save();

    res.status(200).json({
      success: true,
      message: 'Role updated successfully',
      data: { role }
    });
  });

  // DELETE /api/v1/roles/:id - Delete role
  static deleteRole = asyncHandler(async (req, res) => {
    const role = await Role.findById(req.params.id);
    
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    // Check if role is being used by users
    const usersWithRole = await UserManagement.countDocuments({ role_id: role._id });
    if (usersWithRole > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete role that is assigned to users'
      });
    }

    // Delete role permissions
    await RolePermission.deleteMany({ role_id: role._id });

    await Role.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Role deleted successfully'
    });
  });

  // GET /api/v1/roles/:id/permissions - Get role permissions
  static getRolePermissions = asyncHandler(async (req, res) => {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    const rolePermissions = await RolePermission.find({ role_id: role._id })
      .populate('permission_id', 'permission_id permission_name permission_desc');

    const permissions = rolePermissions.map(rp => rp.permission_id);

    res.status(200).json({
      success: true,
      data: { 
        role,
        permissions
      }
    });
  });

  // POST /api/v1/roles/:id/permissions - Assign permission to role
  static assignPermission = asyncHandler(async (req, res) => {
    const { permission_id } = req.body;

    if (!permission_id) {
      return res.status(400).json({
        success: false,
        message: 'Permission ID is required'
      });
    }

    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    const permission = await Permission.findById(permission_id);
    if (!permission) {
      return res.status(404).json({
        success: false,
        message: 'Permission not found'
      });
    }

    // Check if permission already assigned
    const existingRolePermission = await RolePermission.findOne({
      role_id: role._id,
      permission_id: permission._id
    });

    if (existingRolePermission) {
      return res.status(400).json({
        success: false,
        message: 'Permission already assigned to role'
      });
    }

    const rolePermission = new RolePermission({
      role_id: role._id,
      permission_id: permission._id
    });

    await rolePermission.save();

    res.status(201).json({
      success: true,
      message: 'Permission assigned to role successfully',
      data: { rolePermission }
    });
  });

  // DELETE /api/v1/roles/:id/permissions/:permissionId - Remove permission from role
  static removePermission = asyncHandler(async (req, res) => {
    const { permissionId } = req.params;

    const rolePermission = await RolePermission.findOneAndDelete({
      role_id: req.params.id,
      permission_id: permissionId
    });

    if (!rolePermission) {
      return res.status(404).json({
        success: false,
        message: 'Role permission not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Permission removed from role successfully'
    });
  });
}

module.exports = RoleController;
