import { Request, Response } from "express";
import prisma from "../../config/db";
import { AuthRequest } from "../../middleware/authMiddleware";
import { z } from "zod";

// GET: Retrieve all products for a store
export const getProducts = async (req: Request, res: Response) => {
  const {
    page = 1,
    limit = 10,
    minPrice,
    maxPrice,
    name,
    categoryId,
    storeId,
  } = req.query;

  try {
    const skip = (Number(page) - 1) * Number(limit);

    const products = await prisma.product.findMany({
      where: {
        basePrice: {
          gte: minPrice ? Number(minPrice) : undefined,
          lte: maxPrice ? Number(maxPrice) : undefined,
        },
        name: name
          ? { contains: String(name), mode: "insensitive" }
          : undefined,
        categoryId: categoryId ? Number(categoryId) : undefined,
        storeId: storeId ? Number(storeId) : undefined,
      },
      take: Number(limit),
      skip,
      include: {
        // variants: true, // Include product variants
        // media: true, // Include associated media
        category: true, // Include the category information (if needed)
      },
    });

    const total = await prisma.product.count({
      where: {
        basePrice: {
          gte: minPrice ? Number(minPrice) : undefined,
          lte: maxPrice ? Number(maxPrice) : undefined,
        },
        name: name
          ? { contains: String(name), mode: "insensitive" }
          : undefined,
        categoryId: categoryId ? Number(categoryId) : undefined,
        storeId: storeId ? Number(storeId) : undefined,
      },
    });

    res.json({ total, page, limit, products });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch products" });
  }
};

// GET: Retrieve a single product by ID
export const getProductById = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    // TODO: validate user store
    const product = await prisma.product.findFirst({
      where: { id: parseInt(req.params.id) },
      include: {
        media: true,
        variants: true,
        attributes: true,
      },
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

// PUT: Update a product
export const updateProduct = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const productId = parseInt(req.params.id);

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Check if product exists and belongs to user's store
    const existingProduct = await prisma.product.findFirst({
      where: {
        id: productId,
        store: {
          userId,
        },
      },
    });

    if (!existingProduct) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    const { name, description, basePrice, stock, categoryId } = req.body;

    // Update the product
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(basePrice && { basePrice: Number(basePrice) }),
        ...(stock !== undefined && { stock: Number(stock) }),
        ...(categoryId && { categoryId: Number(categoryId) }),
      },
      include: {
        media: true,
        variants: true,
        attributes: true,
        category: true,
      },
    });

    res.json(updatedProduct);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Failed to update product" });
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
