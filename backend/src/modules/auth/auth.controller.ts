import { Request, Response } from "express";
import * as authService from './auth.service'

export function login(req: Request, res: Response) {
    const { userId, password } = req.body;
    if (userId === 'admin' && password === 'password') {
        const { user, accessToken } = authService.login(userId, password);
        return res.status(200).json({ success: true, message: 'Login successful', user, token: accessToken });
    } else {
        return res.status(401).json({ success: false, message: 'Invalid credentials' })
    }
}