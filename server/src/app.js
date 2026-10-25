import cors from "cors";
import express from "express";
import { createBlogRouter } from "./routes/blogRoutes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

export function createApp(Blog) {
  if (!Blog) {
    throw new TypeError("A Blog model must be supplied to createApp.");
  }

  const app = express();
  app.use(cors({ origin: "http://localhost:5173" }));
  app.use(express.json({ limit: "1mb", strict: false }));
  app.use("/api", createBlogRouter(Blog));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
