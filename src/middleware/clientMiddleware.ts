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
  const xSubdomain = req.headers["x-subdomain"];
  
  // If we have a subdomain in the header, use it (useful for development)
  if (xSubdomain && typeof xSubdomain === "string") {
    req.subdomain = xSubdomain;
    next();
    return;
  }

  // If no origin, check query params (useful for development)
  if (!origin && req.query.subdomain && typeof req.query.subdomain === "string") {
    req.subdomain = req.query.subdomain;
    next();
    return;
  }

  // If we have an origin, try to extract subdomain
  if (origin) {
    const url = new URL(origin);
    const host = url.hostname;
    
    // Handle localhost development environment
    if (host === "localhost") {
      req.subdomain = "test-store"; // Default development subdomain
      next();
      return;
    }

    // Production subdomain handling
    const subdomainParts = host.split(".");
    const subdomain = subdomainParts.length > 1 ? subdomainParts[0] : null;

    if (subdomain) {
      req.subdomain = subdomain;
      next();
      return;
    }
  }

  res.status(400).json({ error: "Invalid request - Missing subdomain" });
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
