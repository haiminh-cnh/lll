// ADMIN CMS: tải hàng đợi, sửa nội dung, duyệt/ẩn/xóa bài cộng tác.
// Việc ẩn dashboard chỉ là UX; firestore.rules.example mới là lớp chặn truy cập thực sự.
import { auth, db } from "./firebase-client.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { API_NEWS, NEWS_CATEGORIES } from "./news-data.js";
const $ = (id) => document.getElementById(id);
let currentAdmin = null;
let articles = [];
let editingId = null;
const statusName = {
  draft: "Bản nháp",
  pending: "Đang chờ duyệt",
  published: "Đã xuất bản",
  rejected: "Yêu cầu chỉnh sửa",
  hidden: "Đã ẩn",
};
function esc(s = "") {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
function toast(s) {
  const node = $("admin-message");
  if (node) node.textContent = s;
}
function showAccessState(user, message) {
  const dashboard = $("admin-dashboard"),
    denied = $("admin-access-error");
  if (dashboard) dashboard.hidden = true;
  if (denied) denied.hidden = false;
  const title = $("admin-access-title"),
    text = $("admin-access-text"),
    link = $("admin-access-link");
  if (title)
    title.textContent = user ? "Không có quyền truy cập" : "Vui lòng đăng nhập";
  if (text)
    text.textContent =
      message ||
      (user
        ? "Tài khoản hiện tại chưa được cấp vai trò quản trị viên."
        : "Bạn cần đăng nhập bằng tài khoản Admin để truy cập khu vực quản trị.");
  if (link) {
    link.href = user ? "./index.html" : "./login.html";
    link.textContent = user ? "Quay về trang chủ" : "Đăng nhập";
  }
}
function cleanHTML(html) {
  const parsed = new DOMParser().parseFromString(
    `<div>${html}</div>`,
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
function renderList(target, list, pendingOnly = false) {
  if (!list.length) {
    target.innerHTML =
      '<div class="admin-empty">Chưa có bài viết trong mục này.</div>';
    return;
  }
  target.innerHTML = list
    .map((a) => {
      const id = esc(a.id);
      const status = esc(a.status);
      const cover = esc(a.poster || "./img/news-background.jpg");
      return `<article class="admin-article-card card shadow-sm"><img src="${cover}" alt="" loading="lazy"><div class="admin-article-copy"><h3>${esc(a.title || "Bài viết chưa có tiêu đề")}</h3><p>${esc(a.description || "")}</p><div class="admin-article-meta"><span class="admin-status ${status}">${statusName[a.status] || a.status}</span>${esc(a.authorName || "Cộng tác viên")} · ${a.createdAt ? new Date(a.createdAt).toLocaleDateString("vi-VN") : ""}</div></div><div class="admin-article-actions"><button type="button" data-action="edit" data-id="${id}">Chỉnh sửa</button>${a.status !== "published" ? `<button type="button" class="approve" data-action="publish" data-id="${id}">Duyệt & đăng</button>` : `<button type="button" data-action="hide" data-id="${id}">Ẩn bài</button>`}${a.status !== "rejected" ? `<button type="button" data-action="reject" data-id="${id}">Yêu cầu sửa</button>` : ""}<button type="button" class="danger" data-action="delete" data-id="${id}">Xóa</button></div></article>`;
    })
    .join("");
}
function render() {
  const pending = articles.filter((a) => a.status === "pending");
  const managed = articles
    .filter((a) => a.status !== "pending")
    .sort((a, b) =>
      String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")),
    );
  $("admin-news-count").textContent = String(API_NEWS.length);
  $("admin-category-count").textContent = String(NEWS_CATEGORIES.length);
  $("admin-pending-count").textContent = String(pending.length);
  $("admin-published-count").textContent = String(
    articles.filter((a) => a.status === "published").length,
  );
  $("pending-label").textContent = `${pending.length} bài`;
  renderList($("pending-articles"), pending, true);
  renderList($("managed-articles"), managed);
}
// Chỉ gọi sau khi xác nhận account/{uid}.role === "admin"; Firestore Rules vẫn kiểm tra từng request.
async function refresh() {
  try {
    const snap = await getDocs(collection(db, "articles"));
    articles = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    render();
  } catch (error) {
    console.error(error);
    toast(
      "Không tải được hàng đợi duyệt. Hãy kiểm tra Firestore Rules và quyền Admin.",
    );
  }
}
function openEditor(id) {
  const a = articles.find((x) => x.id === id);
  if (!a) return;
  editingId = id;
  $("edit-title").value = a.title || "";
  $("edit-category").value = a.category || "thoi-su";
  $("edit-status").value = a.status || "pending";
  $("edit-poster").value = a.poster || "";
  $("edit-description").value = a.description || "";
  $("edit-content").value = a.content || "";
  $("admin-edit-modal").hidden = false;
  document.body.style.overflow = "hidden";
}
function closeEditor() {
  $("admin-edit-modal").hidden = true;
  document.body.style.overflow = "";
  editingId = null;
}
async function changeStatus(id, status) {
  if (!["published", "hidden", "rejected"].includes(status))
    throw new Error("Trạng thái không hợp lệ.");
  const article = articles.find((item) => item.id === id);
  if (!article) throw new Error("Không tìm thấy bài viết cần cập nhật.");
  if (
    status === "published" &&
    !window.confirm(
      `Duyệt và xuất bản bài “${article.title || "chưa có tiêu đề"}”? Bài sẽ hiển thị công khai trên website.`,
    )
  )
    return;
  const now = new Date().toISOString();
  const data = { status, updatedAt: now };
  if (status === "published") data.publishedAt = now;
  await updateDoc(doc(db, "articles", id), data);
  await refresh();
  toast(
    status === "published"
      ? "Đã duyệt. Bài viết sẽ xuất hiện trên trang chủ, chuyên mục và tìm kiếm."
      : status === "rejected"
        ? "Đã gửi yêu cầu chỉnh sửa cho tác giả."
        : "Đã ẩn bài viết khỏi khu vực công khai.",
  );
}
async function deleteArticle(id) {
  if (
    !confirm(
      "Bạn chắc chắn muốn xóa bài viết này? Thao tác không thể hoàn tác.",
    )
  )
    return;
  await deleteDoc(doc(db, "articles", id));
  await refresh();
  toast("Đã xóa bài viết.");
}
document.addEventListener("click", async (e) => {
  const button = e.target.closest("[data-action]");
  if (button) {
    const id = button.dataset.id;
    try {
      if (button.dataset.action === "edit") openEditor(id);
      if (button.dataset.action === "publish")
        await changeStatus(id, "published");
      if (button.dataset.action === "hide") await changeStatus(id, "hidden");
      if (button.dataset.action === "reject")
        await changeStatus(id, "rejected");
      if (button.dataset.action === "delete") await deleteArticle(id);
    } catch (err) {
      console.error(err);
      toast("Thao tác thất bại. Kiểm tra Firestore Rules và kết nối.");
    }
  }
  if (e.target.closest("[data-close-modal]")) closeEditor();
});
document
  .querySelectorAll("[data-close-modal]")
  .forEach((b) => b.addEventListener("click", closeEditor));
$("edit-category").innerHTML = NEWS_CATEGORIES.map(
  (c) => `<option value="${c.slug}">${esc(c.name)}</option>`,
).join("");
$("admin-edit-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!editingId) return;
  const button = $("admin-save-btn");
  button.disabled = true;
  try {
    const poster = $("edit-poster").value.trim();
    if (poster && !/^https?:\/\//i.test(poster))
      throw new Error("URL ảnh không hợp lệ.");
    const status = $("edit-status").value;
    const data = {
      title: $("edit-title").value.trim(),
      category: $("edit-category").value,
      poster,
      description: $("edit-description").value.trim(),
      content: cleanHTML($("edit-content").value),
      status,
      updatedAt: new Date().toISOString(),
    };
    if (!data.title || !data.description || !data.content)
      throw new Error("Vui lòng điền đủ tiêu đề, mô tả và nội dung.");
    if (status === "published") data.publishedAt = new Date().toISOString();
    await updateDoc(doc(db, "articles", editingId), data);
    closeEditor();
    await refresh();
    toast("Đã lưu nội dung chỉnh sửa.");
  } catch (err) {
    console.error(err);
    toast(err.message || "Không lưu được bài viết. Kiểm tra Firestore Rules.");
  } finally {
    button.disabled = false;
  }
});

onAuthStateChanged(auth, async (user) => {
  currentAdmin = null;
  if (!user) {
    showAccessState(
      null,
      "Bạn cần đăng nhập bằng tài khoản quản trị viên để xem hàng đợi duyệt bài.",
    );
    return;
  }
  try {
    const snap = await getDoc(doc(db, "account", user.uid));
    const allowed = snap.exists() && snap.data().role === "admin";
    if (!allowed) {
      showAccessState(
        user,
        "Tài khoản hiện tại chưa được cấp vai trò Admin. Hãy liên hệ quản trị viên để được phân quyền.",
      );
      return;
    }
    currentAdmin = user;
    $("admin-access-error").hidden = true;
    $("admin-dashboard").hidden = false;
    await refresh();
  } catch (e) {
    console.error("Không xác minh được quyền admin:", e);
    showAccessState(
      user,
      "Không thể xác minh quyền Admin. Vui lòng kiểm tra kết nối Firebase và Firestore Rules.",
    );
  }
});
