const { sql } = require('@vercel/postgres');
const { isAuthed } = require('../lib/auth');

module.exports = async (req, res) => {
  const method = req.method;

  try {
    // ---- القراءة: عامة للزوار (منشور فقط)، أو كاملة إذا كانت الهوية موثّقة ----
    if (method === 'GET') {
      const authed = isAuthed(req);
      const status = req.query.status;
      let result;
      if (!authed) {
        result = await sql`SELECT * FROM articles WHERE status = 'published' ORDER BY id DESC`;
      } else if (status) {
        result = await sql`SELECT * FROM articles WHERE status = ${status} ORDER BY id DESC`;
      } else {
        result = await sql`SELECT * FROM articles ORDER BY id DESC`;
      }
      return res.status(200).json(result.rows);
    }

    // ---- كل عمليات الكتابة تتطلب توثيقًا ----
    if (!isAuthed(req)) return res.status(401).json({ error: 'غير مصرح — سجّل الدخول أولاً' });

    if (method === 'POST') {
      const b = req.body || {};
      const result = await sql`
        INSERT INTO articles (title, category, excerpt, body, image, status, breaking, featured, reporter, time_label)
        VALUES (${b.title || 'خبر جديد'}, ${b.category || 'محلي'}, ${b.excerpt || ''}, ${b.body || ''},
                ${b.image || 'assets/studio.jpg'}, ${b.status || 'draft'}, ${!!b.breaking}, ${!!b.featured},
                ${b.reporter || ''}, ${b.time_label || 'الآن'})
        RETURNING *`;
      const row = result.rows[0];
      if (row.featured) {
        await sql`UPDATE articles SET featured = false WHERE id <> ${row.id}`;
      }
      return res.status(200).json(row);
    }

    if (method === 'PUT') {
      const b = req.body || {};
      if (!b.id) return res.status(400).json({ error: 'id مطلوب' });
      const result = await sql`
        UPDATE articles SET
          title=${b.title}, category=${b.category}, excerpt=${b.excerpt}, body=${b.body}, image=${b.image},
          status=${b.status}, breaking=${!!b.breaking}, featured=${!!b.featured},
          reporter=${b.reporter}, time_label=${b.time_label}, updated_at=now()
        WHERE id=${b.id}
        RETURNING *`;
      if (b.featured) {
        await sql`UPDATE articles SET featured = false WHERE id <> ${b.id}`;
      }
      return res.status(200).json(result.rows[0]);
    }

    if (method === 'DELETE') {
      // أرشفة (soft delete) — لا حذف نهائي أبدًا من الواجهة العادية
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'id مطلوب' });
      const result = await sql`
        UPDATE articles SET status='archived', featured=false, breaking=false, updated_at=now()
        WHERE id=${id} RETURNING *`;
      return res.status(200).json(result.rows[0]);
    }

    if (method === 'PATCH') {
      // استعادة خبر مؤرشف إلى مسودة
      const b = req.body || {};
      if (!b.id || b.action !== 'restore') return res.status(400).json({ error: 'طلب غير مدعوم' });
      const result = await sql`UPDATE articles SET status='draft', updated_at=now() WHERE id=${b.id} RETURNING *`;
      return res.status(200).json(result.rows[0]);
    }

    return res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

