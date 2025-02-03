import { Router } from "express";
import {
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  createProduct,
} from "../controllers/product";

const router = Router();

router.get("/", getProducts);
router.get("/:id", getProductById);
router.post("/", createProduct);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);

export default router;
