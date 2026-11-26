// ARTICLE COMPOSE: xử lý trình soạn thảo, kiểm tra nội dung, lưu nháp và gửi bài lên Firestore.
// Lưu ý: Rules giới hạn authorId/status; không dựa vào nút bấm để bảo vệ quyền ghi.

import { auth, db } from "./firebase-client.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { NEWS_CATEGORIES } from "./news-data.js";

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const editId = params.get("id");
let editingId = editId;
const form = $("article-compose-form");
const editor = $("article-editor");
let currentUser = null;
let profile = {};
let editingRecord = null;

function showMessage(message, type = "success") {
  const node = $("compose-message");
  node.textContent = message;
  node.className = type;
}
function sanitizeEditorHTML(html) {
  const doc = new DOMParser().parseFromString(
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
  const clean = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) return;
      if (child.nodeType !== Node.ELEMENT_NODE) {
        child.remove();
        return;
      }
      clean(child);
      if (!allowed.has(child.tagName)) {
        child.replaceWith(...child.childNodes);
        return;
      }
      [...child.attributes].forEach((attr) => child.removeAttribute(attr.name));
    });
  };
  clean(doc.body.firstElementChild);
  return doc.body.firstElementChild?.innerHTML || "";
}
function plainText(html) {
  const node = document.createElement("div");
  node.innerHTML = html;
  return node.textContent.trim();
}
function fillCategories() {
  $("article-category").innerHTML = NEWS_CATEGORIES.map(
    (c) => `<option value="${c.slug}">${c.name}</option>`,
  ).join("");
}
function collectData(status) {
  const title = $("article-title").value.trim();
  const description = $("article-description").value.trim();
  const poster = $("article-poster").value.trim();
  const content = sanitizeEditorHTML(editor.innerHTML);
  if (title.length < 12) throw new Error("Tiêu đề cần có ít nhất 12 ký tự.");
  if (description.length < 30)
    throw new Error("Mô tả ngắn cần có ít nhất 30 ký tự.");
  if (plainText(content).length < 100)
    throw new Error("Nội dung bài viết cần có ít nhất 100 ký tự.");
  if (poster && !/^https?:\/\//i.test(poster))
    throw new Error("Đường dẫn ảnh phải bắt đầu bằng http:// hoặc https://.");
  const now = new Date().toISOString();
  return {
    title,
    description,
    category: $("article-category").value,
    poster,
    content,
    authorId: currentUser.uid,
    authorName:
      profile.username ||
      currentUser.displayName ||
      currentUser.email?.split("@")[0] ||
      "Cộng tác viên",
    authorEmail: currentUser.email || "",
    status,
    updatedAt: now,
    ...(status === "pending" ? { submittedAt: now } : {}),
    ...(status === "published" ? { publishedAt: now } : {}),
  };
}
async function saveArticle(status) {
  // Phía trình duyệt chỉ được tạo bản nháp hoặc gửi chờ duyệt; xuất bản chỉ dành cho Admin.
  if (!["draft", "pending"].includes(status)) {
    showMessage(
      "Tài khoản cộng tác viên chỉ được lưu nháp hoặc gửi bài chờ Admin duyệt.",
      "error",
    );
    return;
  }
  const buttons = [$("save-draft"), $("submit-article")];
  buttons.forEach((b) => (b.disabled = true));
  try {
    const data = collectData(status);
    if (editingRecord) {
      await updateDoc(doc(db, "articles", editingId), data);
      showMessage(
        status === "pending"
          ? "Đã gửi lại bài viết. Trạng thái: ĐANG CHỜ DUYỆT; bài chưa được hiển thị công khai."
          : "Đã cập nhật bản nháp.",
      );
    } else {
      data.createdAt = new Date().toISOString();
      const created = await addDoc(collection(db, "articles"), data);
      showMessage(
        status === "pending"
          ? "Đã gửi bài thành công. Trạng thái: ĐANG CHỜ DUYỆT. Bài chưa được hiển thị công khai."
          : "Đã lưu bản nháp của bạn.",
      );
      editingId = created.id;
      history.replaceState({}, "", `./compose.html?id=${created.id}`);
      editingRecord = { ...data, id: created.id };
    }
    await loadMyArticles();
  } catch (error) {
    console.error(error);
    showMessage(
      error.message || "Không thể lưu bài. Hãy kiểm tra Firestore Rules.",
      "error",
    );
  } finally {
    buttons.forEach((b) => (b.disabled = false));
  }
}
async function loadForEdit() {
  if (!editId) return;
  const snap = await getDoc(doc(db, "articles", editId));
  if (!snap.exists()) throw new Error("Không tìm thấy bản nháp.");
  const data = snap.data();
  if (data.authorId !== currentUser.uid)
    throw new Error("Bạn không có quyền chỉnh sửa bài viết này.");
  if (!["draft", "rejected"].includes(data.status))
    throw new Error(
      "Bài đã gửi/chờ duyệt hoặc đã xuất bản không thể tự sửa. Hãy liên hệ Ban biên tập.",
    );
  editingId = editId;
  editingRecord = { ...data, id: editId };
  $("article-title").value = data.title || "";
  $("article-description").value = data.description || "";
  $("article-category").value = data.category || "thoi-su";
  $("article-poster").value = data.poster || "";
  editor.innerHTML = data.content || "";
  showMessage(
    data.status === "rejected"
      ? "Bài bị yêu cầu chỉnh sửa. Bạn có thể cập nhật và gửi lại."
      : "Đang chỉnh sửa bản nháp.",
  );
}
async function loadMyArticles() {
  const list = $("my-articles-list");
  try {
    const q = query(
      collection(db, "articles"),
      where("authorId", "==", currentUser.uid),
    );
    const snap = await getDocs(q);
    if (snap.empty) {
      list.innerHTML =
        "<p>Bạn chưa có bài viết nào. Hãy bắt đầu soạn bài đầu tiên!</p>";
      return;
    }
    const statusLabel = {
      draft: "Bản nháp",
      pending: "Đang chờ duyệt",
      published: "Đã xuất bản",
      rejected: "Cần chỉnh sửa",
      hidden: "Đã ẩn",
    };
    list.innerHTML = snap.docs
      .map((d) => {
        const a = d.data();
        const canEdit = ["draft", "rejected"].includes(a.status);
        return `<div class="my-article-row"><div><strong>${escapeHTML(a.title || "Bài viết chưa có tiêu đề")}</strong><small>Cập nhật: ${new Date(a.updatedAt || a.createdAt || Date.now()).toLocaleString("vi-VN")}</small></div><div style="display:flex;gap:9px;align-items:center"><span class="submission-status ${a.status}">${statusLabel[a.status] || a.status}</span>${canEdit ? `<a href="./compose.html?id=${d.id}">Chỉnh sửa</a>` : ""}${a.status === "published" ? `<a href="./user-article.html?id=${d.id}">Xem bài</a>` : ""}</div></div>`;
      })
      .join("");
  } catch (error) {
    console.warn(error);
    list.innerHTML =
      "<p>Không tải được danh sách. Hãy kiểm tra quyền đọc collection articles trong Firestore Rules.</p>";
  }
}
function escapeHTML(s = "") {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
fillCategories();
$("article-import-file").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const raw = await file.text();
    if (/\.html?$/i.test(file.name)) {
      const safe = sanitizeEditorHTML(raw);
      editor.innerHTML = safe;
    } else {
      editor.innerHTML = raw
        .split(/\r?\n/)
        .map((line) => (line.trim() ? `<p>${escapeHTML(line)}</p>` : ""))
        .join("");
    }
    editor.dispatchEvent(new Event("input"));
    showMessage(
      `Đã nhập nội dung từ tệp “${file.name}”. Hãy rà soát trước khi lưu/gửi.`,
    );
  } catch (error) {
    showMessage("Không đọc được tệp vừa chọn.", "error");
  } finally {
    event.target.value = "";
  }
});
document.querySelectorAll(".editor-toolbar button").forEach((button) =>
  button.addEventListener("click", () => {
    editor.focus();
    const command = button.dataset.command;
    const value = button.dataset.value || null;
    document.execCommand(command, false, value);
  }),
);
editor.addEventListener("input", () => {
  const words = plainText(editor.innerHTML).split(/\s+/).filter(Boolean).length;
  $("word-count").textContent = `${words} từ`;
});
$("save-draft").addEventListener("click", () => saveArticle("draft"));
$("submit-article").addEventListener("click", () => saveArticle("pending"));
form.addEventListener("submit", (e) => e.preventDefault());
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.replace("./login.html");
    return;
  }
  currentUser = user;
  try {
    const userSnap = await getDoc(doc(db, "account", user.uid));
    profile = userSnap.exists() ? userSnap.data() : {};
    if (editId) await loadForEdit();
    await loadMyArticles();
  } catch (error) {
    showMessage(error.message || "Không thể tải dữ liệu bài viết.", "error");
  }
});
