const $=s=>document.querySelector(s);
const state={articles:[],filtered:[],cat:'الكل'};
const cats=['الكل','محلي','السودان','العالم','تغطيات جولة','تقارير','مجتمع','برامج','فيديو'];

function esc(v=''){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
function image(v){return v?String(v).startsWith('http')?v:'/'+String(v).replace(/^\/+/,''):'/assets/studio.jpg';}
function card(n,featured=false){
  return `<a class="card ${featured?'featured-card':''}" href="/news/${n.id}">
    <img class="card-img" src="${esc(image(n.image))}" alt="${esc(n.title)}" loading="lazy" onerror="this.src='/assets/studio.jpg'">
    <div class="card-body"><span class="tag">${esc(n.category||'أخبار')}${n.breaking?' · عاجل':''}</span>
    <h3>${esc(n.title)}</h3>${n.excerpt?`<p>${esc(n.excerpt)}</p>`:''}<small class="meta">${esc(n.reporter||'جولة')} · ${esc(n.time_label||'اليوم')} · ${Number(n.views||0).toLocaleString('ar')} مشاهدة</small></div>
  </a>`;
}
async function load(){
  try{
    const r=await fetch('/api/home');
    if(!r.ok)throw Error();
    const data=await r.json();
    state.articles=Array.isArray(data.articles)?data.articles:[];
    render(data);
  }catch(e){render({articles:[]});}
}
function render(data){
  const a=state.articles;
  const breaking=a.filter(x=>x.breaking).slice(0,6);
  if(breaking.length){
    $('#breakingWrap').hidden=false;
    $('#breakingTrack').innerHTML=breaking.map(x=>`<a href="/news/${x.id}">${esc(x.title)}</a>`).join('<span>•</span>');
  }
  const featured=a.filter(x=>x.featured).slice(0,3);
  const main=featured.length?featured:a.slice(0,3);
  $('#featuredGrid').innerHTML=main.length?main.map(x=>card(x,true)).join(''):'<div class="empty">لا توجد أخبار منشورة بعد.</div>';
  $('#categoryFilters').innerHTML=cats.map(c=>`<button class="filter ${c===state.cat?'active':''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('');
  document.querySelectorAll('.filter').forEach(b=>b.onclick=()=>{state.cat=b.dataset.cat;applyFilter();});
  applyFilter();
  const counts={};
  a.forEach(x=>counts[x.category]=(counts[x.category]||0)+1);
  $('#sectionCards').innerHTML=['محلي','السودان','العالم','تغطيات جولة'].map(c=>`<a class="section-card" href="#latest" data-section="${esc(c)}"><b>${esc(c)}</b><span>${counts[c]||0} خبر منشور</span></a>`).join('');
  document.querySelectorAll('.section-card').forEach(b=>b.onclick=()=>{state.cat=b.dataset.section;applyFilter();});
  const vids=a.filter(x=>x.video_url).slice(0,3);
  $('#videoGrid').innerHTML=vids.length?vids.map(x=>`<a class="card video-card" href="/news/${x.id}"><div class="video-thumb"><img class="card-img" src="${esc(image(x.image))}" alt="" loading="lazy"><span class="video-play">▶</span></div><div class="card-body"><span class="tag">${esc(x.category||'فيديو')}</span><h3>${esc(x.title)}</h3></div></a>`).join(''):'<div class="empty">لا توجد مواد فيديو منشورة حاليًا.</div>';
}
function applyFilter(){
  const a=state.cat==='الكل'?state.articles:state.articles.filter(x=>x.category===state.cat);
  $('#latestGrid').innerHTML=a.length?a.slice(0,18).map(x=>card(x)).join(''):'<div class="empty">لا توجد أخبار في هذا القسم.</div>';
  document.querySelectorAll('.filter').forEach(b=>b.classList.toggle('active',b.dataset.cat===state.cat));
}
function search(q){
  q=q.trim().toLowerCase();
  const rows=!q?[]:state.articles.filter(x=>(x.title+' '+(x.excerpt||'')+' '+(x.category||'')).toLowerCase().includes(q)).slice(0,8);
  $('#searchResults').innerHTML=rows.map(x=>`<a class="search-result" href="/news/${x.id}"><b>${esc(x.title)}</b><small>${esc(x.category||'أخبار')}</small></a>`).join('')|| (q?'<div class="empty">لا توجد نتائج.</div>':'');
}
$('#searchBtn').onclick=()=>{$('#searchDrawer').classList.add('open');$('#searchInput').focus();};
$('#searchClose').onclick=()=>$('#searchDrawer').classList.remove('open');
$('#searchInput').oninput=e=>search(e.target.value);
$('#darkBtn').onclick=()=>{document.body.classList.toggle('dark');localStorage.setItem('gowla-dark',document.body.classList.contains('dark')?'1':'0');};
if(localStorage.getItem('gowla-dark')==='1')document.body.classList.add('dark');
$('#menuBtn').onclick=()=>{$('#mainNav').style.display=$('#mainNav').style.display==='flex'?'none':'flex';$('#mainNav').style.position='absolute';$('#mainNav').style.top='66px';$('#mainNav').style.right='10px';$('#mainNav').style.left='10px';$('#mainNav').style.padding='15px';$('#mainNav').style.background='var(--paper)';$('#mainNav').style.border='1px solid var(--line)';$('#mainNav').style.borderRadius='16px';$('#mainNav').style.flexDirection='column';};
$('#newsletterForm').onsubmit=async e=>{e.preventDefault();const email=$('#newsletterEmail').value.trim();const m=$('#newsletterMsg');try{const r=await fetch('/api/newsletter',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});const d=await r.json();m.textContent=r.ok?(d.message||'تم الاشتراك بنجاح.'):(d.error||'تعذر الاشتراك.');}catch{m.textContent='تعذر الاتصال بالخادم.';}};
$('#year').textContent=new Date().getFullYear();
load();
