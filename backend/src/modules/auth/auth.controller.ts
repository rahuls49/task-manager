import { Request, Response } from "express";
import * as authService from './auth.service'

export async function signup(req: Request, res: Response) {
  try {
    const { name, email, phone, password } = req.body;

    // Basic validation
    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, phone, and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    const { user, token } = await authService.signup(name, email, phone, password);

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      user,
      token
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Signup failed'
    });
  }
}

export async function login(req: Request, res: Response) {
  try {
    // Accept both 'emailOrPhone' (legacy) and 'identifier' (new) 
    const identifier = req.body.emailOrPhone || req.body.identifier;
    const { password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email/Phone/Username and password are required'
      });
    }

    const { user, token } = await authService.login(identifier, password);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      user,
      token
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(401).json({
      success: false,
      message: error.message || 'Login failed'
    });
  }
}