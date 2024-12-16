import { Router } from "express";
import {
  createOrder,
  getOrders,
  getOrdersByCustomer,
  updateOrderStatus,
} from "../controllers/orderController";
import { protectRoute } from "../middleware/authMiddleware";

const router = Router();

router.post("/", protectRoute, createOrder);
router.get("/", protectRoute, getOrders);
router.get("/customer/:customerId", protectRoute, getOrdersByCustomer);
router.put("/:id/status", protectRoute, updateOrderStatus);

export default router;
