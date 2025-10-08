import express from "express";
import cors from "cors";

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Debug logging middleware
app.use((req, res, next) => {
  console.log(`🔍 ${new Date().toISOString()} - ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Simple test routes without external dependencies
app.get("/", (_req, res) => {
  res.json({
    message: "PDF API Server is running!",
    endpoints: ["/api/ping", "/api/demo", "/health"],
    timestamp: new Date().toISOString()
  });
});

app.get("/api/ping", (_req, res) => {
  console.log("✅ /api/ping route hit");
  res.json({ message: "pong", timestamp: new Date().toISOString() });
});

app.get("/api/demo", (_req, res) => {
  console.log("✅ /api/demo route hit");
  res.json({ message: "Hello from Express server" });
});

app.get("/health", (_req, res) => {
  console.log("✅ /health route hit");
  res.json({ status: "ok", service: "PDF API" });
});

// Simple PDF endpoint (without actual PDF generation for now)
app.post("/api/generate-pdf", (_req, res) => {
  res.json({
    message: "PDF generation endpoint",
    note: "Puppeteer implementation would go here"
  });
});

app.listen(port, () => {
  console.log(`🚀 Test PDF API server running on port ${port}`);
  console.log(`📱 Root: Available at /`);
  console.log(`🔧 API: Available at /api endpoints`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("🛑 Received SIGTERM, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("🛑 Received SIGINT, shutting down gracefully");
  process.exit(0);
});