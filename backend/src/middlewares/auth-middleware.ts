import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { rbacClient } from "../lib/rbac-client";

interface JwtPayload {
    id: string | number | null;
    email: string | null;
    name?: string;
    role?: string;
    roles?: string[];
    permissions?: string[];
    iat?: number;
    exp?: number;
}

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

/**
 * Middleware to verify authentication token and load user permissions from RBAC service
 */
export default async function verifyAuthToken(req: Request, res: Response, next: NextFunction) {
    const debugMarker = req.headers['x-debug-request'] || '';
    console.log(`[Auth] Processing: ${req.method} ${req.path} ${debugMarker ? `[${debugMarker}]` : ''}`);
    console.log(`[Auth] Headers: authorization=${!!req.headers.authorization}, x-api-key=${!!req.headers['x-api-key']}`);

    // Check for API key authentication (for service-to-service calls)
    const apiKey = req.headers['x-api-key'];
    if (apiKey && (apiKey === process.env.INTERNAL_API_KEY || apiKey === 'secret-key')) {
        console.log('[Auth] API key auth - service account');
        req.user = {
            id: null,
            email: null,
            role: undefined,
            roles: [],
            permissions: ['*'],
        };
        return next();
    }

    // Check for Bearer token authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('[Auth] No Bearer token, returning 401');
        return res.status(401).json({ success: false, error: 'Unauthorized Request' });
    }

    const token = authHeader.split(' ')[1];
    const secretKey = process.env.JWT_SECRET;

    console.log('[Auth] Token length:', token?.length, 'JWT_SECRET:', !!secretKey);

    if (!secretKey) {
        console.error('[Auth] JWT_SECRET not configured');
        return res.status(500).json({ success: false, error: 'Server configuration error' });
    }

    try {
        const decoded = jwt.verify(token, secretKey) as JwtPayload;

        console.log('[Auth] JWT verified - id:', decoded.id, 'roles:', decoded.roles);

        if (!decoded.id) {
            console.log('[Auth] No ID in token payload');
            return res.status(403).json({ success: false, error: 'Invalid token payload' });
        }

        const userId = typeof decoded.id === 'string' ? parseInt(decoded.id, 10) : decoded.id;

        // Try to fetch fresh permissions from RBAC service
        if (rbacClient.isReady()) {
            try {
                const permResponse = await rbacClient.getUserPermissions(userId);
                if (permResponse.success && permResponse.data) {
                    decoded.roles = permResponse.data.roles;
                    decoded.permissions = permResponse.data.permissions;
                    console.log('[Auth] Loaded from RBAC:', decoded.roles);
                }
            } catch (rbacError) {
                console.error('[Auth] RBAC error:', rbacError);
            }
        }

        console.log('[Auth] Setting req.user with id:', decoded.id);
        req.user = decoded;
        next();
    } catch (err) {
        console.error('[Auth] JWT verify failed:', err);
        return res.status(403).json({
            success: false,
            error: 'Forbidden',
            message: err instanceof Error ? err.message : 'Token verification failed'
        });
    }
}

/**
 * Optional middleware that doesn't require authentication but will load user info if token is present
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
    }

    const token = authHeader.split(' ')[1];
    const secretKey = process.env.JWT_SECRET;

    if (!secretKey) {
        return next();
    }

    try {
        const decoded = jwt.verify(token, secretKey) as JwtPayload;

        if (decoded.id && rbacClient.isReady()) {
            const userId = typeof decoded.id === 'string' ? parseInt(decoded.id, 10) : decoded.id;
            try {
                const permResponse = await rbacClient.getUserPermissions(userId);
                if (permResponse.success && permResponse.data) {
                    decoded.roles = permResponse.data.roles;
                    decoded.permissions = permResponse.data.permissions;
                }
            } catch {
                // Ignore RBAC errors for optional auth
            }
        }

        req.user = decoded;
    } catch (error) {
        console.debug('[Auth] Optional auth failed:', error);
    }

    next();
}