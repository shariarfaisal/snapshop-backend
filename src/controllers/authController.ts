import { Request, Response } from "express";
import prisma from "../config/db";
import bcrypt from "bcryptjs";
import jwt, { Secret, SignOptions } from "jsonwebtoken";
import { AuthRequest } from "../middleware/authMiddleware";
import { Prisma } from "@prisma/client";

const JWT_SECRET: Secret = process.env.JWT_SECRET || "secret";

// POST: User Registration
export const registerUser = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: { 
        name, 
        email, 
        password: hashedPassword, 
        role: "StoreOwner" 
      },
    });

    res.status(201).json({ 
      message: "User created successfully", 
      userId: newUser.id 
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') {
        return res.status(409).json({ 
          message: "A user with this email already exists" 
        });
      }
    }
    return res.status(500).json({ 
      message: "Registration failed", 
      error: "An unexpected error occurred" 
    });
  }
};

// POST: User Login
export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const token = jwt.sign(
      { userId: user.id },
      JWT_SECRET,
      { expiresIn: 86400 } // 24 hours in seconds
    );

    res.json({ message: "Login successful", token });
    return;
  } catch (err: any) {
    res.status(500).json({ message: "Login failed", error: err.message });
    return;
  }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.status(200).json(user);
  } catch (err: any) {
    res
      .status(500)
      .json({ message: "Failed to get user profile", error: err.message });
  }
};
