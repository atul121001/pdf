import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";
import * as express from "express";
import express__default from "express";
import cors from "cors";
import puppeteer from "puppeteer";
import crypto from "crypto";
import { LRUCache } from "lru-cache";
const handleDemo = (req, res) => {
  const response = {
    message: "Hello from Express server"
  };
  res.status(200).json(response);
};
const buffer = [];
const postRum = (req, res) => {
  const evt = req.body;
  if (!evt || typeof evt.name !== "string" || typeof evt.value !== "number") {
    res.status(400).json({ ok: false });
    return;
  }
  buffer.push(evt);
  if (buffer.length > 5e3) buffer.splice(0, buffer.length - 5e3);
  res.json({ ok: true });
};
const getRum = (_req, res) => {
  res.json({ events: buffer });
};
const getRumSummary = (_req, res) => {
  const map = /* @__PURE__ */ new Map();
  for (const e of buffer) {
    const m = map.get(e.name) ?? { count: 0, sum: 0, min: Number.POSITIVE_INFINITY, max: 0 };
    m.count++;
    m.sum += e.value;
    m.min = Math.min(m.min, e.value);
    m.max = Math.max(m.max, e.value);
    map.set(e.name, m);
  }
  const summary = Array.from(map.entries()).map(([name, s]) => ({
    name,
    count: s.count,
    avg: s.sum / s.count,
    min: s.min,
    max: s.max
  }));
  res.json({ summary });
};
class BrowserPool {
  static instance;
  browser = null;
  isInitializing = false;
  initPromise = null;
  constructor() {
  }
  static getInstance() {
    if (!BrowserPool.instance) {
      BrowserPool.instance = new BrowserPool();
    }
    return BrowserPool.instance;
  }
  async initialize() {
    if (this.browser || this.isInitializing) {
      return this.initPromise || Promise.resolve();
    }
    this.isInitializing = true;
    this.initPromise = this._initialize();
    return this.initPromise;
  }
  async _initialize() {
    try {
      console.log("Initializing browser pool...");
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu",
          "--disable-background-timer-throttling",
          "--disable-backgrounding-occluded-windows",
          "--disable-renderer-backgrounding",
          "--disable-features=TranslateUI",
          "--disable-ipc-flooding-protection",
          "--disable-extensions",
          "--disable-default-apps",
          "--disable-background-networking",
          "--disable-sync",
          "--metrics-recording-only",
          "--no-default-browser-check",
          "--mute-audio",
          "--disable-web-security"
        ]
      });
      await setTimeout(() => {
      }, 1e3);
      console.log("Browser pool initialized");
    } catch (error) {
      console.error("Failed to initialize browser pool:", error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }
  async getPage() {
    await this.initialize();
    if (!this.browser) {
      throw new Error("Browser not initialized");
    }
    const page = await this.browser.newPage();
    await page.setViewport({ width: 1e3, height: 700 });
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const resourceType = req.resourceType();
      if (["image", "media", "font", "other", "websocket"].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });
    await page.setJavaScriptEnabled(true);
    return page;
  }
  async releasePage(page) {
    try {
      await new Promise((resolve) => setTimeout(resolve, 5e3));
    } catch (error) {
      console.error("Error closing page:", error);
    }
  }
  async shutdown() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.isInitializing = false;
      this.initPromise = null;
    }
  }
}
const browserPool = BrowserPool.getInstance();
process.on("SIGINT", async () => {
  console.log("Shutting down browser pool...");
  await browserPool.shutdown();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  console.log("Shutting down browser pool...");
  await browserPool.shutdown();
  process.exit(0);
});
class PDFCache {
  static instance;
  cache;
  constructor() {
    this.cache = new LRUCache({
      max: 20,
      // Maximum 20 PDFs in cache
      ttl: 1e3 * 3,
      // 3 seconds TTL
      maxSize: 50 * 1024 * 1024,
      // 50MB max cache size
      sizeCalculation: (value) => value.buffer.length,
      dispose: (value) => {
        console.log(`Evicting cached PDF: ${value.filename}`);
      }
    });
  }
  static getInstance() {
    if (!PDFCache.instance) {
      PDFCache.instance = new PDFCache();
    }
    return PDFCache.instance;
  }
  generateKey(html, css, options) {
    const content = JSON.stringify({ html, css, options });
    return crypto.createHash("sha256").update(content).digest("hex").substring(0, 16);
  }
  get(key) {
    const cached = this.cache.get(key);
    if (cached) {
      console.log(`Cache hit for key: ${key}`);
      return cached;
    }
    console.log(`Cache miss for key: ${key}`);
    return void 0;
  }
  set(key, pdf) {
    this.cache.set(key, pdf);
    console.log(
      `Cached PDF with key: ${key}, size: ${pdf.buffer.length} bytes`
    );
  }
  clear() {
    this.cache.clear();
    console.log("PDF cache cleared");
  }
  getStats() {
    return {
      size: this.cache.calculatedSize || 0,
      maxSize: this.cache.maxSize || 0,
      itemCount: this.cache.size
    };
  }
}
const pdfCache = PDFCache.getInstance();
const generatePDF = async (req, res) => {
  const startTime = Date.now();
  let page;
  try {
    const {
      html,
      css,
      title = "RUM Dashboard",
      format = "A4",
      orientation = "portrait",
      compress = true,
      quality = "high",
      cssOnly = false
    } = req.body;
    if (!html) {
      const errorResponse = {
        success: false,
        error: "HTML content is required"
      };
      return res.status(400).json(errorResponse);
    }
    const cacheKey = pdfCache.generateKey(html, css, {
      format,
      orientation,
      compress,
      quality
    });
    const cached = pdfCache.get(cacheKey);
    if (cached) {
      console.log(`Serving cached PDF in ${Date.now() - startTime}ms`);
      res.setHeader("Content-Type", cached.contentType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${cached.filename}"`
      );
      res.setHeader("Content-Length", cached.buffer.length);
      return res.send(cached.buffer);
    }
    console.log("Cache miss, generating new PDF...");
    console.log("Getting page from browser pool...");
    page = await browserPool.getPage();
    console.log(`Page acquired in ${Date.now() - startTime}ms`);
    try {
      const optimizedCSS = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").replace(/;\s*}/g, "}").replace(/{\s*/g, "{").replace(/;\s*/g, ";").trim();
      if (cssOnly) {
        console.log("CSS-only mode enabled, sending optimized CSS...");
        res.setHeader("Content-Type", "text/css");
        res.setHeader(
          "Content-Length",
          Buffer.byteLength(optimizedCSS, "utf-8")
        );
        return res.send(optimizedCSS);
      }
      const colorOverrideCss = `
        * {
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
          background-color: inherit !important;
        }
          .grid {
          display: block !important;
          grid-template-columns: unset !important;
          gap: unset !important;
        }
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            box-shadow: none !important;
          }
          @page { margin: 0.3in; size: ${format}; }
        }
        .print\\:hidden { display: none !important; }
        img, svg { max-width: 100%; height: auto; }
        table { font-size: 11px; }
        .recharts-wrapper { transform: scale(1); }
      `;
      const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${title}</title>
<meta name="author" content="Your Author Name">
<meta name="description" content="Description of the document for accessibility">
<meta name="keywords" content="PDF, Accessibility, UA-PDF, Puppeteer">
<meta name="generator" content="Puppeteer PDF Generator">
<style>
${optimizedCSS}
${colorOverrideCss}
body {
  margin: 0;
  padding: 15px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 12px;
  line-height: 1.4;
}
  .grid {
  display: block !important;
}
  .text-muted-foreground{
  color: red !important;
  }
</style>
</head>
<body>${html}</body>
</html>`;
      await page.setContent(fullHtml, {
        waitUntil: "networkidle0",
        // Better for complex pages
        timeout: 3e4
      });
      console.log(`Content set in ${Date.now() - startTime}ms`);
      await page.emulateMediaType("screen");
      await new Promise((resolve) => setTimeout(resolve, 500));
      console.log("Starting PDF generation...");
      const settings = {
        high: { scale: 1, margin: "15px" },
        medium: { scale: 0.85, margin: "10px" },
        low: { scale: 0.7, margin: "8px" }
      };
      const qualitySetting = settings[quality] || settings.medium;
      const pdfBuffer = await page.pdf({
        format,
        landscape: orientation === "landscape",
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: false,
        margin: {
          top: qualitySetting.margin,
          right: qualitySetting.margin,
          bottom: qualitySetting.margin,
          left: qualitySetting.margin
        },
        tagged: true,
        omitBackground: false,
        scale: compress ? qualitySetting.scale : 1
      });
      await browserPool.releasePage(page);
      console.log(`PDF generated successfully in ${Date.now() - startTime}ms`);
      const contentType = "application/pdf";
      const filename = `${title.replace(/\s+/g, "_")}_${Date.now()}.pdf`;
      res.setHeader("Content-Type", contentType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader("Content-Length", pdfBuffer.length);
      pdfCache.set(cacheKey, {
        buffer: pdfBuffer,
        contentType,
        filename,
        timestamp: Date.now()
      });
      res.send(pdfBuffer);
    } catch (pageError) {
      if (page) {
        await browserPool.releasePage(page);
      }
      throw pageError;
    }
  } catch (error) {
    console.error("PDF generation error:", error);
    console.log(`PDF generation failed in ${Date.now() - startTime}ms`);
    if (page) {
      try {
        await browserPool.releasePage(page);
      } catch (cleanupError) {
        console.error("Error during page cleanup:", cleanupError);
      }
    }
    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred during PDF generation"
    };
    res.status(500).json(errorResponse);
  }
};
const pdfHealthCheck = async (req, res) => {
  try {
    await browserPool.initialize();
    res.json({
      success: true,
      message: "PDF service is healthy and optimized",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: "PDF service unavailable",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};
function createServer() {
  const app2 = express__default();
  app2.use(cors({
    origin: true,
    // Allow all origins
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
  }));
  app2.use(express__default.json({ limit: "100mb" }));
  app2.use(express__default.urlencoded({ extended: true, limit: "100mb" }));
  app2.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });
  app2.get("/api/demo", handleDemo);
  app2.post("/api/rum", postRum);
  app2.get("/api/rum", getRum);
  app2.get("/api/rum/summary", getRumSummary);
  app2.post("/api/generate-pdf", generatePDF);
  app2.get("/api/pdf-health", pdfHealthCheck);
  return app2;
}
const app = createServer();
const port = process.env.PORT || 3e3;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, "../spa");
app.use(express.static(distPath));
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/") || req.path.startsWith("/health")) {
    return res.status(404).json({ error: "API endpoint not found" });
  }
  res.sendFile(path.join(distPath, "index.html"));
});
app.listen(port, () => {
  console.log(`🚀 Fusion Starter server running on port ${port}`);
  console.log(`📱 Frontend: http://localhost:${port}`);
  console.log(`🔧 API: http://localhost:${port}/api`);
});
process.on("SIGTERM", () => {
  console.log("🛑 Received SIGTERM, shutting down gracefully");
  process.exit(0);
});
process.on("SIGINT", () => {
  console.log("🛑 Received SIGINT, shutting down gracefully");
  process.exit(0);
});
//# sourceMappingURL=node-build.mjs.map
