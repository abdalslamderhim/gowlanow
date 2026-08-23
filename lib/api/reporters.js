const { sql } = require('@vercel/postgres');
const { isAuthed } = require('../lib/auth');

module.exports = async (req, res) => {
  const method = req.method;

  try {
    if (method === 'GET') {
      const authed = isAuthed(req);
      const result = authed
        ? await sql`SELECT * FROM reporters ORDER BY id ASC`
        : await sql`SELECT * FROM reporters WHERE active = true ORDER BY id ASC`;
      return res.status(200).json(result.rows);
    }

    if (!isAuthed(req)) return res.status(401).json({ error: 'غير مصرح — سجّل الدخول أولاً' });

    if (method === 'POST') {
      const b = req.body || {};
      const result = await sql`
        INSERT INTO reporters (name, role, region, active)
        VALUES (${b.name || 'مراسل جديد'}, ${b.role || 'مراسل جولة'}, ${b.region || ''}, ${b.active !== false})
        RETURNING *`;
      return res.status(200).json(result.rows[0]);
    }

    if (method === 'PUT') {
      const b = req.body || {};
      if (!b.id) return res.status(400).json({ error: 'id مطلوب' });
      const result = await sql`
        UPDATE reporters SET name=${b.name}, role=${b.role}, region=${b.region}, active=${b.active !== false}
        WHERE id=${b.id} RETURNING *`;
      return res.status(200).json(result.rows[0]);
    }

    if (method === 'DELETE') {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'id مطلوب' });
      const result = await sql`UPDATE reporters SET active=false WHERE id=${id} RETURNING *`;
      return res.status(200).json(result.rows[0]);
    }

    return res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

