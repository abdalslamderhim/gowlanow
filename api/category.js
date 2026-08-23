const { getPool } = require('../lib/db');

function esc(v = '') {
  return String(v).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
}

module.exports = async (req, res) => {
  const pool = getPool();
  const name = (req.query.name || '').trim();

  if (!name) {
    res.status(400).send('اسم التصنيف مطلوب');
    return;
  }

  try {
    const { rows } = await pool.query(
      `SELECT * FROM articles
       WHERE category = $1 AND (status = 'published' OR (status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= now()))
       ORDER BY id DESC LIMIT 30`,
      [name]
    );

    const siteUrl = 'https://gowlanow.vercel.app';
    const pageUrl = `${siteUrl}/category/${encodeURIComponent(name)}`;
    const title = esc(name);

    const items = rows
      .map(
        (n) => `<article class="news-row" onclick="location.href='/news/${n.id}'">
          <time>${esc(n.time_label || '')}</time>
          <div><span>${esc(n.category)}</span><strong>${esc(n.title)}</strong><p>${esc(n.excerpt || '')}</p></div>
        </article>`
      )
      .join('\n');

    const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>أخبار ${title} | جولة</title>
<meta name="description" content="أحدث أخبار ${title} من منصة جولة الإخبارية.">
<link rel="canonical" href="${pageUrl}">
<link rel="stylesheet" href="/styles.css">
<link rel="stylesheet" href="/dark-mode.css">
<style>.category-wrap{max-width:800px;margin:0 auto;padding:24px 16px}.news-row{cursor:pointer}</style>
</head>
<body>
<header><div class="wrap head" style="padding:16px 0">
<a class="brand" href="/"><img src="/assets/logo.jpg" style="height:40px"><strong> جولة</strong></a>
</div></header>
<main class="category-wrap">
<h1>أخبار ${title}</h1>
${items || '<p>لا توجد أخبار في هذا التصنيف حاليًا.</p>'}
<a class="back" href="/" style="display:inline-block;margin-top:24px;color:#092a9f">← العودة للرئيسية</a>
</main>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate');
    res.status(200).send(html);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
