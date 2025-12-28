// Vercel serverless function wrapper
import express from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "../server/routes.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Register API routes
let serverPromise = null;

export default async function handler(req, res) {
  if (!serverPromise) {
    serverPromise = registerRoutes(app);
  }
  
  await serverPromise;
  return app(req, res);
}
