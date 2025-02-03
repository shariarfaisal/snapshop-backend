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
import mediaRoutes from "./routes/mediaRoutes";
import clientRoutes from "./routes/clientRoutes";
import bodyParser from "body-parser";
import { extractSubdomain } from "./middleware/clientMiddleware";
import { getAnalytics } from "./controllers/analytics";

const limiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 1000, // limit each IP to 100 requests per window
});

// Add product routes
dotenv.config();

const app: Application = express();

// Middleware

app.options("*", cors());
const options: cors.CorsOptions = {
  origin: "*",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.use(cors(options));
app.use(express.json());

app.use(bodyParser.urlencoded({ extended: true }));

app.use(helmet());
app.use(limiter);

app.use(morgan("combined"));

app.use("/uploads", express.static("src/uploads"));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/analytics", protectRoute, getAnalytics);
app.use("/api/stores", protectRoute, storeRoutes);
app.use("/api/products", protectRoute, productRoutes);
app.use("/api/orders", protectRoute, orderRoutes);
app.use("/api/media", protectRoute, mediaRoutes);
app.use("/api/client", extractSubdomain, clientRoutes);

app.use("/api/customers", protectRoute, customerRoutes);

app.use("/api/categories", protectRoute, categoryRoutes);

app.use(compression());

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong" });
});

export default app;
