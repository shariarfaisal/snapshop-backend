import express, { Router } from "express";
import { getAnalytics } from "../controllers/analytics";

const router: Router = express.Router();

router.get("/", getAnalytics as express.RequestHandler);

export default router; 