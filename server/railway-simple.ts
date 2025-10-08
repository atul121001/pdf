import path from "path";
import { fileURLToPath } from 'url';
import express from "express";
import { createServer } from "./index";

const app = createServer();
const port = process.env.PORT || 3000;

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try multiple possible locations for the built frontend
const possiblePaths = [
  path.resolve(__dirname, "../spa"),           // Expected location
  path.resolve(__dirname, "../../dist/spa"),   // Alternative 1
  path.resolve(__dirname, "../dist/spa"),      // Alternative 2
  path.resolve(process.cwd(), "dist/spa"),     // From working directory
];

let frontendPath = null;

// Find which path actually exists
for (const testPath of possiblePaths) {
  try {
    const fs = await import('fs');
    if (fs.existsSync(testPath)) {
      frontendPath = testPath;
      console.log(`✅ Found frontend files at: ${frontendPath}`);
      break;
    }
  } catch (err) {
    // Continue searching
  }
}

if (!frontendPath) {
  console.log("❌ Frontend files not found at any expected location:");
  possiblePaths.forEach(p => console.log(`   - ${p}`));
  console.log("🔧 Serving API only");
} else {
  // Serve static files if we found them
  app.use(express.static(frontendPath));
  console.log(`📁 Serving static files from: ${frontendPath}`);

  // Fallback to index.html for React Router - avoid Express 5 wildcard issue
  app.use((req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api/') || req.path.startsWith('/health')) {
      return next();
    }

    // Skip if it's a static file request that was already handled
    if (req.path.includes('.')) {
      return next();
    }

    // Serve index.html for React Router routes
    const indexPath = path.join(frontendPath, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error('❌ Error serving index.html:', err);
        res.status(404).send('Frontend not available');
      }
    });
  });
}

// Add a basic route for debugging
app.get('/debug', (req, res) => {
  const fs = require('fs');
  const info = {
    __dirname,
    cwd: process.cwd(),
    frontendPath,
    possiblePaths,
    filesInCwd: fs.readdirSync(process.cwd()),
    filesInApp: fs.existsSync('/app') ? fs.readdirSync('/app') : 'N/A'
  };
  res.json(info);
});

app.listen(port, () => {
  console.log(`🚀 PDF app running on port ${port}`);
  if (frontendPath) {
    console.log(`📱 Frontend: Available at root URL`);
  }
  console.log(`🔧 API: Available at /api endpoints`);
  console.log(`🐛 Debug info: /debug`);
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