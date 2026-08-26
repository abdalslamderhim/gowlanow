const { getPool } = require('../lib/db');
const { isAuthed } = require('../lib/auth');

function esc(v = '') {
  return String(v).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
}

module.exports = async (req, res) => {
  const pool = getPool();
  const qs = req.query || {};
  const body = req.body || {};
  const siteUrl = 'https://gowlanow.vercel.app';

  try {
    // ---- صفحة مراسل مستقلة (عامة، عبر /reporter/:name) ----
    if (req.method === 'GET' && qs.name) {
      const name = qs.name.trim();
      const { rows: repRows } = await pool.query('SELECT * FROM reporters WHERE name = $1 LIMIT 1', [name]);
      const rep = repRows[0];
      const { rows: articles } = await pool.query(
        `SELECT * FROM articles WHERE reporter = $1 AND (status = 'published' OR (status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= now()))
         ORDER BY id DESC LIMIT 30`,
        [name]
      );
      const items = articles.map((n) => `<article class="news-row" onclick="location.href='/news/${n.id}'" style="cursor:pointer">
        <time>${esc(n.time_label || '')}</time>
        <div><span>${esc(n.category)}</span><strong>${esc(n.title)}</strong><p>${esc(n.excerpt || '')}</p></div>
      </article>`).join('');

      const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(name)} | جولة</title>
<meta name="description" content="كل أخبار وتقارير المراسل ${esc(name)} في قناة جولة.">
<link rel="canonical" href="${siteUrl}/reporter/${encodeURIComponent(name)}">
<link rel="stylesheet" href="/styles.css">
<link rel="stylesheet" href="/dark-mode.css">
<style>.rep-wrap{max-width:800px;margin:0 auto;padding:24px 16px}.rep-head{text-align:center;margin-bottom:28px}.rep-head img{width:100px;height:100px;border-radius:50%;object-fit:cover;margin-bottom:12px}.rep-head .avatar-fallback{width:100px;height:100px;border-radius:50%;background:var(--b,#1439d8);color:#fff;display:flex;align-items:center;justify-content:center;font-size:34px;margin:0 auto 12px}</style>
</head>
<body>
<header><div class="wrap head" style="padding:16px 0">
<a class="brand" href="/"><img src="/assets/logo.jpg" style="height:40px"><strong> جولة</strong></a>
</div></header>
<main class="rep-wrap">
<div class="rep-head">
${rep?.photo ? `<img src="${esc(rep.photo)}" alt="${esc(name)}">` : `<div class="avatar-fallback">${esc(name.slice(0, 1))}</div>`}
<h1>${esc(name)}</h1>
<p style="color:var(--b,#1439d8);font-weight:700">${esc(rep?.role || 'مراسل جولة')}${rep?.region ? ' • ' + esc(rep.region) : ''}</p>
</div>
<h2 style="margin-bottom:14px">أخبار ${esc(name)}</h2>
${items || '<p style="opacity:.7">لا توجد أخبار منشورة لهذا المراسل بعد.</p>'}
<a href="/" style="display:inline-block;margin-top:24px;color:#092a9f">← العودة للرئيسية</a>
</main>
</body>
</html>`;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate');
      return res.status(200).send(html);
    }

    // ---- قائمة كل المراسلين (عامة، JSON) ----
    if (req.method === 'GET') {
      const { rows } = await pool.query('SELECT * FROM reporters ORDER BY id ASC');
      return res.status(200).json(rows);
    }

    // ---- عمليات الإدارة (تتطلب توثيقًا) ----
    if (!isAuthed(req)) return res.status(401).json({ error: 'غير مصرح' });

    if (req.method === 'POST') {
      const { rows } = await pool.query(
        `INSERT INTO reporters (name, role, region, active, photo) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [body.name || 'مراسل جديد', body.role || 'مراسل جولة', body.region || '', body.active !== false, body.photo || '']
      );
      return res.status(200).json(rows[0]);
    }

    if (req.method === 'PUT') {
      if (!body.id) return res.status(400).json({ error: 'id مطلوب' });
      const { rows } = await pool.query(
        `UPDATE reporters SET name=$1, role=$2, region=$3, active=$4, photo=$5 WHERE id=$6 RETURNING *`,
        [body.name, body.role, body.region, body.active !== false, body.photo || '', body.id]
      );
      return res.status(200).json(rows[0]);
    }

    res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
