// ARTICLE ENHANCE: bổ sung tác giả, tin liên quan, sidebar, chia sẻ/in và tiến độ đọc cho trang bài viết tĩnh.

import { API_NEWS, NEWS_CATEGORIES, getCategoryName } from "./news-data.js";
import { createBookmarkButton } from "./bookmarks.js";

const currentFile =
  window.location.pathname.split("/").filter(Boolean).pop() || "";
const currentNews = API_NEWS.find(
  (item) => item.detail.split("/").pop() === currentFile,
);
const article = document.querySelector(".article-main article");
const meta = article?.querySelector(".meta");
const content = article?.querySelector(".content");
const sidebar = document.getElementById("article-sidebar");
const siteBase = document.getElementById("site-header")?.dataset.base || "../";

function safeText(value = "") {
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

function articleHref(item) {
  return `../Posts/${item.detail.split("/").pop()}`;
}

function readingMinutes() {
  const words = (content?.innerText || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

function renderAuthorAndActions() {
  if (!meta || !article || !currentNews) return;
  const time = document.createElement("span");
  time.textContent = `• ${readingMinutes()} phút đọc`;
  time.className = "article-reading-time";
  meta.append(time);

  const toolbar = document.createElement("div");
  toolbar.className = "article-byline";
  toolbar.innerHTML = `
    <div class="byline-person">
      <img class="byline-avatar" src="${siteBase}img/avatar.png" alt="Logo NEWS 24H">
      <div class="byline-copy"><strong>Ban biên tập NEWS 24H</strong><span>Thông tin nhanh · Góc nhìn đa chiều</span></div>
    </div>
    <div class="article-actions">
      ${createBookmarkButton(currentNews, "article-action")}
      <button class="article-action" type="button" id="share-article">↗ Chia sẻ</button>
      <button class="article-action" type="button" id="print-article">▤ In bài</button>
    </div>
  `;
  meta.insertAdjacentElement("afterend", toolbar);

  const status = document.createElement("div");
  status.className = "article-share-status";
  status.id = "article-share-status";
  status.setAttribute("aria-live", "polite");
  toolbar.insertAdjacentElement("afterend", status);

  document
    .getElementById("share-article")
    ?.addEventListener("click", async () => {
      const shareData = {
        title: document.title,
        text: article.querySelector("h1")?.textContent || "NEWS 24H",
        url: window.location.href,
      };
      try {
        if (navigator.share) await navigator.share(shareData);
        else if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(window.location.href);
          status.textContent = "Đã sao chép liên kết bài viết.";
        } else {
          status.textContent = "Trình duyệt chưa hỗ trợ chia sẻ tự động.";
        }
      } catch (error) {
        if (error?.name !== "AbortError")
          status.textContent = "Không thể chia sẻ ở thời điểm này.";
      }
    });
  document
    .getElementById("print-article")
    ?.addEventListener("click", () => window.print());
}

function renderRelated() {
  if (!article || !currentNews) return;
  const related = API_NEWS.filter((item) => item.id !== currentNews.id).slice(
    0,
    3,
  );
  const section = document.createElement("section");
  section.className = "article-related card shadow-sm";
  section.innerHTML = `
    <div class="article-section-heading"><h2>Tin bài liên quan</h2><span>NEWS 24H đề xuất</span></div>
    <div class="related-grid">
      ${related
        .map(
          (item) => `
        <a class="related-card" href="${safeText(articleHref(item))}">
          <img src="${safeText(item.poster)}" alt="${safeText(item.title)}" loading="lazy">
          <span>${safeText(item.title)}</span>
        </a>
      `,
        )
        .join("")}
    </div>
  `;
  const rating = document.querySelector(".rating-section");
  if (rating) rating.insertAdjacentElement("beforebegin", section);
  else article.insertAdjacentElement("afterend", section);
}

function renderSidebar() {
  if (!sidebar) return;
  const candidates = API_NEWS.filter(
    (item) => item.id !== currentNews?.id,
  ).slice(0, 3);
  const categoryLinks = NEWS_CATEGORIES.slice(0, 8)
    .map(
      (category) => `
    <a href="../category.html?category=${encodeURIComponent(category.slug)}">${safeText(category.name)}</a>
  `,
    )
    .join("");
  sidebar.innerHTML = `
    <section class="aside-panel card shadow-sm">
      <div class="aside-panel-heading"><h2>Đáng chú ý</h2><span>Tin nổi bật</span></div>
      ${candidates
        .map(
          (item) => `
        <a class="aside-news-item" href="${safeText(articleHref(item))}">
          <img src="${safeText(item.poster)}" alt="" loading="lazy">
          <span class="aside-news-copy"><small>${safeText(getCategoryName(item.category))}</small><strong>${safeText(item.title)}</strong></span>
        </a>
      `,
        )
        .join("")}
    </section>
    <section class="aside-panel card shadow-sm">
      <div class="aside-panel-heading"><h2>Chuyên mục</h2><span>Khám phá</span></div>
      <div class="aside-category-links">${categoryLinks}</div>
    </section>
    <section class="aside-brand-card card shadow-sm">
      <span class="brand-eyebrow">Cập nhật mỗi ngày</span>
      <strong>NEWS 24H</strong>
      <p>Đồng hành cùng bạn qua những thông tin mới, những vấn đề đáng quan tâm và góc nhìn đa chiều.</p>
    </section>
  `;
}

function addReadingProgress() {
  const progress = document.createElement("div");
  progress.className = "reading-progress";
  progress.setAttribute("aria-hidden", "true");
  document.body.append(progress);
  let ticking = false;
  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const percent =
      max > 0 ? Math.min(100, Math.max(0, (window.scrollY / max) * 100)) : 0;
    progress.style.width = `${percent}%`;
    ticking = false;
  };
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    },
    { passive: true },
  );
  update();
}

if (currentNews && article) {
  document.title = `${currentNews.title} | NEWS 24H`;
  const category = article.querySelector(".category");
  if (category) category.textContent = getCategoryName(currentNews.category);
}
renderAuthorAndActions();
renderRelated();
renderSidebar();
addReadingProgress();
