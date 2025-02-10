import express, { Router } from "express";
import { getProfile, updateProfile } from "../controllers/authController";

const router: Router = express.Router();

router.get("/", getProfile as express.RequestHandler);
router.put("/", updateProfile as express.RequestHandler);

export default router; 