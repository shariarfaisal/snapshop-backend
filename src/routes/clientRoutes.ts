import express, { RequestHandler } from "express";
import {
  getCartDetails,
  getProductById,
  getProducts,
  getStoreDetails,
  loginCustomer,
  registerCustomer,
  getCustomerProfile,
  updateCustomerProfile,
} from "../controllers/client";
import { createOrder } from "../controllers/client/order";
import { protectClientRoute } from "../middleware/clientMiddleware";
import { getOrders, getOrderById } from "../controllers/client/order";

const router = express.Router();

// Auth routes
router.post("/auth/register", registerCustomer as RequestHandler);
router.post("/auth/login", loginCustomer as RequestHandler);

// Profile routes
router.get("/me", protectClientRoute, getCustomerProfile as RequestHandler);
router.put("/me", protectClientRoute, updateCustomerProfile as RequestHandler);

// Product routes
router.get("/products", getProducts as RequestHandler);
router.get("/products/:id", getProductById as RequestHandler);
router.post("/cart", getCartDetails);
router.get("/store", getStoreDetails);

// Order routes
router.post("/orders", protectClientRoute, createOrder as RequestHandler);
router.get("/orders", protectClientRoute, getOrders as RequestHandler);
router.get("/orders/:id", protectClientRoute, getOrderById as RequestHandler);

export default router;
