import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

interface JwtPayload {
  id: string;
  email: string;
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


export default async function verifyAuthToken(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Unauthorized Request' });
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.JWT_SECRET as string, async (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const payload = decoded as JwtPayload;
        const userId = parseInt(payload.id);

        try {
            // RBAC handled externally, set dummy roles and permissions
            payload.roles = ['Administrator']; // Dummy admin role
            payload.permissions = ['*']; // Dummy all permissions

            req.user = payload;
            next();
        } catch (error) {
            console.error('Error setting user payload:', error);
            // Continue with basic payload if error occurs
            req.user = payload;
            next();
        }
    });
}