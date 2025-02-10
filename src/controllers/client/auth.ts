import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt, { Secret, SignOptions } from "jsonwebtoken";
import prisma from "../../config/db";
import { ClientAuthRequest } from "../../middleware/clientMiddleware";

const JWT_SECRET: Secret = process.env.JWT_SECRET || "secret";

// POST: User Registration
export const registerCustomer = async (
  req: ClientAuthRequest,
  res: Response
) => {
  const { name, email, phone, password } = req.body;
  const domain = req.subdomain;

  try {
    const store = await prisma.store.findFirst({ where: { domain } });
    if (!store) {
      res.status(400).json({ message: "Invalid request!" });
      return;
    }

    const existingUser = await prisma.customer.findUnique({
      where: { email, storeId: store.id },
    });
    if (existingUser) {
      res.status(400).json({ message: "User already exists" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.customer.create({
      data: { name, email, password: hashedPassword, phone, storeId: store.id },
    });

    const signOptions: SignOptions = { expiresIn: 86400 }; // 24 hours in seconds
    const token = jwt.sign(
      { userId: newUser.id, role: "Customer", storeId: store.id },
      JWT_SECRET,
      signOptions
    );

    res.status(201).json({
      message: "User created successfully",
      user: newUser,
      token,
    });
    return;
  } catch (err: any) {
    res
      .status(500)
      .json({ message: "Registration failed", error: err.message });
    return;
  }
};

// POST: User Login
export const loginCustomer = async (req: ClientAuthRequest, res: Response) => {
  const { email, password } = req.body;

  try {
    const domain = req.subdomain;
    const store = await prisma.store.findFirst({ where: { domain } });
    if (!store) {
      res.status(400).json({ message: "Invalid request!" });
      return;
    }

    const user = await prisma.customer.findUnique({
      where: { email, storeId: store.id },
    });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const signOptions: SignOptions = { expiresIn: 86400 }; // 24 hours in seconds
    const token = jwt.sign(
      { userId: user.id, role: "Customer", storeId: store.id },
      JWT_SECRET,
      signOptions
    );

    res.json({ message: "Login successful", token, user });
    return;
  } catch (err: any) {
    res.status(500).json({ message: "Login failed", error: err.message });
    return;
  }
};
