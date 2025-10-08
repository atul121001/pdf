// Note: This is a simplified version since serverless functions don't share state
// In production, you'd want to use a database or external storage

export default function handler(req, res) {
  if (req.method === 'GET') {
    // For now, return empty summary since we can't access the buffer from the other function
    // In a real implementation, you'd read from a shared database
    const summary = [];

    res.json({
      summary,
      note: "This is a simplified version. In production, use shared storage like a database."
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}