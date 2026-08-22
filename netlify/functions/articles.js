const { getPool } = require('./_db');
const { isAuthed } = require('./_auth');

function json(statusCode, data) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(data),
  };
}

exports.handler = async (event) => {
  const pool = getPool();
  const method = event.httpMethod;
  const qs = event.queryStringParameters || {};

  try {
    // ---- القراءة: عامة للزوار (منشور فقط)، أو كاملة إذا كانت الهوية موثّقة ----
    if (method === 'GET') {
      const authed = isAuthed(event);
      let text = 'SELECT * FROM articles';
      const params = [];
      if (!authed) {
        text += ' WHERE status = $1';
        params.push('published');
      } else if (qs.status) {
        text += ' WHERE status = $1';
        params.push(qs.status);
      }
      text += ' ORDER BY id DESC';
      const { rows } = await pool.query(text, params);
      return json(200, rows);
    }

    // ---- كل عمليات الكتابة تتطلب توثيقًا ----
    if (!isAuthed(event)) return json(401, { error: 'غير مصرح — سجّل الدخول أولاً' });

    if (method === 'POST') {
      const b = JSON.parse(event.body || '{}');
      const { rows } = await pool.query(
        `INSERT INTO articles
          (title, category, excerpt, body, image, status, breaking, featured, reporter, time_label)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
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
        ]
      );
      if (rows[0].featured) {
        await pool.query('UPDATE articles SET featured = false WHERE id <> $1', [rows[0].id]);
      }
      return json(200, rows[0]);
    }

    if (method === 'PUT') {
      const b = JSON.parse(event.body || '{}');
      if (!b.id) return json(400, { error: 'id مطلوب' });
      const { rows } = await pool.query(
        `UPDATE articles SET
          title=$1, category=$2, excerpt=$3, body=$4, image=$5,
          status=$6, breaking=$7, featured=$8, reporter=$9, time_label=$10, updated_at=now()
         WHERE id=$11
         RETURNING *`,
        [
          b.title, b.category, b.excerpt, b.body, b.image,
          b.status, !!b.breaking, !!b.featured, b.reporter, b.time_label, b.id,
        ]
      );
      if (b.featured) {
        await pool.query('UPDATE articles SET featured = false WHERE id <> $1', [b.id]);
      }
      return json(200, rows[0]);
    }

    if (method === 'DELETE') {
      // أرشفة (soft delete) — لا حذف نهائي أبدًا من الواجهة العادية
      const id = qs.id;
      if (!id) return json(400, { error: 'id مطلوب' });
      const { rows } = await pool.query(
        `UPDATE articles SET status='archived', featured=false, breaking=false, updated_at=now()
         WHERE id=$1 RETURNING *`,
        [id]
      );
      return json(200, rows[0]);
    }

    if (method === 'PATCH') {
      // استعادة خبر مؤرشف إلى مسودة
      const b = JSON.parse(event.body || '{}');
      if (!b.id || b.action !== 'restore') return json(400, { error: 'طلب غير مدعوم' });
      const { rows } = await pool.query(
        `UPDATE articles SET status='draft', updated_at=now() WHERE id=$1 RETURNING *`,
        [b.id]
      );
      return json(200, rows[0]);
    }

    return json(405, { error: 'method not allowed' });
  } catch (err) {
    return json(500, { error: err.message });
  }
};
