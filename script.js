const cfg = window.CAFE_ACORN_SUPABASE;
const supabaseClient = window.supabase.createClient(cfg.url, cfg.key);

let categories = [];
let subcategories = [];
let products = [];
let cafe = {};
let activeCategory = 'همه';

document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('#search')?.addEventListener('input', render);
  document.querySelector('#searchBtn')?.addEventListener('click', () => {
    go('menu');
    setTimeout(() => document.querySelector('#search')?.focus(), 300);
  });

  document.querySelector('#modal')?.addEventListener('click', e => {
    if (e.target.id === 'modal') closeModal();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

  loadMenu();
});

async function loadMenu() {
  try {
    const [c, s, p, cs] = await Promise.all([
      supabaseClient
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order'),

      supabaseClient
        .from('subcategories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order'),

      supabaseClient
        .from('products')
        .select('*')
        .eq('is_available', true)
        .order('sort_order'),

      supabaseClient
        .from('cafe_settings')
        .select('*')
        .limit(1)
        .maybeSingle()
    ]);

    if (c.error) throw c.error;
    if (s.error) throw s.error;
    if (p.error) throw p.error;
    if (cs.error) throw cs.error;

    categories = c.data || [];
    subcategories = s.data || [];
    products = p.data || [];
    cafe = cs.data || {};

    renderCafe();
    renderCategories();
    render();

  } catch (error) {
    console.error(error);

    const box = document.querySelector('#products');

    if (box) {
      box.innerHTML = `
        <div class="empty-state">
          <p>منو در حال دریافت اطلاعات است.</p>
          <button onclick="loadMenu()">تلاش دوباره</button>
        </div>
      `;
    }
  }
}

function getCategory(product) {
  const sub = subcategories.find(
    x => String(x.id) === String(product.subcategory_id)
  );

  const cat = categories.find(
    x => String(x.id) === String(sub?.category_id)
  );

  return { cat, sub };
}

function renderCafe() {
  const name = cafe.cafe_name || 'Cafe Acorn';
  const tagline = cafe.tagline || 'جایی برای آرامش و حال خوب تو ✨';

  document.title = `${name} | منوی دیجیتال`;

  const heroTitle = document.querySelector('.hero h1');
  if (heroTitle) heroTitle.textContent = name;

  const heroText = document.querySelector('.hero p');
  if (heroText) {
    heroText.innerHTML = escapeHTML(tagline).replace(/\n/g, '<br>');
  }

  document.querySelectorAll('.about h2').forEach(el => {
    el.textContent = name;
  });

  const about = document.querySelector('.about');

  if (about) {
    const ps = about.querySelectorAll('p');

    if (ps[0]) ps[0].textContent = tagline;
    if (ps[1]) ps[1].textContent = '⏰ ' + (cafe.opening_hours || '');
    if (ps[2]) ps[2].textContent = '📍 ' + (cafe.address || '');
    if (ps[3]) ps[3].textContent = '📷 ' + (cafe.instagram || '');
  }

  const contact = document.querySelector('.contact');

  if (contact) {
    const p = contact.querySelector('p');
    if (p) p.textContent = cafe.address || '';
  }
}

function renderCategories() {
  const wrap = document.querySelector('.chips');

  if (!wrap) return;

  wrap.innerHTML = `
    <button class="chip active" data-category="همه">
      همه
    </button>
  `;

  categories.forEach(category => {
    const button = document.createElement('button');

    button.className = 'chip';
    button.dataset.category = category.id;
    button.textContent = category.name;

    button.addEventListener('click', () => {
      activeCategory = category.id;

      document
        .querySelectorAll('.chip')
        .forEach(x => x.classList.remove('active'));

      button.classList.add('active');

      render();
    });

    wrap.appendChild(button);
  });

  const allButton = wrap.querySelector('[data-category="همه"]');

  allButton?.addEventListener('click', () => {
    activeCategory = 'همه';

    document
      .querySelectorAll('.chip')
      .forEach(x => x.classList.remove('active'));

    allButton.classList.add('active');

    render();
  });
}

function render() {
  const query = (
    document.querySelector('#search')?.value || ''
  ).trim().toLowerCase();

  const filtered = products.filter(product => {
    const { cat, sub } = getCategory(product);

    const categoryOK =
      activeCategory === 'همه' ||
      String(cat?.id) === String(activeCategory);

    const searchable = `
      ${product.name || ''}
      ${product.name_en || ''}
      ${product.description || ''}
      ${product.ingredients || ''}
      ${product.allergens || ''}
      ${sub?.name || ''}
      ${cat?.name || ''}
    `.toLowerCase();

    return categoryOK && (!query || searchable.includes(query));
  });

  renderProducts(filtered);
  renderSpecials();
}

function renderProducts(list) {
  const box = document.querySelector('#products');

  if (!box) return;

  if (!list.length) {
    box.innerHTML = `
      <div class="empty-state">
        <p>محصولی پیدا نشد.</p>
      </div>
    `;
    return;
  }

  box.innerHTML = list.map(product => {
    const { cat, sub } = getCategory(product);

    const image = product.image_url
      ? `
        <div class="product-photo">
          <img
            src="${escapeHTML(product.image_url)}"
            alt="${escapeHTML(product.name)}"
            loading="lazy"
          >
        </div>
      `
      : `
        <div class="product-photo no-image">
          <span>☕</span>
        </div>
      `;

    const description = product.description
      ? `<p class="product-description">${escapeHTML(product.description)}</p>`
      : '';

    const ingredients = product.ingredients
      ? `
        <p class="product-ingredients">
          (${escapeHTML(product.ingredients)})
        </p>
      `
      : '';

    const tags = `
      ${product.is_special ? '<span class="tag">پیشنهاد امروز</span>' : ''}
      ${product.is_best_seller ? '<span class="tag">پرفروش</span>' : ''}
    `;

    return `
      <article
        class="card product-card"
        data-product-id="${escapeHTML(product.id)}"
      >

        ${image}

        <div class="product-content">

          <div class="product-top">

            <div class="product-title-area">

              <h3>${escapeHTML(product.name)}</h3>

              ${description}

              ${ingredients}

              <small class="product-category">
                ${escapeHTML(sub?.name || cat?.name || '')}
              </small>

            </div>

            <div class="product-price">
              ${formatPrice(product.price)}
              <small>تومان</small>
            </div>

          </div>

          <div class="product-tags">
            ${tags}
          </div>

        </div>

      </article>
    `;
  }).join('');

  box.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', () => {
      openProduct(card.dataset.productId);
    });
  });
}

function renderSpecials() {
  const box = document.querySelector('#specials');

  if (!box) return;

  const specialProducts = products
    .filter(product => product.is_special)
    .slice(0, 4);

  if (!specialProducts.length) {
    box.innerHTML = `
      <p>پیشنهاد ویژه‌ای ثبت نشده است.</p>
    `;
    return;
  }

  box.innerHTML = specialProducts.map(product => `
    <div
      class="special-item"
      data-product-id="${escapeHTML(product.id)}"
    >
      <strong>${escapeHTML(product.name)}</strong>
      <span>${formatPrice(product.price)} تومان</span>
    </div>
  `).join('');

  box.querySelectorAll('.special-item').forEach(item => {
    item.addEventListener('click', () => {
      openProduct(item.dataset.productId);
    });
  });
}

function openProduct(id) {
  const product = products.find(
    x => String(x.id) === String(id)
  );

  if (!product) return;

  const { cat, sub } = getCategory(product);

  const image = product.image_url
    ? `
      <img
        class="detail-img"
        src="${escapeHTML(product.image_url)}"
        alt="${escapeHTML(product.name)}"
      >
    `
    : '';

  const description = product.description
    ? `<p>${escapeHTML(product.description)}</p>`
    : '';

  const ingredients = product.ingredients
    ? `
      <div class="detail-section">
        <strong>مواد تشکیل‌دهنده</strong>
        <p>(${escapeHTML(product.ingredients)})</p>
      </div>
    `
    : '';

  const allergens = product.allergens
    ? `
      <div class="detail-section">
        <strong>آلرژن‌ها</strong>
        <p>${escapeHTML(product.allergens)}</p>
      </div>
    `
    : '';

  const detail = document.querySelector('#detail');

  if (!detail) return;

  detail.innerHTML = `
    ${image}

    <small>
      ${escapeHTML(sub?.name || cat?.name || '')}
    </small>

    <h2>${escapeHTML(product.name)}</h2>

    <div class="detail-price">
      ${formatPrice(product.price)} تومان
    </div>

    ${description}

    ${ingredients}

    ${allergens}
  `;

  document.querySelector('#modal')?.classList.add('open');
}

function closeModal() {
  document.querySelector('#modal')?.classList.remove('open');
}

function go(id) {
  document.getElementById(id)?.scrollIntoView({
    behavior: 'smooth'
  });
}

function map() {
  const url =
    cafe.map_url ||
    'https://www.google.com/maps/search/?api=1&query=' +
    encodeURIComponent(
      cafe.address || 'بلوار امام حسین کافه بلوط'
    );

  window.open(url, '_blank');
}

function formatPrice(value) {
  return Number(value || 0).toLocaleString('fa-IR');
}

function escapeHTML(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
