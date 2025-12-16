"use client";

import React, { ReactNode } from 'react';
import { useRBAC, PERMISSIONS, ROLES } from '@/lib/rbac';

// ============================================
// PERMISSION-BASED COMPONENTS
// ============================================

interface PermissionGateProps {
    children: ReactNode;
    permission: string;
    fallback?: ReactNode;
}

/**
 * Component that only renders children if user has the specified permission
 */
export function PermissionGate({ children, permission, fallback = null }: PermissionGateProps) {
    const { can } = useRBAC();

    if (!can(permission as any)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}

interface AnyPermissionGateProps {
    children: ReactNode;
    permissions: string[];
    fallback?: ReactNode;
}

/**
 * Component that renders children if user has ANY of the specified permissions
 */
export function AnyPermissionGate({ children, permissions, fallback = null }: AnyPermissionGateProps) {
    const { canAny } = useRBAC();

    if (!canAny(permissions as any)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}

interface AllPermissionsGateProps {
    children: ReactNode;
    permissions: string[];
    fallback?: ReactNode;
}

/**
 * Component that renders children only if user has ALL of the specified permissions
 */
export function AllPermissionsGate({ children, permissions, fallback = null }: AllPermissionsGateProps) {
    const { canAll } = useRBAC();

    if (!canAll(permissions as any)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}

// ============================================
// TASK-SPECIFIC PERMISSION COMPONENTS
// ============================================

interface ConditionalRenderProps {
    children: ReactNode;
    fallback?: ReactNode;
}

/**
 * Only renders children if user can create tasks
 */
export function CanCreateTask({ children, fallback = null }: ConditionalRenderProps) {
    return (
        <PermissionGate permission={PERMISSIONS.TASK_CREATE} fallback={fallback}>
            {children}
        </PermissionGate>
    );
}

/**
 * Only renders children if user can update tasks
 */
export function CanUpdateTask({ children, fallback = null }: ConditionalRenderProps) {
    return (
        <PermissionGate permission={PERMISSIONS.TASK_UPDATE} fallback={fallback}>
            {children}
        </PermissionGate>
    );
}

/**
 * Only renders children if user can delete tasks
 */
export function CanDeleteTask({ children, fallback = null }: ConditionalRenderProps) {
    return (
        <PermissionGate permission={PERMISSIONS.TASK_DELETE} fallback={fallback}>
            {children}
        </PermissionGate>
    );
}

/**
 * Only renders children if user can assign tasks
 */
export function CanAssignTask({ children, fallback = null }: ConditionalRenderProps) {
    return (
        <PermissionGate permission={PERMISSIONS.TASK_ASSIGN} fallback={fallback}>
            {children}
        </PermissionGate>
    );
}

/**
 * Only renders children if user can escalate tasks
 */
export function CanEscalateTask({ children, fallback = null }: ConditionalRenderProps) {
    return (
        <PermissionGate permission={PERMISSIONS.TASK_ESCALATE} fallback={fallback}>
            {children}
        </PermissionGate>
    );
}

/**
 * Only renders children if user can export tasks
 */
export function CanExportTask({ children, fallback = null }: ConditionalRenderProps) {
    return (
        <PermissionGate permission={PERMISSIONS.TASK_EXPORT} fallback={fallback}>
            {children}
        </PermissionGate>
    );
}

/**
 * Only renders children if user can import tasks
 */
export function CanImportTask({ children, fallback = null }: ConditionalRenderProps) {
    return (
        <PermissionGate permission={PERMISSIONS.TASK_IMPORT} fallback={fallback}>
            {children}
        </PermissionGate>
    );
}

// ============================================
// ROLE-BASED COMPONENTS
// ============================================

interface RoleGateProps {
    children: ReactNode;
    role: string;
    fallback?: ReactNode;
}

/**
 * Component that only renders children if user has the specified role
 */
export function RoleGate({ children, role, fallback = null }: RoleGateProps) {
    const { hasRole } = useRBAC();

    if (!hasRole(role as any)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}

/**
 * Only renders children if user is an Admin
 */
export function AdminOnly({ children, fallback = null }: ConditionalRenderProps) {
    return (
        <RoleGate role={ROLES.ADMIN} fallback={fallback}>
            {children}
        </RoleGate>
    );
}

/**
 * Only renders children if user is Team Leader or above
 */
export function TeamLeaderOrAbove({ children, fallback = null }: ConditionalRenderProps) {
    const { isTeamLeaderOrAbove } = useRBAC();

    if (!isTeamLeaderOrAbove()) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}

/**
 * Only renders children if user is NOT an admin (inverse gate)
 */
export function NonAdminOnly({ children, fallback = null }: ConditionalRenderProps) {
    const { isAdmin } = useRBAC();

    if (isAdmin()) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}

// ============================================
// USER MANAGEMENT COMPONENTS
// ============================================

/**
 * Only renders children if user can manage users
 */
export function CanManageUsers({ children, fallback = null }: ConditionalRenderProps) {
    return (
        <PermissionGate permission={PERMISSIONS.USER_MANAGE} fallback={fallback}>
            {children}
        </PermissionGate>
    );
}

/**
 * Only renders children if user can manage roles
 */
export function CanManageRoles({ children, fallback = null }: ConditionalRenderProps) {
    return (
        <PermissionGate permission={PERMISSIONS.ROLE_MANAGE} fallback={fallback}>
            {children}
        </PermissionGate>
    );
}

// ============================================
// LOADING STATE COMPONENTS
// ============================================

/**
 * Shows loading state while RBAC is initializing
 */
export function RBACLoading({ children }: { children: ReactNode }) {
    const { isLoading } = useRBAC();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    return <>{children}</>;
}

/**
 * Shows message when user is not authenticated
 */
export function RequireAuth({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
    const { isAuthenticated, isLoading } = useRBAC();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <>{fallback || <div className="p-4 text-center text-gray-500">Please sign in to continue</div>}</>;
    }

    return <>{children}</>;
}
