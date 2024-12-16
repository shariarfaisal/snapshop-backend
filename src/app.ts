import express, { Application, NextFunction, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import storeRoutes from "./routes/storeRoutes";
import authRoutes from "./routes/authRoutes";
import { protectRoute } from "./middleware/authMiddleware";
import productRoutes from "./routes/productRoutes";
import orderRoutes from "./routes/orderRoutes";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import compression from "compression";
import categoryRoutes from "./routes/categoryRoutes";
import customerRoutes from "./routes/customerRoutes";

const limiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 1000, // limit each IP to 100 requests per window
});

// Add product routes
dotenv.config();

const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());

app.use(helmet());
app.use(limiter);

app.use(morgan("combined"));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/stores", protectRoute, storeRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);

app.use("/api/customers", customerRoutes);

app.use("/api/categories", categoryRoutes);

app.use(compression());

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong" });
});

export default app;
