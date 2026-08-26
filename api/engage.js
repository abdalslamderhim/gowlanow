const { getPool } = require('../lib/db');
const { isAuthed } = require('../lib/auth');

module.exports = async (req, res) => {
  const pool = getPool();
  const qs = req.query || {};
  const body = req.body || {};
  const type = qs.type || body.type || 'comments';

  try {
    // ==================== التعليقات ====================
    if (type === 'comments') {
      if (req.method === 'GET') {
        const articleId = Number(qs.article_id);
        if (articleId) {
          const { rows } = await pool.query('SELECT * FROM comments WHERE article_id = $1 ORDER BY id DESC', [articleId]);
          return res.status(200).json(rows);
        }
        if (!isAuthed(req)) return res.status(401).json({ error: 'غير مصرح' });
        const { rows } = await pool.query(
          `SELECT c.*, a.title AS article_title FROM comments c LEFT JOIN articles a ON a.id = c.article_id ORDER BY c.id DESC LIMIT 200`
        );
        return res.status(200).json(rows);
      }
      if (req.method === 'POST') {
        const articleId = Number(body.article_id);
        const name = (body.name || '').trim().slice(0, 60) || 'زائر';
        const commentBody = (body.body || '').trim().slice(0, 1000);
        if (!articleId || !commentBody) return res.status(400).json({ error: 'بيانات ناقصة' });
        const { rows } = await pool.query('INSERT INTO comments (article_id, name, body) VALUES ($1,$2,$3) RETURNING *', [articleId, name, commentBody]);
        return res.status(200).json(rows[0]);
      }
      if (req.method === 'DELETE') {
        if (!isAuthed(req)) return res.status(401).json({ error: 'غير مصرح' });
        const id = Number(qs.id);
        if (!id) return res.status(400).json({ error: 'id مطلوب' });
        await pool.query('DELETE FROM comments WHERE id = $1', [id]);
        return res.status(200).json({ ok: true });
      }
    }

    // ==================== استطلاع الرأي ====================
    if (type === 'poll') {
      if (req.method === 'GET') {
        const articleId = Number(qs.article_id);
        if (!articleId) return res.status(400).json({ error: 'article_id مطلوب' });
        const { rows } = await pool.query('SELECT * FROM poll_options WHERE article_id = $1 ORDER BY order_index ASC, id ASC', [articleId]);
        return res.status(200).json(rows);
      }
      if (req.method === 'POST' && body.action === 'vote') {
        const optionId = Number(body.option_id);
        if (!optionId) return res.status(400).json({ error: 'option_id مطلوب' });
        await pool.query('UPDATE poll_options SET votes = votes + 1 WHERE id = $1', [optionId]);
        return res.status(200).json({ ok: true });
      }
      if (req.method === 'POST') {
        if (!isAuthed(req)) return res.status(401).json({ error: 'غير مصرح' });
        const articleId = Number(body.article_id);
        const options = Array.isArray(body.options) ? body.options.filter(Boolean) : [];
        if (!articleId) return res.status(400).json({ error: 'article_id مطلوب' });
        await pool.query('DELETE FROM poll_options WHERE article_id = $1', [articleId]);
        for (let i = 0; i < options.length; i++) {
          await pool.query('INSERT INTO poll_options (article_id, option_text, order_index) VALUES ($1,$2,$3)', [articleId, options[i], i]);
        }
        return res.status(200).json({ ok: true });
      }
    }

    // ==================== التغطية المباشرة ====================
    if (type === 'live') {
      if (req.method === 'GET') {
        const articleId = Number(qs.article_id);
        if (!articleId) return res.status(400).json({ error: 'article_id مطلوب' });
        const { rows } = await pool.query('SELECT * FROM live_updates WHERE article_id = $1 ORDER BY id DESC', [articleId]);
        return res.status(200).json(rows);
      }
      if (!isAuthed(req)) return res.status(401).json({ error: 'غير مصرح' });
      if (req.method === 'POST') {
        const articleId = Number(body.article_id);
        const updateBody = (body.body || '').trim();
        if (!articleId || !updateBody) return res.status(400).json({ error: 'بيانات ناقصة' });
        const { rows } = await pool.query('INSERT INTO live_updates (article_id, body) VALUES ($1,$2) RETURNING *', [articleId, updateBody]);
        return res.status(200).json(rows[0]);
      }
      if (req.method === 'DELETE') {
        const id = Number(qs.id);
        if (!id) return res.status(400).json({ error: 'id مطلوب' });
        await pool.query('DELETE FROM live_updates WHERE id = $1', [id]);
        return res.status(200).json({ ok: true });
      }
    }

    res.status(400).json({ error: 'type أو method غير مدعوم' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
