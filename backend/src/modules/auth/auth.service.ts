import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { ACCESS_TOKEN_EXPIRY } from "./auth.constant";
import prisma from "../../lib/connection";

export interface User {
  id: number;
  email: string;
  name: string;
  phone?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export async function signup(name: string, email: string, phone: string, password: string): Promise<AuthResponse> {
  // Check if user already exists
  const existingUser = await prisma.assignee.findFirst({
    where: {
      OR: [
        { Email: email },
        { Phone: phone }
      ]
    }
  });

  if (existingUser) {
    throw new Error("User with this email or phone already exists");
  }

  // Hash password
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Create user
  const user = await prisma.assignee.create({
    data: {
      Name: name,
      Email: email,
      Phone: phone,
      Password: hashedPassword
    }
  });

  // Generate JWT token
  const secretKey = process.env.JWT_SECRET as string;
  const accessToken = jwt.sign(
    { id: Number(user.Id), email: user.Email, name: user.Name },
    secretKey,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  return {
    user: {
      id: Number(user.Id),
      email: user.Email,
      name: user.Name,
      phone: user.Phone
    },
    accessToken
  };
}

export async function login(emailOrPhone: string, password: string): Promise<AuthResponse> {
  // Find user by email or phone
  const user = await prisma.assignee.findFirst({
    where: {
      OR: [
        { Email: emailOrPhone },
        { Phone: emailOrPhone }
      ]
    }
  });

  if (!user || !user.Password) {
    throw new Error("Invalid credentials");
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.Password);
  if (!isValidPassword) {
    throw new Error("Invalid credentials");
  }

  // Generate JWT token
  const secretKey = process.env.JWT_SECRET as string;
  const accessToken = jwt.sign(
    { id: Number(user.Id), email: user.Email, name: user.Name },
    secretKey,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  return {
    user: {
      id: Number(user.Id),
      email: user.Email,
      name: user.Name,
      phone: user.Phone
    },
    accessToken
  };
}