import { Request, Response, NextFunction } from "express";

export interface AuthenticatedUser {
  id: string;
  name?: string;
  email: string;
  roles?: string[];
  permissions?: string[];
}

export function requirePermission(resource: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // RBAC handled externally, return true as dummy data
    next();
  };
}

export function requireAnyPermission(permissions: Array<{ resource: string; action: string }>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // RBAC handled externally, return true as dummy data
    next();
  };
}

export function requireAllPermissions(permissions: Array<{ resource: string; action: string }>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // RBAC handled externally, return true as dummy data
    next();
  };
}

// Helper function to check if user has admin role (for backward compatibility)
export async function isAdmin(userId: string): Promise<boolean> {
  // RBAC handled externally, return true as dummy data
  return true;
}

// Helper function to check if user can manage users
export async function canManageUsers(userId: string): Promise<boolean> {
  // RBAC handled externally, return true as dummy data
  return true;
}

// Helper function to check if user can manage roles
export async function canManageRoles(userId: string): Promise<boolean> {
  // RBAC handled externally, return true as dummy data
  return true;
}