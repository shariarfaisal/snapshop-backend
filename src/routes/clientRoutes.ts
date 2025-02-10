import { Router } from "express";
import {
  getCartDetails,
  getProductById,
  getProducts,
  getStoreDetails,
  loginCustomer,
  registerCustomer,
} from "../controllers/client";
import { createOrder } from "../controllers/client/order";
import { protectClientRoute } from "../middleware/clientMiddleware";
const router = Router();

router.get("/products", getProducts);
router.get("/products/:id", getProductById);
router.post("/cart", getCartDetails);
router.post("/register", registerCustomer);
router.post("/login", loginCustomer);
router.get("/store", getStoreDetails);
router.post("/order", protectClientRoute, createOrder);

export default router;
