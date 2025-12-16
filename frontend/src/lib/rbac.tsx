"use client";

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import {
    RoleName,
    Permission,
    ROLES,
    PERMISSIONS,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getHighestRole,
    isAdmin,
    isTeamLeaderOrAbove,
    ROLE_HIERARCHY,
} from './rbac-constants';

// ============================================
// TYPES
// ============================================
export interface RBACUser {
    id: string;
    email: string;
    name?: string;
    roles: RoleName[];
    permissions: Permission[];
}

export interface RBACContextValue {
    user: RBACUser | null;
    isLoading: boolean;
    isAuthenticated: boolean;

    // Role checks
    hasRole: (role: RoleName) => boolean;
    hasAnyRole: (roles: RoleName[]) => boolean;
    isAdmin: () => boolean;
    isTeamLeaderOrAbove: () => boolean;
    getHighestRole: () => RoleName | null;

    // Permission checks
    can: (permission: Permission) => boolean;
    canAny: (permissions: Permission[]) => boolean;
    canAll: (permissions: Permission[]) => boolean;

    // Task-specific shortcuts
    canCreateTask: () => boolean;
    canUpdateTask: () => boolean;
    canDeleteTask: () => boolean;
    canAssignTask: () => boolean;
    canEscalateTask: () => boolean;
    canExportTask: () => boolean;
    canImportTask: () => boolean;

    // User-specific shortcuts
    canManageUsers: () => boolean;
    canManageRoles: () => boolean;
}

// ============================================
// CONTEXT
// ============================================
const RBACContext = createContext<RBACContextValue | null>(null);

// ============================================
// PROVIDER
// ============================================
interface RBACProviderProps {
    children: ReactNode;
}

export function RBACProvider({ children }: RBACProviderProps) {
    const { data: session, status } = useSession();

    const value = useMemo<RBACContextValue>(() => {
        const isLoading = status === 'loading';
        const isAuthenticated = status === 'authenticated' && !!session?.user;

        // Parse user data from session
        // The session should include roles and permissions from the backend
        const user: RBACUser | null = session?.user ? {
            id: (session.user as any).id || '',
            email: session.user.email || '',
            name: session.user.name || undefined,
            // These should come from the backend via the session
            roles: (session.user as any).roles || [ROLES.GENERAL],
            permissions: (session.user as any).permissions || [],
        } : null;

        const userRoles = user?.roles || [];

        return {
            user,
            isLoading,
            isAuthenticated,

            // Role checks
            hasRole: (role: RoleName) => userRoles.includes(role),
            hasAnyRole: (roles: RoleName[]) => roles.some(role => userRoles.includes(role)),
            isAdmin: () => isAdmin(userRoles),
            isTeamLeaderOrAbove: () => isTeamLeaderOrAbove(userRoles),
            getHighestRole: () => getHighestRole(userRoles),

            // Permission checks
            can: (permission: Permission) => hasPermission(userRoles, permission),
            canAny: (permissions: Permission[]) => hasAnyPermission(userRoles, permissions),
            canAll: (permissions: Permission[]) => hasAllPermissions(userRoles, permissions),

            // Task-specific shortcuts
            canCreateTask: () => hasPermission(userRoles, PERMISSIONS.TASK_CREATE),
            canUpdateTask: () => hasPermission(userRoles, PERMISSIONS.TASK_UPDATE),
            canDeleteTask: () => hasPermission(userRoles, PERMISSIONS.TASK_DELETE),
            canAssignTask: () => hasPermission(userRoles, PERMISSIONS.TASK_ASSIGN),
            canEscalateTask: () => hasPermission(userRoles, PERMISSIONS.TASK_ESCALATE),
            canExportTask: () => hasPermission(userRoles, PERMISSIONS.TASK_EXPORT),
            canImportTask: () => hasPermission(userRoles, PERMISSIONS.TASK_IMPORT),

            // User-specific shortcuts
            canManageUsers: () => hasPermission(userRoles, PERMISSIONS.USER_MANAGE),
            canManageRoles: () => hasPermission(userRoles, PERMISSIONS.ROLE_MANAGE),
        };
    }, [session, status]);

    return (
        <RBACContext.Provider value={value}>
            {children}
        </RBACContext.Provider>
    );
}

// ============================================
// HOOKS
// ============================================

/**
 * Main RBAC hook - provides all RBAC functionality
 */
export function useRBAC(): RBACContextValue {
    const context = useContext(RBACContext);
    if (!context) {
        throw new Error('useRBAC must be used within an RBACProvider');
    }
    return context;
}

/**
 * Hook to check a single permission
 */
export function usePermission(permission: Permission): boolean {
    const { can } = useRBAC();
    return can(permission);
}

/**
 * Hook to check multiple permissions (any)
 */
export function useAnyPermission(permissions: Permission[]): boolean {
    const { canAny } = useRBAC();
    return canAny(permissions);
}

/**
 * Hook to check multiple permissions (all)
 */
export function useAllPermissions(permissions: Permission[]): boolean {
    const { canAll } = useRBAC();
    return canAll(permissions);
}

/**
 * Hook to check if user has a specific role
 */
export function useRole(role: RoleName): boolean {
    const { hasRole } = useRBAC();
    return hasRole(role);
}

/**
 * Hook for task-related permissions
 */
export function useTaskPermissions() {
    const rbac = useRBAC();
    return {
        canCreate: rbac.canCreateTask(),
        canUpdate: rbac.canUpdateTask(),
        canDelete: rbac.canDeleteTask(),
        canAssign: rbac.canAssignTask(),
        canEscalate: rbac.canEscalateTask(),
        canExport: rbac.canExportTask(),
        canImport: rbac.canImportTask(),
    };
}

// ============================================
// RE-EXPORT CONSTANTS
// ============================================
export { ROLES, RESOURCES, OPERATIONS, PERMISSIONS, ROLE_HIERARCHY } from './rbac-constants';
export type { RoleName, Permission } from './rbac-constants';
