import { Request, Response } from "express";
import prisma from "../config/db";

// GET: Retrieve all stores
export const getStores = async (_req: Request, res: Response) => {
  try {
    const stores = await prisma.store.findMany();
    res.json(stores);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stores" });
  }
};

// POST: Create a new store
export const createStore = async (req: Request, res: Response) => {
  const { name, domain, currency, description } = req.body;
  try {
    const store = await prisma.store.create({
      data: { name, domain, currency, description },
    });
    res.status(201).json(store);
  } catch (err) {
    res.status(400).json({ error: "Failed to create store" });
  }
};
