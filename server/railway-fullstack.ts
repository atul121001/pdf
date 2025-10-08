import path from "path";
import { fileURLToPath } from 'url';
import express from "express";
import { createServer } from "./index";

const app = createServer();
const port = process.env.PORT || 3000;

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In Railway, the built files should be in dist/spa
const distPath = path.resolve(__dirname, "../spa");

// Log the paths for debugging
console.log("📁 Current directory:", __dirname);
console.log("📁 Looking for frontend files in:", distPath);

// Serve static files (CSS, JS, images, etc.)
app.use(express.static(distPath));

// API routes are already handled by createServer()

// Catch-all handler: send back React's index.html file for any non-API routes
// Use a middleware approach instead of Express 5's problematic wildcard
app.use((req, res, next) => {
  // Skip if it's an API route
  if (req.path.startsWith("/api/") || req.path.startsWith("/health")) {
    return next();
  }

  // Skip if it's a static file (has file extension)
  if (path.extname(req.path)) {
    return next();
  }

  // Serve index.html for all other routes (React Router)
  const indexPath = path.join(distPath, "index.html");
  console.log("📄 Serving index.html from:", indexPath);

  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error("❌ Error serving index.html:", err);
      res.status(500).send("Error loading application");
    }
  });
});

app.listen(port, () => {
  console.log(`🚀 Full-stack PDF app running on port ${port}`);
  console.log(`📱 Frontend: Available at root URL`);
  console.log(`🔧 API: Available at /api endpoints`);
  console.log(`📁 Serving static files from: ${distPath}`);
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