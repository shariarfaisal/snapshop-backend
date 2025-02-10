import { Request, Response } from "express";
import prisma from "../config/db";
import { AuthRequest } from "../middleware/authMiddleware";

// GET: Retrieve all categories for a store
export const getCategories = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.userId;
    const categories = await prisma.category.findMany({
      where: { storeId },
      include: { products: true },
    });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch categories" });
  }
};

// POST: Create a new category
export const createCategory = async (req: AuthRequest, res: Response) => {
  const { name, description } = req.body;

  try {
    const newCategory = await prisma.category.create({
      data: {
        name,
        description,
        storeId: req.user?.userId || 0,
      },
    });
    res.status(201).json(newCategory);
  } catch (err: any) {
    res
      .status(400)
      .json({ message: "Failed to create category", error: err.message });
  }
};

// PUT: Update a category
export const updateCategory = async (req: AuthRequest, res: Response) => {
  const { name, description } = req.body;

  try {
    const updatedCategory = await prisma.category.update({
      where: { id: parseInt(req.params.id) },
      data: { name, description },
    });
    res.json(updatedCategory);
  } catch (err: any) {
    res
      .status(400)
      .json({ message: "Failed to update category", error: err.message });
  }
};

// DELETE: Delete a category
export const deleteCategory = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.category.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.json({ message: "Category deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete category" });
  }
};
