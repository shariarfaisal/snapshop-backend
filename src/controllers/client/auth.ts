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

export const getCustomerProfile = async (req: ClientAuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const storeId = req.user?.storeId;

    if (!userId || !storeId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const customer = await prisma.customer.findFirst({
      where: { id: userId, storeId },
    });

    if (!customer) {
      res.status(404).json({ message: "Customer not found" });
      return;
    }

    res.status(200).json(customer);
  } catch (err: any) {
    res.status(500).json({ 
      message: "Failed to get customer profile", 
      error: err.message 
    });
  }
};

export const updateCustomerProfile = async (req: ClientAuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const storeId = req.user?.storeId;

    if (!userId || !storeId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { name, email, phone } = req.body;

    // Check if email is already taken by another customer in the same store
    if (email) {
      const existingCustomer = await prisma.customer.findFirst({
        where: {
          email,
          storeId,
          id: {
            not: userId
          }
        }
      });

      if (existingCustomer) {
        res.status(400).json({ message: "Email is already taken" });
        return;
      }
    }

    const updatedCustomer = await prisma.customer.update({
      where: { 
        id: userId,
      },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(phone && { phone })
      },
    });

    res.status(200).json(updatedCustomer);
  } catch (err: any) {
    res.status(500).json({ 
      message: "Failed to update customer profile", 
      error: err.message 
    });
  }
};
