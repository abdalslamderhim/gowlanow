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
    // ---- قائمة أعضاء الفريق (عامة، JSON — تستخدمها الصفحة الرئيسية) ----
    if (req.method === 'GET' && qs.list === 'team') {
      const { rows } = await pool.query('SELECT * FROM team ORDER BY order_index ASC, id ASC');
      return res.status(200).json(rows);
    }

    // ---- عمليات إدارة الفريق (تتطلب توثيقًا) ----
    if (req.method === 'POST') {
      if (!isAuthed(req)) return res.status(401).json({ error: 'غير مصرح' });
      const { rows } = await pool.query(
        `INSERT INTO team (name, role, photo, bio, order_index) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [body.name || '', body.role || '', body.photo || '', body.bio || '', Number(body.order_index) || 0]
      );
      return res.status(200).json(rows[0]);
    }
    if (req.method === 'PUT') {
      if (!isAuthed(req)) return res.status(401).json({ error: 'غير مصرح' });
      if (!body.id) return res.status(400).json({ error: 'id مطلوب' });
      const { rows } = await pool.query(
        `UPDATE team SET name=$1, role=$2, photo=$3, bio=$4, order_index=$5 WHERE id=$6 RETURNING *`,
        [body.name || '', body.role || '', body.photo || '', body.bio || '', Number(body.order_index) || 0, body.id]
      );
      return res.status(200).json(rows[0]);
    }
    if (req.method === 'DELETE') {
      if (!isAuthed(req)) return res.status(401).json({ error: 'غير مصرح' });
      const id = Number(qs.id || body.id);
      if (!id) return res.status(400).json({ error: 'id مطلوب' });
      await pool.query('DELETE FROM team WHERE id = $1', [id]);
      return res.status(200).json({ ok: true });
    }

    // ---- صفحة "من نحن" العامة (GET بدون list=team) ----
    const { rows } = await pool.query('SELECT * FROM team ORDER BY order_index ASC, id ASC');

    const teamHtml = rows.length
      ? rows.map((m) => `<div class="team-card">
          <img src="${esc(m.photo || 'assets/studio.jpg')}" alt="${esc(m.name)}">
          <h3>${esc(m.name)}</h3>
          <span>${esc(m.role || '')}</span>
          ${m.bio ? `<p>${esc(m.bio)}</p>` : ''}
        </div>`).join('')
      : `<p style="opacity:.7">لم تتم إضافة أعضاء الفريق بعد.</p>`;

    const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>من نحن | جولة</title>
<meta name="description" content="تعرّف على قناة جولة وفريق العمل القائم عليها.">
<link rel="canonical" href="${siteUrl}/about">
<link rel="stylesheet" href="/styles.css">
<link rel="stylesheet" href="/dark-mode.css">
<style>
  .about-wrap{max-width:900px;margin:0 auto;padding:24px 16px}
  .about-intro{text-align:center;margin-bottom:36px}
  .about-intro img{height:70px;margin-bottom:12px}
  .about-intro p{line-height:1.9;font-size:16px;max-width:640px;margin:12px auto 0}
  .team-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:18px}
  .team-card{text-align:center;background:#f5f7fb;border-radius:12px;padding:18px 12px}
  .team-card img{width:88px;height:88px;border-radius:50%;object-fit:cover;margin-bottom:10px}
  .team-card h3{font-size:15px;margin:4px 0 2px}
  .team-card span{font-size:12px;color:var(--b,#1439d8);font-weight:700}
  .team-card p{font-size:12px;color:#7a8497;margin-top:8px;line-height:1.6}
  body.dark .team-card{background:#10162a!important}
  .share-row{display:flex;flex-wrap:wrap;gap:8px}
  .share-btn{flex:1 1 auto;min-width:90px;text-align:center;padding:10px 14px;border-radius:7px;font-size:12px;font-weight:800;text-decoration:none;color:#fff;border:none;cursor:pointer}
  .share-btn.wa{background:#25D366}.share-btn.x{background:#000}.share-btn.fb{background:#1877F2}.share-btn.copy{background:var(--b,#1439d8)}
</style>
</head>
<body>
<header><div class="wrap head" style="padding:16px 0;display:flex;align-items:center;justify-content:space-between">
<a class="brand" href="/"><img src="/assets/logo.jpg" style="height:40px"><strong> جولة</strong></a>
<button class="darkmode" id="darkModeToggle" aria-label="تبديل الوضع الليلي" title="الوضع الليلي">🌙</button>
</div></header>
<main class="about-wrap">
<div class="about-intro">
<img src="/assets/logo.jpg">
<h1>عن قناة جولة</h1>
<p>قناة جولة — حيث التغطية والتوثيق. صوت العودة وحكايات المكان. تهدف القناة إلى توثيق وسرد وإحياء قصص العودة إلى الوطن؛ عبر حلقات ميدانية، لقاءات مع العائلات والناشطين، تقارير ثقافية، وجولات افتراضية في الأماكن التي تحمل ذاكرة جماعية.</p>
</div>
<h2 style="margin-bottom:16px">فريق العمل</h2>
<div class="team-grid">${teamHtml}</div>
<div class="share-row" style="margin-top:32px">
  <a class="share-btn wa" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent('تعرّف على قناة جولة وفريق العمل')}%20${encodeURIComponent(siteUrl + '/about')}">واتساب</a>
  <a class="share-btn x" target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?text=${encodeURIComponent('تعرّف على قناة جولة وفريق العمل')}&url=${encodeURIComponent(siteUrl + '/about')}">X</a>
  <a class="share-btn fb" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(siteUrl + '/about')}">فيسبوك</a>
  <a class="share-btn tg" target="_blank" rel="noopener" href="https://t.me/share/url?url=${encodeURIComponent(siteUrl + '/about')}&text=${encodeURIComponent('تعرّف على قناة جولة وفريق العمل')}">تيليجرام</a>
  <button class="share-btn copy" id="copyLink" type="button">نسخ الرابط</button>
</div>
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
  if(c){c.onclick=function(){
    navigator.clipboard && navigator.clipboard.writeText(location.href);
    var old=c.textContent; c.textContent='تم النسخ ✓';
    setTimeout(function(){c.textContent=old;},1500);
  };}
</script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    res.status(200).send(html);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
