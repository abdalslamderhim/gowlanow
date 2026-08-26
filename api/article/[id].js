const { getPool } = require('../../lib/db');

function esc(v = '') {
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = async (req, res) => {
  const pool = getPool();
  const id = req.query.id;
  const proto = 'https';
  const host = req.headers.host;
  const origin = `${proto}://${host}`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  try {
    const { rows } = await pool.query(
      `SELECT * FROM articles WHERE id = $1 AND status = 'published'`,
      [id]
    );
    const article = rows[0];

    if (!article) {
      return res.status(404).send(
        `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">` +
        `<script>location.replace(${JSON.stringify(origin + '/')})</script></head>` +
        `<body>الخبر غير موجود أو غير منشور. <a href="${esc(origin)}/">العودة للموقع</a></body></html>`
      );
    }

    const title = article.title || 'جولة';
    const description = (article.excerpt || '').slice(0, 200);
    let image = article.image || 'assets/studio.jpg';
    if (!/^https?:\/\//i.test(image)) {
      image = `${origin}/${image.replace(/^\//, '')}`;
    }
    const redirectUrl = `${origin}/?article=${id}`;

    const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} | جولة</title>
<meta name="description" content="${esc(description)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="جولة">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:url" content="${esc(origin)}/article/${esc(String(id))}">
<meta property="og:locale" content="ar_AR">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
<meta http-equiv="refresh" content="0; url=${esc(redirectUrl)}">
<script>location.replace(${JSON.stringify(redirectUrl)});</script>
</head>
<body>
<p>جاري التحويل إلى الموقع... <a href="${esc(redirectUrl)}">اضغطي هنا إذا لم يتم التحويل تلقائيًا</a></p>
</body>
</html>`;

    return res.status(200).send(html);
  } catch (err) {
    return res.status(500).send(
      `<!doctype html><html lang="ar" dir="rtl"><body>حدث خطأ: ${esc(err.message)}</body></html>`
    );
  }
};

