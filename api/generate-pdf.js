import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  let browser = null;

  try {
    const {
      html,
      css,
      title = "RUM Dashboard",
      format = "A4",
      orientation = "portrait",
      compress = true,
      quality = "high",
      cssOnly = false,
    } = req.body;

    if (!html) {
      return res.status(400).json({
        success: false,
        error: "HTML content is required",
      });
    }

    // Launch browser with Vercel-compatible configuration
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();

    // Prepare optimized CSS
    const optimizedCSS = css ? css
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\s+/g, " ")
      .replace(/;\s*}/g, "}")
      .replace(/{\s*/g, "{")
      .replace(/;\s*/g, ";")
      .trim() : '';

    if (cssOnly) {
      await browser.close();
      res.setHeader("Content-Type", "text/css");
      return res.send(optimizedCSS);
    }

    // Color override CSS for PDF
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

    // Complete HTML document
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${title}</title>
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
      timeout: 30000,
    });

    await page.emulateMediaType("screen");
    await new Promise((resolve) => setTimeout(resolve, 500));

    const settings = {
      high: { scale: 1.0, margin: "15px" },
      medium: { scale: 0.85, margin: "10px" },
      low: { scale: 0.7, margin: "8px" },
    };
    const qualitySetting = settings[quality] || settings.medium;

    const pdfBuffer = await page.pdf({
      format: format,
      landscape: orientation === "landscape",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      margin: {
        top: qualitySetting.margin,
        right: qualitySetting.margin,
        bottom: qualitySetting.margin,
        left: qualitySetting.margin,
      },
      tagged: true,
      omitBackground: false,
      scale: compress ? qualitySetting.scale : 1.0,
    });

    await browser.close();

    const filename = `${title.replace(/\s+/g, "_")}_${Date.now()}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.setHeader("Cache-Control", "no-cache");

    // Send as buffer to ensure proper binary encoding
    res.end(pdfBuffer);

  } catch (error) {
    if (browser) {
      await browser.close();
    }

    console.error("PDF generation error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}