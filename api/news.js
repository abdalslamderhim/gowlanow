const { getPool } = require('../lib/db');

function esc(v = '') {
  return String(v).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
}

module.exports = async (req, res) => {
  const pool = getPool();
  const id = Number(req.query.id);

  if (!id) {
    res.status(400).send('معرّف الخبر مطلوب');
    return;
  }

  try {
    const { rows } = await pool.query(
      `SELECT * FROM articles WHERE id = $1 AND status = 'published'`,
      [id]
    );
    const n = rows[0];

    if (!n) {
      res.status(404).send('<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>الخبر غير موجود | جولة</title></head><body><h1>عذرًا، هذا الخبر غير موجود أو غير منشور.</h1><a href="/">العودة للرئيسية</a></body></html>');
      return;
    }

    const siteUrl = 'https://gowlanow.vercel.app';
    const pageUrl = `${siteUrl}/news/${n.id}`;
    const image = n.image && n.image.startsWith('http') ? n.image : `${siteUrl}/${n.image || 'assets/studio.jpg'}`;
    const title = esc(n.title);
    const desc = esc(n.excerpt || (n.body || '').slice(0, 150));

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: n.title,
      image: [image],
      datePublished: n.created_at,
      dateModified: n.updated_at || n.created_at,
      author: [{ '@type': 'Person', name: n.reporter || 'جولة' }],
      publisher: {
        '@type': 'Organization',
        name: 'جولة',
        logo: { '@type': 'ImageObject', url: `${siteUrl}/assets/logo.jpg` },
      },
      description: n.excerpt || '',
      mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
    };

    const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} | جولة</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="${pageUrl}">
<meta property="og:type" content="article">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:url" content="${pageUrl}">
<meta property="og:site_name" content="جولة">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="${esc(image)}">
<link rel="stylesheet" href="/styles.css">
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
<style>
  .article-wrap{max-width:800px;margin:0 auto;padding:24px 16px}
  .article-wrap img{width:100%;border-radius:8px;margin-bottom:16px}
  .article-wrap .meta{color:#666;font-size:14px;margin-bottom:16px}
  .article-wrap .body{line-height:1.9;font-size:18px;white-space:pre-line}
  .back{display:inline-block;margin-top:24px;color:#092a9f;text-decoration:none}
</style>
</head>
<body>
<header><div class="wrap head" style="padding:16px 0">
<a class="brand" href="/"><img src="/assets/logo.jpg" style="height:40px"><strong> جولة</strong></a>
</div></header>
<main class="article-wrap">
<span class="story-cat">${esc(n.category || '')}</span>
<h1>${title}</h1>
<div class="meta">${esc(n.reporter || 'جولة')} · ${esc(n.time_label || '')}</div>
<img src="${esc(image)}" alt="${title}">
<div class="body">${esc(n.body || n.excerpt || '')}</div>
<a class="back" href="/">← العودة لكل الأخبار</a>
</main>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    res.status(200).send(html);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
