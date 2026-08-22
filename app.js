const $ = (s) => document.querySelector(s);
const STORE = 'gowla_v32_news';
const seed = [
  {id:1,title:'جولة تتابع آخر المستجدات من الميدان',category:'محلي',excerpt:'تغطية مستمرة لأبرز الأحداث والوقائع مع تحديثات من مراسلي جولة.',body:'تتابع قناة جولة الحدث من الميدان وتنقل التفاصيل أولاً بأول.',image:'assets/studio.jpg',status:'published',breaking:true,views:1840,time:'الآن'},
  {id:2,title:'تغطية ميدانية: تفاصيل جديدة من قلب الحدث',category:'تغطيات جولة',excerpt:'مراسلو جولة في الميدان لنقل الصورة كاملة.',body:'تقرير ميداني مصور يضع الحدث في سياقه ويجمع شهادات من المكان.',image:'assets/studio.jpg',status:'published',breaking:false,views:1320,time:'قبل 18 دقيقة'},
  {id:3,title:'قصة إنسانية من المجتمع: حين تتحول المبادرة إلى أثر',category:'مجتمع',excerpt:'قصص الناس والمبادرات التي تصنع فرقاً حقيقياً.',body:'قصة إنسانية من المجتمع المحلي.',image:'assets/studio.jpg',status:'published',breaking:false,views:980,time:'قبل 42 دقيقة'},
  {id:4,title:'تقرير جولة: قراءة في المشهد وأبرز ما يجب معرفته',category:'تقارير',excerpt:'سياق وتحليل ومصادر تساعدك على فهم القصة.',body:'تقرير تحليلي من إعداد فريق جولة.',image:'assets/studio.jpg',status:'published',breaking:false,views:760,time:'قبل ساعة'},
  {id:5,title:'من ذاكرة المكان: صورة تختصر حكاية مدينة',category:'توثيق',excerpt:'التوثيق بالصورة والصوت يحفظ ذاكرة المكان.',body:'مادة توثيقية من أرشيف جولة.',image:'assets/studio.jpg',status:'published',breaking:false,views:640,time:'اليوم'},
  {id:6,title:'جولة فيديو: لقاء خاص من الميدان',category:'فيديو',excerpt:'لقاء ومشاهد مباشرة من موقع الحدث.',body:'فيديو خاص لقناة جولة.',image:'assets/studio.jpg',status:'published',breaking:false,views:520,time:'اليوم'}
];
function getNews(){ try { const x=JSON.parse(localStorage.getItem(STORE)); if(Array.isArray(x)&&x.length)return x; } catch(e){} return seed; }
function saveNews(items){ localStorage.setItem(STORE, JSON.stringify(items)); }
function esc(v=''){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
function render(d){
  const news=d.filter(n=>n.status==='published').sort((a,b)=>Number(b.id)-Number(a.id));
  const breaking=news.filter(n=>n.breaking);
  $('#breaking').textContent=breaking[0]?.title || 'جولة تتابع آخر المستجدات من الميدان';
  const featured=news.find(n=>n.featured)||news[0];
  if(featured){
    const hero=document.querySelector('.hero-main');
    if(hero){hero.innerHTML=`<img src="${esc(featured.image||'assets/studio.jpg')}" alt=""><div class="shade"></div><div class="hero-copy"><span>${esc(featured.category||'جولة')}</span><h1>${esc(featured.title)}</h1><p>${esc(featured.excerpt||'خبر من الميدان، صورة تحفظ الذاكرة، وتقرير يضع الحدث في سياقه.')}</p><a class="cta" href="#latest" onclick="openStory(${featured.id})">اقرأ الخبر ←</a></div>`}
  }
  $('#top').innerHTML=news.filter(n=>n.id!==featured?.id).slice(0,4).map(n=>`<article class="top-item" onclick="openStory(${n.id})"><span>${esc(n.category)}</span><h3>${esc(n.title)}</h3></article>`).join('');
  $('#news').innerHTML=news.map(n=>`<article class="news-row" onclick="openStory(${n.id})"><time>${esc(n.time||'اليوم')}</time><div><span>${esc(n.category)}</span><strong>${esc(n.title)}</strong><p>${esc(n.excerpt||'')}</p></div></article>`).join('');
  const popular=[...news].sort((a,b)=>(b.views||0)-(a.views||0)).slice(0,5);
  $('#popular').innerHTML=popular.map((n,i)=>`<div class="pop" onclick="openStory(${n.id})"><b>${String(i+1).padStart(2,'0')}</b><span>${esc(n.title)}</span></div>`).join('');
  const cov=news.filter(n=>['تغطيات جولة','توثيق','مجتمع'].includes(n.category)).slice(0,4);
  $('#coverageGrid').innerHTML=cov.map(n=>`<article class="card" onclick="openStory(${n.id})"><div class="card-img" style="background-image:url('${esc(n.image||'assets/studio.jpg')}')"></div><div class="card-body"><span>${esc(n.category)}</span><h3>${esc(n.title)}</h3><p>${esc(n.reporter||'جولة')} · ${esc(n.time||'')}</p></div></article>`).join('');
  const programs=[['صوت المجتمع','برنامج اجتماعي يضع الإنسان في قلب القصة.'],['من الميدان','حوار وتغطية مباشرة من موقع الحدث.'],['ذاكرة المكان','توثيق للقصص والأماكن والشهادات.']];
  $('#programsGrid').innerHTML=programs.map(p=>`<article class="program"><i>${esc(p[0].slice(0,1))}</i><div><h3>${esc(p[0])}</h3><p>${esc(p[1])}</p></div></article>`).join('');
  $('#videosGrid').innerHTML=news.slice(0,4).map(n=>`<article class="video" onclick="openStory(${n.id})"><div class="thumb" style="background-image:url('${esc(n.image||'assets/studio.jpg')}')"><button class="play" onclick="event.stopPropagation();openStory(${n.id})">▶</button></div><h3>${esc(n.title)}</h3><span>${esc(n.category)}</span></article>`).join('');
  const reps=JSON.parse(localStorage.getItem('gowla_v32_reporters')||'null')||[['أحمد محمد','مراسل ميداني','الوسط'],['محمد عمر','مراسل جولة','الشرق'],['علي إبراهيم','مراسل وتصوير','الغرب'],['سارة أحمد','محررة ميدانية','الشمال']].map((r,i)=>({id:i,name:r[0],role:r[1],region:r[2]}));
  $('#reportersGrid').innerHTML=reps.map(p=>`<article class="person"><div class="avatar">${esc(p.name.slice(0,1))}</div><h3>${esc(p.name)}</h3><p>${esc(p.role)}</p><span>${esc(p.region)}</span></article>`).join('');
}
function openStory(id){const n=getNews().find(x=>x.id===id);if(!n)return;const modal=$('#modal');modal.classList.add('open');const box=modal.querySelector('.modal-box');box.innerHTML=`<button id="closeStory">×</button><img class="story-image" src="${esc(n.image||'assets/studio.jpg')}" alt=""><span class="story-cat">${esc(n.category)}</span><h2>${esc(n.title)}</h2><small>${esc(n.reporter||'جولة')} · ${esc(n.time||'')}</small><p class="story-body">${esc(n.body||n.excerpt||'')}</p>`;$('#closeStory').onclick=()=>modal.classList.remove('open');}
function load(){render(getNews());}
$('#search').onclick=()=>{$('#modal').classList.add('open');$('#q').focus();};
$('#close').onclick=()=>$('#modal').classList.remove('open');
$('#q').oninput=e=>{const q=e.target.value.trim().toLowerCase();const results=getNews().filter(n=>n.status==='published' && (n.title+n.excerpt+n.category).toLowerCase().includes(q)).slice(0,10);$('#results').innerHTML=q?results.map(r=>`<div class="result"><b>${esc(r.title)}</b><small>${esc(r.category)} · ${esc(r.time||'')}</small></div>`).join('')||'<p>لا توجد نتائج.</p>':'';};
$('#menu').onclick=()=>$('#nav').classList.toggle('open');
load();
