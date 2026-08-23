const { getPool } = require('../lib/db');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  const pool = getPool();
  const id = Number((req.body || {}).id);
  if (!id) return res.status(400).json({ error: 'id مطلوب' });

  try {
    await pool.query(
      `UPDATE articles SET views = COALESCE(views, 0) + 1 WHERE id = $1`,
      [id]
    );
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
