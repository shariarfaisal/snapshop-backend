import { Router } from "express";
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/productController";
import { protectRoute } from "../middleware/authMiddleware";

const router = Router();

router.get("/", protectRoute, getProducts);
router.get("/:id", protectRoute, getProductById);
router.post("/", protectRoute, createProduct);
router.put("/:id", protectRoute, updateProduct);
router.delete("/:id", protectRoute, deleteProduct);

export default router;
