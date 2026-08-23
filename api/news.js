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
      `SELECT * FROM articles WHERE id = $1 AND (status = 'published' OR (status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= now()))`,
      [id]
    );
    const n = rows[0];

    if (!n) {
      res.status(404).send('<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>الخبر غير موجود | جولة</title></head><body><h1>عذرًا، هذا الخبر غير موجود أو غير منشور.</h1><a href="/">العودة للرئيسية</a></body></html>');
      return;
    }

    // تسجيل مشاهدة (لا ننتظر النتيجة حتى لا نبطئ عرض الصفحة)
    pool.query('UPDATE articles SET views = COALESCE(views, 0) + 1 WHERE id = $1', [n.id]).catch(() => {});

    const { rows: relatedRows } = await pool.query(
      `SELECT id, title, image, time_label FROM articles
       WHERE category = $1 AND id <> $2 AND (status = 'published' OR (status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= now()))
       ORDER BY id DESC LIMIT 3`,
      [n.category, n.id]
    );

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
<link rel="alternate" type="application/rss+xml" title="جولة" href="/rss.xml">
<link rel="stylesheet" href="/styles.css">
<link rel="stylesheet" href="/dark-mode.css">
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
<header><div class="wrap head" style="padding:16px 0;display:flex;align-items:center;justify-content:space-between">
<a class="brand" href="/"><img src="/assets/logo.jpg" style="height:40px"><strong> جولة</strong></a>
<button class="darkmode" id="darkModeToggle" aria-label="تبديل الوضع الليلي" title="الوضع الليلي">🌙</button>
</div></header>
<main class="article-wrap">
<span class="story-cat">${esc(n.category || '')}</span>
<h1>${title}</h1>
<div class="meta">${esc(n.reporter || 'جولة')} · ${esc(n.time_label || '')}</div>
<img src="${esc(image)}" alt="${title}">
<div class="body">${esc(n.body || n.excerpt || '')}</div>
<div class="share-row">
  <a class="share-btn wa" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(n.title)}%20${encodeURIComponent(pageUrl)}">واتساب</a>
  <a class="share-btn x" target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(n.title)}&url=${encodeURIComponent(pageUrl)}">X</a>
  <a class="share-btn fb" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}">فيسبوك</a>
  <button class="share-btn copy" id="copyLink" type="button">نسخ الرابط</button>
</div>
${relatedRows.length ? `<div class="related-wrap" style="margin-top:32px">
  <h3>أخبار ذات صلة</h3>
  <div style="display:grid;gap:12px">
    ${relatedRows.map((r) => `<a href="/news/${r.id}" style="display:flex;gap:10px;align-items:center;text-decoration:none;color:inherit">
      <img src="${esc(r.image || 'assets/studio.jpg')}" style="width:64px;height:64px;object-fit:cover;border-radius:8px">
      <span style="font-size:14px;font-weight:700">${esc(r.title)}</span>
    </a>`).join('')}
  </div>
</div>` : ''}
<a class="back" href="/">← العودة لكل الأخبار</a>
</main>
<script>
  var b=document.getElementById('darkModeToggle');
  var saved=localStorage.getItem('gwola-theme')==='dark';
  if(saved){document.body.classList.add('dark');b.textContent='☀';}
  b.onclick=function(){
    var d=document.body.classList.toggle('dark');
    localStorage.setItem('gwola-theme', d?'dark':'light');
    b.textContent = d?'☀':'🌙';
  };
  var c=document.getElementById('copyLink');
  c.onclick=function(){
    navigator.clipboard && navigator.clipboard.writeText(location.href);
    var old=c.textContent; c.textContent='تم النسخ ✓';
    setTimeout(function(){c.textContent=old;},1500);
  };
</script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    res.status(200).send(html);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
