export default function handler(req, res) {
  if (req.method === 'GET') {
    res.status(200).json({
      message: 'pong',
      timestamp: new Date().toISOString(),
      method: req.method
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}