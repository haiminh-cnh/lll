// USER ARTICLE: tải bài cộng tác theo ?id=, kiểm tra trạng thái/quyền xem và dựng nội dung an toàn.
// safeContent chỉ cho phép một tập thẻ HTML; không đưa HTML thô từ Firestore lên trang.

import { auth, db } from "./firebase-client.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { NEWS_CATEGORIES } from "./news-data.js";
import { loadNewsFeed } from "./news-store.js";
import { createBookmarkButton } from "./bookmarks.js";
const id = new URLSearchParams(location.search).get("id");
const $ = (x) => document.getElementById(x);
function safeContent(html) {
  const parsed = new DOMParser().parseFromString(
    `<div>${html || ""}</div>`,
    "text/html",
  );
  const allowed = new Set([
    "P",
    "BR",
    "STRONG",
    "B",
    "EM",
    "I",
    "U",
    "H2",
    "H3",
    "UL",
    "OL",
    "LI",
    "BLOCKQUOTE",
  ]);
  const walk = (n) =>
    [...n.childNodes].forEach((c) => {
      if (c.nodeType === Node.TEXT_NODE) return;
      if (c.nodeType !== Node.ELEMENT_NODE) {
        c.remove();
        return;
      }
      walk(c);
      if (!allowed.has(c.tagName)) {
        c.replaceWith(...c.childNodes);
        return;
      }
      [...c.attributes].forEach((a) => c.removeAttribute(a.name));
    });
  walk(parsed.body.firstElementChild);
  return parsed.body.firstElementChild?.innerHTML || "";
}
function showError(msg) {
  $("article-loading").textContent = msg;
  $("submitted-message").textContent = msg;
}
onAuthStateChanged(auth, async (user) => {
  if (!id) {
    showError("Không tìm thấy mã bài viết.");
    return;
  }
  try {
    const snap = await getDoc(doc(db, "articles", id));
    if (!snap.exists()) {
      showError("Bài viết không tồn tại hoặc đã bị xóa.");
      return;
    }
    const a = snap.data();
    const isAuthor = user && user.uid === a.authorId;
    let isAdmin = false;
    if (user) {
      const u = await getDoc(doc(db, "account", user.uid));
      isAdmin = u.exists() && u.data().role === "admin";
    }
    if (a.status !== "published" && !isAuthor && !isAdmin) {
      showError("Bài viết chưa được xuất bản hoặc bạn không có quyền xem.");
      return;
    }
    $("article-loading").remove();
    $("submitted-title").textContent = a.title || "Bài viết";
    $("submitted-category").textContent =
      NEWS_CATEGORIES.find((c) => c.slug === a.category)?.name || "Tin tức";
    const date = a.publishedAt || a.createdAt || new Date().toISOString();
    $("submitted-meta").textContent =
      `${new Date(date).toLocaleDateString("vi-VN")} · ${a.authorName || "Cộng tác viên NEWS 24H"}`;
    const bookmarkItem = {
      id: `user-${id}`,
      firestoreId: id,
      title: a.title || "Bài viết",
      poster: a.poster || "./img/news-background.jpg",
      detail: `./user-article.html?id=${encodeURIComponent(id)}`,
      releaseDate: typeof date === "string" ? date.slice(0, 10) : "",
      description: a.description || "Bài viết do độc giả NEWS 24H đóng góp.",
      category: a.category || "thoi-su",
      source: "reader",
    };
    const bookmarkToolbar = document.createElement("div");
    bookmarkToolbar.className = "article-byline user-article-actions";
    bookmarkToolbar.innerHTML = `<div class="article-actions">${createBookmarkButton(bookmarkItem, "article-action")}</div>`;
    $("submitted-meta").insertAdjacentElement("afterend", bookmarkToolbar);
    $("submitted-content").innerHTML = safeContent(a.content);
    if (a.poster) {
      $("submitted-poster").src = a.poster;
      $("submitted-poster").alt = a.title || "Ảnh bài viết";
      $("submitted-caption").textContent = "Ảnh do tác giả cung cấp.";
      $("submitted-figure").hidden = false;
    }
    document.title = `${a.title} | NEWS 24H`;
    const feed = await loadNewsFeed();
    const sidebar = $("article-sidebar");
    const related = feed
      .filter((x) => x.category === a.category && x.firestoreId !== id)
      .slice(0, 4);
    sidebar.innerHTML = `<section class="aside-panel"><div class="aside-panel-heading"><h2>Bài viết đáng chú ý</h2><span>NEWS 24H</span></div>${related.map((x) => `<a class="aside-news-item" href="${x.detail}"><img src="${x.poster}" alt="" loading="lazy"><span class="aside-news-copy"><small>${NEWS_CATEGORIES.find((c) => c.slug === x.category)?.name || "Tin tức"}</small><strong>${x.title}</strong></span></a>`).join("") || "<p>Chưa có bài viết liên quan.</p>"}</section>`;
  } catch (error) {
    console.error(error);
    showError("Không tải được bài viết. Hãy kiểm tra Firestore Rules.");
  }
});
