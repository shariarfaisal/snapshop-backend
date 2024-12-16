import { Router } from "express";
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "../controllers/customerController";
import { protectRoute } from "../middleware/authMiddleware";

const router = Router();

router.get("/", protectRoute, getCustomers);
router.get("/:id", protectRoute, getCustomerById);
router.post("/", protectRoute, createCustomer);
router.put("/:id", protectRoute, updateCustomer);
router.delete("/:id", protectRoute, deleteCustomer);

export default router;
