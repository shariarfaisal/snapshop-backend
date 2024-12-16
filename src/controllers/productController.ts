import { Request, Response } from "express";
import prisma from "../config/db";
import { AuthRequest } from "../middleware/authMiddleware";

// GET: Retrieve all products for a store
export const getProducts = async (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 10, minPrice, maxPrice, name } = req.query;

  try {
    const skip = (Number(page) - 1) * Number(limit);

    const products = await prisma.product.findMany({
      where: {
        price: {
          gte: minPrice ? Number(minPrice) : undefined,
          lte: maxPrice ? Number(maxPrice) : undefined,
        },
        name: name
          ? { contains: String(name), mode: "insensitive" }
          : undefined,
      },
      take: Number(limit),
      skip,
    });

    const total = await prisma.product.count();
    res.json({ total, page, limit, products });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch products" });
  }
};

// GET: Retrieve a single product by ID
export const getProductById = async (req: AuthRequest, res: Response) => {
  try {
    const product = await prisma.product.findFirst({
      where: { id: parseInt(req.params.id), storeId: req.user?.userId },
    });

    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    res.json(product);
    return;
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch product" });
    return;
  }
};

// POST: Create a new product
export const createProduct = async (req: AuthRequest, res: Response) => {
  const { name, description, price, stock } = req.body;

  try {
    const newProduct = await prisma.product.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        stock: parseInt(stock),
        storeId: req.user?.userId || 0,
      },
    });
    res.status(201).json(newProduct);
  } catch (err) {
    res.status(400).json({ error: "Failed to create product" });
  }
};

// PUT: Update a product
export const updateProduct = async (req: AuthRequest, res: Response) => {
  const { name, description, price, stock } = req.body;

  try {
    const updatedProduct = await prisma.product.updateMany({
      where: { id: parseInt(req.params.id), storeId: req.user?.userId },
      data: {
        name,
        description,
        price: parseFloat(price),
        stock: parseInt(stock),
      },
    });

    if (updatedProduct.count === 0) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    res.json({ message: "Product updated successfully" });
  } catch (err) {
    res.status(400).json({ error: "Failed to update product" });
  }
};

// DELETE: Delete a product
export const deleteProduct = async (req: AuthRequest, res: Response) => {
  try {
    const deletedProduct = await prisma.product.deleteMany({
      where: { id: parseInt(req.params.id), storeId: req.user?.userId },
    });

    if (deletedProduct.count === 0) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete product" });
  }
};
