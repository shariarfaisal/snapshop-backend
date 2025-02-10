import { Router } from "express";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController";
import { protectRoute } from "../middleware/authMiddleware";

const router = Router();

router.get("/", protectRoute, getCategories);
router.post("/", protectRoute, createCategory);
router.put("/:id", protectRoute, updateCategory);
router.delete("/:id", protectRoute, deleteCategory);

export default router;
