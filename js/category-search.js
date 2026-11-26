// CATEGORY & SEARCH: đọc query string, tải nguồn tin và lọc theo chuyên mục/từ khóa.
// Muốn thay đổi cách tìm kiếm, cập nhật phần normalize/filter ở cuối file.

import { getCategoryName } from "./news-data.js";
import { loadNewsFeed } from "./news-store.js";
import { createBookmarkButton } from "./bookmarks.js";

const params = new URLSearchParams(window.location.search);
const pageType = document.body.dataset.pageType;
const titleNode = document.getElementById("listing-title");
const descriptionNode = document.getElementById("listing-description");
const resultNode = document.getElementById("listing-results");
const countNode = document.getElementById("result-count");
const query = (params.get("q") || "").trim();
const category = params.get("category") || "";

function escapeHTML(value = "") {
  return String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
}
function card(item) {
  const date = new Date(`${item.releaseDate}T00:00:00`);
  const formattedDate = Number.isNaN(date.getTime())
    ? item.releaseDate
    : date.toLocaleDateString("vi-VN");
  return `
    <article class="listing-card-wrap">
      <a class="listing-card card shadow-sm" href="${escapeHTML(item.detail)}">
        <img src="${escapeHTML(item.poster)}" alt="${escapeHTML(item.title)}" loading="lazy">
        <div class="listing-card-copy">
          <div class="listing-meta"><span>${escapeHTML(getCategoryName(item.category))}</span><time>${escapeHTML(formattedDate)}</time></div>
          <h2>${escapeHTML(item.title)}</h2>
          <p>${escapeHTML(item.description)}</p>
          <span class="listing-read">Đọc tiếp →</span>
        </div>
      </a>
      ${createBookmarkButton(item)}
    </article>`;
}

const allNews = await loadNewsFeed();
let results = allNews;
if (pageType === "category") {
  const categoryName = getCategoryName(category);
  titleNode.textContent = categoryName;
  descriptionNode.textContent = `Các tin tức mới nhất thuộc chuyên mục ${categoryName}.`;
  results = allNews.filter((item) => item.category === category);
} else {
  titleNode.textContent = query
    ? `Kết quả tìm kiếm: “${query}”`
    : "Tìm kiếm tin tức";
  descriptionNode.textContent = query
    ? "Những bài viết phù hợp với từ khóa bạn vừa tìm."
    : "Nhập từ khóa vào ô tìm kiếm ở thanh điều hướng để tìm bài viết.";
  const normalized = query.toLocaleLowerCase("vi");
  results = query
    ? allNews.filter((item) =>
        [
          item.title,
          item.description,
          getCategoryName(item.category),
          item.author || "",
        ].some((value) =>
          String(value).toLocaleLowerCase("vi").includes(normalized),
        ),
      )
    : [];
}

countNode.textContent = `${results.length} bài viết`;
resultNode.innerHTML = results.length
  ? results.map(card).join("")
  : `<div class="empty-results"><span class="empty-icon">⌕</span><h2>Chưa có bài viết phù hợp</h2><p>${pageType === "category" ? "Chuyên mục này chưa có bài viết trong dữ liệu hiện tại. Bạn hãy chọn chủ đề khác." : "Không tìm thấy bài viết trùng với từ khóa. Hãy thử một từ khóa ngắn hoặc khác."}</p><a href="./index.html">Quay về trang chủ</a></div>`;
