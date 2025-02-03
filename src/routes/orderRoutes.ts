import { Router } from "express";
import {
  getOrderById,
  getOrders,
  getOrdersByCustomer,
  updateOrderStatus,
} from "../controllers/orderController";
import { protectRoute } from "../middleware/authMiddleware";

const router = Router();

router.get("/", protectRoute, getOrders);
router.get("/:id", protectRoute, getOrderById);
router.get("/customer/:customerId", protectRoute, getOrdersByCustomer);
router.put("/:id/status", protectRoute, updateOrderStatus);

export default router;
