const FN = '/api';
const $ = s => document.querySelector(s);
let current = 'dashboard', editId = null;
let TOKEN = sessionStorage.getItem('gowla_admin_token') || '';
let articlesCache = [];
let reportersCache = [];
let teamCache = [];
let teamFormMode = null; // null = list view, 'new' = adding, or a member id = editing

function esc(v = '') { return String(v).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m])); }
function statusLabel(s) { return s === 'published' ? 'منشور' : s === 'draft' ? 'مسودة' : s === 'archived' ? 'مؤرشف' : 'مجدول'; }
function authHeaders() { return TOKEN ? { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }; }
function get() { return articlesCache; }
function reps() { return reportersCache; }
function teamMembers() { return teamCache; }

function handleAuthExpired() {
  TOKEN = ''; sessionStorage.removeItem('gowla_admin_token');
  $('#shell').classList.add('hidden'); $('#login').classList.remove('hidden');
  if ($('#loginMsg')) $('#loginMsg').textContent = 'انتهت الجلسة، سجّلي الدخول مرة أخرى.';
}

async function loadArticles() {
  try {
    const res = await fetch(`${FN}/articles`, { headers: authHeaders() });
    if (res.status === 401) { handleAuthExpired(); return; }
    const rows = await res.json();
    articlesCache = Array.isArray(rows) ? rows.map(r => ({ ...r, id: Number(r.id) })) : [];
  } catch { articlesCache = []; }
}
async function loadReporters() {
  try {
    const res = await fetch(`${FN}/reporters`, { headers: authHeaders() });
    if (res.status === 401) { handleAuthExpired(); return; }
    const rows = await res.json();
    reportersCache = Array.isArray(rows) ? rows.map(r => ({ ...r, id: Number(r.id) })) : [];
  } catch { reportersCache = []; }
}
async function loadTeam() {
  try {
    const res = await fetch(`${FN}/team`, { headers: authHeaders() });
    if (res.status === 401) { handleAuthExpired(); return; }
    const rows = await res.json();
    teamCache = Array.isArray(rows) ? rows.map(r => ({ ...r, id: Number(r.id) })) : [];
  } catch { teamCache = []; }
}

async function boot() {
  $('#login').classList.add('hidden'); $('#shell').classList.remove('hidden');
  $('#who').textContent = 'متصل بقاعدة البيانات الحقيقية'; $('#role').textContent = 'V4';
  await Promise.all([loadArticles(), loadReporters()]);
  render();
}

// --- تسجيل الدخول ---
// كلمة المرور تُتحقق منها على الخادم (ضمن متغير بيئة ADMIN_PASSWORD في إعدادات Netlify)،
// ولا تُخزَّن أبدًا داخل هذا الملف. التوكن الناتج صالح لمدة 12 ساعة فقط.
async function attemptLogin() {
  const val = ($('#loginPass')?.value || '').trim();
  if (!val) return;
  if ($('#loginMsg')) $('#loginMsg').textContent = 'جاري التحقق...';
  try {
    const res = await fetch(`${FN}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: val }) });
    const data = await res.json();
    if (res.ok && data.token) {
      TOKEN = data.token; sessionStorage.setItem('gowla_admin_token', TOKEN);
      if ($('#loginMsg')) $('#loginMsg').textContent = '';
      await boot();
    } else {
      if ($('#loginMsg')) $('#loginMsg').textContent = data.error || 'كلمة المرور غير صحيحة';
    }
  } catch {
    if ($('#loginMsg')) $('#loginMsg').textContent = 'تعذر الاتصال بالخادم. تحققي من الاتصال وحاولي مجددًا.';
  }
}
if ($('#loginBtn')) $('#loginBtn').onclick = attemptLogin;
if ($('#loginPass')) $('#loginPass').addEventListener('keydown', e => { if (e.key === 'Enter') attemptLogin(); });
$('#logout').onclick = () => { TOKEN = ''; sessionStorage.removeItem('gowla_admin_token'); location.href = '/'; };
if (TOKEN) { boot(); }

// --- القائمة الجانبية على الجوال ---
if ($('#asideToggle')) $('#asideToggle').onclick = () => $('#aside').classList.toggle('open');
document.querySelectorAll('.tab').forEach(b => b.onclick = () => {
  current = b.dataset.view; editId = null; teamFormMode = null;
  document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  if ($('#aside')) $('#aside').classList.remove('open');
  render();
});

async function render() {
  if (current === 'dashboard') { await loadArticles(); dashboard(); }
  else if (current === 'articles') { await loadArticles(); articles(); }
  else if (current === 'new') { await Promise.all([loadArticles(), loadReporters()]); form(); }
  else if (current === 'reporters') { await loadReporters(); reporters(); }
  else if (current === 'team') { await loadTeam(); team(); }
}

function dashboard() {
  const a = get(); const pub = a.filter(x => x.status === 'published');
  $('#title').textContent = 'نظرة عامة';
  $('#view').innerHTML = `<div class="content"><div class="notice"><b>V4</b> — غرفة أخبار متصلة بقاعدة بيانات حقيقية. أي خبر تنشرينه يظهر مباشرة لكل زوار الموقع من أي جهاز.</div><div class="stats"><div class="stat"><b>${pub.length}</b><span>منشور</span></div><div class="stat"><b>${a.filter(x => x.status === 'draft').length}</b><span>مسودات</span></div><div class="stat"><b>${a.filter(x => x.status === 'scheduled').length}</b><span>مجدول</span></div><div class="stat"><b>${a.filter(x => x.status === 'archived').length}</b><span>مؤرشف</span></div><div class="stat"><b>${a.filter(x => x.breaking).length}</b><span>عاجل</span></div></div><div class="panel"><div class="panel-title"><h2>آخر المواد</h2><button class="btn" onclick="current='new';editId=null;render()">+ خبر جديد</button></div>${a.slice().sort((x, y) => y.id - x.id).slice(0, 8).map(x => `<div class="tr"><span class="badge ${x.status}">${statusLabel(x.status)}</span><span>${esc(x.title)}</span><span class="hide">${esc(x.category)}</span><span>${Number(x.views || 0).toLocaleString('ar')} مشاهدة</span></div>`).join('')}</div></div>`;
}

function articles() {
  const a = get();
  $('#title').textContent = 'الأخبار';
  $('#view').innerHTML = `<div class="content"><div class="toolbar"><div><h2>إدارة الأخبار</h2><small>${a.length} مادة</small></div><button class="btn red" onclick="current='new';editId=null;render()">+ خبر جديد</button></div><div class="filters"><input id="searchArticles" placeholder="ابحث في العناوين..." oninput="filterArticles()"><select id="filterStatus" onchange="filterArticles()"><option value="">كل الحالات</option><option value="published">منشور</option><option value="draft">مسودة</option><option value="scheduled">مجدول</option><option value="archived">مؤرشف</option></select><select id="filterCat" onchange="filterArticles()"><option value="">كل التصنيفات</option>${['محلي', 'السودان', 'العالم', 'تغطيات جولة', 'توثيق', 'تقارير', 'برامج', 'مجتمع', 'فيديو'].map(c => `<option>${c}</option>`).join('')}</select></div><div id="articleTable" class="table"></div></div>`;
  filterArticles();
}

function filterArticles() {
  const a = get();
  const q = ($('#searchArticles')?.value || '').toLowerCase();
  const st = $('#filterStatus')?.value || '';
  const cat = $('#filterCat')?.value || '';
  const list = a.filter(x => (!q || x.title.toLowerCase().includes(q)) && (st ? x.status === st : x.status !== 'archived') && (!cat || x.category === cat));
  $('#articleTable').innerHTML = `<div class="tr head"><span>الحالة</span><span>العنوان</span><span>التصنيف</span><span>إجراء</span></div>` +
    list.map(x => `<div class="tr"><span><i class="dot ${x.breaking ? 'red-dot' : ''}"></i>${statusLabel(x.status)}</span><span><b>${esc(x.title)}</b><small class="meta">${x.reporter ? esc(x.reporter) : 'بدون مراسل'} ${x.featured ? ' • رئيسي' : ''} ${x.breaking ? ' • عاجل' : ''}</small></span><span class="hide">${esc(x.category)}</span><span class="actions"><button onclick="edit(${x.id})">تعديل</button><button onclick="toggleFeatured(${x.id})">${x.featured ? 'إلغاء الرئيسي' : 'رئيسي'}</button>${x.status === 'archived' ? `<button onclick="restore(${x.id})">استعادة</button>` : `<button class="red" onclick="archive(${x.id})">أرشفة</button>`}</span></div>`).join('') +
    (list.length ? '' : '<div class="empty">لا توجد مواد مطابقة.</div>');
}

function toLocalInputValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const pad = x => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function form() {
  const n = editId ? get().find(x => x.id === editId) : { title: '', excerpt: '', body: '', status: 'draft', breaking: false, featured: false, category: 'محلي', image: 'assets/studio.jpg', views: 0, time_label: 'الآن', reporter: '', scheduled_at: null, video_url: '' };
  const rs = reps();
  $('#title').textContent = editId ? 'تعديل خبر' : 'خبر جديد';
  $('#view').innerHTML = `<div class="content"><div class="form"><div class="form-head"><div><h2>${editId ? 'تعديل الخبر' : 'إنشاء خبر جديد'}</h2><small>اكتب، ارفع الصورة، ثم اختر حالة النشر.</small></div><span class="live-chip" id="draftChip">غرفة الأخبار</span></div><div class="grid"><div class="field full"><label>عنوان الخبر *</label><input id="fTitle" value="${esc(n.title)}" placeholder="عنوان واضح ومباشر"></div><div class="field"><label>التصنيف</label><select id="fCat">${['محلي', 'السودان', 'العالم', 'تغطيات جولة', 'توثيق', 'تقارير', 'برامج', 'مجتمع', 'فيديو'].map(c => `<option ${n.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div><div class="field"><label>الحالة</label><select id="fStatus"><option value="draft" ${n.status === 'draft' ? 'selected' : ''}>مسودة</option><option value="published" ${n.status === 'published' ? 'selected' : ''}>منشور</option><option value="scheduled" ${n.status === 'scheduled' ? 'selected' : ''}>مجدول</option><option value="archived" ${n.status === 'archived' ? 'selected' : ''}>مؤرشف</option></select></div><div class="field"><label>موعد النشر (عند اختيار "مجدول")</label><input id="fSchedule" type="datetime-local" value="${toLocalInputValue(n.scheduled_at)}"></div><div class="field"><label>المراسل</label><select id="fReporter"><option value="">بدون مراسل</option>${rs.map(r => `<option ${n.reporter === r.name ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select></div><div class="field"><label>وقت العرض</label><input id="fTime" value="${esc(n.time_label || 'الآن')}" placeholder="الآن / قبل 10 دقائق"></div><div class="field full"><label>الملخص</label><input id="fExcerpt" value="${esc(n.excerpt)}" placeholder="ملخص يظهر في بطاقات الأخبار"></div><div class="field full"><label>رابط فيديو يوتيوب (اختياري — عادي أو Shorts)</label><input id="fVideoUrl" value="${esc(n.video_url || '')}" placeholder="https://www.youtube.com/watch?v=... أو https://youtube.com/shorts/..."></div><div class="field full"><label>نص الخبر</label><textarea id="fBody" placeholder="تفاصيل الخبر...">${esc(n.body)}</textarea></div><div class="field full"><label>صورة الغلاف</label><div class="upload"><input id="fImage" value="${esc(n.image || 'assets/studio.jpg')}" placeholder="رابط الصورة أو ارفع من الهاتف"><input id="fFile" type="file" accept="image/*" onchange="previewImage(this)"><img id="preview" src="${esc(n.image || 'assets/studio.jpg')}" onerror="this.style.display='none'"></div><small>يفضَّل رابط صورة خارجي (وليس رفعًا مباشرًا) — الصور المرفوعة كملف تُحوَّل لنص طويل جدًا وقد تفشل مع أحجام كبيرة.</small></div></div><div class="checks"><label><input id="fBreaking" type="checkbox" ${n.breaking ? 'checked' : ''}> 🔴 نشر كخبر عاجل</label><label><input id="fFeatured" type="checkbox" ${n.featured ? 'checked' : ''}> ⭐ وضع في الأخبار الرئيسية</label></div><div class="form-actions"><button class="btn" id="saveBtn" onclick="saveArticle()">حفظ الخبر</button><button class="btn ghost" onclick="discardDraftAndLeave()">إلغاء</button></div></div></div>`;
  restoreDraftIfAny();
  attachAutosave();
}

function previewImage(input) {
  const f = input.files?.[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => { $('#fImage').value = r.result; $('#preview').src = r.result; $('#preview').style.display = 'block'; };
  r.readAsDataURL(f);
}

async function saveArticle() {
  const item = {
    id: editId || undefined,
    title: $('#fTitle').value.trim() || 'خبر جديد',
    category: $('#fCat').value,
    excerpt: $('#fExcerpt').value.trim(),
    body: $('#fBody').value.trim(),
    image: $('#fImage').value.trim() || 'assets/studio.jpg',
    status: $('#fStatus').value,
    scheduled_at: $('#fSchedule').value ? new Date($('#fSchedule').value).toISOString() : null,
    video_url: $('#fVideoUrl').value.trim(),
    breaking: $('#fBreaking').checked,
    featured: $('#fFeatured').checked,
    reporter: $('#fReporter').value,
    time_label: $('#fTime').value.trim() || 'الآن',
  };
  const btn = $('#saveBtn'); if (btn) { btn.disabled = true; btn.textContent = 'جاري الحفظ...'; }
  try {
    const res = await fetch(`${FN}/articles`, { method: editId ? 'PUT' : 'POST', headers: authHeaders(), body: JSON.stringify(item) });
    if (res.status === 401) { handleAuthExpired(); return; }
    if (!res.ok) { alert('تعذر حفظ الخبر، حاولي مرة أخرى.'); if (btn) { btn.disabled = false; btn.textContent = 'حفظ الخبر'; } return; }
  } catch { alert('تعذر الاتصال بالخادم.'); if (btn) { btn.disabled = false; btn.textContent = 'حفظ الخبر'; } return; }
  clearDraftLocal();
  current = 'articles'; editId = null; await render();
}

// --- الحفظ التلقائي المحلي للمسودة (لا يُرسل شيئًا للخادم، فقط يحفظ في المتصفح) ---
function draftKey() { return editId ? `gwola_draft_edit_${editId}` : 'gwola_draft_new'; }

function collectDraftValues() {
  return {
    title: $('#fTitle')?.value || '',
    category: $('#fCat')?.value || '',
    excerpt: $('#fExcerpt')?.value || '',
    body: $('#fBody')?.value || '',
    image: $('#fImage')?.value || '',
    status: $('#fStatus')?.value || '',
    scheduled_at: $('#fSchedule')?.value || '',
    video_url: $('#fVideoUrl')?.value || '',
    reporter: $('#fReporter')?.value || '',
    time_label: $('#fTime')?.value || '',
    breaking: $('#fBreaking')?.checked || false,
    featured: $('#fFeatured')?.checked || false,
  };
}

function saveDraftLocal() {
  try { localStorage.setItem(draftKey(), JSON.stringify({ t: Date.now(), v: collectDraftValues() })); } catch {}
  const chip = $('#draftChip'); if (chip) chip.textContent = 'تم الحفظ التلقائي محليًا ✓';
}

function clearDraftLocal() {
  try { localStorage.removeItem(draftKey()); } catch {}
}

function applyDraftValues(v) {
  if (!v) return;
  if ($('#fTitle')) $('#fTitle').value = v.title || '';
  if ($('#fCat')) $('#fCat').value = v.category || $('#fCat').value;
  if ($('#fExcerpt')) $('#fExcerpt').value = v.excerpt || '';
  if ($('#fBody')) $('#fBody').value = v.body || '';
  if ($('#fImage')) { $('#fImage').value = v.image || ''; if ($('#preview')) $('#preview').src = v.image || ''; }
  if ($('#fStatus')) $('#fStatus').value = v.status || $('#fStatus').value;
  if ($('#fSchedule')) $('#fSchedule').value = v.scheduled_at || '';
  if ($('#fVideoUrl')) $('#fVideoUrl').value = v.video_url || '';
  if ($('#fReporter')) $('#fReporter').value = v.reporter || '';
  if ($('#fTime')) $('#fTime').value = v.time_label || '';
  if ($('#fBreaking')) $('#fBreaking').checked = !!v.breaking;
  if ($('#fFeatured')) $('#fFeatured').checked = !!v.featured;
}

function restoreDraftIfAny() {
  let raw;
  try { raw = localStorage.getItem(draftKey()); } catch { raw = null; }
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (confirm('يوجد مسودة محفوظة تلقائيًا لهذا الخبر لم تُرسَل بعد للخادم. هل تريد استعادتها؟')) {
      applyDraftValues(parsed.v);
    } else {
      clearDraftLocal();
    }
  } catch { clearDraftLocal(); }
}

let autosaveTimer = null;
function attachAutosave() {
  const view = $('#view');
  if (!view) return;
  view.addEventListener('input', () => {
    clearTimeout(autosaveTimer);
    const chip = $('#draftChip'); if (chip) chip.textContent = 'جاري الحفظ التلقائي...';
    autosaveTimer = setTimeout(saveDraftLocal, 800);
  });
}

function discardDraftAndLeave() {
  clearDraftLocal();
  current = 'articles'; editId = null; render();
}

function edit(id) { editId = id; current = 'new'; render(); }

async function archive(id) {
  if (!confirm('أرشفة الخبر؟ سيختفي من الموقع لكن يبقى محفوظًا ويمكن استعادته لاحقًا.')) return;
  try {
    const res = await fetch(`${FN}/articles?id=${id}`, { method: 'DELETE', headers: authHeaders() });
    if (res.status === 401) { handleAuthExpired(); return; }
  } catch { alert('تعذر الاتصال بالخادم.'); return; }
  await loadArticles(); filterArticles();
}

async function restore(id) {
  try {
    const res = await fetch(`${FN}/articles`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ id, action: 'restore' }) });
    if (res.status === 401) { handleAuthExpired(); return; }
  } catch { alert('تعذر الاتصال بالخادم.'); return; }
  await loadArticles(); filterArticles();
}

async function toggleFeatured(id) {
  const x = get().find(z => z.id === id); if (!x) return;
  const item = { ...x, featured: !x.featured };
  try {
    const res = await fetch(`${FN}/articles`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(item) });
    if (res.status === 401) { handleAuthExpired(); return; }
  } catch { alert('تعذر الاتصال بالخادم.'); return; }
  await render();
}

function reporters() {
  const r = reps();
  $('#title').textContent = 'المراسلون';
  $('#view').innerHTML = `<div class="content"><div class="toolbar"><div><h2>شبكة مراسلي جولة</h2><small>يمكن ربط كل خبر بمراسل.</small></div><button class="btn" onclick="addReporter()">+ مراسل</button></div><div class="panel">${r.map(x => `<div class="tr rep"><span class="avatar-mini">${esc(x.name.slice(0, 1))}</span><span><b>${esc(x.name)}</b><small class="meta">${esc(x.role)} • ${esc(x.region)}</small></span><span class="hide">${x.active ? 'نشط' : 'غير نشط'}</span><span><button class="actions-btn" onclick="editReporter(${x.id})">تعديل</button></span></div>`).join('')}</div></div>`;
}

async function addReporter() {
  const name = prompt('اسم المراسل'); if (!name) return;
  const role = prompt('الصفة', 'مراسل جولة') || 'مراسل جولة';
  const region = prompt('المنطقة', '') || '';
  try {
    const res = await fetch(`${FN}/reporters`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ name, role, region, active: true }) });
    if (res.status === 401) { handleAuthExpired(); return; }
  } catch { alert('تعذر الاتصال بالخادم.'); return; }
  await render();
}

async function editReporter(id) {
  const x = reps().find(z => z.id === id); if (!x) return;
  const name = prompt('اسم المراسل', x.name) || x.name;
  const role = prompt('الصفة', x.role) || x.role;
  const region = prompt('المنطقة', x.region) || x.region;
  try {
    const res = await fetch(`${FN}/reporters`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ id, name, role, region, active: x.active }) });
    if (res.status === 401) { handleAuthExpired(); return; }
  } catch { alert('تعذر الاتصال بالخادم.'); return; }
  await render();
}

function team() {
  if (teamFormMode !== null) { teamForm(); return; }
  const t = teamMembers();
  $('#title').textContent = 'فريق العمل';
  $('#view').innerHTML = `<div class="content"><div class="toolbar"><div><h2>فريق قناة جولة</h2><small>يظهر هذا الفريق في الصفحة الرئيسية وصفحة "من نحن" العامة للزوار.</small></div><button class="btn" onclick="teamFormMode='new';render()">+ عضو جديد</button></div><div class="panel">${t.map(x => `<div class="tr rep"><span class="avatar-mini" style="overflow:hidden">${x.photo ? `<img src="${esc(x.photo)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : esc((x.name || '؟').slice(0, 1))}</span><span><b>${esc(x.name)}</b><small class="meta">${esc(x.role || '')}</small></span><span class="hide">${esc(x.bio || '')}</span><span><button class="actions-btn" onclick="teamFormMode=${x.id};render()">تعديل</button><button class="actions-btn" onclick="delTeamMember(${x.id})">حذف</button></span></div>`).join('') || '<p style="opacity:.7;padding:16px">لا يوجد أعضاء بعد.</p>'}</div></div>`;
}

function teamForm() {
  const isNew = teamFormMode === 'new';
  const x = isNew ? { name: '', role: '', photo: '', bio: '', order_index: teamMembers().length } : teamMembers().find(m => m.id === teamFormMode);
  if (!x) { teamFormMode = null; team(); return; }
  $('#title').textContent = isNew ? 'عضو جديد' : 'تعديل عضو';
  $('#view').innerHTML = `<div class="content"><div class="form"><div class="form-head"><div><h2>${isNew ? 'إضافة عضو للفريق' : 'تعديل بيانات العضو'}</h2><small>الاسم والصفة يظهران في صفحة "من نحن".</small></div></div><div class="grid"><div class="field full"><label>الاسم *</label><input id="tName" value="${esc(x.name)}" placeholder="اسم العضو"></div><div class="field full"><label>الصفة</label><input id="tRole" value="${esc(x.role || '')}" placeholder="مثال: رئيس تحرير، مصور، معد برامج"></div><div class="field full"><label>نبذة قصيرة (اختياري)</label><input id="tBio" value="${esc(x.bio || '')}" placeholder="جملة أو جملتان عن العضو"></div><div class="field full"><label>صورة العضو</label><div class="upload"><input id="tPhoto" value="${esc(x.photo || '')}" placeholder="رابط الصورة أو ارفع من الهاتف"><input id="tFile" type="file" accept="image/*" onchange="previewTeamPhoto(this)"><img id="tPreview" src="${esc(x.photo || '')}" style="${x.photo ? '' : 'display:none'}" onerror="this.style.display='none'"></div><small>يفضَّل رابط صورة خارجي (وليس رفعًا مباشرًا) — الصور المرفوعة كملف تُحوَّل لنص طويل جدًا وقد تفشل مع أحجام كبيرة.</small></div></div><div class="form-actions"><button class="btn" id="tSaveBtn" onclick="saveTeamMember()">${isNew ? 'إضافة العضو' : 'حفظ التعديل'}</button><button class="btn ghost" onclick="teamFormMode=null;render()">إلغاء</button></div></div></div>`;
}

function previewTeamPhoto(input) {
  const f = input.files?.[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => { $('#tPhoto').value = r.result; $('#tPreview').src = r.result; $('#tPreview').style.display = 'block'; };
  r.readAsDataURL(f);
}

async function saveTeamMember() {
  const name = $('#tName').value.trim();
  if (!name) { alert('اسم العضو مطلوب.'); return; }
  const isNew = teamFormMode === 'new';
  const item = {
    id: isNew ? undefined : teamFormMode,
    name,
    role: $('#tRole').value.trim(),
    bio: $('#tBio').value.trim(),
    photo: $('#tPhoto').value.trim(),
    order_index: isNew ? teamMembers().length : (teamMembers().find(m => m.id === teamFormMode)?.order_index || 0),
  };
  const btn = $('#tSaveBtn'); if (btn) { btn.disabled = true; btn.textContent = 'جاري الحفظ...'; }
  try {
    const res = await fetch(`${FN}/team`, { method: isNew ? 'POST' : 'PUT', headers: authHeaders(), body: JSON.stringify(item) });
    if (res.status === 401) { handleAuthExpired(); return; }
    if (!res.ok) { alert('تعذر الحفظ، حاولي مرة أخرى.'); if (btn) { btn.disabled = false; btn.textContent = isNew ? 'إضافة العضو' : 'حفظ التعديل'; } return; }
  } catch { alert('تعذر الاتصال بالخادم.'); if (btn) { btn.disabled = false; btn.textContent = isNew ? 'إضافة العضو' : 'حفظ التعديل'; } return; }
  teamFormMode = null;
  await render();
}

async function delTeamMember(id) {
  if (!confirm('حذف هذا العضو من الفريق؟')) return;
  try {
    const res = await fetch(`${FN}/team?id=${id}`, { method: 'DELETE', headers: authHeaders() });
    if (res.status === 401) { handleAuthExpired(); return; }
    if (!res.ok) { alert('تعذر الحذف، حاولي مرة أخرى.'); return; }
  } catch { alert('تعذر الاتصال بالخادم.'); return; }
  await render();
}
