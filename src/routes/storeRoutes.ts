import { Router } from "express";
import {
  getStores,
  createStore,
  domainExists,
  getStore,
} from "../controllers/storeController";

const router = Router();

router.get("/", getStores);
router.get("/:id", getStore);
router.post("/", createStore);
router.get("/domain/:domain", domainExists);

export default router;
