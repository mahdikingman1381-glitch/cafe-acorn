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

const $ = id => document.getElementById(id);

function escapeHTML(value){
  return String(value ?? "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

function formatPrice(price){
  if(price === null || price === undefined || price === ""){
    return "";
  }

  return Number(price).toLocaleString("fa-IR") + " تومان";
}


/* =========================
   حرکت به بخش
========================= */

function go(id){
  const el = document.getElementById(id);

  if(el){
    el.scrollIntoView({
      behavior:"smooth",
      block:"start"
    });
  }
}


/* =========================
   نقشه
========================= */

function map(){

  const url =
    cafe.map_url ||
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(
      cafe.address || "بلوار امام حسین، جنب کابینت بلوط"
    );

  window.open(url,"_blank","noopener");
}


/* =========================
   دریافت اطلاعات
========================= */

async function loadMenu(){

  try{

    const [
      cat,
      sub,
      prod,
      settings
    ] = await Promise.all([

      supabaseClient
        .from("categories")
        .select("*")
        .eq("is_active",true)
        .order("sort_order"),

      supabaseClient
        .from("subcategories")
        .select("*")
        .eq("is_active",true)
        .order("sort_order"),

      supabaseClient
        .from("products")
        .select("*")
        .eq("is_available",true)
        .order("sort_order"),

      supabaseClient
        .from("cafe_settings")
        .select("*")
        .limit(1)
        .maybeSingle()

    ]);

    if(cat.error) throw cat.error;
    if(sub.error) throw sub.error;
    if(prod.error) throw prod.error;

    categories = cat.data || [];
    subcategories = sub.data || [];
    products = prod.data || [];
    cafe = settings.data || {};

    renderCafeInfo();
    renderCategories();
    renderProducts();
    renderSpecials();
    setupSearch();

  }catch(error){

    console.error(error);

    const container = $("products");

    if(container){
      container.innerHTML = `
        <div style="
          padding:30px;
          text-align:center;
          color:#8b0000;
          background:#fff0f0;
          border-radius:16px;
        ">
          خطا در دریافت منو.
          <br>
          لطفاً صفحه را دوباره باز کنید.
        </div>
      `;
    }
  }
}


/* =========================
   اطلاعات کافه
========================= */

function renderCafeInfo(){

  const name =
    cafe.cafe_name ||
    cafe.name ||
    "کافه بلوط";

  const tagline =
    cafe.tagline ||
    "جایی برای آرامش و حال خوب تو ✨";

  const address =
    cafe.address ||
    "بلوار امام حسین، جنب کابینت بلوط";

  const hours =
    cafe.opening_hours ||
    cafe.hours ||
    "۷:۳۰ تا ۱۳:۰۰ و ۱۷:۰۰ تا ۲۳:۰۰";

  const instagram =
    cafe.instagram ||
    "@cafe_acorn";

  document.title = name;

  const nameEls = document.querySelectorAll(
    "#cafeName,#aboutName,.cafe-name,.brand-name,[data-cafe-name]"
  );

  nameEls.forEach(el => {
    el.textContent = name;
  });

  const taglineEls = document.querySelectorAll(
    "#tagline,#aboutTagline,.tagline,[data-tagline]"
  );

  taglineEls.forEach(el => {
    el.textContent = tagline;
  });

  const addressEls = document.querySelectorAll(
    "#address,#contactAddress,.address,[data-address]"
  );

  addressEls.forEach(el => {
    el.textContent = address;
  });

  const hoursEls = document.querySelectorAll(
    "#hours,.hours,[data-hours]"
  );

  hoursEls.forEach(el => {
    el.textContent = hours;
  });

  const instagramEls = document.querySelectorAll(
    "#instagram,.instagram,[data-instagram]"
  );

  instagramEls.forEach(el => {
    el.textContent = instagram;
  });
}


/* =========================
   دسته‌بندی‌ها
========================= */

function renderCategories(){

  const container =
    $("chips") ||
    $("categories") ||
    $("categoryList") ||
    document.querySelector(".categories");

  if(!container) return;

  container.innerHTML = `

    <button
      class="chip active"
      data-category="all"
    >
      همه
    </button>

    ${
      categories.map(category => `

        <button
          class="chip"
          data-category="${escapeHTML(category.id)}"
        >
          ${escapeHTML(category.name)}
        </button>

      `).join("")
    }

  `;

  container
    .querySelectorAll(".chip")
    .forEach(button => {

      button.addEventListener("click",function(){

        container
          .querySelectorAll(".chip")
          .forEach(x =>
            x.classList.remove("active")
          );

        button.classList.add("active");

        selectedCategory =
          button.dataset.category === "all"
            ? null
            : button.dataset.category;

        selectedSubcategory = null;

        renderSubcategories();
        renderProducts();

      });

    });

  renderSubcategories();
}


/* =========================
   زیر دسته‌بندی‌ها
========================= */

function renderSubcategories(){

  const container =
    $("subchips") ||
    $("subcategories") ||
    $("subcategoryList") ||
    document.querySelector(".subcategories");

  if(!container) return;

  let list = subcategories;

  if(selectedCategory){

    list = subcategories.filter(sub =>
      String(sub.category_id) ===
      String(selectedCategory)
    );

  }

  if(!list.length){

    container.innerHTML = "";
    return;

  }

  container.innerHTML = `

    <button
      class="chip active"
      data-subcategory="all"
    >
      همه
    </button>

    ${
      list.map(sub => `

        <button
          class="chip"
          data-subcategory="${escapeHTML(sub.id)}"
        >
          ${escapeHTML(sub.name)}
        </button>

      `).join("")
    }

  `;

  container
    .querySelectorAll(".chip")
    .forEach(button => {

      button.addEventListener("click",function(){

        container
          .querySelectorAll(".chip")
          .forEach(x =>
            x.classList.remove("active")
          );

        button.classList.add("active");

        selectedSubcategory =
          button.dataset.subcategory === "all"
            ? null
            : button.dataset.subcategory;

        renderProducts();

      });

    });
}


/* =========================
   فیلتر محصولات
========================= */

function getFilteredProducts(){

  let list = [...products];

  if(selectedCategory){

    const subIds =
      subcategories

        .filter(sub =>
          String(sub.category_id) ===
          String(selectedCategory)
        )

        .map(sub => String(sub.id));

    list = list.filter(product =>
      subIds.includes(
        String(product.subcategory_id)
      )
    );

  }

  if(selectedSubcategory){

    list = list.filter(product =>
      String(product.subcategory_id) ===
      String(selectedSubcategory)
    );

  }

  return list;
}


/* =========================
   نمایش محصولات
========================= */

function renderProducts(){

  const container = $("products");

  if(!container) return;

  const list = getFilteredProducts();

  if(!list.length){

    container.innerHTML = `
      <div style="
        grid-column:1/-1;
        padding:35px;
        text-align:center;
        color:#777;
        background:#fff;
        border-radius:18px;
      ">
        محصولی در این بخش پیدا نشد.
      </div>
    `;

    return;
  }

  container.innerHTML =
    list.map(productCard).join("");

  attachProductClicks(container);
}


/* =========================
   کارت محصول
========================= */

function productCard(product){

  const image = product.image_url

    ? `
      <img
        class="product-img"
        src="${escapeHTML(product.image_url)}"
        alt="${escapeHTML(product.name)}"
        loading="lazy"
      >
    `

    : `
      <div class="product-img"
        style="
          display:grid;
          place-items:center;
          font-size:48px;
        "
      >
        ☕
      </div>
    `;

  return `

    <article
      class="card"
      data-product-id="${escapeHTML(product.id)}"
    >

      ${image}

      <div class="row">

        <div>

          <h3>
            ${escapeHTML(product.name)}
          </h3>

          ${
            product.description
              ? `
                <p>
                  ${escapeHTML(product.description)}
                </p>
              `
              : ""
          }

          ${
            product.ingredients
              ? `
                <small>
                  (${escapeHTML(product.ingredients)})
                </small>
              `
              : ""
          }

        </div>

        <div class="price">
          ${formatPrice(product.price)}
        </div>

      </div>

      ${
        product.is_special
          ? `<span class="tag">⭐ پیشنهاد امروز</span>`
          : ""
      }

      ${
        product.is_best_seller
          ? `<span class="tag">🔥 پرفروش</span>`
          : ""
      }

    </article>

  `;
}


function attachProductClicks(container){

  container
    .querySelectorAll("[data-product-id]")
    .forEach(card => {

      card.addEventListener("click",function(){

        openProduct(
          card.dataset.productId
        );

      });

    });
}


/* =========================
   پیشنهاد امروز
========================= */

function renderSpecials(){

  const container = $("specials");

  if(!container) return;

  const specials =
    products.filter(product =>
      product.is_special
    );

  if(!specials.length){

    container.innerHTML = `
      <div class="special-item">
        <span>فعلاً پیشنهادی ثبت نشده</span>
      </div>
    `;

    return;
  }

  container.innerHTML =
    specials.map(product => `

      <div
        class="special-item"
        data-product-id="${escapeHTML(product.id)}"
      >

        <b>
          ${escapeHTML(product.name)}
        </b>

        <span>
          ${formatPrice(product.price)}
        </span>

      </div>

    `).join("");

  attachProductClicks(container);
}


/* =========================
   جزئیات محصول
========================= */

function openProduct(id){

  const product =
    products.find(product =>
      String(product.id) === String(id)
    );

  if(!product) return;

  const modal = $("modal");

  const detail = $("detail");

  if(!modal || !detail){

    showProductFallback(product);
    return;

  }

  detail.innerHTML = `

    ${
      product.image_url
        ? `
          <img
            class="detail-img"
            src="${escapeHTML(product.image_url)}"
            alt="${escapeHTML(product.name)}"
          >
        `
        : ""
    }

    <h2>
      ${escapeHTML(product.name)}
    </h2>

    <strong class="price">
      ${formatPrice(product.price)}
    </strong>

    ${
      product.description
        ? `
          <p>
            ${escapeHTML(product.description)}
          </p>
        `
        : ""
    }

    ${
      product.ingredients
        ? `
          <hr>

          <p>
            <strong>مواد تشکیل‌دهنده:</strong>
            <br>
            ${escapeHTML(product.ingredients)}
          </p>
        `
        : ""
    }

    ${
      product.allergens
        ? `
          <p>
            <strong>حساسیت‌زا:</strong>
            <br>
            ${escapeHTML(product.allergens)}
          </p>
        `
        : ""
    }

  `;

  modal.classList.add("open");
  modal.style.display = "flex";
}


function closeProduct(){

  const modal = $("modal");

  if(!modal) return;

  modal.classList.remove("open");
  modal.style.display = "none";
}


function closeModal(){
  closeProduct();
}


function showProductFallback(product){

  alert(
    product.name +
    "\n\n" +
    formatPrice(product.price) +
    "\n\n" +
    (product.description || "")
  );

}


/* =========================
   بستن مودال با کلیک بیرون
========================= */

document.addEventListener("click",function(event){

  const modal = $("modal");

  if(
    modal &&
    event.target === modal
  ){

    closeModal();

  }

});


/* =========================
   جستجو
========================= */

function setupSearch(){

  const search = $("search");

  if(!search || search.dataset.ready){
    return;
  }

  search.dataset.ready = "1";

  search.addEventListener("input",function(){

    const query =
      search.value.trim().toLowerCase();

    const container = $("products");

    if(!container) return;

    if(!query){

      renderProducts();
      return;

    }

    const result =
      products.filter(product => {

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

    if(!result.length){

      container.innerHTML = `
        <div style="
          grid-column:1/-1;
          padding:35px;
          text-align:center;
          color:#777;
          background:#fff;
          border-radius:18px;
        ">
          چیزی پیدا نشد.
        </div>
      `;

      return;
    }

    container.innerHTML =
      result.map(productCard).join("");

    attachProductClicks(container);

  });

}


/* =========================
   شروع سایت
========================= */

document.addEventListener(
  "DOMContentLoaded",
  function(){

    loadMenu();

  }
);
