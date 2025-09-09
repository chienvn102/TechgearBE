// controllers/PermissionController.js
// CRUD controller cho permission collection 

const { Permission, RolePermission } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');

class PermissionController {
  // GET /api/v1/permissions - Get all permissions
  static getAllPermissions = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const { search, permission_type } = req.query;

    let query = {};
    
    if (search) {
      query.$or = [
        { permission_id: { $regex: search, $options: 'i' } },
        { permission_name: { $regex: search, $options: 'i' } },
        { permission_desc: { $regex: search, $options: 'i' } }
      ];
    }

    if (permission_type) {
      query.permission_type = permission_type;
    }

    const total = await Permission.countDocuments(query);

    const permissions = await Permission.find(query)
      .sort({ permission_type: 1, permission_name: 1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        permissions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/permissions/:id - Get permission by ID
  static getPermissionById = asyncHandler(async (req, res) => {
    const permission = await Permission.findById(req.params.id);

    if (!permission) {
      return res.status(404).json({
        success: false,
        message: 'Permission not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { permission }
    });
  });

  // POST /api/v1/permissions - Create new permission
  static createPermission = asyncHandler(async (req, res) => {
    const { permission_id, permission_name, permission_desc, permission_type } = req.body;

    if (!permission_id || !permission_name || !permission_type) {
      return res.status(400).json({
        success: false,
        message: 'Permission ID, name and type are required'
      });
    }

    // Validate permission type
    const validTypes = ['read', 'write', 'update', 'delete', 'admin'];
    if (!validTypes.includes(permission_type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid permission type'
      });
    }

    // Check if permission_id already exists
    const existingPermission = await Permission.findOne({ permission_id });
    if (existingPermission) {
      return res.status(400).json({
        success: false,
        message: 'Permission ID already exists'
      });
    }

    const permission = new Permission({
      permission_id: permission_id.toUpperCase(),
      permission_name,
      permission_desc: permission_desc || '',
      permission_type,
      created_at: new Date()
    });

    await permission.save();

    res.status(201).json({
      success: true,
      message: 'Permission created successfully',
      data: { permission }
    });
  });

  // PUT /api/v1/permissions/:id - Update permission
  static updatePermission = asyncHandler(async (req, res) => {
    const { permission_id, permission_name, permission_desc, permission_type } = req.body;

    const permission = await Permission.findById(req.params.id);
    if (!permission) {
      return res.status(404).json({
        success: false,
        message: 'Permission not found'
      });
    }

    // Validate permission type if provided
    if (permission_type) {
      const validTypes = ['read', 'write', 'update', 'delete', 'admin'];
      if (!validTypes.includes(permission_type)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid permission type'
        });
      }
    }

    // Check unique constraint if permission_id changed
    if (permission_id && permission_id !== permission.permission_id) {
      const existingPermission = await Permission.findOne({ permission_id });
      if (existingPermission) {
        return res.status(400).json({
          success: false,
          message: 'Permission ID already exists'
        });
      }
    }

    // Update fields
    if (permission_id) permission.permission_id = permission_id.toUpperCase();
    if (permission_name) permission.permission_name = permission_name;
    if (permission_desc !== undefined) permission.permission_desc = permission_desc;
    if (permission_type) permission.permission_type = permission_type;

    await permission.save();

    res.status(200).json({
      success: true,
      message: 'Permission updated successfully',
      data: { permission }
    });
  });

  // DELETE /api/v1/permissions/:id - Delete permission
  static deletePermission = asyncHandler(async (req, res) => {
    const permission = await Permission.findById(req.params.id);
    
    if (!permission) {
      return res.status(404).json({
        success: false,
        message: 'Permission not found'
      });
    }

    // Check if permission is being used by roles
    const rolePermissionCount = await RolePermission.countDocuments({ permission_id: permission._id });
    if (rolePermissionCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete permission that is assigned to roles'
      });
    }

    await Permission.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Permission deleted successfully'
    });
  });

  // GET /api/v1/permissions/by-type - Get permissions grouped by type
  static getPermissionsByType = asyncHandler(async (req, res) => {
    const permissions = await Permission.aggregate([
      {
        $group: {
          _id: '$permission_type',
          permissions: {
            $push: {
              _id: '$_id',
              permission_id: '$permission_id',
              permission_name: '$permission_name',
              permission_desc: '$permission_desc'
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: { permissionsByType: permissions }
    });
  });

  // GET /api/v1/permissions/statistics - Get permission statistics
  static getPermissionStatistics = asyncHandler(async (req, res) => {
    const totalPermissions = await Permission.countDocuments();

    // Permission stats by type
    const permissionsByType = await Permission.aggregate([
      {
        $group: {
          _id: '$permission_type',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Most assigned permissions
    const mostAssignedPermissions = await RolePermission.aggregate([
      {
        $group: {
          _id: '$permission_id',
          assignmentCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'permission',
          localField: '_id',
          foreignField: '_id',
          as: 'permission'
        }
      },
      { $unwind: '$permission' },
      { $sort: { assignmentCount: -1 } },
      { $limit: 10 },
      {
        $project: {
          permission_name: '$permission.permission_name',
          permission_id: '$permission.permission_id',
          assignmentCount: 1
        }
      }
    ]);

    // Unused permissions
    const usedPermissionIds = await RolePermission.distinct('permission_id');
    const unusedPermissions = await Permission.countDocuments({
      _id: { $nin: usedPermissionIds }
    });

    res.status(200).json({
      success: true,
      data: {
        totalPermissions,
        unusedPermissions,
        permissionsByType,
        mostAssignedPermissions
      }
    });
  });
}

module.exports = PermissionController;
