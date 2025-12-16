/**
 * RBAC Constants for Task Manager
 * Defines roles, resources, operations, and permission mappings
 */

// ============================================
// ROLES
// ============================================
export const ROLES = {
    ADMIN: 'Admin',
    TEAM_LEADER: 'Team Leader',
    FC: 'FC',
    PCH: 'PCH',
    GENERAL: 'General',
} as const;

export type RoleName = typeof ROLES[keyof typeof ROLES];

// ============================================
// RESOURCES
// ============================================
export const RESOURCES = {
    TASK: 'Task',
    USER: 'User',
    ROLE: 'Role',
    PERMISSION: 'Permission',
    REPORT: 'Report',
    GROUP: 'Group',
} as const;

export type ResourceName = typeof RESOURCES[keyof typeof RESOURCES];

// ============================================
// OPERATIONS
// ============================================
export const OPERATIONS = {
    CREATE: 'create',
    READ: 'read',
    UPDATE: 'update',
    DELETE: 'delete',
    ASSIGN: 'assign',
    ESCALATE: 'escalate',
    MANAGE: 'manage',
    EXPORT: 'export',
    IMPORT: 'import',
} as const;

export type OperationName = typeof OPERATIONS[keyof typeof OPERATIONS];

// ============================================
// PERMISSIONS
// ============================================
export type Permission = `${ResourceName}:${OperationName}`;

export const PERMISSIONS = {
    // Task permissions
    TASK_CREATE: `${RESOURCES.TASK}:${OPERATIONS.CREATE}` as Permission,
    TASK_READ: `${RESOURCES.TASK}:${OPERATIONS.READ}` as Permission,
    TASK_UPDATE: `${RESOURCES.TASK}:${OPERATIONS.UPDATE}` as Permission,
    TASK_DELETE: `${RESOURCES.TASK}:${OPERATIONS.DELETE}` as Permission,
    TASK_ASSIGN: `${RESOURCES.TASK}:${OPERATIONS.ASSIGN}` as Permission,
    TASK_ESCALATE: `${RESOURCES.TASK}:${OPERATIONS.ESCALATE}` as Permission,
    TASK_MANAGE: `${RESOURCES.TASK}:${OPERATIONS.MANAGE}` as Permission,
    TASK_EXPORT: `${RESOURCES.TASK}:${OPERATIONS.EXPORT}` as Permission,
    TASK_IMPORT: `${RESOURCES.TASK}:${OPERATIONS.IMPORT}` as Permission,

    // User permissions
    USER_CREATE: `${RESOURCES.USER}:${OPERATIONS.CREATE}` as Permission,
    USER_READ: `${RESOURCES.USER}:${OPERATIONS.READ}` as Permission,
    USER_UPDATE: `${RESOURCES.USER}:${OPERATIONS.UPDATE}` as Permission,
    USER_DELETE: `${RESOURCES.USER}:${OPERATIONS.DELETE}` as Permission,
    USER_MANAGE: `${RESOURCES.USER}:${OPERATIONS.MANAGE}` as Permission,

    // Role permissions
    ROLE_CREATE: `${RESOURCES.ROLE}:${OPERATIONS.CREATE}` as Permission,
    ROLE_READ: `${RESOURCES.ROLE}:${OPERATIONS.READ}` as Permission,
    ROLE_UPDATE: `${RESOURCES.ROLE}:${OPERATIONS.UPDATE}` as Permission,
    ROLE_DELETE: `${RESOURCES.ROLE}:${OPERATIONS.DELETE}` as Permission,
    ROLE_MANAGE: `${RESOURCES.ROLE}:${OPERATIONS.MANAGE}` as Permission,
    ROLE_ASSIGN: `${RESOURCES.ROLE}:${OPERATIONS.ASSIGN}` as Permission,

    // Permission management
    PERMISSION_READ: `${RESOURCES.PERMISSION}:${OPERATIONS.READ}` as Permission,
    PERMISSION_MANAGE: `${RESOURCES.PERMISSION}:${OPERATIONS.MANAGE}` as Permission,

    // Report permissions
    REPORT_READ: `${RESOURCES.REPORT}:${OPERATIONS.READ}` as Permission,
    REPORT_EXPORT: `${RESOURCES.REPORT}:${OPERATIONS.EXPORT}` as Permission,

    // Group permissions
    GROUP_CREATE: `${RESOURCES.GROUP}:${OPERATIONS.CREATE}` as Permission,
    GROUP_READ: `${RESOURCES.GROUP}:${OPERATIONS.READ}` as Permission,
    GROUP_UPDATE: `${RESOURCES.GROUP}:${OPERATIONS.UPDATE}` as Permission,
    GROUP_DELETE: `${RESOURCES.GROUP}:${OPERATIONS.DELETE}` as Permission,
    GROUP_MANAGE: `${RESOURCES.GROUP}:${OPERATIONS.MANAGE}` as Permission,
} as const;

// ============================================
// ROLE PERMISSIONS MAPPING
// ============================================
export const ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
    [ROLES.ADMIN]: [
        PERMISSIONS.TASK_CREATE,
        PERMISSIONS.TASK_READ,
        PERMISSIONS.TASK_UPDATE,
        PERMISSIONS.TASK_DELETE,
        PERMISSIONS.TASK_ASSIGN,
        PERMISSIONS.TASK_ESCALATE,
        PERMISSIONS.TASK_MANAGE,
        PERMISSIONS.TASK_EXPORT,
        PERMISSIONS.TASK_IMPORT,
        PERMISSIONS.USER_CREATE,
        PERMISSIONS.USER_READ,
        PERMISSIONS.USER_UPDATE,
        PERMISSIONS.USER_DELETE,
        PERMISSIONS.USER_MANAGE,
        PERMISSIONS.ROLE_CREATE,
        PERMISSIONS.ROLE_READ,
        PERMISSIONS.ROLE_UPDATE,
        PERMISSIONS.ROLE_DELETE,
        PERMISSIONS.ROLE_MANAGE,
        PERMISSIONS.ROLE_ASSIGN,
        PERMISSIONS.PERMISSION_READ,
        PERMISSIONS.PERMISSION_MANAGE,
        PERMISSIONS.REPORT_READ,
        PERMISSIONS.REPORT_EXPORT,
        PERMISSIONS.GROUP_CREATE,
        PERMISSIONS.GROUP_READ,
        PERMISSIONS.GROUP_UPDATE,
        PERMISSIONS.GROUP_DELETE,
        PERMISSIONS.GROUP_MANAGE,
    ],

    [ROLES.TEAM_LEADER]: [
        PERMISSIONS.TASK_CREATE,
        PERMISSIONS.TASK_READ,
        PERMISSIONS.TASK_UPDATE,
        PERMISSIONS.TASK_ASSIGN,
        PERMISSIONS.TASK_ESCALATE,
        PERMISSIONS.TASK_EXPORT,
        PERMISSIONS.USER_READ,
        PERMISSIONS.ROLE_READ,
        PERMISSIONS.REPORT_READ,
        PERMISSIONS.REPORT_EXPORT,
        PERMISSIONS.GROUP_READ,
        PERMISSIONS.GROUP_UPDATE,
    ],

    [ROLES.FC]: [
        PERMISSIONS.TASK_CREATE,
        PERMISSIONS.TASK_READ,
        PERMISSIONS.TASK_UPDATE,
        PERMISSIONS.USER_READ,
        PERMISSIONS.REPORT_READ,
        PERMISSIONS.GROUP_READ,
    ],

    [ROLES.PCH]: [
        PERMISSIONS.TASK_CREATE,
        PERMISSIONS.TASK_READ,
        PERMISSIONS.TASK_UPDATE,
        PERMISSIONS.TASK_ESCALATE,
        PERMISSIONS.USER_READ,
        PERMISSIONS.REPORT_READ,
        PERMISSIONS.GROUP_READ,
    ],

    [ROLES.GENERAL]: [
        PERMISSIONS.TASK_CREATE,
        PERMISSIONS.TASK_READ,
        PERMISSIONS.TASK_UPDATE,
        PERMISSIONS.TASK_DELETE,  // Temporary: Added until admin users can be properly assigned Admin role in RBAC
        PERMISSIONS.USER_READ,
        PERMISSIONS.GROUP_READ,
    ],
};

// ============================================
// ROLE HIERARCHY
// ============================================
export const ROLE_HIERARCHY: Record<RoleName, number> = {
    [ROLES.ADMIN]: 5,
    [ROLES.TEAM_LEADER]: 4,
    [ROLES.FC]: 3,
    [ROLES.PCH]: 2,
    [ROLES.GENERAL]: 1,
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if a user with given roles has a specific permission
 */
export function hasPermission(userRoles: RoleName[], permission: Permission): boolean {
    return userRoles.some(role => ROLE_PERMISSIONS[role]?.includes(permission));
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(userRoles: RoleName[], permissions: Permission[]): boolean {
    return permissions.some(perm => hasPermission(userRoles, perm));
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllPermissions(userRoles: RoleName[], permissions: Permission[]): boolean {
    return permissions.every(perm => hasPermission(userRoles, perm));
}

/**
 * Get all permissions for given roles
 */
export function getPermissionsForRoles(roles: RoleName[]): Permission[] {
    const permissionSet = new Set<Permission>();
    roles.forEach(role => {
        ROLE_PERMISSIONS[role]?.forEach(perm => permissionSet.add(perm));
    });
    return Array.from(permissionSet);
}

/**
 * Get the highest role from a list of roles
 */
export function getHighestRole(roles: RoleName[]): RoleName | null {
    if (!roles || roles.length === 0) return null;

    return roles.reduce((highest, current) => {
        const highestLevel = ROLE_HIERARCHY[highest] || 0;
        const currentLevel = ROLE_HIERARCHY[current] || 0;
        return currentLevel > highestLevel ? current : highest;
    }, roles[0]);
}

/**
 * Check if user is an admin
 */
export function isAdmin(roles: RoleName[]): boolean {
    return roles.includes(ROLES.ADMIN);
}

/**
 * Check if user is Team Leader or above
 */
export function isTeamLeaderOrAbove(roles: RoleName[]): boolean {
    return roles.some(role => {
        const level = ROLE_HIERARCHY[role] || 0;
        return level >= ROLE_HIERARCHY[ROLES.TEAM_LEADER];
    });
}
