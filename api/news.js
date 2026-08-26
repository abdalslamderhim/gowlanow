const { getPool } = require('../lib/db');

function esc(v = '') {
  return String(v).replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[m]));
}

function extractYouTube(url) {
  if (!url) return null;
  const m = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (!m) return null;
  return { id: m[1], isShort: /\/shorts\//.test(url) };
}

function readingMinutes(text = '') {
  const words = String(text).trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 180));
}

function safeImage(siteUrl, value) {
  if (!value) return `${siteUrl}/assets/studio.jpg`;
  return String(value).startsWith('http') ? String(value) : `${siteUrl}/${String(value).replace(/^\/+/, '')}`;
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
      `SELECT * FROM articles
       WHERE id = $1
       AND (status = 'published' OR (status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= now()))`,
      [id]
    );

    const n = rows[0];

    if (!n) {
      res.status(404).send(`<!doctype html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>الخبر غير موجود | جولة</title>
<style>
body{margin:0;background:#f5f7fb;color:#0b1533;font-family:Arial,sans-serif;display:grid;place-items:center;min-height:100vh}
.box{width:min(520px,calc(100% - 36px));background:#fff;border:1px solid #e6eaf2;border-radius:20px;padding:30px;box-sizing:border-box}
a{color:#1238c7;font-weight:800;text-decoration:none}
</style></head>
<body><div class="box"><h1>عذرًا، الخبر غير موجود.</h1><p>قد يكون الخبر غير منشور أو تم حذفه.</p><a href="/">العودة إلى جولة ←</a></div></body></html>`);
      return;
    }

    pool.query('UPDATE articles SET views = COALESCE(views, 0) + 1 WHERE id = $1', [n.id]).catch(() => {});

    const { rows: relatedRows } = await pool.query(
      `SELECT id, title, image, category, time_label FROM articles
       WHERE category = $1 AND id <> $2
       AND (status = 'published' OR (status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= now()))
       ORDER BY id DESC LIMIT 3`,
      [n.category, n.id]
    );

    const siteUrl = 'https://gowlanow.vercel.app';
    const pageUrl = `${siteUrl}/news/${n.id}`;
    const image = safeImage(siteUrl, n.image);
    const title = esc(n.title);
    const desc = esc(n.excerpt || (n.body || '').slice(0, 155));
    const yt = extractYouTube(n.video_url);
    const bodyText = n.body || n.excerpt || '';
    const galleryImages = (n.gallery || '').split('\n').map(s => s.trim()).filter(Boolean);
    const minutes = readingMinutes(bodyText);

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
        logo: { '@type': 'ImageObject', url: `${siteUrl}/assets/logo.jpg` }
      },
      description: n.excerpt || '',
      mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl }
    };

    const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
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
<link rel="stylesheet" href="/article-v41.css">
<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>
</head>
<body>
<div class="article-v41">

<header class="article-v41-header">
  <div class="article-v41-nav">
    <a class="article-v41-brand" href="/">
      <img src="/assets/logo.jpg" alt="جولة">
      <span>جولة</span>
    </a>
    <div class="article-v41-actions">
      <a class="article-v41-action" href="/" aria-label="العودة للرئيسية" title="الرئيسية">⌂</a>
      <button class="article-v41-action" id="darkModeToggle" aria-label="الوضع الليلي" title="الوضع الليلي">🌙</button>
    </div>
  </div>
</header>

<main class="article-v41-wrap">

  <nav class="article-v41-breadcrumb" aria-label="مسار الصفحة">
    <a href="/">الرئيسية</a>
    <span>←</span>
    <span>${esc(n.category || 'أخبار')}</span>
  </nav>

  <div class="article-v41-kicker">
    <span class="article-v41-category">${esc(n.category || 'أخبار')}</span>
    ${n.is_live ? '<span class="article-v41-live"><i></i> مباشر</span>' : ''}
    ${n.breaking ? '<span class="article-v41-live"><i></i> عاجل</span>' : ''}
  </div>

  <h1 class="article-v41-title">${title}</h1>

  ${n.excerpt ? `<p class="article-v41-deck">${esc(n.excerpt)}</p>` : ''}

  <div class="article-v41-meta">
    <span>بواسطة ${n.reporter ? `<a href="/reporter/${encodeURIComponent(n.reporter)}">${esc(n.reporter)}</a>` : '<b>جولة</b>'}</span>
    <span class="dot"></span>
    <span>${esc(n.time_label || 'اليوم')}</span>
    <span class="dot"></span>
    <span>قراءة ${minutes} دقيقة</span>
    <span class="dot"></span>
    <span>${Number(n.views || 0) + 1} مشاهدة</span>
  </div>

  ${yt
    ? `<div class="article-v41-video ${yt.isShort ? 'short' : ''}">
         <iframe src="https://www.youtube.com/embed/${yt.id}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>
       </div>`
    : `<figure class="article-v41-hero">
         <img src="${esc(image)}" alt="${title}" fetchpriority="high">
         <figcaption class="article-v41-hero-caption">صورة الخبر · قناة جولة</figcaption>
       </figure>`
  }

  ${galleryImages.length ? `
    <div class="article-v41-gallery" aria-label="صور إضافية">
      ${galleryImages.map(g => `<img src="${esc(safeImage(siteUrl, g))}" alt="" loading="lazy" onclick="window.open('${esc(safeImage(siteUrl, g))}','_blank')">`).join('')}
    </div>
  ` : ''}

  <div class="article-v41-content">
    <div>
      <article class="article-v41-body">${esc(bodyText)}</article>

      <div class="article-v41-share" aria-label="مشاركة الخبر">
        <a class="primary" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(n.title)}%20${encodeURIComponent(pageUrl)}">واتساب</a>
        <a target="_blank" rel="noopener" href="https://t.me/share/url?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(n.title)}">تيليجرام</a>
        <a target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}">فيسبوك</a>
        <a target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(n.title)}&url=${encodeURIComponent(pageUrl)}">X</a>
        <button id="copyLink" type="button">نسخ الرابط</button>
        <button id="nativeShare" type="button">مشاركة</button>
      </div>

      ${relatedRows.length ? `
      <section class="article-v41-section">
        <div class="article-v41-section-head">
          <h2>أخبار ذات صلة</h2><span>من جولة</span>
        </div>
        <div class="article-v41-related">
          ${relatedRows.map(r => `
            <a class="article-v41-related-card" href="/news/${r.id}">
              <img src="${esc(safeImage(siteUrl, r.image))}" alt="" loading="lazy">
              <div>
                <small>${esc(r.category || n.category || 'أخبار')}</small>
                <strong>${esc(r.title)}</strong>
              </div>
            </a>
          `).join('')}
        </div>
      </section>` : ''}

      ${n.poll_question ? `
      <section class="article-v41-section">
        <div class="article-v41-section-head">
          <h3>صوت القراء</h3><span>شارك برأيك</span>
        </div>
        <div class="article-v41-panel">
          <h3 style="margin-top:0">${esc(n.poll_question)}</h3>
          <div id="pollOptions"><p style="opacity:.6;font-size:13px">جاري التحميل...</p></div>
        </div>
      </section>` : ''}

      ${n.is_live ? `
      <section class="article-v41-section">
        <div class="article-v41-section-head">
          <h3>🔴 آخر التحديثات</h3><span>تغطية مباشرة</span>
        </div>
        <div class="article-v41-panel" id="liveUpdates"><p style="opacity:.6;font-size:13px">جاري التحميل...</p></div>
      </section>` : ''}

      <section class="article-v41-section">
        <div class="article-v41-section-head">
          <h3>التعليقات</h3><span>شارك باحترام</span>
        </div>
        <div class="article-v41-panel">
          <div id="commentsList" class="article-v41-comment-list"><p style="opacity:.6;font-size:13px">جاري تحميل التعليقات...</p></div>
          <form id="commentForm" class="article-v41-form">
            <input id="cName" placeholder="اسمك (اختياري)" maxlength="80">
            <textarea id="cBody" placeholder="اكتب تعليقك..." required maxlength="2000"></textarea>
            <button class="article-v41-btn" type="submit">نشر التعليق</button>
          </form>
        </div>
      </section>

      <div class="article-v41-bottom">
        <a class="article-v41-back" href="/">← العودة إلى الأخبار</a>
        <span style="color:var(--luxy-muted);font-size:11px">جولة · حيث التغطية والتوثيق</span>
      </div>
    </div>

    <aside class="article-v41-side">
      <div class="article-v41-side-card">
        <div class="article-v41-side-label">التصنيف</div>
        <div class="article-v41-side-value">${esc(n.category || 'أخبار')}</div>
      </div>
      <div class="article-v41-side-card">
        <div class="article-v41-side-label">المراسل</div>
        <div class="article-v41-side-value">${esc(n.reporter || 'جولة')}</div>
      </div>
      <div class="article-v41-side-card">
        <div class="article-v41-side-label">زمن القراءة</div>
        <div class="article-v41-side-value">${minutes} دقيقة تقريبًا</div>
      </div>
      <div class="article-v41-side-card">
        <div class="article-v41-side-label">رابط الخبر</div>
        <div class="article-v41-side-value" style="font-size:11px;word-break:break-all">${esc(pageUrl)}</div>
      </div>
    </aside>
  </div>
</main>

<div class="article-v41-mobile-share">
  <a class="main" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(n.title)}%20${encodeURIComponent(pageUrl)}">واتساب</a>
  <button id="mobileCopy" type="button">نسخ</button>
  <button id="mobileNative" type="button">مشاركة</button>
</div>

<footer class="article-v41-footer">
  <div class="article-v41-footer-inner">
    <strong>جولة | ALGWOLA</strong>
    <small>حيث التغطية والتوثيق</small>
  </div>
</footer>

</div>

<script>
(function(){
  var ARTICLE_ID = ${Number(n.id)};
  var PAGE_URL = ${JSON.stringify(pageUrl)};

  var darkBtn = document.getElementById('darkModeToggle');
  function applyTheme(){
    var dark = localStorage.getItem('gwola-theme') === 'dark';
    document.body.classList.toggle('dark', dark);
    if(darkBtn) darkBtn.textContent = dark ? '☀' : '🌙';
  }
  applyTheme();
  if(darkBtn){
    darkBtn.onclick = function(){
      var dark = document.body.classList.toggle('dark');
      localStorage.setItem('gwola-theme', dark ? 'dark' : 'light');
      darkBtn.textContent = dark ? '☀' : '🌙';
    };
  }

  function copyLink(button){
    var done = function(){
      var old = button.textContent;
      button.textContent = 'تم النسخ ✓';
      setTimeout(function(){ button.textContent = old; }, 1500);
    };
    if(navigator.clipboard){
      navigator.clipboard.writeText(PAGE_URL).then(done).catch(function(){});
    }else{
      var input=document.createElement('input');
      input.value=PAGE_URL; document.body.appendChild(input); input.select();
      try{document.execCommand('copy'); done();}catch(e){}
      input.remove();
    }
  }

  ['copyLink','mobileCopy'].forEach(function(id){
    var el=document.getElementById(id);
    if(el) el.onclick=function(){copyLink(el);};
  });

  function nativeShare(){
    if(navigator.share){
      navigator.share({
        title: ${JSON.stringify(n.title)},
        text: ${JSON.stringify(n.excerpt || '')},
        url: PAGE_URL
      }).catch(function(){});
    }else{
      var el=document.getElementById('copyLink');
      if(el) copyLink(el);
    }
  }

  ['nativeShare','mobileNative'].forEach(function(id){
    var el=document.getElementById(id);
    if(el) el.onclick=nativeShare;
  });

  function escHtml(s){
    return String(s).replace(/[&<>"']/g, function(m){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m];
    });
  }

  function loadComments(){
    fetch('/api/engage?type=comments&article_id='+ARTICLE_ID)
      .then(function(r){return r.json();})
      .then(function(rows){
        var list=document.getElementById('commentsList');
        if(!Array.isArray(rows)||!rows.length){
          list.innerHTML='<p style="opacity:.6;font-size:13px">لا توجد تعليقات بعد، كن أول من يعلّق.</p>';
          return;
        }
        list.innerHTML=rows.map(function(c){
          return '<div class="article-v41-comment"><b>'+escHtml(c.name||'زائر')+'</b><p>'+escHtml(c.body||'')+'</p></div>';
        }).join('');
      }).catch(function(){});
  }
  loadComments();

  var cf=document.getElementById('commentForm');
  if(cf){
    cf.addEventListener('submit',function(e){
      e.preventDefault();
      var btn=cf.querySelector('button');
      var name=document.getElementById('cName').value.trim();
      var body=document.getElementById('cBody').value.trim();
      if(!body)return;
      btn.disabled=true; btn.textContent='جاري النشر...';
      fetch('/api/engage?type=comments',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({article_id:ARTICLE_ID,name:name,body:body})
      }).then(function(r){return r.json();})
       .then(function(){
         document.getElementById('cName').value='';
         document.getElementById('cBody').value='';
         loadComments();
       }).catch(function(){})
       .finally(function(){btn.disabled=false;btn.textContent='نشر التعليق';});
    });
  }

  var pollBox=document.getElementById('pollOptions');
  if(pollBox){
    function loadPoll(){
      fetch('/api/engage?type=poll&article_id='+ARTICLE_ID)
        .then(function(r){return r.json();})
        .then(function(opts){
          if(!Array.isArray(opts)||!opts.length){pollBox.innerHTML='<p style="opacity:.6;font-size:13px">لا توجد خيارات متاحة.</p>';return;}
          var voted=localStorage.getItem('gwola-voted-'+ARTICLE_ID);
          var total=opts.reduce(function(s,o){return s+Number(o.votes||0);},0)||1;
          pollBox.innerHTML=opts.map(function(o){
            var pct=Math.round((Number(o.votes||0)/total)*100);
            if(voted){
              return '<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px"><span>'+escHtml(o.option_text)+'</span><b>'+pct+'%</b></div><div class="article-v41-progress"><div style="width:'+pct+'%"></div></div></div>';
            }
            return '<button type="button" class="article-v41-poll-option" onclick="votePoll('+Number(o.id)+')">'+escHtml(o.option_text)+'</button>';
          }).join('');
        }).catch(function(){});
    }
    window.votePoll=function(optionId){
      fetch('/api/engage?type=poll',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:'vote',option_id:optionId})
      }).then(function(){
        localStorage.setItem('gwola-voted-'+ARTICLE_ID,'1');
        loadPoll();
      }).catch(function(){});
    };
    loadPoll();
  }

  var liveBox=document.getElementById('liveUpdates');
  if(liveBox){
    function loadLive(){
      fetch('/api/engage?type=live&article_id='+ARTICLE_ID)
        .then(function(r){return r.json();})
        .then(function(rows){
          if(!Array.isArray(rows)||!rows.length){
            liveBox.innerHTML='<p style="opacity:.6;font-size:13px">لا توجد تحديثات بعد.</p>';
            return;
          }
          liveBox.innerHTML=rows.map(function(u){
            var t=new Date(u.created_at);
            var time=String(t.getHours()).padStart(2,'0')+':'+String(t.getMinutes()).padStart(2,'0');
            return '<div class="article-v41-live-item"><small>'+time+'</small><p>'+escHtml(u.body||'')+'</p></div>';
          }).join('');
        }).catch(function(){});
    }
    loadLive();
    setInterval(loadLive,30000);
  }
})();
</script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.status(200).send(html);
  } catch (err) {
    res.status(500).send(`<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>خطأ | جولة</title><body><h1>تعذر عرض الخبر</h1><p>${esc(err.message)}</p><a href="/">العودة للرئيسية</a></body></html>`);
  }
};
