import jwt from "jsonwebtoken";
import { ACCESS_TOKEN_EXPIRY } from "./auth.constant";
import { rbacClient } from "../../lib/rbac-client";
import { ROLE_PERMISSIONS, RoleName, ROLES } from "../../lib/rbac-constants";

export interface User {
  id: number;
  email: string;
  name: string;
  phone?: string;
  roles?: string[];
  permissions?: string[];
}

export interface AuthResponse {
  user: User;
  token: string;
}

/**
 * Get permissions from local constants (fallback when RBAC API doesn't provide them)
 */
function getPermissionsFromConstants(roles: string[]): string[] {
  const permissions = new Set<string>();

  roles.forEach(roleName => {
    const rolePermissions = ROLE_PERMISSIONS[roleName as RoleName];
    if (rolePermissions) {
      rolePermissions.forEach(perm => permissions.add(perm));
    }
  });

  return Array.from(permissions);
}

/**
 * Fetch user roles and permissions from .NET RBAC API
 */
async function getUserRolesAndPermissions(userId: number): Promise<{ roles: string[]; permissions: string[] }> {
  try {
    if (!rbacClient.isReady()) {
      console.warn('[Auth] RBAC client not configured, using default General role');
      return {
        roles: [ROLES.GENERAL],
        permissions: getPermissionsFromConstants([ROLES.GENERAL])
      };
    }

    const response = await rbacClient.getUserPermissions(userId);

    if (response.success && response.data) {
      // If permissions are not returned, derive from roles using local constants
      const permissions = response.data.permissions?.length > 0
        ? response.data.permissions
        : getPermissionsFromConstants(response.data.roles);

      return {
        roles: response.data.roles,
        permissions
      };
    }

    console.warn(`[Auth] Failed to fetch permissions from RBAC API for user ${userId}`);
  } catch (error) {
    console.error('[Auth] Error fetching from RBAC API:', error);
  }

  return {
    roles: [ROLES.GENERAL],
    permissions: getPermissionsFromConstants([ROLES.GENERAL])
  };
}

/**
 * Login user via .NET RBAC API
 * The RBAC API validates credentials and returns user data
 */
export async function login(identifier: string, password: string): Promise<AuthResponse> {
  // Check if RBAC service is available
  if (!rbacClient.isReady()) {
    throw new Error("Authentication service is not configured");
  }

  console.log(`[Auth] Attempting login for identifier: ${identifier}`);

  // Authenticate via .NET RBAC API
  const loginResponse = await rbacClient.login(identifier, password);

  if (!loginResponse.success || !loginResponse.data?.user) {
    console.error(`[Auth] Login failed: ${loginResponse.message}`);
    throw new Error(loginResponse.message || "Invalid credentials");
  }

  const rbacUser = loginResponse.data.user;
  console.log(`[Auth] Login successful for user ID: ${rbacUser.id}`);

  // Fetch user roles and permissions from RBAC API
  const { roles, permissions } = await getUserRolesAndPermissions(rbacUser.id);

  // If user has no roles, use default General role
  const finalRoles = roles.length > 0 ? roles : [ROLES.GENERAL];
  const finalPermissions = permissions.length > 0 ? permissions : getPermissionsFromConstants([ROLES.GENERAL]);

  // Generate JWT token with user info and permissions
  const secretKey = process.env.JWT_SECRET as string;
  if (!secretKey) {
    throw new Error("JWT_SECRET is not configured");
  }

  const token = jwt.sign(
    {
      id: rbacUser.id,
      email: rbacUser.email,
      name: rbacUser.username || rbacUser.email,
      roles: finalRoles,
      permissions: finalPermissions
    },
    secretKey,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  console.log(`[Auth] JWT token generated for user ${rbacUser.id} with roles:`, finalRoles);

  return {
    user: {
      id: rbacUser.id,
      email: rbacUser.email,
      name: rbacUser.username || rbacUser.email,
      roles: finalRoles,
      permissions: finalPermissions
    },
    token
  };
}

/**
 * Signup - Creates a new user in the .NET RBAC system
 * Note: This requires the RBAC API to support user creation
 */
export async function signup(name: string, email: string, phone: string, password: string): Promise<AuthResponse> {
  // Note: The .NET RBAC API should handle user creation
  // For now, we'll throw an error indicating this should be done via RBAC API
  throw new Error("User registration should be performed via the RBAC administration API");
}