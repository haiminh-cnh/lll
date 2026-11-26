// FIREBASE CLIENT: khởi tạo Firebase App dùng chung và export Auth/Firestore cho toàn dự án.
// Không tạo Firebase App riêng trong từng module.

import { firebaseConfig } from "./firebase-config.js";
import {
  getApps,
  initializeApp,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// Kiểm tra cấu hình trước khi khởi tạo để lỗi cấu hình được báo rõ trong Console.
if (
  !firebaseConfig?.apiKey ||
  !firebaseConfig?.projectId ||
  !firebaseConfig?.appId
) {
  throw new Error(
    "Thiếu cấu hình Firebase. Hãy kiểm tra js/firebase-config.js.",
  );
}

// Dùng chung một Firebase App cho tất cả module, tránh lỗi app đã tồn tại.
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
