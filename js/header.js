// SITE HEADER: dựng logo, ô tìm kiếm, chuyên mục, menu tài khoản và tương tác đóng/mở.
// Tìm kiếm mobile: lần chạm đầu mở input; Enter/lần chạm tiếp theo gửi truy vấn.

import { NEWS_CATEGORIES } from "./news-data.js";

const mount = document.getElementById("site-header");
if (mount) {
  const base = mount.dataset.base || "./";
  const currentUrl = new URL(window.location.href);
  const currentCategory = currentUrl.searchParams.get("category") || "";
  const isHome =
    /index\.html?$/.test(window.location.pathname) ||
    window.location.pathname.endsWith("/");
  const categoryLinks = NEWS_CATEGORIES.map(
    (category) => `
    <a class="topic-link ${currentCategory === category.slug ? "is-active" : ""}" href="${base}category.html?category=${encodeURIComponent(category.slug)}">${category.name}</a>
  `,
  ).join("");

  mount.innerHTML = `
    <header class="news-site-header">
      <div class="news-topbar">
        <div class="news-topbar-inner">
          <a class="news-logo" href="${base}index.html" aria-label="NEWS 24H - Trang chủ">
            <img class="news-logo-mark" src="${base}img/avatar.png" alt="Logo NEWS 24H"><span class="news-logo-word">NEWS <b>24H</b></span>
          </a>
          <span class="news-date" id="news-date"></span>
          <div class="news-top-actions">
            <a class="top-edition" href="${base}index.html">Tin tức Việt Nam</a>
            <form class="news-search" id="site-search-form" role="search" aria-label="Tìm kiếm tin tức" aria-expanded="false">
              <input type="search" id="site-search-input" placeholder="Tìm kiếm tin tức..." aria-label="Tìm kiếm tin tức" autocomplete="off">
              <button type="submit" aria-label="Mở hoặc thực hiện tìm kiếm"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"></circle><path d="m16 16 5 5"></path></svg></button>
            </form>
            <div class="account-area">
              <button class="account-trigger" id="account-toggle" type="button" aria-expanded="false" aria-controls="account-menu">
                <span class="account-avatar" id="account-initials">N</span>
                <span class="account-label" id="account-name">Tài khoản</span>
                <svg class="account-chevron" viewBox="0 0 12 12" aria-hidden="true"><path d="m2 4 4 4 4-4"></path></svg>
              </button>
              <div class="account-menu" id="account-menu" hidden>
                <div class="account-menu-head">
                  <strong id="account-summary-name">Độc giả NEWS 24H</strong>
                  <span id="account-summary-email">Đăng nhập để đồng bộ tài khoản</span>
                  <span class="account-role" id="account-role">Khách</span>
                </div>
                <a href="${base}login.html" id="account-login-link">Đăng nhập</a>
                <a href="${base}register.html" id="account-register-link">Tạo tài khoản</a>
                <a href="${base}profile.html" id="account-profile-link" hidden>Thông tin tài khoản</a>
                <a href="${base}bookmarks.html" id="account-bookmarks-link">Bài viết đã lưu</a>
                <a href="${base}compose.html" id="account-compose-link" hidden>Soạn thảo bài báo</a>
                <a href="${base}admin.html" id="account-admin-link" hidden>Trang quản trị</a>
                <button type="button" id="logout-btn" hidden>Đăng xuất</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="topics-bar">
        <nav class="topic-nav" aria-label="Chuyên mục">
          <a class="home-topic ${isHome ? "is-active" : ""}" href="${base}index.html" aria-label="Trang chủ" title="Trang chủ">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"></path></svg>
          </a>
          ${categoryLinks}
          <div class="topics-more-wrap">
            <button class="topics-more-button" id="topics-more-toggle" type="button" aria-label="Mở thêm chức năng" aria-expanded="false" aria-controls="topics-more-menu">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
            <div class="topics-more-menu" id="topics-more-menu" hidden>
              <a href="${base}contact.html">Liên hệ tòa soạn</a>
              <a href="${base}bookmarks.html">Bài viết đã lưu</a>
              <a href="${base}login.html" id="topics-login-link">Đăng nhập</a>
              <a href="${base}profile.html" id="topics-profile-link" hidden>Thông tin tài khoản</a>
              <a href="${base}compose.html" id="topics-compose-link" hidden>Soạn thảo bài báo</a>
              <a href="${base}admin.html" id="topics-admin-link" hidden>Trang quản trị</a>
            </div>
          </div>
        </nav>
      </div>
    </header>
  `;

  const dateNode = document.getElementById("news-date");
  if (dateNode) {
    dateNode.textContent = new Intl.DateTimeFormat("vi-VN", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date());
  }

  const searchInput = document.getElementById("site-search-input");
  if (searchInput && currentUrl.searchParams.has("q"))
    searchInput.value = currentUrl.searchParams.get("q") || "";

  const searchForm = document.getElementById("site-search-form");
  const isCompactHeader = () => window.matchMedia("(max-width: 700px)").matches;
  const closeMobileSearch = () => {
    if (!searchForm) return;
    searchForm.classList.remove("is-open");
    searchForm.setAttribute("aria-expanded", "false");
  };

  // Trên điện thoại, lần chạm đầu vào kính lúp chỉ mở ô nhập và bật bàn phím.
  // Khi ô đã mở, Enter hoặc chạm kính lúp lần nữa mới gửi từ khóa.
  searchForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (isCompactHeader() && !searchForm.classList.contains("is-open")) {
      searchForm.classList.add("is-open");
      searchForm.setAttribute("aria-expanded", "true");
      searchInput?.focus({ preventScroll: true });
      return;
    }
    const query = searchInput?.value.trim() || "";
    if (query)
      window.location.href = `${base}search.html?q=${encodeURIComponent(query)}`;
    else searchInput?.focus({ preventScroll: true });
  });

  searchInput?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMobileSearch();
      searchInput.blur();
    }
  });

  const accountToggle = document.getElementById("account-toggle");
  const accountMenu = document.getElementById("account-menu");
  const moreToggle = document.getElementById("topics-more-toggle");
  const moreMenu = document.getElementById("topics-more-menu");
  moreToggle?.addEventListener("click", () => {
    const isOpen = !moreMenu.hidden;
    moreMenu.hidden = isOpen;
    moreToggle.setAttribute("aria-expanded", String(!isOpen));
  });
  accountToggle?.addEventListener("click", () => {
    const isOpen = !accountMenu.hidden;
    accountMenu.hidden = isOpen;
    accountToggle.setAttribute("aria-expanded", String(!isOpen));
  });
  document.addEventListener("click", (event) => {
    if (
      !event.target.closest(".news-search") &&
      isCompactHeader() &&
      searchForm?.classList.contains("is-open")
    ) {
      closeMobileSearch();
    }
    if (
      !event.target.closest(".account-area") &&
      accountMenu &&
      !accountMenu.hidden
    ) {
      accountMenu.hidden = true;
      accountToggle?.setAttribute("aria-expanded", "false");
    }
    if (
      !event.target.closest(".topics-more-wrap") &&
      moreMenu &&
      !moreMenu.hidden
    ) {
      moreMenu.hidden = true;
      moreToggle?.setAttribute("aria-expanded", "false");
    }
  });
}
