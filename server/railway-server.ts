import { createServer } from "./index";

const app = createServer();
const port = process.env.PORT || 3000;

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "PDF API" });
});

app.listen(port, () => {
  console.log(`🚀 PDF API server running on port ${port}`);
  console.log(`🔧 API: http://localhost:${port}/api`);
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