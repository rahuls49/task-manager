/**
 * RBAC Client - REST API client for communicating with .NET RBAC service
 * This client handles all RBAC-related API calls to the external .NET service
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

// RBAC API Configuration
const RBAC_API_URL = process.env.RBAC_API_URL || 'http://localhost:5000';
const RBAC_API_KEY = process.env.RBAC_API_KEY || 'IBu+5sjMCcxmQyltgXqAIocFxiu2To/A5IaSnYrHIc0=';

// Types for RBAC entities
export interface RbacUser {
    id: number;
    username?: string;  // Some endpoints use 'username'
    name?: string;      // Some endpoints use 'name'
    email: string;
    mobileNo?: string;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
    roles?: RbacRole[];
    permissions?: string[];
}

export interface RbacRole {
    id: number;
    name: string;
    description?: string;
    isActive: boolean;
    permissions?: RbacPermission[];
}

export interface RbacPermission {
    id: number;
    name: string;
    description?: string;
    resource: string;
    action: string;
    isActive: boolean;
}

export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginResponse {
    success: boolean;
    data?: {
        user: RbacUser;
        token?: string;
    };
    message?: string;
}

export interface PermissionCheckRequest {
    userId: number;
    resource: string;
    action: string;
}

export interface PermissionCheckResponse {
    success: boolean;
    hasPermission: boolean;
    message?: string;
}

export interface UserPermissionsResponse {
    success: boolean;
    data?: {
        roles: string[];
        permissions: string[];
    };
    message?: string;
}

export interface ApiResponse<T> {
    success?: boolean;
    status?: string; // .NET API uses 'Success' or 'Failed'
    data?: T;
    message?: string;
    errors?: string[];
    timestamp?: string;
}

class RbacClient {
    private client: AxiosInstance;
    private isConfigured: boolean = false;

    constructor() {
        this.client = axios.create({
            baseURL: RBAC_API_URL,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': RBAC_API_KEY,
            },
        });

        // Request interceptor for logging
        this.client.interceptors.request.use(
            (config) => {
                console.log(`[RBAC Client] ${config.method?.toUpperCase()} ${config.url}`);
                return config;
            },
            (error) => {
                console.error('[RBAC Client] Request error:', error.message);
                return Promise.reject(error);
            }
        );

        // Response interceptor for error handling
        this.client.interceptors.response.use(
            (response) => response,
            (error: AxiosError) => {
                if (error.response) {
                    console.error(`[RBAC Client] Response error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
                } else if (error.request) {
                    console.error('[RBAC Client] No response received:', error.message);
                } else {
                    console.error('[RBAC Client] Request setup error:', error.message);
                }
                return Promise.reject(error);
            }
        );

        this.checkConfiguration();
    }

    private checkConfiguration(): void {
        if (RBAC_API_URL && RBAC_API_KEY && RBAC_API_KEY !== 'your-api-key') {
            this.isConfigured = true;
            console.log(`[RBAC Client] Configured to connect to: ${RBAC_API_URL}`);
        } else {
            console.warn('[RBAC Client] Not fully configured. Set RBAC_API_URL and RBAC_API_KEY environment variables.');
        }
    }

    /**
     * Check if the RBAC service is available
     */
    async healthCheck(): Promise<boolean> {
        try {
            await this.client.get('/api/health');
            return true;
        } catch (error) {
            console.warn('[RBAC Client] Health check failed, RBAC service may be unavailable');
            return false;
        }
    }

    /**
     * Authenticate user with the RBAC service
     * Uses 'identifier' field which can be username, email, or mobile number
     */
    async login(identifier: string, password: string): Promise<LoginResponse> {
        try {
            const response = await this.client.post<ApiResponse<RbacUser>>('/api/Auth/login', {
                identifier,
                password,
            });
            return {
                success: response.data.success !== false && response.data.status !== 'Failed',
                data: response.data.data ? { user: response.data.data } : undefined,
                message: response.data.message,
            };
        } catch (error) {
            const axiosError = error as AxiosError<ApiResponse<null>>;
            return {
                success: false,
                message: axiosError.response?.data?.message || 'Login failed',
            };
        }
    }

    /**
     * Get user by ID with their roles and permissions
     */
    async getUserById(userId: number): Promise<ApiResponse<RbacUser>> {
        try {
            const response = await this.client.get<ApiResponse<RbacUser>>(`/api/Users/${userId}`);
            return response.data;
        } catch (error) {
            const axiosError = error as AxiosError<ApiResponse<null>>;
            return {
                success: false,
                message: axiosError.response?.data?.message || 'Failed to get user',
            };
        }
    }

    /**
     * Get user by username with their roles and permissions
     */
    async getUserByUsername(username: string): Promise<ApiResponse<RbacUser>> {
        try {
            const response = await this.client.get<ApiResponse<RbacUser>>(`/api/Users/${username}`);
            return response.data;
        } catch (error) {
            const axiosError = error as AxiosError<ApiResponse<null>>;
            return {
                success: false,
                message: axiosError.response?.data?.message || 'Failed to get user',
            };
        }
    }

    /**
     * Get all users from RBAC service
     */
    async getAllUsers(): Promise<ApiResponse<RbacUser[]>> {
        try {
            const response = await this.client.get<ApiResponse<RbacUser[]>>('/api/Users');
            // Handle both old and new response format
            const isSuccess = response.data.success ?? response.data.status === 'Success';
            return {
                success: isSuccess,
                data: response.data.data,
                message: response.data.message,
            };
        } catch (error) {
            const axiosError = error as AxiosError<ApiResponse<null>>;
            console.error('[RBAC] Failed to get all users:', axiosError.message);
            return {
                success: false,
                message: axiosError.response?.data?.message || 'Failed to get users',
            };
        }
    }

    /**
     * Create a new user in RBAC system
     */
    async createUser(userData: {
        name: string;
        email: string;
        mobileNo?: string;
        rawPassword: string;
    }): Promise<ApiResponse<RbacUser>> {
        try {
            const response = await this.client.post<ApiResponse<RbacUser>>('/api/Users', userData);
            const isSuccess = response.data.success ?? response.data.status === 'Success';
            return {
                success: isSuccess,
                data: response.data.data,
                message: response.data.message,
            };
        } catch (error) {
            const axiosError = error as AxiosError<ApiResponse<null>>;
            console.error('[RBAC] Failed to create user:', axiosError.message);
            return {
                success: false,
                message: axiosError.response?.data?.message || 'Failed to create user',
            };
        }
    }

    /**
     * Update an existing user in RBAC system
     */
    async updateUser(username: string, userData: {
        name?: string;
        email?: string;
        mobileNo?: string;
    }): Promise<ApiResponse<RbacUser>> {
        try {
            const response = await this.client.put<ApiResponse<RbacUser>>(`/api/Users/${username}`, userData);
            const isSuccess = response.data.success ?? response.data.status === 'Success';
            return {
                success: isSuccess,
                data: response.data.data,
                message: response.data.message,
            };
        } catch (error) {
            const axiosError = error as AxiosError<ApiResponse<null>>;
            console.error('[RBAC] Failed to update user:', axiosError.message);
            return {
                success: false,
                message: axiosError.response?.data?.message || 'Failed to update user',
            };
        }
    }

    /**
     * Delete a user from RBAC system
     */
    async deleteUser(username: string): Promise<ApiResponse<null>> {
        try {
            const response = await this.client.delete<ApiResponse<null>>(`/api/Users/${username}`);
            const isSuccess = response.data.success ?? response.data.status === 'Success';
            return {
                success: isSuccess,
                message: response.data.message,
            };
        } catch (error) {
            const axiosError = error as AxiosError<ApiResponse<null>>;
            console.error('[RBAC] Failed to delete user:', axiosError.message);
            return {
                success: false,
                message: axiosError.response?.data?.message || 'Failed to delete user',
            };
        }
    }

    /**
     * Get user's roles and permissions from RBAC service
     */
    async getUserPermissions(userId: number): Promise<UserPermissionsResponse> {
        try {
            const response = await this.client.get<ApiResponse<{ roles: string[]; permissions: string[] }>>(
                `/api/Users/${userId}/permissions`
            );
            return {
                success: response.data.success !== false && response.data.status !== 'Failed',
                data: response.data.data,
                message: response.data.message,
            };
        } catch (error) {
            const axiosError = error as AxiosError<ApiResponse<null>>;
            return {
                success: false,
                message: axiosError.response?.data?.message || 'Failed to get user permissions',
            };
        }
    }

    /**
     * Check if user has specific permission
     */
    async checkPermission(userId: number, resource: string, action: string): Promise<PermissionCheckResponse> {
        try {
            const response = await this.client.post<ApiResponse<{ hasPermission: boolean }>>(
                '/api/Permissions/check',
                {
                    userId,
                    resource,
                    action,
                }
            );
            return {
                success: response.data.success !== false && response.data.status !== 'Failed',
                hasPermission: response.data.data?.hasPermission || false,
                message: response.data.message,
            };
        } catch (error) {
            const axiosError = error as AxiosError<ApiResponse<null>>;
            // If RBAC service is unavailable, we can decide to:
            // 1. Deny access (more secure)
            // 2. Allow access (more permissive, for development)
            console.error('[RBAC Client] Permission check failed:', axiosError.message);
            return {
                success: false,
                hasPermission: false,
                message: axiosError.response?.data?.message || 'Permission check failed',
            };
        }
    }

    /**
     * Check if user has any of the specified permissions
     */
    async checkAnyPermission(
        userId: number,
        permissions: Array<{ resource: string; action: string }>
    ): Promise<PermissionCheckResponse> {
        try {
            const response = await this.client.post<ApiResponse<{ hasPermission: boolean }>>(
                '/api/Permissions/check-any',
                {
                    userId,
                    permissions,
                }
            );
            return {
                success: response.data.success !== false && response.data.status !== 'Failed',
                hasPermission: response.data.data?.hasPermission || false,
                message: response.data.message,
            };
        } catch (error) {
            const axiosError = error as AxiosError<ApiResponse<null>>;
            console.error('[RBAC Client] Permission check (any) failed:', axiosError.message);
            return {
                success: false,
                hasPermission: false,
                message: axiosError.response?.data?.message || 'Permission check failed',
            };
        }
    }

    /**
     * Check if user has all of the specified permissions
     */
    async checkAllPermissions(
        userId: number,
        permissions: Array<{ resource: string; action: string }>
    ): Promise<PermissionCheckResponse> {
        try {
            const response = await this.client.post<ApiResponse<{ hasPermission: boolean }>>(
                '/api/Permissions/check-all',
                {
                    userId,
                    permissions,
                }
            );
            return {
                success: response.data.success !== false && response.data.status !== 'Failed',
                hasPermission: response.data.data?.hasPermission || false,
                message: response.data.message,
            };
        } catch (error) {
            const axiosError = error as AxiosError<ApiResponse<null>>;
            console.error('[RBAC Client] Permission check (all) failed:', axiosError.message);
            return {
                success: false,
                hasPermission: false,
                message: axiosError.response?.data?.message || 'Permission check failed',
            };
        }
    }

    /**
     * Get all available roles
     */
    async getRoles(): Promise<ApiResponse<RbacRole[]>> {
        try {
            const response = await this.client.get<ApiResponse<RbacRole[]>>('/api/Roles');
            return response.data;
        } catch (error) {
            const axiosError = error as AxiosError<ApiResponse<null>>;
            return {
                success: false,
                message: axiosError.response?.data?.message || 'Failed to get roles',
            };
        }
    }

    /**
     * Get all available permissions
     */
    async getPermissions(): Promise<ApiResponse<RbacPermission[]>> {
        try {
            const response = await this.client.get<ApiResponse<RbacPermission[]>>('/api/Permissions');
            return response.data;
        } catch (error) {
            const axiosError = error as AxiosError<ApiResponse<null>>;
            return {
                success: false,
                message: axiosError.response?.data?.message || 'Failed to get permissions',
            };
        }
    }

    /**
     * Assign role to user
     */
    async assignRoleToUser(userId: number, roleId: number): Promise<ApiResponse<null>> {
        try {
            const response = await this.client.post<ApiResponse<null>>(`/api/Users/${userId}/roles`, {
                roleId,
            });
            return response.data;
        } catch (error) {
            const axiosError = error as AxiosError<ApiResponse<null>>;
            return {
                success: false,
                message: axiosError.response?.data?.message || 'Failed to assign role',
            };
        }
    }

    /**
     * Remove role from user
     */
    async removeRoleFromUser(userId: number, roleId: number): Promise<ApiResponse<null>> {
        try {
            const response = await this.client.delete<ApiResponse<null>>(`/api/Users/${userId}/roles/${roleId}`);
            return response.data;
        } catch (error) {
            const axiosError = error as AxiosError<ApiResponse<null>>;
            return {
                success: false,
                message: axiosError.response?.data?.message || 'Failed to remove role',
            };
        }
    }

    /**
     * Check if user has a specific role
     */
    async hasRole(userId: number, roleName: string): Promise<boolean> {
        try {
            const response = await this.getUserPermissions(userId);
            if (response.success && response.data) {
                return response.data.roles.includes(roleName);
            }
            return false;
        } catch (error) {
            console.error('[RBAC Client] Role check failed:', error);
            return false;
        }
    }

    /**
     * Check if RBAC client is properly configured
     */
    isReady(): boolean {
        return this.isConfigured;
    }
}

// Export singleton instance
export const rbacClient = new RbacClient();

// Export class for testing purposes
export { RbacClient };
