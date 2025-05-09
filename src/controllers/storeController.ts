import { Request, Response } from "express";
import prisma from "../config/db";
import { AuthRequest } from "../middleware/authMiddleware";

// GET: Retrieve all stores
export const getStores = async (_req: AuthRequest, res: Response) => {
  try {
    const userId = _req.user?.userId;

    const stores = await prisma.store.findMany({
      where: {
        userId,
      },
    });
    res.json(stores);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stores" });
  }
};

export const getStore = async (req: Request, res: Response) => {
  try {
    const store = await prisma.store.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    res.json(store);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to fetch store" });
  }
};

// POST: Create a new store
export const createStore = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { name, domain, currency, description } = req.body;

  // check domain uniqueness
  const existingStore = await prisma.store.findFirst({
    where: { domain: domain },
  });
  if (existingStore) {
    res.status(400).json({ error: "Store domain already exists" });
    return;
  }

  try {
    const store = await prisma.store.create({
      data: { name, domain, currency, description, userId },
    });
    res.status(201).json(store);
  } catch (err) {
    res.status(400).json({ error: "Failed to create store" });
  }
};

export const domainExists = async (req: Request, res: Response) => {
  const { domain } = req.params;
  try {
    const store = await prisma.store.findFirst({ where: { domain } });
    res.json({ exists: !!store });
    return;
  } catch (err) {
    res.status(500).json({ error: "Failed to check domain" });
    return;
  }
};

export const deleteStore = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const storeId = parseInt(req.params.id);

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Check if store exists and belongs to user
    const store = await prisma.store.findFirst({
      where: { 
        id: storeId,
        userId 
      },
    });

    if (!store) {
      res.status(404).json({ error: "Store not found" });
      return;
    }

    // Delete all associated data in a transaction
    await prisma.$transaction(async (prisma) => {
      // Delete all products and their variants
      await prisma.variant.deleteMany({
        where: { product: { storeId } },
      });
      
      await prisma.media.deleteMany({
        where: { product: { storeId } },
      });

      await prisma.attribute.deleteMany({
        where: { product: { storeId } },
      });

      await prisma.product.deleteMany({
        where: { storeId },
      });

      // Delete all orders and order items
      await prisma.orderItem.deleteMany({
        where: { order: { storeId } },
      });

      await prisma.order.deleteMany({
        where: { storeId },
      });

      // Delete all customers
      await prisma.customer.deleteMany({
        where: { storeId },
      });

      // Finally delete the store
      await prisma.store.delete({
        where: { id: storeId },
      });
    });

    res.json({ message: "Store and all associated data deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete store" });
  }
};
