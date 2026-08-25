const { getPool } = require('../lib/db');
const { isAuthed } = require('../lib/auth');

module.exports = async (req, res) => {
  const pool = getPool();
  try {
    if (req.method === 'POST') {
      const email = ((req.body || {}).email || '').trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'بريد إلكتروني غير صالح' });
      }
      await pool.query(
        `INSERT INTO subscribers (email) VALUES ($1) ON CONFLICT (email) DO NOTHING`,
        [email]
      );
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'GET') {
      if (!isAuthed(req)) return res.status(401).json({ error: 'غير مصرح' });
      const { rows } = await pool.query('SELECT * FROM subscribers ORDER BY id DESC');
      return res.status(200).json(rows);
    }

    res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
