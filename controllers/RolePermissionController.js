// controllers/RolePermissionController.js
// CRUD controller cho role_permission collection 

const { RolePermission, Role, Permission } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');

class RolePermissionController {
  // GET /api/v1/role-permissions - Get all role permissions
  static getAllRolePermissions = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const { role_id, permission_id } = req.query;

    let query = {};
    
    if (role_id) {
      query.role_id = role_id;
    }

    if (permission_id) {
      query.permission_id = permission_id;
    }

    const total = await RolePermission.countDocuments(query);

    const rolePermissions = await RolePermission.find(query)
      .populate('role_id', 'role_name role_description')
      .populate('permission_id', 'permission_name permission_description permission_category')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        rolePermissions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/role-permissions/:id - Get role permission by ID
  static getRolePermissionById = asyncHandler(async (req, res) => {
    const rolePermission = await RolePermission.findById(req.params.id)
      .populate('role_id', 'role_name role_description')
      .populate('permission_id', 'permission_name permission_description permission_category');

    if (!rolePermission) {
      return res.status(404).json({
        success: false,
        message: 'Role permission not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { rolePermission }
    });
  });

  // POST /api/v1/role-permissions - Create new role permission
  static createRolePermission = asyncHandler(async (req, res) => {
    const { role_id, permission_id } = req.body;

    if (!role_id || !permission_id) {
      return res.status(400).json({
        success: false,
        message: 'Role ID and permission ID are required'
      });
    }

    // Verify role exists
    const role = await Role.findById(role_id);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    // Verify permission exists
    const permission = await Permission.findById(permission_id);
    if (!permission) {
      return res.status(404).json({
        success: false,
        message: 'Permission not found'
      });
    }

    // Check if role permission already exists
    const existingRolePermission = await RolePermission.findOne({ role_id, permission_id });
    if (existingRolePermission) {
      return res.status(400).json({
        success: false,
        message: 'Role permission already exists'
      });
    }

    const rolePermission = new RolePermission({
      role_id,
      permission_id,
      created_at: new Date()
    });

    await rolePermission.save();

    // Populate for response
    await rolePermission.populate('role_id', 'role_name role_description');
    await rolePermission.populate('permission_id', 'permission_name permission_description');

    res.status(201).json({
      success: true,
      message: 'Role permission created successfully',
      data: { rolePermission }
    });
  });

  // DELETE /api/v1/role-permissions/:id - Delete role permission
  static deleteRolePermission = asyncHandler(async (req, res) => {
    const rolePermission = await RolePermission.findById(req.params.id);
    
    if (!rolePermission) {
      return res.status(404).json({
        success: false,
        message: 'Role permission not found'
      });
    }

    await RolePermission.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Role permission deleted successfully'
    });
  });

  // GET /api/v1/role-permissions/role/:roleId - Get permissions for specific role
  static getPermissionsByRole = asyncHandler(async (req, res) => {
    const { roleId } = req.params;
    const { page, limit, skip } = req.pagination;

    // Verify role exists
    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    const total = await RolePermission.countDocuments({ role_id: roleId });

    const rolePermissions = await RolePermission.find({ role_id: roleId })
      .populate('permission_id', 'permission_name permission_description permission_category')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);

    // Group permissions by category
    const permissionsByCategory = {};
    rolePermissions.forEach(rp => {
      const category = rp.permission_id.permission_category || 'Others';
      if (!permissionsByCategory[category]) {
        permissionsByCategory[category] = [];
      }
      permissionsByCategory[category].push(rp.permission_id);
    });

    res.status(200).json({
      success: true,
      data: {
        role: {
          _id: role._id,
          role_name: role.role_name,
          role_description: role.role_description
        },
        rolePermissions,
        permissionsByCategory,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/role-permissions/permission/:permissionId - Get roles for specific permission
  static getRolesByPermission = asyncHandler(async (req, res) => {
    const { permissionId } = req.params;
    const { page, limit, skip } = req.pagination;

    // Verify permission exists
    const permission = await Permission.findById(permissionId);
    if (!permission) {
      return res.status(404).json({
        success: false,
        message: 'Permission not found'
      });
    }

    const total = await RolePermission.countDocuments({ permission_id: permissionId });

    const rolePermissions = await RolePermission.find({ permission_id: permissionId })
      .populate('role_id', 'role_name role_description')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        permission: {
          _id: permission._id,
          permission_name: permission.permission_name,
          permission_description: permission.permission_description,
          permission_category: permission.permission_category
        },
        rolePermissions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // POST /api/v1/role-permissions/bulk-assign - Bulk assign permissions to role
  static bulkAssignPermissions = asyncHandler(async (req, res) => {
    const { role_id, permission_ids } = req.body;

    if (!role_id || !permission_ids || !Array.isArray(permission_ids)) {
      return res.status(400).json({
        success: false,
        message: 'Role ID and permission IDs array are required'
      });
    }

    // Verify role exists
    const role = await Role.findById(role_id);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    // Verify all permissions exist
    const permissions = await Permission.find({ _id: { $in: permission_ids } });
    if (permissions.length !== permission_ids.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more permissions not found'
      });
    }

    let created = 0;
    let skipped = 0;
    const errors = [];

    for (const permission_id of permission_ids) {
      try {
        // Check if role permission already exists
        const existingRolePermission = await RolePermission.findOne({ role_id, permission_id });
        
        if (existingRolePermission) {
          skipped++;
        } else {
          await RolePermission.create({
            role_id,
            permission_id,
            created_at: new Date()
          });
          created++;
        }
      } catch (error) {
        errors.push({
          permission_id,
          error: error.message
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Bulk assignment completed. ${created} created, ${skipped} skipped`,
      data: {
        created,
        skipped,
        errors,
        total_processed: permission_ids.length
      }
    });
  });

  // DELETE /api/v1/role-permissions/bulk-remove - Bulk remove permissions from role
  static bulkRemovePermissions = asyncHandler(async (req, res) => {
    const { role_id, permission_ids } = req.body;

    if (!role_id || !permission_ids || !Array.isArray(permission_ids)) {
      return res.status(400).json({
        success: false,
        message: 'Role ID and permission IDs array are required'
      });
    }

    // Verify role exists
    const role = await Role.findById(role_id);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    const result = await RolePermission.deleteMany({
      role_id,
      permission_id: { $in: permission_ids }
    });

    res.status(200).json({
      success: true,
      message: `Bulk removal completed. ${result.deletedCount} permissions removed`,
      data: {
        removed: result.deletedCount,
        total_requested: permission_ids.length
      }
    });
  });

  // GET /api/v1/role-permissions/statistics - Get role permission statistics
  static getRolePermissionStatistics = asyncHandler(async (req, res) => {
    const totalRolePermissions = await RolePermission.countDocuments();

    // Role with permission count
    const roleStats = await RolePermission.aggregate([
      {
        $lookup: {
          from: 'role',
          localField: 'role_id',
          foreignField: '_id',
          as: 'role'
        }
      },
      { $unwind: '$role' },
      {
        $group: {
          _id: '$role_id',
          role_name: { $first: '$role.role_name' },
          permission_count: { $sum: 1 }
        }
      },
      { $sort: { permission_count: -1 } }
    ]);

    // Permission with role count
    const permissionStats = await RolePermission.aggregate([
      {
        $lookup: {
          from: 'permission',
          localField: 'permission_id',
          foreignField: '_id',
          as: 'permission'
        }
      },
      { $unwind: '$permission' },
      {
        $group: {
          _id: '$permission_id',
          permission_name: { $first: '$permission.permission_name' },
          permission_category: { $first: '$permission.permission_category' },
          role_count: { $sum: 1 }
        }
      },
      { $sort: { role_count: -1 } }
    ]);

    // Permission category distribution
    const categoryStats = await RolePermission.aggregate([
      {
        $lookup: {
          from: 'permission',
          localField: 'permission_id',
          foreignField: '_id',
          as: 'permission'
        }
      },
      { $unwind: '$permission' },
      {
        $group: {
          _id: '$permission.permission_category',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Roles without permissions
    const totalRoles = await Role.countDocuments();
    const rolesWithPermissions = await RolePermission.distinct('role_id');
    const rolesWithoutPermissions = totalRoles - rolesWithPermissions.length;

    // Permissions without roles
    const totalPermissions = await Permission.countDocuments();
    const permissionsWithRoles = await RolePermission.distinct('permission_id');
    const permissionsWithoutRoles = totalPermissions - permissionsWithRoles.length;

    res.status(200).json({
      success: true,
      data: {
        totalRolePermissions,
        rolesWithoutPermissions,
        permissionsWithoutRoles,
        roleStats,
        permissionStats,
        categoryDistribution: categoryStats
      }
    });
  });

  // POST /api/v1/role-permissions/copy-permissions - Copy permissions from one role to another
  static copyPermissions = asyncHandler(async (req, res) => {
    const { source_role_id, target_role_id } = req.body;

    if (!source_role_id || !target_role_id) {
      return res.status(400).json({
        success: false,
        message: 'Source role ID and target role ID are required'
      });
    }

    if (source_role_id === target_role_id) {
      return res.status(400).json({
        success: false,
        message: 'Source and target roles cannot be the same'
      });
    }

    // Verify both roles exist
    const [sourceRole, targetRole] = await Promise.all([
      Role.findById(source_role_id),
      Role.findById(target_role_id)
    ]);

    if (!sourceRole) {
      return res.status(404).json({
        success: false,
        message: 'Source role not found'
      });
    }

    if (!targetRole) {
      return res.status(404).json({
        success: false,
        message: 'Target role not found'
      });
    }

    // Get source role permissions
    const sourcePermissions = await RolePermission.find({ role_id: source_role_id });

    if (sourcePermissions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Source role has no permissions to copy'
      });
    }

    let created = 0;
    let skipped = 0;

    for (const sourcePermission of sourcePermissions) {
      // Check if target role already has this permission
      const existingPermission = await RolePermission.findOne({
        role_id: target_role_id,
        permission_id: sourcePermission.permission_id
      });

      if (existingPermission) {
        skipped++;
      } else {
        await RolePermission.create({
          role_id: target_role_id,
          permission_id: sourcePermission.permission_id,
          created_at: new Date()
        });
        created++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Permissions copied successfully. ${created} created, ${skipped} skipped`,
      data: {
        source_role: sourceRole.role_name,
        target_role: targetRole.role_name,
        created,
        skipped,
        total_source_permissions: sourcePermissions.length
      }
    });
  });
}

module.exports = RolePermissionController;
