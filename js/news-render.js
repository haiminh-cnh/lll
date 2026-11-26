// NEWS RENDER: dựng các khu vực tin mới, tin nóng, slider và thẻ bài viết trên trang chủ.
// Cấu trúc HTML cần giữ đúng các ID mà module này truy cập.

import { getCategoryName } from "./news-data.js";
import { loadNewsFeed } from "./news-store.js";
import { createBookmarkButton } from "./bookmarks.js";

const hero = document.getElementById("hero-slider");
const newsContainer = document.getElementById("news");
const sidebar = document.getElementById("sidebar-news");
const ticker = document.getElementById("breaking-track");

function escapeHTML(value = "") {
  return String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );
}

function formatDate(date) {
  if (!date) return "";
  const normalized = /^\d{2}-\d{2}-\d{4}$/.test(date)
    ? date.split("-").reverse().join("-")
    : date;
  const parsed = new Date(`${normalized}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString("vi-VN");
}

function renderTicker(items) {
  if (!ticker || !items.length) return;
  const links = items
    .map(
      (item) => `
    <a href="${escapeHTML(item.detail)}">${escapeHTML(item.title)}</a>
  `,
    )
    .join("");
  // Nhân đôi dải tin để tạo hiệu ứng chạy liền mạch.
  ticker.innerHTML = links + links;
}

function renderHero(items) {
  if (!hero || !items.length) return;
  const featured = items.slice(0, 5);
  hero.innerHTML =
    featured
      .map(
        (item, index) => `
    <a href="${escapeHTML(item.detail)}" class="slide ${index === 0 ? "active" : ""}" aria-label="Đọc bài: ${escapeHTML(item.title)}" ${index === 0 ? 'aria-current="true"' : ""}>
      <img src="${escapeHTML(item.poster)}" class="slide-img" alt="${escapeHTML(item.title)}" ${index === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}>
      <div class="slide-content">
        <span class="badge text-bg-primary">Tiêu điểm · ${escapeHTML(getCategoryName(item.category))}</span>
        <h2>${escapeHTML(item.title)}</h2>
        <p>${escapeHTML(item.description)}</p>
      </div>
    </a>
  `,
      )
      .join("") +
    `
    <div class="hero-controls" aria-label="Điều khiển tin tiêu điểm">
      <button class="hero-arrow hero-prev" type="button" aria-label="Tin trước">‹</button>
      <div class="hero-dots">${featured.map((_, index) => `<button type="button" class="hero-dot ${index === 0 ? "is-active" : ""}" data-slide="${index}" aria-label="Chuyển đến tin ${index + 1}" aria-pressed="${index === 0}"></button>`).join("")}</div>
      <button class="hero-arrow hero-next" type="button" aria-label="Tin tiếp theo">›</button>
    </div>
  `;

  const slides = [...hero.querySelectorAll(".slide")];
  const dots = [...hero.querySelectorAll(".hero-dot")];
  let active = 0;
  let timer;

  function showSlide(next) {
    active = (next + slides.length) % slides.length;
    slides.forEach((slide, index) => {
      slide.classList.toggle("active", index === active);
      if (index === active) slide.setAttribute("aria-current", "true");
      else slide.removeAttribute("aria-current");
    });
    dots.forEach((dot, index) => {
      dot.classList.toggle("is-active", index === active);
      dot.setAttribute("aria-pressed", String(index === active));
    });
  }
  function restartTimer() {
    window.clearInterval(timer);
    if (slides.length > 1)
      timer = window.setInterval(() => showSlide(active + 1), 6000);
  }

  hero.querySelector(".hero-prev")?.addEventListener("click", () => {
    showSlide(active - 1);
    restartTimer();
  });
  hero.querySelector(".hero-next")?.addEventListener("click", () => {
    showSlide(active + 1);
    restartTimer();
  });
  dots.forEach((dot) =>
    dot.addEventListener("click", () => {
      showSlide(Number(dot.dataset.slide));
      restartTimer();
    }),
  );
  hero.addEventListener("mouseenter", () => window.clearInterval(timer));
  hero.addEventListener("mouseleave", restartTimer);
  restartTimer();
}

function renderCards(items) {
  if (!newsContainer) return;
  if (!items.length) {
    newsContainer.innerHTML =
      '<div class="empty-news">Chưa có bài viết nào trong danh sách này.</div>';
    return;
  }
  newsContainer.innerHTML = items
    .map(
      (item, index) => `
    <article class="news-card-wrap ${index === 0 ? "card-wrap-featured" : ""}">
      <a class="card shadow-sm ${index === 0 ? "card-featured" : ""}" href="${escapeHTML(item.detail)}">
        <img src="${escapeHTML(item.poster)}" alt="${escapeHTML(item.title)}" loading="${index === 0 ? "eager" : "lazy"}">
        <div class="card-content">
          <div class="card-meta"><span>${escapeHTML(getCategoryName(item.category))}</span><time datetime="${escapeHTML(item.releaseDate)}">${escapeHTML(formatDate(item.releaseDate))}</time></div>
          <h3>${escapeHTML(item.title)}</h3>
          <p>${escapeHTML(item.description)}</p>
          <span class="read-more">Đọc bài viết <span aria-hidden="true">→</span></span>
        </div>
      </a>
      ${createBookmarkButton(item)}
    </article>
  `,
    )
    .join("");
  const count = document.getElementById("news-count");
  if (count) count.textContent = `${items.length} bài viết`;
}

function renderSidebar(items) {
  if (!sidebar) return;
  const popular = items.filter((item) => item.isHot).slice(0, 4); // Chỉ hiển thị tối đa 4 bài trong mục Tin nóng.
  sidebar.innerHTML = popular
    .map(
      (item, index) => `
    <a class="hot-item list-group-item" href="${escapeHTML(item.detail)}">
      <span class="hot-number">${String(index + 1).padStart(2, "0")}</span>
      <span class="hot-copy">
        <span class="hot-title">${escapeHTML(item.title)}</span>
        <time class="hot-date" datetime="${escapeHTML(item.releaseDate)}">${escapeHTML(formatDate(item.releaseDate))}</time>
      </span>
    </a>
  `,
    )
    .join("");
}

const today = document.getElementById("today-label");
if (today)
  today.textContent = new Date().toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const feed = await loadNewsFeed();
renderTicker(feed.slice(0, 10));
renderHero(feed.filter((item) => item.isHot));
renderCards(feed.slice(0, 3)); // Chỉ hiển thị tối đa 3 tin mới nhất trên trang chủ.
renderSidebar(feed);
