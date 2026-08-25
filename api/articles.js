const { getPool } = require('../lib/db');
const { isAuthed } = require('../lib/auth');

module.exports = async (req, res) => {
  const pool = getPool();
  const method = req.method;
  const qs = req.query || {};

  try {
    // ---- القراءة: عامة للزوار (منشور، أو مجدول وحان وقته)، أو كاملة إذا كانت الهوية موثّقة ----
    if (method === 'GET') {
      const authed = isAuthed(req);
      let text = 'SELECT * FROM articles';
      const params = [];
      if (!authed) {
        text += ` WHERE status = 'published' OR (status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= now())`;
      } else if (qs.status) {
        text += ' WHERE status = $1';
        params.push(qs.status);
      }
      text += ' ORDER BY id DESC';
      const { rows } = await pool.query(text, params);
      return res.status(200).json(rows);
    }

    // ---- كل عمليات الكتابة تتطلب توثيقًا ----
    if (!isAuthed(req)) return res.status(401).json({ error: 'غير مصرح — سجّل الدخول أولاً' });

    if (method === 'POST') {
      const b = req.body || {};
      const { rows } = await pool.query(
        `INSERT INTO articles
          (title, category, excerpt, body, image, status, breaking, featured, reporter, time_label, scheduled_at, video_url, gallery)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING *`,
        [
          b.title || 'خبر جديد',
          b.category || 'محلي',
          b.excerpt || '',
          b.body || '',
          b.image || 'assets/studio.jpg',
          b.status || 'draft',
          !!b.breaking,
          !!b.featured,
          b.reporter || '',
          b.time_label || 'الآن',
          b.scheduled_at || null,
          b.video_url || null,
          b.gallery || null,
        ]
      );
      if (rows[0].featured) {
        await pool.query('UPDATE articles SET featured = false WHERE id <> $1', [rows[0].id]);
      }
      return res.status(200).json(rows[0]);
    }

    if (method === 'PUT') {
      const b = req.body || {};
      if (!b.id) return res.status(400).json({ error: 'id مطلوب' });
      const { rows } = await pool.query(
        `UPDATE articles SET
          title=$1, category=$2, excerpt=$3, body=$4, image=$5,
          status=$6, breaking=$7, featured=$8, reporter=$9, time_label=$10, scheduled_at=$11, video_url=$12, gallery=$13, updated_at=now()
         WHERE id=$14
         RETURNING *`,
        [
          b.title, b.category, b.excerpt, b.body, b.image,
          b.status, !!b.breaking, !!b.featured, b.reporter, b.time_label, b.scheduled_at || null, b.video_url || null, b.gallery || null, b.id,
        ]
      );
      if (b.featured) {
        await pool.query('UPDATE articles SET featured = false WHERE id <> $1', [b.id]);
      }
      return res.status(200).json(rows[0]);
    }

    if (method === 'DELETE') {
      const id = qs.id;
      if (!id) return res.status(400).json({ error: 'id مطلوب' });
      const { rows } = await pool.query(
        `UPDATE articles SET status='archived', featured=false, breaking=false, updated_at=now()
         WHERE id=$1 RETURNING *`,
        [id]
      );
      return res.status(200).json(rows[0]);
    }

    if (method === 'PATCH') {
      const b = req.body || {};
      if (!b.id || b.action !== 'restore') return res.status(400).json({ error: 'طلب غير مدعوم' });
      const { rows } = await pool.query(
        `UPDATE articles SET status='draft', updated_at=now() WHERE id=$1 RETURNING *`,
        [b.id]
      );
      return res.status(200).json(rows[0]);
    }

    return res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
