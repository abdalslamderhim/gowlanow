const { getPool } = require('../lib/db');
const { isAuthed } = require('../lib/auth');

module.exports = async (req, res) => {
  const pool = getPool();
  const method = req.method;
  const qs = req.query || {};

  try {
    if (method === 'GET') {
      const authed = isAuthed(req);
      let text = 'SELECT * FROM reporters';
      if (!authed) text += ' WHERE active = true';
      text += ' ORDER BY id ASC';
      const { rows } = await pool.query(text);
      return res.status(200).json(rows);
    }

    if (!isAuthed(req)) return res.status(401).json({ error: 'غير مصرح — سجّل الدخول أولاً' });

    if (method === 'POST') {
      const b = req.body || {};
      const { rows } = await pool.query(
        `INSERT INTO reporters (name, role, region, active) VALUES ($1,$2,$3,$4) RETURNING *`,
        [b.name || 'مراسل جديد', b.role || 'مراسل جولة', b.region || '', b.active !== false]
      );
      return res.status(200).json(rows[0]);
    }

    if (method === 'PUT') {
      const b = req.body || {};
      if (!b.id) return res.status(400).json({ error: 'id مطلوب' });
      const { rows } = await pool.query(
        `UPDATE reporters SET name=$1, role=$2, region=$3, active=$4 WHERE id=$5 RETURNING *`,
        [b.name, b.role, b.region, b.active !== false, b.id]
      );
      return res.status(200).json(rows[0]);
    }

    if (method === 'DELETE') {
      const id = qs.id;
      if (!id) return res.status(400).json({ error: 'id مطلوب' });
      const { rows } = await pool.query(
        `UPDATE reporters SET active=false WHERE id=$1 RETURNING *`,
        [id]
      );
      return res.status(200).json(rows[0]);
    }

    return res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
