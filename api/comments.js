const { getPool } = require('../lib/db');
const { isAuthed } = require('../lib/auth');

module.exports = async (req, res) => {
  const pool = getPool();
  const qs = req.query || {};

  try {
    if (req.method === 'GET') {
      const articleId = Number(qs.article_id);
      if (articleId) {
        const { rows } = await pool.query(
          'SELECT * FROM comments WHERE article_id = $1 ORDER BY id DESC',
          [articleId]
        );
        return res.status(200).json(rows);
      }
      // بدون article_id: قائمة إشراف كاملة، تتطلب توثيقًا
      if (!isAuthed(req)) return res.status(401).json({ error: 'غير مصرح' });
      const { rows } = await pool.query(
        `SELECT c.*, a.title AS article_title FROM comments c
         LEFT JOIN articles a ON a.id = c.article_id
         ORDER BY c.id DESC LIMIT 200`
      );
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const b = req.body || {};
      const articleId = Number(b.article_id);
      const name = (b.name || '').trim().slice(0, 60) || 'زائر';
      const body = (b.body || '').trim().slice(0, 1000);
      if (!articleId || !body) return res.status(400).json({ error: 'بيانات ناقصة' });
      const { rows } = await pool.query(
        'INSERT INTO comments (article_id, name, body) VALUES ($1,$2,$3) RETURNING *',
        [articleId, name, body]
      );
      return res.status(200).json(rows[0]);
    }

    if (req.method === 'DELETE') {
      if (!isAuthed(req)) return res.status(401).json({ error: 'غير مصرح' });
      const id = Number(qs.id);
      if (!id) return res.status(400).json({ error: 'id مطلوب' });
      await pool.query('DELETE FROM comments WHERE id = $1', [id]);
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
