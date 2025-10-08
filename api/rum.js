// In-memory storage for RUM metrics (Note: this will reset on each serverless function cold start)
let buffer = [];

export default function handler(req, res) {
  if (req.method === 'POST') {
    // Handle RUM metric submission
    const evt = req.body;

    if (!evt || typeof evt.name !== "string" || typeof evt.value !== "number") {
      return res.status(400).json({ ok: false });
    }

    buffer.push(evt);
    // Cap at 5000 events
    if (buffer.length > 5000) {
      buffer.splice(0, buffer.length - 5000);
    }

    res.json({ ok: true });

  } else if (req.method === 'GET') {
    // Handle RUM data retrieval
    res.json({ events: buffer });

  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}