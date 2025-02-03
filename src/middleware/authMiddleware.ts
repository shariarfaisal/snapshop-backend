import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "secret";

// Extend the Express Request interface
export interface AuthRequest extends Request {
  user?: { userId: number };
}

export const protectRoute = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    res.status(401).json({ message: "Unauthorized, no token provided" });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    req.user = { userId: decoded.userId }; // Add custom user object
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};
