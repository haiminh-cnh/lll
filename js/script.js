// AUTH & ACCOUNT CONTROLLER: điều phối đăng ký/đăng nhập, khôi phục mật khẩu, hồ sơ và quyền hiển thị.
// Lưu ý bảo mật: chỉ Firestore Rules quyết định quyền truy cập dữ liệu; role trong localStorage không đáng tin.
import "./header.js";
import { API_NEWS, NEWS_CATEGORIES } from "./news-data.js";
import {
  populateProfile,
  showProfileMessage,
  getProfileFormData,
} from "./profile-page.js";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { auth, db } from "./firebase-client.js";
// AUTH MODULE: đăng ký, đăng nhập email/Google, đặt lại mật khẩu, hồ sơ và trạng thái phiên.
// QUAN TRỌNG: quyền admin chỉ được đọc từ Firestore; localStorage chỉ phục vụ hiển thị,
// tuyệt đối không dùng current_user.role để cấp quyền đọc/ghi dữ liệu nhạy cảm.
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

const $ = (id) => document.getElementById(id);
const loginPage = Boolean($("login-section"));
const registerPage = Boolean($("register-section"));
const indexPage = Boolean($("news"));
const profilePage = Boolean($("profile-page"));
const adminPage = Boolean($("admin-page"));
const composePage = Boolean($("compose-page"));
const protectedPage = profilePage || adminPage || composePage;
const messageForPage = () => $("login-message") || $("register-message");
let signedInUser = null;

function showMessage(text, type = "error") {
  const node = messageForPage();
  if (!node) return;
  node.textContent = text;
  node.classList.remove("success", "error");
  node.classList.add(type);
}
function friendlyError(error) {
  const messages = {
    "auth/email-already-in-use":
      "Email này đã được đăng ký. Hãy đăng nhập hoặc dùng email khác.",
    "auth/invalid-email": "Địa chỉ email không hợp lệ.",
    "auth/weak-password": "Mật khẩu quá yếu. Hãy dùng ít nhất 6 ký tự.",
    "auth/invalid-credential": "Email hoặc mật khẩu không chính xác.",
    "auth/user-disabled": "Tài khoản này đã bị vô hiệu hóa.",
    "auth/popup-closed-by-user": "Bạn đã đóng cửa sổ đăng nhập Google.",
    "auth/popup-blocked":
      "Trình duyệt đã chặn cửa sổ đăng nhập. Hãy cho phép popup rồi thử lại.",
    "auth/unauthorized-domain":
      "Tên miền hiện tại chưa được thêm vào mục Authorized domains trong Firebase Authentication.",
    "auth/network-request-failed": "Không thể kết nối mạng. Vui lòng thử lại.",
    "auth/too-many-requests":
      "Bạn thao tác quá nhiều lần. Vui lòng thử lại sau.",
  };
  return (
    messages[error?.code] ||
    `Có lỗi xảy ra (${error?.code || "unknown"}). Vui lòng thử lại.`
  );
}
function validPassword(password) {
  return (
    password.length >= 6 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password)
  );
}

// HỒ SƠ & PHÂN QUYỀN: tài khoản mới mặc định role=user.
// Không ghi đè role admin đã được cấp bởi quản trị viên. Firestore Rules mới là lớp bảo vệ thực sự;
// đoạn kiểm tra role ở giao diện chỉ dùng để ẩn/hiện menu và trang admin.
async function saveUserProfile(user, extra = {}) {
  const accountRef = doc(db, "account", user.uid);
  try {
    const snapshot = await getDoc(accountRef);
    const existing = snapshot.exists() ? snapshot.data() : {};
    const record = {
      uid: user.uid,
      username:
        extra.username ??
        user.displayName ??
        existing.username ??
        user.email?.split("@")[0] ??
        "Bạn đọc",
      email: user.email || "",
      photoURL: user.photoURL || "",
      updated_at: new Date().toISOString(),
      ...extra,
    };
    if (!snapshot.exists() || !existing.role) {
      record.role = existing.role || "user";
    }
    if (!snapshot.exists()) record.created_at = new Date().toISOString();
    await setDoc(accountRef, record, { merge: true });
    return {
      ...existing,
      ...record,
      role: existing.role || record.role || "user",
    };
  } catch (error) {
    console.warn("Không lưu được hồ sơ Firestore:", error);
    return {
      role: "user",
      username: user.displayName || user.email?.split("@")[0] || "Bạn đọc",
      email: user.email || "",
      ...extra,
    };
  }
}
async function loadUserProfile(user) {
  try {
    const snapshot = await getDoc(doc(db, "account", user.uid));
    if (snapshot.exists()) return snapshot.data();
    return await saveUserProfile(user);
  } catch (error) {
    console.warn("Không đọc được hồ sơ Firestore:", error);
    return {
      role: "user",
      username: user.displayName || user.email?.split("@")[0] || "Bạn đọc",
      email: user.email || "",
    };
  }
}
function persistUser(user, profile = {}) {
  localStorage.setItem(
    "current_user",
    JSON.stringify({
      uid: user.uid,
      email: user.email || "",
      username: profile.username || user.displayName || "",
      role: profile.role || "user",
      photoURL: user.photoURL || "",
      last_login: new Date().toLocaleString("vi-VN"),
    }),
  );
}
function renderHeaderUser(user, profile = {}) {
  const name =
    profile.username ||
    user.displayName ||
    user.email?.split("@")[0] ||
    "Độc giả";
  const initials = name.trim().charAt(0).toUpperCase() || "N";
  if ($("account-name")) $("account-name").textContent = name;
  if ($("account-initials")) {
    if (user.photoURL)
      $("account-initials").innerHTML =
        `<img src="${user.photoURL}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    else $("account-initials").textContent = initials;
  }
  if ($("account-summary-name")) $("account-summary-name").textContent = name;
  if ($("account-summary-email"))
    $("account-summary-email").textContent = user.email || "Tài khoản Google";
  if ($("account-role"))
    $("account-role").textContent =
      profile.role === "admin" ? "Quản trị viên" : "Độc giả";
  if ($("account-login-link")) $("account-login-link").hidden = true;
  if ($("account-register-link")) $("account-register-link").hidden = true;
  if ($("account-profile-link")) $("account-profile-link").hidden = false;
  if ($("account-admin-link"))
    $("account-admin-link").hidden = profile.role !== "admin";
  if ($("account-compose-link")) $("account-compose-link").hidden = false;
  if ($("topics-login-link")) $("topics-login-link").hidden = true;
  if ($("topics-profile-link")) $("topics-profile-link").hidden = false;
  if ($("topics-admin-link"))
    $("topics-admin-link").hidden = profile.role !== "admin";
  if ($("topics-compose-link")) $("topics-compose-link").hidden = false;
  if ($("logout-btn")) $("logout-btn").hidden = false;
  if ($("profile-display-name")) $("profile-display-name").textContent = name;
  if ($("profile-summary-email"))
    $("profile-summary-email").textContent = user.email || "";
  if ($("profile-role-value"))
    $("profile-role-value").textContent =
      profile.role === "admin" ? "Quản trị viên" : "Độc giả";
  if ($("profile-role-readonly"))
    $("profile-role-readonly").value =
      profile.role === "admin" ? "Quản trị viên" : "Độc giả";
}
function renderGuestHeader() {
  if ($("account-name")) $("account-name").textContent = "Tài khoản";
  if ($("account-initials")) $("account-initials").textContent = "N";
  if ($("account-summary-name"))
    $("account-summary-name").textContent = "Độc giả NEWS 24H";
  if ($("account-summary-email"))
    $("account-summary-email").textContent = "Đăng nhập để đồng bộ tài khoản";
  if ($("account-role")) $("account-role").textContent = "Khách";
  if ($("account-login-link")) $("account-login-link").hidden = false;
  if ($("account-register-link")) $("account-register-link").hidden = false;
  if ($("account-profile-link")) $("account-profile-link").hidden = true;
  if ($("account-admin-link")) $("account-admin-link").hidden = true;
  if ($("account-compose-link")) $("account-compose-link").hidden = true;
  if ($("topics-login-link")) $("topics-login-link").hidden = false;
  if ($("topics-profile-link")) $("topics-profile-link").hidden = true;
  if ($("topics-admin-link")) $("topics-admin-link").hidden = true;
  if ($("topics-compose-link")) $("topics-compose-link").hidden = true;
  if ($("logout-btn")) $("logout-btn").hidden = true;
}
function renderLoginProfile(user) {
  const emailNode = $("profile-email");
  if (emailNode) emailNode.textContent = user.email || "-";
  const lastLogin = $("profile-last-login");
  if (lastLogin) lastLogin.textContent = new Date().toLocaleString("vi-VN");
  if ($("login-section")) $("login-section").classList.add("hidden");
  if ($("profile-section")) $("profile-section").classList.remove("hidden");
}
function redirectHome() {
  const requested = new URLSearchParams(window.location.search).get("redirect");
  if (requested) {
    try {
      const destination = new URL(requested, window.location.href);
      const isAuthPage = /\/(login|register)\.html$/.test(destination.pathname);
      if (destination.origin === window.location.origin && !isAuthPage) {
        window.location.replace(destination.href);
        return;
      }
    } catch (error) {
      console.warn("Đường dẫn quay lại không hợp lệ:", error);
    }
  }
  window.location.replace("./index.html");
}
function redirectLogin() {
  window.location.replace("./login.html");
}

async function registerUser(event) {
  event?.preventDefault();
  const email = $("register-email")?.value.trim() || "";
  const password = $("register-password")?.value || "";
  const confirm = $("register-confirm-password")?.value || "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return showMessage("Vui lòng nhập email hợp lệ.");
  if (!validPassword(password))
    return showMessage(
      "Mật khẩu cần ít nhất 6 ký tự, gồm chữ hoa, chữ thường và số.",
    );
  if (password !== confirm) return showMessage("Mật khẩu xác nhận không khớp.");
  const button = $("register-btn");
  if (button) {
    button.disabled = true;
    button.textContent = "Đang tạo tài khoản…";
  }
  try {
    const credential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );
    await saveUserProfile(credential.user, {
      created_at: new Date().toISOString(),
    });
    showMessage("Đăng ký thành công! Đang chuyển đến trang chủ…", "success");
    setTimeout(redirectHome, 700);
  } catch (error) {
    showMessage(friendlyError(error));
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Tạo tài khoản";
    }
  }
}
async function loginUser(event) {
  event?.preventDefault();
  const email = $("login-email")?.value.trim() || "";
  const password = $("login-password")?.value || "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return showMessage("Vui lòng nhập email hợp lệ.");
  if (!password) return showMessage("Vui lòng nhập mật khẩu.");
  const button = $("login-btn");
  if (button) {
    button.disabled = true;
    button.textContent = "Đang đăng nhập…";
  }
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    await saveUserProfile(credential.user);
    showMessage("Đăng nhập thành công! Đang chuyển đến trang chủ…", "success");
    setTimeout(redirectHome, 450);
  } catch (error) {
    showMessage(friendlyError(error));
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Đăng nhập";
    }
  }
}
// Gửi email đặt lại mật khẩu qua Firebase Authentication; không bao giờ tự lưu mật khẩu mới.
async function requestPasswordReset(event) {
  event?.preventDefault();
  const email =
    $("forgot-email")?.value.trim() || $("login-email")?.value.trim() || "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showMessage(
      "Vui lòng nhập email hợp lệ để nhận liên kết đặt lại mật khẩu.",
    );
    $("forgot-email")?.focus();
    return;
  }
  const button = $("forgot-password-btn");
  if (button) {
    button.disabled = true;
    button.textContent = "Đang gửi…";
  }
  try {
    await sendPasswordResetEmail(auth, email);
    // Thông báo chung, không tiết lộ email có tồn tại trong hệ thống hay không.
    showMessage(
      "Nếu email này đã đăng ký, Firebase sẽ gửi liên kết đặt lại mật khẩu. Hãy kiểm tra cả thư mục Spam.",
      "success",
    );
  } catch (error) {
    if (error?.code === "auth/user-not-found") {
      showMessage(
        "Nếu email này đã đăng ký, Firebase sẽ gửi liên kết đặt lại mật khẩu. Hãy kiểm tra cả thư mục Spam.",
        "success",
      );
    } else {
      showMessage(friendlyError(error));
    }
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Gửi liên kết đặt lại";
    }
  }
}

async function loginWithGoogle() {
  const button = $("google-login-btn");
  if (button) {
    button.disabled = true;
    button.textContent = "Đang kết nối Google…";
  }
  showMessage("");
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await saveUserProfile(result.user, { last_provider: "google" });
    if (loginPage)
      showMessage("Đăng nhập Google thành công! Đang chuyển trang…", "success");
    setTimeout(redirectHome, 350);
  } catch (error) {
    if (error?.code === "auth/popup-blocked") {
      try {
        await signInWithRedirect(auth, googleProvider);
        return;
      } catch (redirectError) {
        showMessage(friendlyError(redirectError));
      }
    } else {
      showMessage(friendlyError(error));
    }
  } finally {
    if (button) {
      button.disabled = false;
      button.innerHTML =
        '<img class="google-icon" src="./img/google-g.svg" alt=""> ' +
        (registerPage ? "Tiếp tục với Google" : "Google");
    }
  }
}
async function logoutUser(event) {
  event?.preventDefault();
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Lỗi đăng xuất Firebase:", error);
  } finally {
    localStorage.removeItem("current_user");
    localStorage.removeItem("user");
    localStorage.removeItem("pass");
    redirectLogin();
  }
}

// Nút con mắt hiện/ẩn mật khẩu ở cả trang đăng nhập và đăng ký.
document.querySelectorAll(".toggle-password").forEach((button) => {
  button.addEventListener("click", () => {
    const input = $(button.dataset.target);
    if (!input) return;
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    button.setAttribute("aria-pressed", String(show));
    button.setAttribute("aria-label", show ? "Ẩn mật khẩu" : "Hiện mật khẩu");
    button.classList.toggle("is-visible", show);
  });
});

$("register-form")?.addEventListener("submit", registerUser);
$("login-form")?.addEventListener("submit", loginUser);
$("forgot-password-form")?.addEventListener("submit", requestPasswordReset);
$("forgot-password-toggle")?.addEventListener("click", (event) => {
  event.preventDefault();
  const panel = $("forgot-password-panel");
  if (!panel) return;
  panel.hidden = !panel.hidden;
  $("forgot-password-toggle")?.setAttribute(
    "aria-expanded",
    String(!panel.hidden),
  );
  if (!panel.hidden) {
    const loginEmail = $("login-email")?.value.trim() || "";
    if (loginEmail && $("forgot-email")) $("forgot-email").value = loginEmail;
    $("forgot-email")?.focus();
  }
});
$("google-login-btn")?.addEventListener("click", loginWithGoogle);
document.addEventListener("click", (event) => {
  if (event.target.closest("#logout-btn")) logoutUser(event);
});

document.addEventListener("news24h:save-profile", async () => {
  if (!auth.currentUser) return redirectLogin();
  const { username, phone } = getProfileFormData();
  if (!username)
    return showProfileMessage("Vui lòng nhập họ và tên hiển thị.", "error");
  const button = $("profile-save-btn");
  if (button) {
    button.disabled = true;
    button.textContent = "Đang lưu…";
  }
  try {
    await updateProfile(auth.currentUser, { displayName: username });
    const profile = await saveUserProfile(auth.currentUser, {
      username,
      phone,
    });
    renderHeaderUser(auth.currentUser, profile);
    populateProfile(auth.currentUser, profile);
    showProfileMessage("Đã cập nhật thông tin tài khoản.", "success");
  } catch (error) {
    console.error(error);
    showProfileMessage(
      "Chưa thể lưu thông tin. Vui lòng kiểm tra kết nối và Firestore Rules.",
      "error",
    );
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Lưu thay đổi";
    }
  }
});

// Xử lý kết quả đăng nhập Google khi Firebase quay về bằng redirect.
try {
  const redirectResult = await getRedirectResult(auth);
  if (redirectResult?.user)
    await saveUserProfile(redirectResult.user, { last_provider: "google" });
} catch (error) {
  showMessage(friendlyError(error));
}

// Theo dõi phiên đăng nhập trên mọi trang; trang admin vẫn được Firestore Rules bảo vệ độc lập.
onAuthStateChanged(auth, async (user) => {
  signedInUser = user || null;
  if (!user) {
    renderGuestHeader();
    localStorage.removeItem("current_user");
    if (protectedPage) redirectLogin();
    return;
  }

  const profile = await loadUserProfile(user);
  persistUser(user, profile);
  renderHeaderUser(user, profile);

  if (loginPage) {
    if ($("profile-section")?.classList.contains("hidden")) redirectHome();
    else renderLoginProfile(user);
  }
  if (registerPage) redirectHome();
  if (profilePage) populateProfile(user, profile);
  if (adminPage) {
    const allowed = profile.role === "admin";
    if ($("admin-dashboard")) $("admin-dashboard").hidden = !allowed;
    if ($("admin-access-error")) $("admin-access-error").hidden = allowed;
    if (allowed) {
      if ($("admin-news-count"))
        $("admin-news-count").textContent = String(API_NEWS.length);
      if ($("admin-category-count"))
        $("admin-category-count").textContent = String(NEWS_CATEGORIES.length);
    }
  }
});
