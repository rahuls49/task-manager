import jwt from "jsonwebtoken";
import { ACCESS_TOKEN_EXPIRY } from "./auth.constant";

export function login(userId: string, password: string) {
    const secretKey = process.env.JWT_SECRET as string;
    const user = { id: 123, email: "test@gmail.com", name: "Rahul Sahu" }
    const accessToken = jwt.sign(user, secretKey, { expiresIn: ACCESS_TOKEN_EXPIRY });
    return { user, accessToken };
}