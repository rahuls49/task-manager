import { Request, Response, NextFunction } from "express";
import { rbacClient } from "../lib/rbac-client";

export interface AuthenticatedUser {
  id: string | number;
  name?: string;
  email: string;
  roles?: string[];
  permissions?: string[];
}

// Cache for user permissions to reduce API calls
const permissionCache = new Map<string, { permissions: string[]; roles: string[]; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

/**
 * Get cached permissions or fetch from RBAC service
 */
async function getCachedPermissions(userId: number): Promise<{ roles: string[]; permissions: string[] } | null> {
  const cacheKey = `user:${userId}`;
  const cached = permissionCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return { roles: cached.roles, permissions: cached.permissions };
  }

  // Fetch from RBAC service
  try {
    const response = await rbacClient.getUserPermissions(userId);
    if (response.success && response.data) {
      permissionCache.set(cacheKey, {
        permissions: response.data.permissions,
        roles: response.data.roles,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
      return response.data;
    }
  } catch (error) {
    console.error('[RBAC Middleware] Failed to fetch user permissions:', error);
  }

  return null;
}

/**
 * Clear cached permissions for a user
 */
export function clearPermissionCache(userId: string): void {
  permissionCache.delete(`user:${userId}`);
}

/**
 * Clear all cached permissions
 */
export function clearAllPermissionCache(): void {
  permissionCache.clear();
}

/**
 * Helper to get userId as number
 */
function getUserIdAsNumber(userId: string | number | null | undefined): number | null {
  if (userId === null || userId === undefined) return null;
  return typeof userId === 'string' ? parseInt(userId, 10) : userId;
}

/**
 * Middleware to require a specific permission (resource + action)
 * First checks permissions from JWT token, then falls back to RBAC service
 */
export function requirePermission(resource: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Debug logging
    console.log('[RBAC] requirePermission called for:', resource, action);
    console.log('[RBAC] req.user exists:', !!req.user);
    console.log('[RBAC] req.user?.id:', req.user?.id);

    const userId = req.user?.id;

    if (!userId) {
      console.log('[RBAC] No userId, returning 401');
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    const userIdNum = getUserIdAsNumber(userId);
    if (userIdNum === null) {
      return res.status(401).json({
        success: false,
        error: "Invalid user ID",
      });
    }

    const requiredPermission = `${resource}:${action}`;
    console.log('[RBAC] Required permission:', requiredPermission);
    console.log('[RBAC] User permissions:', req.user?.permissions);

    try {
      // First check if user has permissions in jwt token (loaded by auth-middleware)
      const userPermissions = req.user?.permissions || [];

      // Check for wildcard permission (service accounts)
      if (userPermissions.includes('*')) {
        console.log('[RBAC] Wildcard permission found, allowing');
        return next();
      }

      // Check if user has the required permission in their JWT
      if (userPermissions.includes(requiredPermission)) {
        console.log('[RBAC] Permission found in JWT, allowing');
        return next();
      }

      // If not found in JWT, check if RBAC service is configured for real-time check
      if (!rbacClient.isReady()) {
        console.warn('[RBAC] RBAC client not configured, permission not found in JWT');
        return res.status(403).json({
          success: false,
          error: `Access denied. Required permission: ${requiredPermission}`,
        });
      }

      // Check permission via RBAC service as fallback
      const result = await rbacClient.checkPermission(userIdNum, resource, action);

      if (!result.success) {
        console.error(`[RBAC] Permission check failed for user ${userId}: ${result.message}`);
        return res.status(503).json({
          success: false,
          error: "RBAC service unavailable",
        });
      }

      if (!result.hasPermission) {
        return res.status(403).json({
          success: false,
          error: `Access denied. Required permission: ${requiredPermission}`,
        });
      }

      next();
    } catch (error) {
      console.error('[RBAC] Error checking permission:', error);
      return res.status(500).json({
        success: false,
        error: "Internal error during permission check",
      });
    }
  };
}

/**
 * Middleware to require any of the specified permissions
 */
export function requireAnyPermission(permissions: Array<{ resource: string; action: string }>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    const userIdNum = getUserIdAsNumber(userId);
    if (userIdNum === null) {
      return res.status(401).json({
        success: false,
        error: "Invalid user ID",
      });
    }

    try {
      // First check JWT permissions
      const userPermissions = req.user?.permissions || [];

      if (userPermissions.includes('*')) {
        return next();
      }

      // Check if user has any of the required permissions in JWT
      const hasAnyPermission = permissions.some(p =>
        userPermissions.includes(`${p.resource}:${p.action}`)
      );

      if (hasAnyPermission) {
        return next();
      }

      // Fall back to RBAC service
      if (!rbacClient.isReady()) {
        const permList = permissions.map(p => `${p.resource}:${p.action}`).join(', ');
        return res.status(403).json({
          success: false,
          error: `Access denied. Required one of: ${permList}`,
        });
      }

      const result = await rbacClient.checkAnyPermission(userIdNum, permissions);

      if (!result.success) {
        console.error(`[RBAC] Permission check (any) failed for user ${userId}: ${result.message}`);
        return res.status(503).json({
          success: false,
          error: "RBAC service unavailable",
        });
      }

      if (!result.hasPermission) {
        const permList = permissions.map(p => `${p.resource}:${p.action}`).join(', ');
        return res.status(403).json({
          success: false,
          error: `Access denied. Required one of: ${permList}`,
        });
      }

      next();
    } catch (error) {
      console.error('[RBAC] Error checking permissions:', error);
      return res.status(500).json({
        success: false,
        error: "Internal error during permission check",
      });
    }
  };
}

/**
 * Middleware to require all of the specified permissions
 */
export function requireAllPermissions(permissions: Array<{ resource: string; action: string }>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    const userIdNum = getUserIdAsNumber(userId);
    if (userIdNum === null) {
      return res.status(401).json({
        success: false,
        error: "Invalid user ID",
      });
    }

    try {
      const userPermissions = req.user?.permissions || [];

      if (userPermissions.includes('*')) {
        return next();
      }

      // Check if user has all required permissions in JWT
      const hasAllPermissions = permissions.every(p =>
        userPermissions.includes(`${p.resource}:${p.action}`)
      );

      if (hasAllPermissions) {
        return next();
      }

      // Fall back to RBAC service
      if (!rbacClient.isReady()) {
        const permList = permissions.map(p => `${p.resource}:${p.action}`).join(', ');
        return res.status(403).json({
          success: false,
          error: `Access denied. Required all of: ${permList}`,
        });
      }

      const result = await rbacClient.checkAllPermissions(userIdNum, permissions);

      if (!result.success) {
        console.error(`[RBAC] Permission check (all) failed for user ${userId}: ${result.message}`);
        return res.status(503).json({
          success: false,
          error: "RBAC service unavailable",
        });
      }

      if (!result.hasPermission) {
        const permList = permissions.map(p => `${p.resource}:${p.action}`).join(', ');
        return res.status(403).json({
          success: false,
          error: `Access denied. Required all of: ${permList}`,
        });
      }

      next();
    } catch (error) {
      console.error('[RBAC] Error checking permissions:', error);
      return res.status(500).json({
        success: false,
        error: "Internal error during permission check",
      });
    }
  };
}

/**
 * Middleware to require a specific role
 */
export function requireRole(roleName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    try {
      // First check JWT roles
      const userRoles = req.user?.roles || [];

      if (userRoles.includes(roleName)) {
        return next();
      }

      // Fall back to RBAC service
      const userIdNum = getUserIdAsNumber(userId);
      if (!userIdNum || !rbacClient.isReady()) {
        return res.status(403).json({
          success: false,
          error: `Access denied. Required role: ${roleName}`,
        });
      }

      const hasRole = await rbacClient.hasRole(userIdNum, roleName);

      if (!hasRole) {
        return res.status(403).json({
          success: false,
          error: `Access denied. Required role: ${roleName}`,
        });
      }

      next();
    } catch (error) {
      console.error('[RBAC] Error checking role:', error);
      return res.status(500).json({
        success: false,
        error: "Internal error during role check",
      });
    }
  };
}

/**
 * Helper function to check if user has admin role
 */
export async function isAdmin(userId: string | number): Promise<boolean> {
  const userIdNum = getUserIdAsNumber(userId);
  if (!userIdNum) return false;

  if (!rbacClient.isReady()) {
    console.warn('[RBAC] RBAC client not configured, returning false for isAdmin');
    return false;
  }

  try {
    return await rbacClient.hasRole(userIdNum, 'Administrator');
  } catch (error) {
    console.error('[RBAC] Error checking admin role:', error);
    return false;
  }
}

/**
 * Middleware to load user permissions into request object
 */
export function loadUserPermissions() {
  return async (req: Request, res: Response, next: NextFunction) => {
    console.log('[RBAC] loadUserPermissions called');
    console.log('[RBAC] req.user exists:', !!req.user);
    console.log('[RBAC] req.user?.id:', req.user?.id);

    // Permissions are already loaded by auth-middleware from JWT
    // This middleware is kept for backwards compatibility
    // It can refresh permissions from RBAC service if needed

    const userId = req.user?.id;
    if (!userId) {
      console.log('[RBAC] No userId in loadUserPermissions, continuing');
      return next();
    }

    const userIdNum = getUserIdAsNumber(userId);
    if (!userIdNum) {
      return next();
    }

    // If user already has permissions from JWT, skip
    if (req.user?.permissions && req.user.permissions.length > 0) {
      console.log('[RBAC] User already has permissions from JWT:', req.user.permissions.length);
      return next();
    }

    // Try to load from cache or RBAC service
    if (rbacClient.isReady()) {
      const cached = await getCachedPermissions(userIdNum);
      if (cached) {
        req.user!.roles = cached.roles;
        req.user!.permissions = cached.permissions;
        console.log('[RBAC] Loaded permissions from RBAC service');
      }
    }

    next();
  };
}