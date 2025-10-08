import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { getRum, getRumSummary, postRum } from "./routes/rum";
import { generatePDF, pdfHealthCheck } from "./routes/pdf-generator";

export function createServer() {
  const app = express();

  // Middleware - Allow all origins for POC
  app.use(cors({
    origin: true, // Allow all origins
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }));
  app.use(express.json({ limit: '100mb' })); // Increase limit for large CSS content
  app.use(express.urlencoded({ extended: true, limit: '100mb' }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // RUM endpoints
  app.post("/api/rum", postRum);
  app.get("/api/rum", getRum);
  app.get("/api/rum/summary", getRumSummary);

  // PDF generation endpoints
  app.post("/api/generate-pdf", generatePDF);
  app.get("/api/pdf-health", pdfHealthCheck);

  return app;
}
