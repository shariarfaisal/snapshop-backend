import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "secret";

// Extend the Express Request interface
export interface ClientAuthRequest extends Request {
  user?: { userId: number; storeId: number };
  subdomain?: string;
}

export const extractSubdomain = (
  req: ClientAuthRequest,
  res: Response,
  next: NextFunction
) => {
  const origin = req.headers.origin;
  console.log(origin, req.get("origin"));
  if (origin) {
    const url = new URL(origin);
    const host = url.hostname;
    const subdomainParts = host.split(".");

    const subdomain = subdomainParts.length > 1 ? subdomainParts[0] : null;

    if (subdomain) {
      req.subdomain = subdomain; // Set the subdomain in the request object
      next(); // Continue to the next middleware
      return;
    }
  }

  res.status(400).json({ error: "Invalid request" }); // If no origin, return error
};

export const protectClientRoute = (
  req: ClientAuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    res.status(401).json({ message: "Unauthorized, no token provided" });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: number;
      storeId: number;
    };
    req.user = { userId: decoded.userId, storeId: decoded.storeId }; // Add custom user object
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};
