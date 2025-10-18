import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ACCESS_TOKEN_EXPIRY } from "./auth.constant";

export function login(req: Request, res: Response) {
    const { userId, password } = req.body;
    if (userId === 'admin' && password === 'password') {
        const secretKey = process.env.JWT_SECRET as string;
        const user = { id: 123, email: "test@gmail.com", name: "Rahul Sahu" }
        const accessToken = jwt.sign(user, secretKey, { expiresIn: ACCESS_TOKEN_EXPIRY });
        return res.status(200).json({ success: true, message: 'Login successful', user, token: accessToken });
    } else {
        return res.status(401).json({ success: false, message: 'Invalid credentials' })
    }
}