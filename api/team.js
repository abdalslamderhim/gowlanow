const { getPool } = require('../lib/db');
const { isAuthed } = require('../lib/auth');

module.exports = async (req, res) => {
  const pool = getPool();
  const method = req.method;

  try {
    if (method === 'GET') {
      const { rows } = await pool.query('SELECT * FROM team ORDER BY order_index ASC, id ASC');
      return res.status(200).json(rows);
    }

    if (!isAuthed(req)) return res.status(401).json({ error: 'غير مصرح — سجّل الدخول أولاً' });

    if (method === 'POST') {
      const b = req.body || {};
      const { rows } = await pool.query(
        `INSERT INTO team (name, role, photo, bio, order_index) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [b.name || '', b.role || '', b.photo || '', b.bio || '', Number(b.order_index) || 0]
      );
      return res.status(200).json(rows[0]);
    }

    if (method === 'PUT') {
      const b = req.body || {};
      if (!b.id) return res.status(400).json({ error: 'id مطلوب' });
      const { rows } = await pool.query(
        `UPDATE team SET name=$1, role=$2, photo=$3, bio=$4, order_index=$5 WHERE id=$6 RETURNING *`,
        [b.name || '', b.role || '', b.photo || '', b.bio || '', Number(b.order_index) || 0, b.id]
      );
      return res.status(200).json(rows[0]);
    }

    if (method === 'DELETE') {
      const id = Number((req.query || {}).id || (req.body || {}).id);
      if (!id) return res.status(400).json({ error: 'id مطلوب' });
      await pool.query('DELETE FROM team WHERE id = $1', [id]);
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
