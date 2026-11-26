// PROFILE PAGE: đổ dữ liệu hồ sơ vào form và phát sự kiện lưu để script.js xử lý cập nhật Firebase.

const nameInput = document.getElementById("profile-name-input");
const phoneInput = document.getElementById("profile-phone-input");
const message = document.getElementById("profile-message");
const form = document.getElementById("profile-form");

export function populateProfile(user, profile = {}) {
  if (nameInput) nameInput.value = profile.username || user.displayName || "";
  if (phoneInput) phoneInput.value = profile.phone || "";
  const email = document.getElementById("profile-email-value");
  if (email) email.value = user.email || "Chưa cung cấp";
  const role = document.getElementById("profile-role-value");
  if (role)
    role.textContent = profile.role === "admin" ? "Quản trị viên" : "Độc giả";
  const avatar = document.getElementById("profile-avatar");
  if (avatar) {
    const initials = (profile.username || user.displayName || user.email || "N")
      .trim()
      .charAt(0)
      .toUpperCase();
    avatar.replaceChildren();
    if (user.photoURL) {
      const image = document.createElement("img");
      image.src = user.photoURL;
      image.alt = "Ảnh đại diện";
      avatar.append(image);
    } else avatar.textContent = initials;
  }
  const displayName = document.getElementById("profile-display-name");
  if (displayName)
    displayName.textContent =
      profile.username || user.displayName || "Tài khoản NEWS 24H";
  const summaryEmail = document.getElementById("profile-summary-email");
  if (summaryEmail) summaryEmail.textContent = user.email || "";
  const roleInput = document.getElementById("profile-role-readonly");
  if (roleInput)
    roleInput.value = profile.role === "admin" ? "Quản trị viên" : "Độc giả";
}

export function showProfileMessage(text, type = "success") {
  if (!message) return;
  message.textContent = text;
  message.className = `profile-message ${type}`;
}

export function getProfileFormData() {
  return {
    username: nameInput?.value.trim() || "",
    phone: phoneInput?.value.trim() || "",
  };
}

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  document.dispatchEvent(new CustomEvent("news24h:save-profile"));
});
