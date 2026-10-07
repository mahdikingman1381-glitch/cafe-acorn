(function () {
  "use strict";

  const config = window.CAFE_ACORN_SUPABASE || {};

  const SUPABASE_URL = config.url;
  const SUPABASE_KEY = config.anonKey || config.key;

  let categories = [];
  let subcategories = [];
  let products = [];
  let cafe = {};

  let selectedCategory = null;
  let selectedSubcategory = null;
  let searchQuery = "";

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function price(value) {
    if (value === null || value === undefined || value === "") return "";

    const n = Number(value);

    return Number.isFinite(n)
      ? n.toLocaleString("fa-IR") + " تومان"
      : escapeHTML(value);
  }

  async function get(table, params = "") {
    const response = await fetch(
      SUPABASE_URL + "/rest/v1/" + table + params,
      {
        method: "GET",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: "Bearer " + SUPABASE_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(table + ": " + response.status + " " + text);
    }

    return response.json();
  }

  async function loadMenu() {
    try {
      if (!SUPABASE_URL || !SUPABASE_KEY) {
        throw new Error("Supabase configuration missing");
      }

      const [
        categoriesData,
        subcategoriesData,
        productsData,
        settingsData
      ] = await Promise.all([
        get(
          "categories",
          "?select=*&is_active=eq.true&order=sort_order.asc"
        ),

        get(
          "subcategories",
          "?select=*&is_active=eq.true&order=sort_order.asc"
        ),

        get(
          "products",
          "?select=*&is_available=eq.true&order=sort_order.asc"
        ),

        get(
          "cafe_settings",
          "?select=*&limit=1"
        )
      ]);

      categories = Array.isArray(categoriesData)
        ? categoriesData
        : [];

      subcategories = Array.isArray(subcategoriesData)
        ? subcategoriesData
        : [];

      products = Array.isArray(productsData)
        ? productsData
        : [];

      cafe =
        Array.isArray(settingsData) && settingsData.length
          ? settingsData[0]
          : {};

      console.log("CAFE ACORN:", {
        categories: categories.length,
        subcategories: subcategories.length,
        products: products.length
      });

      renderCafeInfo();
      renderCategories();
      renderProducts();
      renderSpecials();
      setupSearch();

    } catch (error) {
      console.error("CAFE ACORN ERROR:", error);
      showError(error);
    }
  }

  function showError(error) {
    const box = $("products");

    if (!box) return;

    box.innerHTML = `
      <div style="
        grid-column:1/-1;
        padding:30px;
        margin:10px 0;
        background:#fff1f1;
        color:#9b1c1c;
        border-radius:18px;
        text-align:center;
        direction:rtl;
      ">
        <strong>منو بارگذاری نشد</strong>
        <br><br>
        <small>
          لطفاً صفحه را یک بار رفرش کنید.
        </small>
      </div>
    `;
  }

  function renderCafeInfo() {
    const name = cafe.cafe_name || "کافه بلوط";

    const tagline =
      cafe.tagline ||
      "جایی برای آرامش و حال خوب تو ✨";

    const address =
      cafe.address ||
      "بلوار امام حسین، جنب کابینت بلوط";

    const hours =
      cafe.opening_hours ||
      "۷:۳۰ تا ۱۳:۰۰ و ۱۷:۰۰ تا ۲۳:۰۰";

    const instagram =
      cafe.instagram ||
      "@cafe_acorn";

    document.title = name + " | منوی دیجیتال";

    const nameEls = document.querySelectorAll(
      "#cafeName,#aboutName"
    );

    nameEls.forEach(function (el) {
      el.textContent = name;
    });

    const taglineEls = document.querySelectorAll(
      "#tagline,#aboutTagline"
    );

    taglineEls.forEach(function (el) {
      el.textContent = tagline;
    });

    const addressEls = document.querySelectorAll(
      "#address,#contactAddress"
    );

    addressEls.forEach(function (el) {
      el.textContent = address;
    });

    const hoursEl = $("hours");

    if (hoursEl) {
      hoursEl.textContent = hours;
    }

    const instagramEl = $("instagram");

    if (instagramEl) {
      instagramEl.textContent = instagram;
    }
  }

  function renderCategories() {
    const box = $("chips");

    if (!box) return;

    let html = `
      <button
        type="button"
        class="chip active"
        data-category="all"
      >
        همه
      </button>
    `;

    categories.forEach(function (category) {
      html += `
        <button
          type="button"
          class="chip"
          data-category="${escapeHTML(category.id)}"
        >
          ${escapeHTML(category.name)}
        </button>
      `;
    });

    box.innerHTML = html;

    box.querySelectorAll("[data-category]")
      .forEach(function (button) {

        button.addEventListener("click", function () {

          box.querySelectorAll("[data-category]")
            .forEach(function (b) {
              b.classList.remove("active");
            });

          button.classList.add("active");

          const id = button.dataset.category;

          selectedCategory =
            id === "all" ? null : id;

          selectedSubcategory = null;

          renderSubcategories();
          renderProducts();
        });
      });

    renderSubcategories();
  }

  function renderSubcategories() {
    const box = $("subchips");

    if (!box) return;

    let list = subcategories;

    if (selectedCategory) {
      list = subcategories.filter(function (item) {
        return String(item.category_id) ===
          String(selectedCategory);
      });
    }

    if (!list.length) {
      box.innerHTML = "";
      return;
    }

    let html = "";

    list.forEach(function (item) {
      html += `
        <button
          type="button"
          class="chip"
          data-subcategory="${escapeHTML(item.id)}"
        >
          ${escapeHTML(item.name)}
        </button>
      `;
    });

    box.innerHTML = html;

    box.querySelectorAll("[data-subcategory]")
      .forEach(function (button) {

        button.addEventListener("click", function () {

          box.querySelectorAll("[data-subcategory]")
            .forEach(function (b) {
              b.classList.remove("active");
            });

          button.classList.add("active");

          const id = button.dataset.subcategory;

          selectedSubcategory =
            id === "all" ? null : id;

          renderProducts();
        });
      });
  }

  function filteredProducts() {
    let list = products.slice();

    if (selectedCategory) {

      const ids = subcategories
        .filter(function (item) {
          return String(item.category_id) ===
            String(selectedCategory);
        })
        .map(function (item) {
          return String(item.id);
        });

      list = list.filter(function (product) {
        return ids.includes(
          String(product.subcategory_id)
        );
      });
    }

    if (selectedSubcategory) {

      list = list.filter(function (product) {
        return String(product.subcategory_id) ===
          String(selectedSubcategory);
      });
    }

    if (searchQuery) {

      const q = searchQuery.toLowerCase();

      list = list.filter(function (product) {

        return [
          product.name,
          product.name_en,
          product.description,
          product.ingredients,
          product.allergens
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q);
      });
    }

    return list;
  }

  function renderProducts() {
    const box = $("products");

    if (!box) return;

    const list = filteredProducts();

    if (!list.length) {

      box.innerHTML = `
        <div style="
          grid-column:1/-1;
          padding:30px;
          text-align:center;
          background:#fff;
          border-radius:18px;
          direction:rtl;
        ">
          محصولی پیدا نشد.
        </div>
      `;

      return;
    }

    box.innerHTML = list
      .map(function (product) {

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
            <div
              class="product-img"
              style="
                display:grid;
                place-items:center;
                font-size:45px;
              "
            >
              ☕
            </div>
          `;

        return `
          <article
            class="card"
            data-product-id="${escapeHTML(product.id)}"
            tabindex="0"
            role="button"
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
                ${price(product.price)}
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
      })
      .join("");

    box.querySelectorAll("[data-product-id]")
      .forEach(function (card) {

        card.addEventListener("click", function () {
          openProduct(card.dataset.productId);
        });

        card.addEventListener("keydown", function (event) {

          if (
            event.key === "Enter" ||
            event.key === " "
          ) {

            event.preventDefault();

            openProduct(card.dataset.productId);
          }
        });
      });
  }

  function renderSpecials() {
    const box = $("specials");

    if (!box) return;

    const specials = products.filter(function (product) {
      return product.is_special === true;
    });

    if (!specials.length) {

      box.innerHTML = `
        <div class="special-item">
          فعلاً پیشنهادی ثبت نشده
        </div>
      `;

      return;
    }

    box.innerHTML = specials
      .map(function (product) {

        return `
          <div
            class="special-item"
            data-product-id="${escapeHTML(product.id)}"
          >
            <b>${escapeHTML(product.name)}</b>
            <span>${price(product.price)}</span>
          </div>
        `;
      })
      .join("");

    box.querySelectorAll("[data-product-id]")
      .forEach(function (item) {

        item.addEventListener("click", function () {
          openProduct(item.dataset.productId);
        });
      });
  }

  function openProduct(id) {

    const product = products.find(function (item) {
      return String(item.id) === String(id);
    });

    if (!product) return;

    const modal = $("modal");
    const detail = $("detail");

    if (!modal || !detail) return;

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

      <h2>${escapeHTML(product.name)}</h2>

      <strong class="price">
        ${price(product.price)}
      </strong>

      ${
        product.description
          ? `<p>${escapeHTML(product.description)}</p>`
          : ""
      }

      ${
        product.ingredients
          ? `
            <hr>

            <p>
              <strong>مواد تشکیل‌دهنده:</strong><br>
              ${escapeHTML(product.ingredients)}
            </p>
          `
          : ""
      }

      ${
        product.allergens
          ? `
            <p>
              <strong>حساسیت‌زا:</strong><br>
              ${escapeHTML(product.allergens)}
            </p>
          `
          : ""
      }
    `;

    modal.classList.add("open");
    modal.style.display = "flex";

    document.body.style.overflow = "hidden";
  }

  function closeModal() {

    const modal = $("modal");

    if (!modal) return;

    modal.classList.remove("open");
    modal.style.display = "none";

    document.body.style.overflow = "";
  }

  window.closeModal = closeModal;
  window.closeProduct = closeModal;

  window.go = function (id) {

    const element = $(id);

    if (!element) return;

    element.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  };

  window.map = function () {

    const address =
      cafe.address ||
      "بلوار امام حسین، جنب کابینت بلوط";

    const url =
      cafe.map_url ||
      "https://www.google.com/maps/search/?api=1&query=" +
      encodeURIComponent(address);

    window.open(url, "_blank");
  };

  document.addEventListener("click", function (event) {

    const modal = $("modal");

    if (modal && event.target === modal) {
      closeModal();
    }
  });

  document.addEventListener("keydown", function (event) {

    if (event.key === "Escape") {
      closeModal();
    }
  });

  function setupSearch() {

    const search = $("search");

    if (!search) return;

    search.addEventListener("input", function () {

      searchQuery =
        search.value.trim().toLowerCase();

      renderProducts();
    });
  }

  if (document.readyState === "loading") {

    document.addEventListener(
      "DOMContentLoaded",
      loadMenu
    );

  } else {

    loadMenu();
  }

})();
