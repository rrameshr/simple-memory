import "dotenv/config";
import mongoose from "mongoose";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { validateEnv } from "./config/env.js";
import { startTrashPurge } from "./services/memoryService.js";

const port = process.env.PORT || 5000;

try {
  validateEnv();
  await connectDB();
  const server = app.listen(port, "0.0.0.0", () => console.log(`API listening on port ${port}`));
  const purge = startTrashPurge();

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down...`);
    clearInterval(purge);
    server.close(async () => { await mongoose.disconnect(); process.exit(0); });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
} catch (error) {
  console.error("Could not start server:", error.message);
  process.exit(1);
}

