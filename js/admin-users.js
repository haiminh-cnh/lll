// ADMIN USERS: Admin xem danh sách hồ sơ và thay đổi vai trò user/admin.
// Việc đổi vai trò được Firestore Rules kiểm tra lại; giao diện không thay thế lớp bảo mật này.
import { auth, db } from "./firebase-client.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const $ = (id) => document.getElementById(id);
let currentAdmin = null;
let accounts = [];

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

function showMessage(message, type = "success") {
  const node = $("admin-users-message");
  if (!node) return;
  node.textContent = message;
  node.className = `admin-users-message ${type}`;
}

function renderUsers() {
  const list = $("admin-users-list");
  if (!list) return;
  const keyword = ($("admin-users-search")?.value || "")
    .trim()
    .toLocaleLowerCase("vi");
  const filtered = accounts.filter((account) => {
    const text =
      `${account.username} ${account.email} ${account.uid}`.toLocaleLowerCase(
        "vi",
      );
    return text.includes(keyword);
  });

  $("admin-users-count").textContent = String(accounts.length);
  if (!filtered.length) {
    list.innerHTML =
      '<div class="admin-empty">Không tìm thấy tài khoản phù hợp.</div>';
    return;
  }

  list.innerHTML = filtered
    .map((account) => {
      const isSelf = account.uid === currentAdmin?.uid;
      const role = account.role === "admin" ? "admin" : "user";
      return `
      <article class="admin-user-row">
        <div class="admin-user-avatar" aria-hidden="true">${escapeHTML((account.username || account.email || "N").trim().charAt(0).toUpperCase())}</div>
        <div class="admin-user-info">
          <strong>${escapeHTML(account.username || "Độc giả NEWS 24H")}</strong>
          <span>${escapeHTML(account.email || "Chưa có email")}</span>
          <small>UID: ${escapeHTML(account.uid)}</small>
        </div>
        <div class="admin-user-controls">
          <label class="visually-hidden" for="role-${escapeHTML(account.uid)}">Vai trò tài khoản</label>
          <select id="role-${escapeHTML(account.uid)}" class="form-select" data-user-role="${escapeHTML(account.uid)}" ${isSelf ? "disabled" : ""}>
            <option value="user" ${role === "user" ? "selected" : ""}>User</option>
            <option value="admin" ${role === "admin" ? "selected" : ""}>Admin</option>
          </select>
          <button type="button" class="admin-user-save" data-save-user-role="${escapeHTML(account.uid)}" ${isSelf ? "disabled" : ""}>Lưu vai trò</button>
          ${isSelf ? '<small class="admin-self-note">Tài khoản đang đăng nhập</small>' : ""}
        </div>
      </article>`;
    })
    .join("");
}

async function loadUsers() {
  const list = $("admin-users-list");
  if (list)
    list.innerHTML =
      '<div class="admin-empty">Đang tải danh sách tài khoản...</div>';
  try {
    const snapshot = await getDocs(collection(db, "account"));
    accounts = snapshot.docs
      .map((item) => ({
        uid: item.id,
        ...item.data(),
      }))
      .sort((a, b) =>
        String(a.username || a.email || "").localeCompare(
          String(b.username || b.email || ""),
          "vi",
        ),
      );
    renderUsers();
  } catch (error) {
    console.error("Không tải được danh sách tài khoản:", error);
    if (list)
      list.innerHTML =
        '<div class="admin-empty">Không tải được tài khoản. Hãy kiểm tra Firestore Rules và quyền Admin.</div>';
    showMessage(
      "Không thể tải danh sách tài khoản. Hãy kiểm tra Firestore Rules.",
      "error",
    );
  }
}

$("admin-users-search")?.addEventListener("input", renderUsers);

$("admin-users-list")?.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-save-user-role]");
  if (!button) return;
  const uid = button.dataset.saveUserRole;
  const select = [...document.querySelectorAll("[data-user-role]")].find(
    (node) => node.dataset.userRole === uid,
  );
  const account = accounts.find((item) => item.uid === uid);
  if (!account || !select || !["user", "admin"].includes(select.value)) return;
  if (uid === currentAdmin?.uid) {
    showMessage(
      "Bạn không thể tự thay đổi vai trò của tài khoản đang đăng nhập.",
      "error",
    );
    return;
  }
  if (select.value === (account.role === "admin" ? "admin" : "user")) {
    showMessage("Vai trò của tài khoản này chưa thay đổi.");
    return;
  }
  const nextRole = select.value;
  const accountName = account.username || account.email || uid;
  if (
    !window.confirm(
      `Đổi vai trò của “${accountName}” thành ${nextRole.toUpperCase()}?`,
    )
  )
    return;

  button.disabled = true;
  button.textContent = "Đang lưu...";
  try {
    await updateDoc(doc(db, "account", uid), {
      role: nextRole,
      updated_at: new Date().toISOString(),
    });
    account.role = nextRole;
    renderUsers();
    showMessage(`Đã cập nhật vai trò cho ${accountName}.`);
  } catch (error) {
    console.error("Không cập nhật được vai trò:", error);
    showMessage(
      "Không đổi được vai trò. Hãy kiểm tra Rules và quyền quản trị.",
      "error",
    );
    button.disabled = false;
    button.textContent = "Lưu vai trò";
  }
});

onAuthStateChanged(auth, async (user) => {
  currentAdmin = null;
  if (!user) return;
  try {
    const profile = await getDoc(doc(db, "account", user.uid));
    if (!profile.exists() || profile.data().role !== "admin") return;
    currentAdmin = user;
    await loadUsers();
  } catch (error) {
    console.error("Không xác minh được quyền quản lý tài khoản:", error);
    showMessage("Không xác minh được quyền Admin.", "error");
  }
});
