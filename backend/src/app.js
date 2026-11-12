import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { clientOrigins } from "./config/env.js";
import { originCheck } from "./middleware/originCheck.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import coupleRoutes from "./routes/couple.routes.js";
import memoryRoutes from "./routes/memory.routes.js";
import albumRoutes from "./routes/album.routes.js";
import eventRoutes from "./routes/event.routes.js";
import notificationRoutes from "./routes/notification.routes.js";

const app = express();
app.set("trust proxy", 1); // behind nginx / a load balancer: real client IPs for rate limiting
app.disable("x-powered-by");

app.use(helmet());
app.use(compression());
if (process.env.NODE_ENV !== "test") app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(cors({ origin: clientOrigins(), credentials: true }));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use(originCheck);

app.get("/api/health", (_req, res) => res.json({ success: true, message: "Couple Memories API is running ❤️" }));
app.get("/api/ready", (_req, res) => {
  const up = mongoose.connection.readyState === 1;
  res.status(up ? 200 : 503).json({ ready: up });
});

app.use("/api", rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: true, legacyHeaders: false, message: { message: "Too many requests. Slow down a little." } }));
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/couples", coupleRoutes);
app.use("/api/memories", memoryRoutes);
app.use("/api/albums", albumRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/notifications", notificationRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;

