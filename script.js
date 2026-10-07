/* =========================================================
   CAFE ACORN — PUBLIC MENU SCRIPT
   Only this file needs to be replaced.
========================================================= */

(function () {
  "use strict";

  /* ---------------------------------------------------------
     Supabase
  --------------------------------------------------------- */

  const config = window.CAFE_ACORN_SUPABASE || {};

  if (
    !window.supabase ||
    !config.url ||
    !(config.anonKey || config.key)
  ) {
    console.error("Cafe Acorn: Supabase configuration is missing.");

    document.addEventListener("DOMContentLoaded", function () {
      const products = document.getElementById("products");

      if (products) {
        products.innerHTML = `
          <div style="
            grid-column:1/-1;
            padding:30px;
            text-align:center;
            background:#fff0f0;
            color:#8b0000;
            border-radius:18px;
          ">
            خطا در اتصال به منو.
          </div>
        `;
      }
    });

    return;
  }

  const supabaseClient = window.supabase.createClient(
    config.url,
    config.anonKey || config.key
  );

  /* ---------------------------------------------------------
     State
  --------------------------------------------------------- */

  let categories = [];
  let subcategories = [];
  let products = [];
  let cafe = {};

  let selectedCategory = null;
  let selectedSubcategory = null;
  let searchQuery = "";

  /* ---------------------------------------------------------
     Helpers
  --------------------------------------------------------- */

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

  function formatPrice(price) {
    if (price === null || price === undefined || price === "") {
      return "";
    }

    const number = Number(price);

    if (!Number.isFinite(number)) {
      return escapeHTML(price);
    }

    return number.toLocaleString("fa-IR") + " تومان";
  }

  /* ---------------------------------------------------------
     Navigation
  --------------------------------------------------------- */

  window.go = function (id) {
    const element = document.getElementById(id);

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

    window.open(url, "_blank", "noopener,noreferrer");
  };

  /* ---------------------------------------------------------
     Load menu
  --------------------------------------------------------- */

  async function loadMenu() {
    try {
      const [
        categoriesResult,
        subcategoriesResult,
        productsResult,
        settingsResult
      ] = await Promise.all([
        supabaseClient
          .from("categories")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),

        supabaseClient
          .from("subcategories")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),

        supabaseClient
          .from("products")
          .select("*")
          .eq("is_available", true)
          .order("sort_order", { ascending: true }),

        supabaseClient
          .from("cafe_settings")
          .select("*")
          .limit(1)
          .maybeSingle()
      ]);

      /*
        Important:
        Settings must NOT be allowed to break the whole menu.
      */

      if (categoriesResult.error) {
        throw categoriesResult.error;
      }

      if (subcategoriesResult.error) {
        throw subcategoriesResult.error;
      }

      if (productsResult.error) {
        throw productsResult.error;
      }

      categories = Array.isArray(categoriesResult.data)
        ? categoriesResult.data
        : [];

      subcategories = Array.isArray(subcategoriesResult.data)
        ? subcategoriesResult.data
        : [];

      products = Array.isArray(productsResult.data)
        ? productsResult.data
        : [];

      cafe = settingsResult.data || {};

      console.log("Cafe Acorn menu loaded:", {
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
      console.error("Cafe Acorn menu error:", error);
      showMenuError();
    }
  }

  /* ---------------------------------------------------------
     Error
  --------------------------------------------------------- */

  function showMenuError() {
    const productsContainer = $("products");

    if (!productsContainer) return;

    productsContainer.innerHTML = `
      <div style="
        grid-column:1/-1;
        padding:30px;
        text-align:center;
        background:#fff0f0;
        color:#8b0000;
        border-radius:18px;
      ">
        <strong>خطا در دریافت منو</strong>
        <br>
        <small>
          لطفاً صفحه را دوباره بارگذاری کنید.
        </small>
      </div>
    `;
  }

  /* ---------------------------------------------------------
     Cafe information
  --------------------------------------------------------- */

  function renderCafeInfo() {
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

    document.title = name + " | منوی دیجیتال";

    document
      .querySelectorAll(
        "#cafeName,#aboutName,.cafe-name,.brand-name,[data-cafe-name]"
      )
      .forEach(function (element) {
        element.textContent = name;
      });

    document
      .querySelectorAll(
        "#tagline,#aboutTagline,.tagline,[data-tagline]"
      )
      .forEach(function (element) {
        element.textContent = tagline;
      });

    document
      .querySelectorAll(
        "#address,#contactAddress,.address,[data-address]"
      )
      .forEach(function (element) {
        element.textContent = address;
      });

    document
      .querySelectorAll(
        "#hours,.hours,[data-hours]"
      )
      .forEach(function (element) {
        element.textContent = hours;
      });

    document
      .querySelectorAll(
        "#instagram,.instagram,[data-instagram]"
      )
      .forEach(function (element) {
        element.textContent = instagram;
      });
  }

  /* ---------------------------------------------------------
     Categories
  --------------------------------------------------------- */

  function renderCategories() {
    const container =
      $("chips") ||
      $("categories") ||
      $("categoryList") ||
      document.querySelector(".categories");

    if (!container) {
      console.error("Cafe Acorn: category container not found.");
      return;
    }

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

    container.innerHTML = html;

    container
      .querySelectorAll("[data-category]")
      .forEach(function (button) {
        button.addEventListener("click", function () {
          container
            .querySelectorAll("[data-category]")
            .forEach(function (item) {
              item.classList.remove("active");
            });

          button.classList.add("active");

          const value = button.dataset.category;

          selectedCategory =
            value === "all" ? null : value;

          selectedSubcategory = null;

          renderSubcategories();
          renderProducts();
        });
      });

    renderSubcategories();
  }

  /* ---------------------------------------------------------
     Subcategories
  --------------------------------------------------------- */

  function renderSubcategories() {
    const container =
      $("subchips") ||
      $("subcategories") ||
      $("subcategoryList") ||
      document.querySelector(".subcategories");

    if (!container) return;

    let list = subcategories;

    if (selectedCategory) {
      list = subcategories.filter(function (subcategory) {
        return String(subcategory.category_id) ===
          String(selectedCategory);
      });
    }

    if (!list.length) {
      container.innerHTML = "";
      return;
    }

    let html = `
      <button
        type="button"
        class="chip active"
        data-subcategory="all"
      >
        همه
      </button>
    `;

    list.forEach(function (subcategory) {
      html += `
        <button
          type="button"
          class="chip"
          data-subcategory="${escapeHTML(subcategory.id)}"
        >
          ${escapeHTML(subcategory.name)}
        </button>
      `;
    });

    container.innerHTML = html;

    container
      .querySelectorAll("[data-subcategory]")
      .forEach(function (button) {
        button.addEventListener("click", function () {
          container
            .querySelectorAll("[data-subcategory]")
            .forEach(function (item) {
              item.classList.remove("active");
            });

          button.classList.add("active");

          const value = button.dataset.subcategory;

          selectedSubcategory =
            value === "all" ? null : value;

          renderProducts();
        });
      });
  }

  /* ---------------------------------------------------------
     Product filtering
  --------------------------------------------------------- */

  function getFilteredProducts() {
    let list = products.slice();

    if (selectedCategory) {
      const validSubcategoryIds = subcategories
        .filter(function (subcategory) {
          return String(subcategory.category_id) ===
            String(selectedCategory);
        })
        .map(function (subcategory) {
          return String(subcategory.id);
        });

      list = list.filter(function (product) {
        return validSubcategoryIds.includes(
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
      const query = searchQuery.toLowerCase();

      list = list.filter(function (product) {
        const searchableText = [
          product.name,
          product.name_en,
          product.description,
          product.ingredients,
          product.allergens
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(query);
      });
    }

    return list;
  }

  /* ---------------------------------------------------------
     Products
  --------------------------------------------------------- */

  function renderProducts() {
    const container = $("products");

    if (!container) return;

    const list = getFilteredProducts();

    if (!list.length) {
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

    container.innerHTML = list
      .map(productCard)
      .join("");

    attachProductClicks(container);
  }

  /* ---------------------------------------------------------
     Product card
  --------------------------------------------------------- */

  function productCard(product) {
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
          aria-hidden="true"
          style="
            display:grid;
            place-items:center;
            font-size:48px;
          "
        >
          ☕
        </div>
      `;

    let tags = "";

    if (product.is_special) {
      tags += `
        <span class="tag">
          ⭐ پیشنهاد امروز
        </span>
      `;
    }

    if (product.is_best_seller) {
      tags += `
        <span class="tag">
          🔥 پرفروش
        </span>
      `;
    }

    return `
      <article
        class="card"
        data-product-id="${escapeHTML(product.id)}"
        role="button"
        tabindex="0"
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

        ${tags}

      </article>
    `;
  }

  function attachProductClicks(container) {
    container
      .querySelectorAll("[data-product-id]")
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

  /* ---------------------------------------------------------
     Specials
  --------------------------------------------------------- */

  function renderSpecials() {
    const container = $("specials");

    if (!container) return;

    const specials = products.filter(function (product) {
      return product.is_special === true;
    });

    if (!specials.length) {
      container.innerHTML = `
        <div class="special-item">
          <span>
            فعلاً پیشنهادی ثبت نشده
          </span>
        </div>
      `;

      return;
    }

    container.innerHTML = specials
      .map(function (product) {
        return `
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
        `;
      })
      .join("");

    attachProductClicks(container);
  }

  /* ---------------------------------------------------------
     Product details modal
  --------------------------------------------------------- */

  function openProduct(id) {
    const product = products.find(function (item) {
      return String(item.id) === String(id);
    });

    if (!product) return;

    const modal = $("modal");
    const detail = $("detail");

    if (!modal || !detail) {
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

    document.body.style.overflow = "hidden";
  }

  function closeProduct() {
    const modal = $("modal");

    if (!modal) return;

    modal.classList.remove("open");
    modal.style.display = "none";

    document.body.style.overflow = "";
  }

  window.closeProduct = closeProduct;
  window.closeModal = closeProduct;

  /* ---------------------------------------------------------
     Modal events
  --------------------------------------------------------- */

  document.addEventListener("click", function (event) {
    const modal = $("modal");

    if (
      modal &&
      event.target === modal
    ) {
      closeProduct();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeProduct();
    }
  });

  /* ---------------------------------------------------------
     Search
  --------------------------------------------------------- */

  function setupSearch() {
    const search = $("search");

    if (!search) return;

    if (search.dataset.ready === "true") {
      return;
    }

    search.dataset.ready = "true";

    search.addEventListener("input", function () {
      searchQuery = search.value.trim();

      renderProducts();
    });
  }

  /* ---------------------------------------------------------
     Start
  --------------------------------------------------------- */

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      loadMenu
    );
  } else {
    loadMenu();
  }

})();
