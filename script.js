const cfg = window.CAFE_ACORN_SUPABASE || {};
const supabaseClient = window.supabase.createClient(
  cfg.url,
  cfg.anonKey || cfg.key
);

let categories = [];
let subcategories = [];
let products = [];
let cafe = {};
let selectedCategory = null;
let selectedSubcategory = null;

const $ = (id) => document.getElementById(id);

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatPrice(price) {
  if (price === null || price === undefined || price === "") return "";
  return Number(price).toLocaleString("fa-IR") + " تومان";
}

async function loadMenu() {
  try {
    const [cat, sub, prod, settings] = await Promise.all([
      supabaseClient
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order"),

      supabaseClient
        .from("subcategories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order"),

      supabaseClient
        .from("products")
        .select("*")
        .eq("is_available", true)
        .order("sort_order"),

      supabaseClient
        .from("cafe_settings")
        .select("*")
        .limit(1)
        .maybeSingle()
    ]);

    if (cat.error) throw cat.error;
    if (sub.error) throw sub.error;
    if (prod.error) throw prod.error;

    categories = cat.data || [];
    subcategories = sub.data || [];
    products = prod.data || [];
    cafe = settings.data || {};

    renderCafeInfo();
    renderCategories();
    renderSpecials();
    renderProducts();
    setupSearch();

  } catch (error) {
    console.error(error);

    const app = $("app") || $("menu") || document.body;

    app.insertAdjacentHTML(
      "afterbegin",
      `<div style="
        margin:20px;
        padding:16px;
        border-radius:14px;
        background:#fff0f0;
        color:#8b0000;
        text-align:center;
      ">
        خطا در دریافت منو. لطفاً صفحه را دوباره باز کنید.
      </div>`
    );
  }
}

function renderCafeInfo() {
  const name = cafe.cafe_name || "کافه بلوط";
  const tagline =
    cafe.tagline || "جایی برای آرامش و حال خوب تو ✨";

  document.title = name;

  const nameEls = document.querySelectorAll(
    "#cafeName,.cafe-name,.brand-name,[data-cafe-name]"
  );

  nameEls.forEach(el => {
    el.textContent = name;
  });

  const taglineEls = document.querySelectorAll(
    "#tagline,.tagline,[data-tagline]"
  );

  taglineEls.forEach(el => {
    el.textContent = tagline;
  });

  const addressEls = document.querySelectorAll(
    "#address,.address,[data-address]"
  );

  addressEls.forEach(el => {
    el.textContent =
      cafe.address || "بلوار امام حسین، جنب کابینت بلوط";
  });

  const hoursEls = document.querySelectorAll(
    "#hours,.hours,[data-hours]"
  );

  hoursEls.forEach(el => {
    el.textContent =
      cafe.opening_hours || "۷:۳۰ تا ۱۳:۰۰ و ۱۷:۰۰ تا ۲۳:۰۰";
  });

  const instagramEls = document.querySelectorAll(
    "#instagram,.instagram,[data-instagram]"
  );

  instagramEls.forEach(el => {
    el.textContent = cafe.instagram || "@cafe_acorn";
  });

  const mapLinks = document.querySelectorAll(
    "#mapLink,.map-link,[data-map-link]"
  );

  mapLinks.forEach(el => {
    if (cafe.map_url) {
      el.href = cafe.map_url;
      el.target = "_blank";
      el.rel = "noopener";
    }
  });
}

function renderCategories() {
  const container =
    $("categories") ||
    $("categoryList") ||
    document.querySelector(".categories");

  if (!container) return;

  container.innerHTML = `
    <button class="category-btn active" data-category="all">
      همه
    </button>
    ${categories.map(category => `
      <button
        class="category-btn"
        data-category="${escapeHTML(category.id)}"
      >
        ${escapeHTML(category.name)}
      </button>
    `).join("")}
  `;

  container.querySelectorAll(".category-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      container.querySelectorAll(".category-btn")
        .forEach(x => x.classList.remove("active"));

      btn.classList.add("active");

      selectedCategory =
        btn.dataset.category === "all"
          ? null
          : btn.dataset.category;

      selectedSubcategory = null;

      renderSubcategories();
      renderProducts();
    });
  });

  renderSubcategories();
}

function renderSubcategories() {
  const container =
    $("subcategories") ||
    $("subcategoryList") ||
    document.querySelector(".subcategories");

  if (!container) return;

  let list = subcategories;

  if (selectedCategory) {
    list = subcategories.filter(
      x => String(x.category_id) === String(selectedCategory)
    );
  }

  if (!list.length) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = `
    <button class="subcategory-btn active" data-subcategory="all">
      همه
    </button>
    ${list.map(sub => `
      <button
        class="subcategory-btn"
        data-subcategory="${escapeHTML(sub.id)}"
      >
        ${escapeHTML(sub.name)}
      </button>
    `).join("")}
  `;

  container.querySelectorAll(".subcategory-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      container.querySelectorAll(".subcategory-btn")
        .forEach(x => x.classList.remove("active"));

      btn.classList.add("active");

      selectedSubcategory =
        btn.dataset.subcategory === "all"
          ? null
          : btn.dataset.subcategory;

      renderProducts();
    });
  });
}

function getFilteredProducts() {
  let list = [...products];

  if (selectedCategory) {
    const subIds = subcategories
      .filter(x => String(x.category_id) === String(selectedCategory))
      .map(x => String(x.id));

    list = list.filter(p =>
      subIds.includes(String(p.subcategory_id))
    );
  }

  if (selectedSubcategory) {
    list = list.filter(
      p => String(p.subcategory_id) === String(selectedSubcategory)
    );
  }

  return list;
}

function renderProducts() {
  const container =
    $("products") ||
    $("productList") ||
    document.querySelector(".products");

  if (!container) return;

  const list = getFilteredProducts();

  if (!list.length) {
    container.innerHTML = `
      <div style="
        padding:30px;
        text-align:center;
        color:#777;
      ">
        محصولی در این بخش پیدا نشد.
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(productCard).join("");

  container.querySelectorAll("[data-product-id]")
    .forEach(card => {
      card.addEventListener("click", () => {
        const id = card.dataset.productId;
        openProduct(id);
      });
    });
}

function productCard(product) {
  const image = product.image_url
    ? `<img
        src="${escapeHTML(product.image_url)}"
        alt="${escapeHTML(product.name)}"
        loading="lazy"
        style="width:100%;height:190px;object-fit:cover;border-radius:14px 14px 0 0;"
      >`
    : `
      <div style="
        height:190px;
        display:flex;
        align-items:center;
        justify-content:center;
        background:#eee5de;
        font-size:45px;
        border-radius:14px 14px 0 0;
      ">☕</div>
    `;

  return `
    <article
      class="product-card"
      data-product-id="${escapeHTML(product.id)}"
      style="cursor:pointer;overflow:hidden;"
    >
      ${image}

      <div style="padding:14px;">
        <div style="
          display:flex;
          justify-content:space-between;
          gap:8px;
          align-items:flex-start;
        ">
          <h3 style="margin:0;">
            ${escapeHTML(product.name)}
          </h3>

          <strong style="white-space:nowrap;">
            ${formatPrice(product.price)}
          </strong>
        </div>

        ${
          product.description
            ? `<p style="color:#777;">
                ${escapeHTML(product.description)}
              </p>`
            : ""
        }

        ${
          product.ingredients
            ? `<div style="font-size:13px;color:#777;">
                (${escapeHTML(product.ingredients)})
              </div>`
            : ""
        }

        <div style="margin-top:8px;">
          ${
            product.is_special
              ? `<span class="badge">⭐ پیشنهاد امروز</span>`
              : ""
          }

          ${
            product.is_best_seller
              ? `<span class="badge">🔥 پرفروش</span>`
              : ""
          }
        </div>
      </div>
    </article>
  `;
}

function renderSpecials() {
  const container =
    $("specials") ||
    $("todaySpecials") ||
    document.querySelector(".specials");

  if (!container) return;

  const specials = products.filter(p => p.is_special);

  if (!specials.length) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = `
    <div style="margin-bottom:10px;">
      <h2>⭐ پیشنهاد امروز</h2>
    </div>
    <div class="special-products">
      ${specials.map(productCard).join("")}
    </div>
  `;

  container.querySelectorAll("[data-product-id]")
    .forEach(card => {
      card.addEventListener("click", () => {
        openProduct(card.dataset.productId);
      });
    });
}

function openProduct(id) {
  const product = products.find(
    p => String(p.id) === String(id)
  );

  if (!product) return;

  const modal =
    $("productModal") ||
    $("modal");

  if (!modal) {
    showProductFallback(product);
    return;
  }

  const content =
    modal.querySelector(".modal-content") ||
    modal;

  content.innerHTML = `
    <button
      onclick="closeProduct()"
      style="float:left;background:none;color:inherit;font-size:24px;"
    >×</button>

    ${
      product.image_url
        ? `<img
            src="${escapeHTML(product.image_url)}"
            style="width:100%;max-height:320px;object-fit:cover;border-radius:14px;"
          >`
        : ""
    }

    <h2>${escapeHTML(product.name)}</h2>

    <h3>${formatPrice(product.price)}</h3>

    ${
      product.description
        ? `<p>${escapeHTML(product.description)}</p>`
        : ""
    }

    ${
      product.ingredients
        ? `<p><strong>مواد تشکیل‌دهنده:</strong><br>
          ${escapeHTML(product.ingredients)}
        </p>`
        : ""
    }

    ${
      product.allergens
        ? `<p><strong>حساسیت‌زا:</strong><br>
          ${escapeHTML(product.allergens)}
        </p>`
        : ""
    }
  `;

  modal.classList.remove("hidden");
  modal.style.display = "flex";
}

function closeProduct() {
  const modal =
    $("productModal") ||
    $("modal");

  if (!modal) return;

  modal.classList.add("hidden");
  modal.style.display = "none";
}

function showProductFallback(product) {
  alert(
    `${product.name}\n\n` +
    `${formatPrice(product.price)}\n\n` +
    `${product.description || ""}\n\n` +
    `${product.ingredients || ""}`
  );
}

function setupSearch() {
  const search =
    $("search") ||
    $("searchInput") ||
    document.querySelector('input[type="search"]');

  if (!search || search.dataset.ready) return;

  search.dataset.ready = "1";

  search.addEventListener("input", () => {
    const query = search.value.trim().toLowerCase();

    const container =
      $("products") ||
      $("productList") ||
      document.querySelector(".products");

    if (!container) return;

    if (!query) {
      renderProducts();
      return;
    }

    const result = products.filter(product => {
      const text = [
        product.name,
        product.name_en,
        product.description,
        product.ingredients
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(query);
    });

    container.innerHTML = result.length
      ? result.map(productCard).join("")
      : `
        <div style="
          padding:30px;
          text-align:center;
          color:#777;
        ">
          چیزی پیدا نشد.
        </div>
      `;

    container.querySelectorAll("[data-product-id]")
      .forEach(card => {
        card.addEventListener("click", () => {
          openProduct(card.dataset.productId);
        });
      });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadMenu();
});
