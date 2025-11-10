import { Router } from "express";
import { requirePermission, requireAnyPermission } from "../../middlewares/rbac-middleware";
import {
  createRole,
  getRoleById,
  getAllRoles,
  updateRole,
  deleteRole,
  activateRole,
  createPermission,
  getAllPermissions,
  getPermissionsByResource,
  updatePermission,
  deletePermission,
  activatePermission,
  assignPermissionToRole,
  removePermissionFromRole,
  getRolePermissions,
  setRolePermissions,
  assignRoleToUser,
  removeRoleFromUser,
  getUserRoles,
  getUserPermissions,
  setUserRoles,
  getUsersByRole,
  getRolesByUser
} from "./rbac.service";

const rbacRouter = Router();

// Helper function to convert BigInt to number in response data
function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (Array.isArray(obj)) return obj.map(serializeBigInt);
  if (typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      result[key] = serializeBigInt(obj[key]);
    }
    return result;
  }
  return obj;
}

// ============================================================================
// ROLE MANAGEMENT ENDPOINTS
// ============================================================================

// Get all roles
rbacRouter.get('/roles', requirePermission('role', 'read'), async (req, res, next) => {
  try {
    const roles = await getAllRoles();

    return res.json({
      success: true,
      message: "Roles fetched successfully",
      data: serializeBigInt(roles)
    });
  } catch (error) {
    next(error);
  }
});

// Get role by ID
rbacRouter.get('/roles/:id', requirePermission('role', 'read'), async (req, res, next) => {
  try {
    const roleId = parseInt(req.params.id);
    const role = await getRoleById(roleId);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found"
      });
    }

    return res.json({
      success: true,
      message: "Role fetched successfully",
      data: role
    });
  } catch (error) {
    next(error);
  }
});

// Create new role
rbacRouter.post('/roles', requirePermission('role', 'create'), async (req, res, next) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Role name is required"
      });
    }

    const role = await createRole({ name, description });

    return res.status(201).json({
      success: true,
      message: "Role created successfully",
      data: serializeBigInt(role)
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return res.status(400).json({
        success: false,
        message: "Role name already exists"
      });
    }
    next(error);
  }
});

// Update role
rbacRouter.put('/roles/:id', requirePermission('role', 'update'), async (req, res, next) => {
  try {
    const roleId = parseInt(req.params.id);
    const { name, description } = req.body;

    const role = await updateRole(roleId, { name, description });

    return res.json({
      success: true,
      message: "Role updated successfully",
      data: role
    });
  } catch (error) {
    next(error);
  }
});

// Delete role (soft delete)
rbacRouter.delete('/roles/:id', requirePermission('role', 'delete'), async (req, res, next) => {
  try {
    const roleId = parseInt(req.params.id);

    await deleteRole(roleId);

    return res.json({
      success: true,
      message: "Role deleted successfully"
    });
  } catch (error) {
    next(error);
  }
});

// Activate role
rbacRouter.patch('/roles/:id/activate', requirePermission('role', 'update'), async (req, res, next) => {
  try {
    const roleId = parseInt(req.params.id);

    const role = await activateRole(roleId);

    return res.json({
      success: true,
      message: "Role activated successfully",
      data: role
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// PERMISSION MANAGEMENT ENDPOINTS
// ============================================================================

// Get all permissions
rbacRouter.get('/permissions', requirePermission('permission', 'read'), async (req, res, next) => {
  try {
    const permissions = await getAllPermissions();

    return res.json({
      success: true,
      message: "Permissions fetched successfully",
      data: serializeBigInt(permissions)
    });
  } catch (error) {
    next(error);
  }
});

// Get permissions by resource
rbacRouter.get('/permissions/resource/:resource', async (req, res, next) => {
  try {
    const resource = req.params.resource;
    const permissions = await getPermissionsByResource(resource);

    return res.json({
      success: true,
      message: "Permissions fetched successfully",
      data: permissions
    });
  } catch (error) {
    next(error);
  }
});

// Create new permission
rbacRouter.post('/permissions', requirePermission('permission', 'create'), async (req, res, next) => {
  try {
    const { name, description, resource, action } = req.body;

    if (!name || !resource || !action) {
      return res.status(400).json({
        success: false,
        message: "Name, resource, and action are required"
      });
    }

    const permission = await createPermission({ name, description, resource, action });

    return res.status(201).json({
      success: true,
      message: "Permission created successfully",
      data: serializeBigInt(permission)
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return res.status(400).json({
        success: false,
        message: "Permission name already exists"
      });
    }
    next(error);
  }
});

// Update permission
rbacRouter.put('/permissions/:id', requirePermission('permission', 'update'), async (req, res, next) => {
  try {
    const permissionId = parseInt(req.params.id);
    const { name, description, resource, action } = req.body;

    const permission = await updatePermission(permissionId, { name, description, resource, action });

    return res.json({
      success: true,
      message: "Permission updated successfully",
      data: permission
    });
  } catch (error) {
    next(error);
  }
});

// Delete permission (soft delete)
rbacRouter.delete('/permissions/:id', requirePermission('permission', 'delete'), async (req, res, next) => {
  try {
    const permissionId = parseInt(req.params.id);

    await deletePermission(permissionId);

    return res.json({
      success: true,
      message: "Permission deleted successfully"
    });
  } catch (error) {
    next(error);
  }
});

// Activate permission
rbacRouter.patch('/permissions/:id/activate', async (req, res, next) => {
  try {
    const permissionId = parseInt(req.params.id);

    const permission = await activatePermission(permissionId);

    return res.json({
      success: true,
      message: "Permission activated successfully",
      data: permission
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// ROLE-PERMISSION RELATIONSHIP ENDPOINTS
// ============================================================================

// Get role permissions
rbacRouter.get('/roles/:id/permissions', requirePermission('role', 'read'), async (req, res, next) => {
  try {
    const roleId = parseInt(req.params.id);
    const permissions = await getRolePermissions(roleId);

    return res.json({
      success: true,
      message: "Role permissions fetched successfully",
      data: permissions
    });
  } catch (error) {
    next(error);
  }
});

// Assign permission to role
rbacRouter.post('/roles/:roleId/permissions/:permissionId', requirePermission('role', 'update'), async (req, res, next) => {
  try {
    const roleId = parseInt(req.params.roleId);
    const permissionId = parseInt(req.params.permissionId);

    const rolePermission = await assignPermissionToRole(roleId, permissionId);

    return res.status(201).json({
      success: true,
      message: "Permission assigned to role successfully",
      data: rolePermission
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return res.status(400).json({
        success: false,
        message: "Permission already assigned to this role"
      });
    }
    next(error);
  }
});

// Remove permission from role
rbacRouter.delete('/roles/:roleId/permissions/:permissionId', requirePermission('role', 'update'), async (req, res, next) => {
  try {
    const roleId = parseInt(req.params.roleId);
    const permissionId = parseInt(req.params.permissionId);

    await removePermissionFromRole(roleId, permissionId);

    return res.json({
      success: true,
      message: "Permission removed from role successfully"
    });
  } catch (error) {
    next(error);
  }
});

// Set role permissions (bulk)
rbacRouter.put('/roles/:id/permissions', requirePermission('role', 'update'), async (req, res, next) => {
  try {
    const roleId = parseInt(req.params.id);
    const { permissionIds } = req.body;

    if (!Array.isArray(permissionIds)) {
      return res.status(400).json({
        success: false,
        message: "permissionIds must be an array"
      });
    }

    await setRolePermissions(roleId, permissionIds);

    return res.json({
      success: true,
      message: "Role permissions updated successfully"
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// USER-ROLE RELATIONSHIP ENDPOINTS
// ============================================================================

// Get user roles
rbacRouter.get('/users/:id/roles', requirePermission('role', 'read'), async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const roles = await getUserRoles(userId);

    return res.json({
      success: true,
      message: "User roles fetched successfully",
      data: serializeBigInt(roles)
    });
  } catch (error) {
    next(error);
  }
});

// Get user permissions
rbacRouter.get('/users/:id/permissions', requirePermission('role', 'read'), async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const permissions = await getUserPermissions(userId);

    return res.json({
      success: true,
      message: "User permissions fetched successfully",
      data: permissions
    });
  } catch (error) {
    next(error);
  }
});

// Assign role to user
rbacRouter.post('/users/:userId/roles/:roleId', requirePermission('role', 'assign'), async (req, res, next) => {
  try {
    const userId = parseInt(req.params.userId);
    const roleId = parseInt(req.params.roleId);
    const assignedBy = req.user?.id ? parseInt(req.user.id as string) : undefined;

    const userRole = await assignRoleToUser(userId, roleId, assignedBy);

    return res.status(201).json({
      success: true,
      message: "Role assigned to user successfully",
      data: serializeBigInt(userRole)
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return res.status(400).json({
        success: false,
        message: "User already has this role"
      });
    }
    next(error);
  }
});

// Remove role from user
rbacRouter.delete('/users/:userId/roles/:roleId', requirePermission('role', 'assign'), async (req, res, next) => {
  try {
    const userId = parseInt(req.params.userId);
    const roleId = parseInt(req.params.roleId);

    await removeRoleFromUser(userId, roleId);

    return res.json({
      success: true,
      message: "Role removed from user successfully"
    });
  } catch (error) {
    next(error);
  }
});

// Set user roles (bulk)
rbacRouter.put('/users/:id/roles', requirePermission('role', 'assign'), async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const { roleIds } = req.body;
    const assignedBy = req.user?.id ? parseInt(req.user.id as string) : undefined;

    if (!Array.isArray(roleIds)) {
      return res.status(400).json({
        success: false,
        message: "roleIds must be an array"
      });
    }

    await setUserRoles(userId, roleIds, assignedBy);

    return res.json({
      success: true,
      message: "User roles updated successfully"
    });
  } catch (error) {
    next(error);
  }
});

// Get users by role
rbacRouter.get('/roles/:id/users', async (req, res, next) => {
  try {
    const roleId = parseInt(req.params.id);
    const users = await getUsersByRole(roleId);

    return res.json({
      success: true,
      message: "Users with role fetched successfully",
      data: users
    });
  } catch (error) {
    next(error);
  }
});

// Get roles by user
rbacRouter.get('/users/:id/role-details', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const roles = await getRolesByUser(userId);

    return res.json({
      success: true,
      message: "User role details fetched successfully",
      data: roles
    });
  } catch (error) {
    next(error);
  }
});

export default rbacRouter;