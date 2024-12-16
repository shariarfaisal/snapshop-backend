import { Router } from "express";
import { getStores, createStore } from "../controllers/storeController";

const router = Router();

router.get("/", getStores);
router.post("/", createStore);

export default router;
