// BOOKMARKS: lưu bài viết theo từng tài khoản trong account/{uid}/bookmarks.
// Dữ liệu được đồng bộ bằng Firestore; người dùng cần đăng nhập để lưu và quản lý bài viết.

import { auth, db } from "./firebase-client.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const state = {
  user: null,
  items: [],
  status: "loading",
  error: null,
};
const subscribers = new Set();
let stopSnapshot = null;

function emit() {
  const snapshot = {
    user: state.user,
    items: [...state.items],
    status: state.status,
    error: state.error,
  };
  subscribers.forEach((callback) => callback(snapshot));
  refreshBookmarkButtons();
}

function getBookmarkId(item) {
  if (item.bookmarkId) return String(item.bookmarkId);
  if (item.firestoreId) return `article-${item.firestoreId}`;
  return `news-${item.id}`;
}

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

function bookmarkRecord(item) {
  return {
    bookmarkId: getBookmarkId(item),
    articleId: String(item.id ?? item.firestoreId ?? ""),
    firestoreId: item.firestoreId ? String(item.firestoreId) : "",
    title: String(item.title || "Bài viết NEWS 24H"),
    poster: String(item.poster || "./img/news-background.jpg"),
    detail: String(item.detail || "./index.html"),
    releaseDate: String(item.releaseDate || ""),
    description: String(item.description || ""),
    category: String(item.category || ""),
    source: String(item.source || (item.firestoreId ? "reader" : "news")),
  };
}

// Dùng hàm này khi dựng thẻ bài viết hoặc thanh công cụ của trang bài viết.
export function createBookmarkButton(item, className = "") {
  const record = bookmarkRecord(item);
  const encoded = encodeURIComponent(JSON.stringify(record));
  const saved = state.items.some(
    (entry) => entry.bookmarkId === record.bookmarkId,
  );
  return `
    <button type="button" class="bookmark-button ${safeText(className)} ${saved ? "is-saved" : ""}"
      data-bookmark-button data-bookmark-id="${safeText(record.bookmarkId)}"
      data-bookmark-item="${safeText(encoded)}" aria-pressed="${saved}"
      aria-label="${saved ? "Bỏ lưu bài viết" : "Lưu bài viết để đọc sau"}"
      title="${saved ? "Bỏ lưu bài viết" : "Lưu bài viết để đọc sau"}">
      <span class="bookmark-button-icon" aria-hidden="true">${saved ? "★" : "☆"}</span>
      <span class="bookmark-button-label">${saved && className.includes("bookmark-card-remove") ? "Bỏ lưu" : saved ? "Đã lưu" : "Lưu bài"}</span>
    </button>`;
}

function refreshBookmarkButtons() {
  document.querySelectorAll("[data-bookmark-button]").forEach((button) => {
    const saved = state.items.some(
      (item) => item.bookmarkId === button.dataset.bookmarkId,
    );
    button.classList.toggle("is-saved", saved);
    button.setAttribute("aria-pressed", String(saved));
    button.setAttribute(
      "aria-label",
      saved ? "Bỏ lưu bài viết" : "Lưu bài viết để đọc sau",
    );
    button.title = saved ? "Bỏ lưu bài viết" : "Lưu bài viết để đọc sau";
    const icon = button.querySelector(".bookmark-button-icon");
    const label = button.querySelector(".bookmark-button-label");
    if (icon) icon.textContent = saved ? "★" : "☆";
    if (label) {
      label.textContent = saved
        ? button.classList.contains("bookmark-card-remove")
          ? "Bỏ lưu"
          : "Đã lưu"
        : "Lưu bài";
    }
  });
}

function showBookmarkNotice(message, type = "info") {
  let notice = document.getElementById("bookmark-toast");
  if (!notice) {
    notice = document.createElement("div");
    notice.id = "bookmark-toast";
    notice.className = "bookmark-toast";
    notice.setAttribute("role", "status");
    notice.setAttribute("aria-live", "polite");
    document.body.append(notice);
  }
  notice.textContent = message;
  notice.dataset.type = type;
  notice.classList.add("is-visible");
  window.clearTimeout(showBookmarkNotice.timer);
  showBookmarkNotice.timer = window.setTimeout(
    () => notice.classList.remove("is-visible"),
    3200,
  );
}

export function subscribeToBookmarks(callback) {
  subscribers.add(callback);
  callback({
    user: state.user,
    items: [...state.items],
    status: state.status,
    error: state.error,
  });
  return () => subscribers.delete(callback);
}

onAuthStateChanged(auth, (user) => {
  state.user = user;
  state.items = [];
  state.error = null;
  if (stopSnapshot) {
    stopSnapshot();
    stopSnapshot = null;
  }

  if (!user) {
    state.status = "signed-out";
    emit();
    return;
  }

  state.status = "loading";
  emit();
  stopSnapshot = onSnapshot(
    collection(db, "account", user.uid, "bookmarks"),
    (snapshot) => {
      state.items = snapshot.docs
        .map((bookmark) => ({
          ...bookmark.data(),
          bookmarkId: bookmark.id,
          savedAtMillis: bookmark.data().savedAt?.toMillis?.() || 0,
        }))
        .sort((a, b) => b.savedAtMillis - a.savedAtMillis);
      state.status = "ready";
      state.error = null;
      emit();
    },
    (error) => {
      console.error("Không tải được bookmark:", error);
      state.status = "error";
      state.error = error;
      emit();
    },
  );
});

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-bookmark-button]");
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();

  if (button.disabled) return;
  if (!state.user) {
    const base = document.getElementById("site-header")?.dataset.base || "./";
    showBookmarkNotice("Bạn cần đăng nhập để lưu và đồng bộ bài viết.");
    window.setTimeout(() => {
      window.location.href = `${base}login.html?redirect=${encodeURIComponent(window.location.href)}`;
    }, 450);
    return;
  }

  let item;
  try {
    item = JSON.parse(decodeURIComponent(button.dataset.bookmarkItem || ""));
  } catch (error) {
    console.error("Thông tin bài viết không hợp lệ:", error);
    showBookmarkNotice("Không thể xử lý bài viết này.", "error");
    return;
  }

  const bookmarkId = getBookmarkId(item);
  const alreadySaved = state.items.some(
    (saved) => saved.bookmarkId === bookmarkId,
  );
  button.disabled = true;
  try {
    const bookmarkRef = doc(
      db,
      "account",
      state.user.uid,
      "bookmarks",
      bookmarkId,
    );
    if (alreadySaved) {
      await deleteDoc(bookmarkRef);
      state.items = state.items.filter(
        (saved) => saved.bookmarkId !== bookmarkId,
      );
      showBookmarkNotice("Đã bỏ lưu bài viết.", "success");
    } else {
      const record = bookmarkRecord(item);
      await setDoc(bookmarkRef, {
        ...record,
        savedAt: serverTimestamp(),
      });
      state.items = [
        { ...record, savedAtMillis: Date.now() },
        ...state.items.filter((saved) => saved.bookmarkId !== bookmarkId),
      ];
      showBookmarkNotice(
        "Đã lưu bài viết. Bạn có thể đọc lại trong mục Bài viết đã lưu.",
        "success",
      );
    }
    refreshBookmarkButtons();
    // Phát lại để trang danh sách bookmark cập nhật ngay cả trước snapshot kế tiếp.
    emit();
  } catch (error) {
    console.error("Không thể cập nhật bookmark:", error);
    showBookmarkNotice(
      "Không lưu được bài viết. Hãy kiểm tra kết nối và Firestore Rules.",
      "error",
    );
  } finally {
    button.disabled = false;
  }
});
