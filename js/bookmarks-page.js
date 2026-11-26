// BOOKMARKS PAGE: hiển thị các bài đã lưu của tài khoản đang đăng nhập.
import { subscribeToBookmarks, createBookmarkButton } from "./bookmarks.js";
import { getCategoryName } from "./news-data.js";

const list = document.getElementById("bookmarks-list");
const count = document.getElementById("bookmarks-count");
const status = document.getElementById("bookmarks-status");

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

function safeArticleLink(value) {
  try {
    const url = new URL(String(value || "./index.html"), window.location.href);
    if (
      url.origin === window.location.origin &&
      ["http:", "https:"].includes(url.protocol)
    )
      return url.href;
  } catch (error) {
    console.warn("Đường dẫn bài viết đã lưu không hợp lệ:", error);
  }
  return "./index.html";
}

function safeImageSource(value) {
  try {
    const url = new URL(
      String(value || "./img/news-background.jpg"),
      window.location.href,
    );
    if (["http:", "https:"].includes(url.protocol)) return url.href;
  } catch (error) {
    console.warn("Ảnh bookmark không hợp lệ:", error);
  }
  return "./img/news-background.jpg";
}

function formatDate(value) {
  if (!value) return "";
  const date = /^\d{2}-\d{2}-\d{4}$/.test(value)
    ? new Date(`${value.split("-").reverse().join("-")}T00:00:00`)
    : new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("vi-VN");
}

function renderItems(items) {
  count.textContent = `${items.length} bài viết`;
  if (!items.length) {
    list.innerHTML = `
      <div class="bookmarks-empty">
        <span class="bookmarks-empty-icon" aria-hidden="true">☆</span>
        <h2>Bạn chưa lưu bài viết nào</h2>
        <p>Khi đọc tin, hãy nhấn nút “Lưu bài” để thêm bài viết vào danh sách đọc sau.</p>
        <a href="./index.html">Khám phá tin mới nhất</a>
      </div>`;
    return;
  }

  list.innerHTML = items
    .map(
      (item) => `
    <article class="bookmark-card">
      <a class="bookmark-card-link" href="${escapeHTML(safeArticleLink(item.detail))}">
        <img src="${escapeHTML(safeImageSource(item.poster))}" alt="${escapeHTML(item.title)}" loading="lazy">
        <span class="bookmark-card-copy">
          <span class="bookmark-card-meta">${escapeHTML(getCategoryName(item.category || ""))} ${item.releaseDate ? `· ${escapeHTML(formatDate(item.releaseDate))}` : ""}</span>
          <strong>${escapeHTML(item.title || "Bài viết NEWS 24H")}</strong>
          <span>${escapeHTML(item.description || "")}</span>
          <em>Đọc bài viết →</em>
        </span>
      </a>
      ${createBookmarkButton(item, "bookmark-card-remove")}
    </article>
  `,
    )
    .join("");
}

subscribeToBookmarks(({ user, items, status: loadStatus }) => {
  if (loadStatus === "loading") {
    status.textContent = "Đang tải danh sách bài viết đã lưu…";
    count.textContent = "";
    list.innerHTML = "";
    return;
  }
  if (loadStatus === "signed-out") {
    status.textContent =
      "Đăng nhập để xem danh sách bookmark được đồng bộ theo tài khoản của bạn.";
    count.textContent = "";
    list.innerHTML = `
      <div class="bookmarks-empty">
        <span class="bookmarks-empty-icon" aria-hidden="true">♙</span>
        <h2>Đăng nhập để xem bài đã lưu</h2>
        <p>Bookmark được lưu riêng cho từng tài khoản NEWS 24H.</p>
        <a href="./login.html?redirect=${encodeURIComponent("./bookmarks.html")}">Đăng nhập ngay</a>
      </div>`;
    return;
  }
  if (loadStatus === "error") {
    status.textContent =
      "Không thể tải bookmark. Hãy kiểm tra kết nối và Firestore Rules.";
    count.textContent = "";
    list.innerHTML = "";
    return;
  }
  status.textContent = user
    ? `Các bài viết đã lưu trong tài khoản ${user.email || "của bạn"}.`
    : "";
  renderItems(items);
});
