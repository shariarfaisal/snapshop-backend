import express, { Router } from "express";
import { loginUser, registerUser } from "../controllers/authController";

const router: Router = express.Router();

router.post("/register", registerUser as express.RequestHandler);
router.post("/login", loginUser as express.RequestHandler);

export default router;
