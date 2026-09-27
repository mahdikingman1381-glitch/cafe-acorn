const cfg = window.CAFE_ACORN_SUPABASE;
const supabaseClient = window.supabase.createClient(cfg.url, cfg.key);
let categories = [], subcategories = [], products = [], cafe = {};
let activeCategory = 'همه';

async function loadMenu(){
  try{
    const [c,s,p,cs] = await Promise.all([
      supabaseClient.from('categories').select('*').eq('is_active',true).order('sort_order'),
      supabaseClient.from('subcategories').select('*').eq('is_active',true).order('sort_order'),
      supabaseClient.from('products').select('*').eq('is_available',true).order('sort_order'),
      supabaseClient.from('cafe_settings').select('*').limit(1).maybeSingle()
    ]);
    if(c.error) throw c.error; if(s.error) throw s.error; if(p.error) throw p.error; if(cs.error) throw cs.error;
    categories=c.data||[]; subcategories=s.data||[]; products=p.data||[]; cafe=cs.data||{};
    renderCafe(); renderCategories(); render();
  }catch(e){
    console.error(e);
    document.querySelector('#products').innerHTML='<p>منو در حال دریافت اطلاعات است. لطفاً چند لحظه بعد دوباره تلاش کنید.</p>';
  }
}
function catNameFor(p){
  const sub=subcategories.find(x=>x.id===p.subcategory_id);
  const cat=categories.find(x=>x.id===sub?.category_id);
  return {cat,sub};
}
function renderCafe(){
  const name=cafe.cafe_name||'Cafe Acorn', tagline=cafe.tagline||'جایی برای آرامش و حال خوب تو ✨';
  document.title=`${name} | منوی دیجیتال`;
  const hero=document.querySelector('.hero h1'); if(hero) hero.textContent=name;
  const heroP=document.querySelector('.hero p'); if(heroP) heroP.innerHTML=(tagline||'').replace(/\n/g,'<br>');
  document.querySelectorAll('.about h2').forEach(x=>x.textContent=name);
  const about=document.querySelector('.about'); if(about){
    const ps=about.querySelectorAll('p');
    if(ps[0]) ps[0].textContent=tagline;
    if(ps[1]) ps[1].textContent='⏰ '+(cafe.opening_hours||'');
    if(ps[2]) ps[2].textContent='📍 '+(cafe.address||'');
    if(ps[3]) ps[3].textContent='📷 '+(cafe.instagram||'');
  }
  const contact=document.querySelector('.contact'); if(contact){ const p=contact.querySelector('p'); if(p)p.textContent=cafe.address||''; }
}
function renderCategories(){
  const wrap=document.querySelector('.chips');
  if(!wrap)return;
  wrap.innerHTML='<button class="chip active" data-c="همه">همه</button>'+categories.map(c=>`<button class="chip" data-c="${esc(c.id)}">${esc(c.name)}</button>`).join('');
  wrap.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{activeCategory=b.dataset.c;wrap.querySelectorAll('.chip').forEach(x=>x.classList.toggle('active',x===b));render()});
}
function render(){
  const q=(document.querySelector('#search')?.value||'').trim().toLowerCase();
  const filtered=products.filter(p=>{
    const {cat}=catNameFor(p);
    return (activeCategory==='همه'||cat?.id===activeCategory) && (!q||`${p.name||''} ${p.name_en||''} ${p.description||''} ${p.ingredients||''}`.toLowerCase().includes(q));
  });
  const box=document.querySelector('#products');
  box.innerHTML=filtered.map(p=>{
    const {cat,sub}=catNameFor(p);
    const image=p.image_url?`<img class="product-img" src="${esc(p.image_url)}" alt="${esc(p.name)}">`:'';
    return `<article class="card" data-id="${p.id}">${image}<div class="row"><div><h3>${esc(p.name)}</h3><p>${esc(p.description||'')}</p><small>${esc(sub?.name||cat?.name||'')}</small></div><span class="price">${fmt(p.price)} هزار</span></div>${p.is_special?'<span class="tag">پیشنهاد امروز</span>':''}${p.is_best_seller?'<span class="tag">پرفروش</span>':''}</article>`;
  }).join('')||'<p>محصولی پیدا نشد.</p>';
  box.querySelectorAll('.card').forEach(c=>c.onclick=()=>detail(c.dataset.id));
  const special=products.filter(p=>p.is_special).slice(0,4);
  document.querySelector('#specials').innerHTML=special.map(p=>`<div class="special-item" data-id="${p.id}"><b>${esc(p.name)}</b><span>${fmt(p.price)} هزار تومان</span></div>`).join('')||'<p>پیشنهاد ویژه‌ای ثبت نشده است.</p>';
  document.querySelectorAll('.special-item').forEach(c=>c.onclick=()=>detail(c.dataset.id));
}
function detail(id){
  const p=products.find(x=>String(x.id)===String(id)); if(!p)return;
  const {cat,sub}=catNameFor(p);
  const img=p.image_url?`<img class="detail-img" src="${esc(p.image_url)}" alt="${esc(p.name)}">`:'';
  document.querySelector('#detail').innerHTML=`${img}<small>${esc(sub?.name||cat?.name||'')}</small><h2>${esc(p.name)}</h2><b class="price">${fmt(p.price)} هزار تومان</b><p>${esc(p.description||'')}</p><hr><b>مواد تشکیل‌دهنده</b><p>${esc(p.ingredients||'—')}</p><b>آلرژن‌ها</b><p>${esc(p.allergens||'—')}</p>`;
  document.querySelector('#modal').classList.add('open');
}
function closeModal(){document.querySelector('#modal').classList.remove('open')}
function go(id){document.getElementById(id).scrollIntoView({behavior:'smooth'})}
function map(){window.open(cafe.map_url||'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(cafe.address||'بلوار امام حسین کافه بلوط'),'_blank')}
function fmt(n){return Number(n||0).toLocaleString('fa-IR')}
function esc(s){return String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')}
document.querySelector('#search')?.addEventListener('input',render);
document.querySelector('#searchBtn')?.addEventListener('click',()=>{go('menu');setTimeout(()=>document.querySelector('#search')?.focus(),400)});
loadMenu();
