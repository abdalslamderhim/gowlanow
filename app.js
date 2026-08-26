const FN = '/api';
const $ = (s) => document.querySelector(s);

// نسخة احتياطية تُستخدم فقط لو تعذّر الاتصال بالخادم (حتى لا تظهر صفحة فارغة)
const fallbackSeed = [
  { id: 1, title: 'جولة تتابع آخر المستجدات من الميدان', category: 'محلي', excerpt: 'تغطية مستمرة لأبرز الأحداث والوقائع مع تحديثات من مراسلي جولة.', body: 'تتابع قناة جولة الحدث من الميدان وتنقل التفاصيل أولاً بأول.', image: 'assets/studio.jpg', status: 'published', breaking: true, featured: true, views: 1840, time_label: 'الآن' },
];

function esc(v = '') { return String(v).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m])); }

async function getNews() {
  try {
    const res = await fetch(`${FN}/articles`);
    if (!res.ok) throw new Error('bad response');
    const rows = await res.json();
    return Array.isArray(rows) && rows.length ? rows : fallbackSeed;
  } catch {
    return fallbackSeed;
  }
}

async function getReporters() {
  try {
    const res = await fetch(`${FN}/reporters`);
    if (!res.ok) throw new Error('bad response');
    const rows = await res.json();
    return Array.isArray(rows) && rows.length ? rows : [];
  } catch {
    return [];
  }
}

async function getPrograms() {
  try {
    const res = await fetch(`${FN}/programs`);
    if (!res.ok) throw new Error('bad response');
    const rows = await res.json();
    return Array.isArray(rows) && rows.length ? rows : [];
  } catch {
    return [];
  }
}

function render(d, reps, programs) {
  const news = d.filter(n => n.status === 'published').sort((a, b) => Number(b.id) - Number(a.id));
  const breaking = news.filter(n => n.breaking);
  $('#breaking').textContent = breaking[0]?.title || 'جولة تتابع آخر المستجدات من الميدان';

  const featured = news.find(n => n.featured) || news[0];
  if (featured) {
    const hero = document.querySelector('.hero-main');
    if (hero) { hero.innerHTML = `<img src="${esc(featured.image || 'assets/studio.jpg')}" alt=""><div class="shade"></div><div class="hero-copy"><span>${esc(featured.category || 'جولة')}</span><h1>${esc(featured.title)}</h1><p>${esc(featured.excerpt || 'خبر من الميدان، صورة تحفظ الذاكرة، وتقرير يضع الحدث في سياقه.')}</p><a class="cta" href="#latest" onclick="openStory(${featured.id})">اقرأ الخبر ←</a></div>`; }
  }

  $('#top').innerHTML = news.filter(n => n.id !== featured?.id).slice(0, 4).map(n => `<article class="top-item" onclick="openStory(${n.id})"><span>${esc(n.category)}</span><h3>${esc(n.title)}</h3></article>`).join('');
  $('#news').innerHTML = news.map(n => `<article class="news-row" onclick="openStory(${n.id})"><time>${esc(n.time_label || 'اليوم')}</time><div><span>${esc(n.category)}</span><strong>${esc(n.title)}</strong><p>${esc(n.excerpt || '')}</p></div></article>`).join('');

  const popular = [...news].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);
  $('#popular').innerHTML = popular.map((n, i) => `<div class="pop" onclick="openStory(${n.id})"><b>${String(i + 1).padStart(2, '0')}</b><span>${esc(n.title)}</span></div>`).join('');

  const cov = news.filter(n => ['تغطيات جولة', 'توثيق', 'مجتمع'].includes(n.category)).slice(0, 4);
  $('#coverageGrid').innerHTML = cov.map(n => `<article class="card" onclick="openStory(${n.id})"><div class="card-img" style="background-image:url('${esc(n.image || 'assets/studio.jpg')}')"></div><div class="card-body"><span>${esc(n.category)}</span><h3>${esc(n.title)}</h3><p>${esc(n.reporter || 'جولة')} · ${esc(n.time_label || '')}</p></div></article>`).join('');

  const reports = news.filter(n => n.category === 'تقارير').slice(0, 3);
  if (reports.length) {
    $('#reportsGrid').innerHTML = reports.map(n => `<article onclick="openStory(${n.id})"><span>${esc(n.category)}</span><h3>${esc(n.title)}</h3><p>${esc(n.excerpt || '')}</p></article>`).join('');
  }

  const activePrograms = programs.length ? programs : [{ title: 'صوت المجتمع', description: 'برنامج اجتماعي يضع الإنسان في قلب القصة.' }, { title: 'من الميدان', description: 'حوار وتغطية مباشرة من موقع الحدث.' }, { title: 'ذاكرة المكان', description: 'توثيق للقصص والأماكن والشهادات.' }];
  $('#programsGrid').innerHTML = activePrograms.map(p => `<article class="program"><i>${esc((p.title || '?').slice(0, 1))}</i><div><h3>${esc(p.title)}</h3><p>${esc(p.description || '')}</p></div></article>`).join('');

  let vids = news.filter(n => n.category === 'فيديو');
  if (vids.length < 4) { vids = vids.concat(news.filter(n => n.category !== 'فيديو')).slice(0, 4); } else { vids = vids.slice(0, 4); }
  $('#videosGrid').innerHTML = vids.map(n => `<article class="video" onclick="openStory(${n.id})"><div class="thumb" style="background-image:url('${esc(n.image || 'assets/studio.jpg')}')"><button class="play" onclick="event.stopPropagation();openStory(${n.id})">▶</button></div><h3>${esc(n.title)}</h3><span>${esc(n.category)}</span></article>`).join('');

  const activeReps = reps.length ? reps : [{ name: 'أحمد محمد', role: 'مراسل ميداني', region: 'الوسط' }, { name: 'محمد عمر', role: 'مراسل جولة', region: 'الشرق' }];
  $('#reportersGrid').innerHTML = activeReps.map(p => `<article class="person"><div class="avatar">${esc(p.name.slice(0, 1))}</div><h3>${esc(p.name)}</h3><p>${esc(p.role)}</p><span>${esc(p.region)}</span></article>`).join('');
}

let allNews = [];
function openStory(id) {
  const n = allNews.find(x => x.id === id); if (!n) return;
  const modal = $('#modal'); modal.classList.add('open');
  const box = modal.querySelector('.modal-box');
  const shareUrl = `${location.origin}/article/${n.id}`;
  box.innerHTML = `<button id="closeStory">×</button><img class="story-image" src="${esc(n.image || 'assets/studio.jpg')}" alt=""><span class="story-cat">${esc(n.category)}</span><h2>${esc(n.title)}</h2><small>${esc(n.reporter || 'جولة')} · ${esc(n.time_label || '')}</small><p class="story-body">${esc(n.body || n.excerpt || '')}</p><div class="share-row"><button id="shareNativeBtn" type="button">📤 مشاركة</button><a href="https://wa.me/?text=${encodeURIComponent(n.title + ' - ' + shareUrl)}" target="_blank" rel="noopener">واتساب</a><a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(n.title)}&url=${encodeURIComponent(shareUrl)}" target="_blank" rel="noopener">تويتر</a></div>`;
  $('#closeStory').onclick = () => modal.classList.remove('open');
  const shareBtn = $('#shareNativeBtn');
  if (shareBtn) shareBtn.onclick = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: n.title, text: n.excerpt || '', url: shareUrl }); } catch { /* user cancelled */ }
    } else {
      try { await navigator.clipboard.writeText(shareUrl); alert('تم نسخ رابط الخبر'); } catch { prompt('انسخي رابط الخبر:', shareUrl); }
    }
  };
}

async function load() {
  const [news, reps, programs] = await Promise.all([getNews(), getReporters(), getPrograms()]);
  allNews = news.map(n => ({ ...n, id: Number(n.id) }));
  render(allNews, reps, programs);
  const params = new URLSearchParams(location.search);
  const articleId = Number(params.get('article'));
  if (articleId && allNews.some(n => n.id === articleId)) {
    openStory(articleId);
  }
}

$('#search').onclick = () => { $('#modal').classList.add('open'); $('#q').focus(); };
$('#close').onclick = () => $('#modal').classList.remove('open');
$('#q').oninput = e => {
  const q = e.target.value.trim().toLowerCase();
  const results = allNews.filter(n => n.status === 'published' && (n.title + n.excerpt + n.category).toLowerCase().includes(q)).slice(0, 10);
  $('#results').innerHTML = q ? (results.map(r => `<div class="result"><b>${esc(r.title)}</b><small>${esc(r.category)} · ${esc(r.time_label || '')}</small></div>`).join('') || '<p>لا توجد نتائج.</p>') : '';
};
$('#menu').onclick = () => $('#nav').classList.toggle('open');

load();
