const { getPool } = require('../lib/db');

function esc(v = '') {
  return String(v).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
}

function extractYouTube(url) {
  if (!url) return null;
  const m = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (!m) return null;
  return { id: m[1], isShort: /\/shorts\//.test(url) };
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
    const yt = extractYouTube(n.video_url);
    const galleryImages = (n.gallery || '').split('\n').map((s) => s.trim()).filter(Boolean);

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
${yt ? `<div style="position:relative;padding-bottom:${yt.isShort ? '177.7' : '56.25'}%;height:0;overflow:hidden;border-radius:8px;margin-bottom:16px;${yt.isShort ? 'max-width:400px;margin-left:auto;margin-right:auto' : ''}"><iframe src="https://www.youtube.com/embed/${yt.id}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen loading="lazy"></iframe></div>` : `<img src="${esc(image)}" alt="${title}">`}
${galleryImages.length ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px;margin-bottom:16px">${galleryImages.map((g) => `<img src="${esc(g)}" style="width:100%;height:110px;object-fit:cover;border-radius:8px;cursor:pointer" onclick="window.open('${esc(g)}','_blank')">`).join('')}</div>` : ''}
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
<div class="comments-wrap" style="margin-top:36px">
  <h3 style="margin-bottom:14px">التعليقات</h3>
  <div id="commentsList" style="display:grid;gap:12px;margin-bottom:20px"><p style="opacity:.6;font-size:13px">جاري تحميل التعليقات...</p></div>
  <form id="commentForm" style="display:grid;gap:8px">
    <input id="cName" placeholder="اسمك (اختياري)" style="padding:10px;border:1px solid #e6eaf2;border-radius:7px;font-family:inherit">
    <textarea id="cBody" placeholder="اكتب تعليقك..." required style="padding:10px;border:1px solid #e6eaf2;border-radius:7px;font-family:inherit;min-height:80px;resize:vertical"></textarea>
    <button type="submit" class="share-btn copy" style="width:fit-content;padding:10px 22px">نشر التعليق</button>
  </form>
</div>
<a class="back" href="/">← العودة لكل الأخبار</a>
</main>
<footer style="text-align:center;padding:20px 0"><div class="social-links" style="justify-content:center">
<a href="https://www.facebook.com/gwola1" target="_blank" rel="noopener" aria-label="فيسبوك" class="social-icon fb"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.462h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.891h-2.33v6.987C18.343 21.128 22 16.991 22 12z"/></svg></a>
<a href="https://www.instagram.com/gowla_1" target="_blank" rel="noopener" aria-label="انستغرام" class="social-icon ig"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.256 1.216.6 1.772 1.153a4.9 4.9 0 0 1 1.153 1.772c.247.637.415 1.363.465 2.428.05 1.066.06 1.405.06 4.122 0 2.717-.01 3.056-.06 4.122-.05 1.065-.218 1.79-.465 2.428a4.9 4.9 0 0 1-1.153 1.772 4.9 4.9 0 0 1-1.772 1.153c-.637.247-1.363.415-2.428.465-1.066.05-1.405.06-4.122.06-2.717 0-3.056-.01-4.122-.06-1.065-.05-1.79-.218-2.428-.465a4.9 4.9 0 0 1-1.772-1.153 4.9 4.9 0 0 1-1.153-1.772c-.247-.637-.415-1.363-.465-2.428C2.01 15.056 2 14.717 2 12c0-2.717.01-3.056.06-4.122.05-1.066.218-1.79.465-2.428A4.9 4.9 0 0 1 3.678 3.678 4.9 4.9 0 0 1 5.45 2.525c.637-.247 1.363-.415 2.428-.465C8.944 2.01 9.283 2 12 2zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8.25a3.25 3.25 0 1 1 0-6.5 3.25 3.25 0 0 1 0 6.5zm5.4-8.44a1.17 1.17 0 1 0 0-2.34 1.17 1.17 0 0 0 0 2.34z"/></svg></a>
<a href="https://www.tiktok.com/@.gowla" target="_blank" rel="noopener" aria-label="تيك توك" class="social-icon tt"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M16.6 5.82c-.9-.98-1.4-2.26-1.4-3.6h-3.28v13.66c0 1.6-1.3 2.9-2.9 2.9-1.6 0-2.9-1.3-2.9-2.9 0-1.6 1.3-2.9 2.9-2.9.28 0 .55.04.8.11V9.8a6.3 6.3 0 0 0-.8-.05 6.16 6.16 0 1 0 6.16 6.16V8.4a9.5 9.5 0 0 0 5.32 1.62V6.74a5.9 5.9 0 0 1-3.9-.92z"/></svg></a>
</div></footer>
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

  var ARTICLE_ID = ${n.id};
  function escHtml(s){ return String(s).replace(/[&<>"']/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]; }); }
  function loadComments(){
    fetch('/api/comments?article_id='+ARTICLE_ID).then(function(r){return r.json();}).then(function(rows){
      var list = document.getElementById('commentsList');
      if(!Array.isArray(rows) || rows.length===0){ list.innerHTML = '<p style="opacity:.6;font-size:13px">لا توجد تعليقات بعد، كن أول من يعلّق.</p>'; return; }
      list.innerHTML = rows.map(function(c){
        return '<div style="border:1px solid #e6eaf2;border-radius:8px;padding:12px"><b style="font-size:13px">'+escHtml(c.name)+'</b><p style="font-size:13px;margin:6px 0 0;line-height:1.7">'+escHtml(c.body)+'</p></div>';
      }).join('');
    }).catch(function(){});
  }
  loadComments();
  var cf = document.getElementById('commentForm');
  cf.addEventListener('submit', function(e){
    e.preventDefault();
    var btn = cf.querySelector('button');
    var name = document.getElementById('cName').value.trim();
    var body = document.getElementById('cBody').value.trim();
    if(!body) return;
    btn.disabled = true;
    fetch('/api/comments', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ article_id: ARTICLE_ID, name: name, body: body }) })
      .then(function(r){ return r.json(); })
      .then(function(){ document.getElementById('cName').value=''; document.getElementById('cBody').value=''; loadComments(); })
      .catch(function(){})
      .finally(function(){ btn.disabled = false; });
  });
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
