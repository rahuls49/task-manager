import prisma from "../../lib/connection";

export interface CreateRoleDto {
  name: string;
  description?: string;
}

export interface CreatePermissionDto {
  name: string;
  description?: string;
  resource: string;
  action: string;
}

export interface AssignRoleDto {
  userId: number;
  roleId: number;
}

export interface RoleWithPermissions {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  permissions: {
    id: number;
    name: string;
    resource: string;
    action: string;
    description?: string;
  }[];
}

// ============================================================================
// ROLE MANAGEMENT
// ============================================================================

export async function createRole(data: CreateRoleDto) {
  return await prisma.role.create({
    data: {
      Name: data.name,
      Description: data.description
    }
  });
}

export async function getRoleById(id: number) {
  return await prisma.role.findUnique({
    where: { Id: id },
    include: {
      RolePermissions: {
        include: {
          Permission: true
        }
      }
    }
  });
}

export async function getRoleByName(name: string) {
  return await prisma.role.findUnique({
    where: { Name: name },
    include: {
      RolePermissions: {
        include: {
          Permission: true
        }
      }
    }
  });
}

export async function getAllRoles() {
  return await prisma.role.findMany({
    where: { IsActive: true },
    include: {
      RolePermissions: {
        include: {
          Permission: true
        }
      },
      _count: {
        select: { UserRoles: true }
      }
    },
    orderBy: { Name: 'asc' }
  });
}

export async function updateRole(id: number, data: Partial<CreateRoleDto>) {
  return await prisma.role.update({
    where: { Id: id },
    data: {
      Name: data.name,
      Description: data.description
    }
  });
}

export async function deleteRole(id: number) {
  // Soft delete by deactivating
  return await prisma.role.update({
    where: { Id: id },
    data: { IsActive: false }
  });
}

export async function activateRole(id: number) {
  return await prisma.role.update({
    where: { Id: id },
    data: { IsActive: true }
  });
}

// ============================================================================
// PERMISSION MANAGEMENT
// ============================================================================

export async function createPermission(data: CreatePermissionDto) {
  return await prisma.permission.create({
    data: {
      Name: data.name,
      Description: data.description,
      Resource: data.resource,
      Action: data.action
    }
  });
}

export async function getPermissionById(id: number) {
  return await prisma.permission.findUnique({
    where: { Id: id }
  });
}

export async function getPermissionByName(name: string) {
  return await prisma.permission.findUnique({
    where: { Name: name }
  });
}

export async function getAllPermissions() {
  return await prisma.permission.findMany({
    where: { IsActive: true },
    orderBy: [
      { Resource: 'asc' },
      { Action: 'asc' }
    ]
  });
}

export async function getPermissionsByResource(resource: string) {
  return await prisma.permission.findMany({
    where: {
      Resource: resource,
      IsActive: true
    },
    orderBy: { Action: 'asc' }
  });
}

export async function updatePermission(id: number, data: Partial<CreatePermissionDto>) {
  return await prisma.permission.update({
    where: { Id: id },
    data: {
      Name: data.name,
      Description: data.description,
      Resource: data.resource,
      Action: data.action
    }
  });
}

export async function deletePermission(id: number) {
  // Soft delete by deactivating
  return await prisma.permission.update({
    where: { Id: id },
    data: { IsActive: false }
  });
}

export async function activatePermission(id: number) {
  return await prisma.permission.update({
    where: { Id: id },
    data: { IsActive: true }
  });
}

// ============================================================================
// ROLE-PERMISSION RELATIONSHIP MANAGEMENT
// ============================================================================

export async function assignPermissionToRole(roleId: number, permissionId: number) {
  return await prisma.rolePermission.create({
    data: {
      RoleId: roleId,
      PermissionId: permissionId
    }
  });
}

export async function removePermissionFromRole(roleId: number, permissionId: number) {
  return await prisma.rolePermission.deleteMany({
    where: {
      RoleId: roleId,
      PermissionId: permissionId
    }
  });
}

export async function getRolePermissions(roleId: number) {
  return await prisma.rolePermission.findMany({
    where: { RoleId: roleId },
    include: {
      Permission: true
    }
  });
}

export async function setRolePermissions(roleId: number, permissionIds: number[]) {
  // Remove existing permissions
  await prisma.rolePermission.deleteMany({
    where: { RoleId: roleId }
  });

  // Add new permissions
  if (permissionIds.length > 0) {
    const rolePermissions = permissionIds.map(permissionId => ({
      RoleId: roleId,
      PermissionId: permissionId
    }));

    await prisma.rolePermission.createMany({
      data: rolePermissions
    });
  }
}

// ============================================================================
// USER-ROLE RELATIONSHIP MANAGEMENT
// ============================================================================

export async function assignRoleToUser(userId: number, roleId: number, assignedBy?: number) {
  return await prisma.userRole.create({
    data: {
      UserId: userId,
      RoleId: roleId,
      AssignedBy: assignedBy
    }
  });
}

export async function removeRoleFromUser(userId: number, roleId: number) {
  return await prisma.userRole.deleteMany({
    where: {
      UserId: userId,
      RoleId: roleId
    }
  });
}

export async function getUserRoles(userId: number) {
  return await prisma.userRole.findMany({
    where: { UserId: userId },
    include: {
      Role: {
        include: {
          RolePermissions: {
            include: {
              Permission: true
            }
          }
        }
      }
    }
  });
}

export async function getUserPermissions(userId: number) {
  const userRoles = await getUserRoles(userId);

  const permissions = new Set<string>();
  for (const userRole of userRoles) {
    for (const rolePermission of userRole.Role.RolePermissions) {
      permissions.add(`${rolePermission.Permission.Resource}:${rolePermission.Permission.Action}`);
    }
  }

  return Array.from(permissions);
}

export async function hasPermission(userId: number, resource: string, action: string): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  return permissions.includes(`${resource}:${action}`);
}

export async function setUserRoles(userId: number, roleIds: number[], assignedBy?: number) {
  // Remove existing roles
  await prisma.userRole.deleteMany({
    where: { UserId: userId }
  });

  // Add new roles
  if (roleIds.length > 0) {
    const userRoles = roleIds.map(roleId => ({
      UserId: userId,
      RoleId: roleId,
      AssignedBy: assignedBy
    }));

    await prisma.userRole.createMany({
      data: userRoles
    });
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export async function getUsersByRole(roleId: number) {
  return await prisma.userRole.findMany({
    where: { RoleId: roleId },
    include: {
      User: {
        select: {
          Id: true,
          Name: true,
          Email: true,
          Phone: true
        }
      }
    }
  });
}

export async function getRolesByUser(userId: number) {
  return await prisma.userRole.findMany({
    where: { UserId: userId },
    include: {
      Role: true
    }
  });
}

// ============================================================================
// INITIALIZATION FUNCTIONS
// ============================================================================

export async function initializeDefaultPermissions() {
  const defaultPermissions = [
    // Task permissions
    { name: 'task:create', resource: 'task', action: 'create', description: 'Create new tasks' },
    { name: 'task:read', resource: 'task', action: 'read', description: 'View tasks' },
    { name: 'task:update', resource: 'task', action: 'update', description: 'Update existing tasks' },
    { name: 'task:delete', resource: 'task', action: 'delete', description: 'Delete tasks' },
    { name: 'task:assign', resource: 'task', action: 'assign', description: 'Assign tasks to users/groups' },
    { name: 'task:complete', resource: 'task', action: 'complete', description: 'Mark tasks as completed' },
    { name: 'task:escalate', resource: 'task', action: 'escalate', description: 'Escalate tasks' },

    // Subtask permissions
    { name: 'subtask:create', resource: 'subtask', action: 'create', description: 'Create subtasks' },
    { name: 'subtask:read', resource: 'subtask', action: 'read', description: 'View subtasks' },
    { name: 'subtask:update', resource: 'subtask', action: 'update', description: 'Update subtasks' },
    { name: 'subtask:delete', resource: 'subtask', action: 'delete', description: 'Delete subtasks' },

    // Recurrence permissions
    { name: 'recurrence:create', resource: 'recurrence', action: 'create', description: 'Create recurrence rules' },
    { name: 'recurrence:read', resource: 'recurrence', action: 'read', description: 'View recurrence rules' },
    { name: 'recurrence:update', resource: 'recurrence', action: 'update', description: 'Update recurrence rules' },
    { name: 'recurrence:delete', resource: 'recurrence', action: 'delete', description: 'Delete recurrence rules' },

    // User management permissions
    { name: 'user:create', resource: 'user', action: 'create', description: 'Create new users' },
    { name: 'user:read', resource: 'user', action: 'read', description: 'View user information' },
    { name: 'user:update', resource: 'user', action: 'update', description: 'Update user information' },
    { name: 'user:delete', resource: 'user', action: 'delete', description: 'Delete users' },

    // Group management permissions
    { name: 'group:create', resource: 'group', action: 'create', description: 'Create new groups' },
    { name: 'group:read', resource: 'group', action: 'read', description: 'View groups' },
    { name: 'group:update', resource: 'group', action: 'update', description: 'Update groups' },
    { name: 'group:delete', resource: 'group', action: 'delete', description: 'Delete groups' },
    { name: 'group:manage-members', resource: 'group', action: 'manage-members', description: 'Add/remove group members' },

    // Role management permissions
    { name: 'role:create', resource: 'role', action: 'create', description: 'Create new roles' },
    { name: 'role:read', resource: 'role', action: 'read', description: 'View roles and permissions' },
    { name: 'role:update', resource: 'role', action: 'update', description: 'Update roles' },
    { name: 'role:delete', resource: 'role', action: 'delete', description: 'Delete roles' },
    { name: 'role:assign', resource: 'role', action: 'assign', description: 'Assign roles to users' },

    // Permission management permissions
    { name: 'permission:create', resource: 'permission', action: 'create', description: 'Create new permissions' },
    { name: 'permission:read', resource: 'permission', action: 'read', description: 'View permissions' },
    { name: 'permission:update', resource: 'permission', action: 'update', description: 'Update permissions' },
    { name: 'permission:delete', resource: 'permission', action: 'delete', description: 'Delete permissions' },

    // System permissions
    { name: 'system:initialize', resource: 'system', action: 'initialize', description: 'Initialize system' },
    { name: 'system:manage-scheduler', resource: 'system', action: 'manage-scheduler', description: 'Manage scheduler configuration' },
    { name: 'system:view-stats', resource: 'system', action: 'view-stats', description: 'View system statistics' },
    { name: 'system:process-escalations', resource: 'system', action: 'process-escalations', description: 'Process automatic escalations' },

    // Data import permissions
    { name: 'data:import', resource: 'data', action: 'import', description: 'Import data from CSV' }
  ];

  for (const permission of defaultPermissions) {
    const existing = await getPermissionByName(permission.name);
    if (!existing) {
      await createPermission(permission);
    }
  }

  console.log('✅ Default permissions initialized');
}

export async function initializeDefaultRoles() {
  // Create default roles (check if they exist first)
  let adminRole = await getRoleByName('Administrator');
  if (!adminRole) {
    adminRole = await createRole({
      name: 'Administrator',
      description: 'Full system access with all permissions'
    }) as any;
  }

  let managerRole = await getRoleByName('Manager');
  if (!managerRole) {
    managerRole = await createRole({
      name: 'Manager',
      description: 'Management access to tasks, users, and groups'
    }) as any;
  }

  let userRole = await getRoleByName('User');
  if (!userRole) {
    userRole = await createRole({
      name: 'User',
      description: 'Basic user access to tasks and personal data'
    }) as any;
  }

  // Ensure roles exist
  if (!adminRole || !managerRole || !userRole) {
    throw new Error('Failed to initialize default roles');
  }

  // Get all permissions
  const allPermissions = await getAllPermissions();

  // Assign permissions to Administrator (all permissions)
  const adminPermissionIds = allPermissions.map((p: any) => Number(p.Id));
  await setRolePermissions(Number(adminRole.Id), adminPermissionIds);

  // Assign permissions to Manager
  const managerPermissions = allPermissions.filter((p: any) =>
    ['task', 'subtask', 'recurrence', 'user', 'group', 'system:view-stats', 'data'].some(resource =>
      p.Resource.startsWith(resource.split(':')[0])
    )
  );
  const managerPermissionIds = managerPermissions.map((p: any) => Number(p.Id));
  await setRolePermissions(Number(managerRole.Id), managerPermissionIds);

  // Assign permissions to User
  const userPermissions = allPermissions.filter((p: any) =>
    p.Resource === 'task' ||
    p.Resource === 'subtask' ||
    p.Resource === 'recurrence'
  );
  const userPermissionIds = userPermissions.map((p: any) => Number(p.Id));
  await setRolePermissions(Number(userRole.Id), userPermissionIds);

  console.log('✅ Default roles initialized');
}