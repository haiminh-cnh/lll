// NEWS STORE: hợp nhất API_NEWS tĩnh với bài cộng tác đã published từ Firestore.
// Lỗi tải Firestore được xử lý để trang vẫn dùng được nguồn dữ liệu tĩnh.

import { API_NEWS } from "./news-data.js";
import { db } from "./firebase-client.js";
import {
  collection,
  getDocs,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

export async function loadNewsFeed() {
  let contributed = [];
  try {
    const q = query(
      collection(db, "articles"),
      where("status", "==", "published"),
    );
    const snapshot = await getDocs(q);
    contributed = snapshot.docs.map((snap) => {
      const data = snap.data();
      const dateValue =
        data.publishedAt || data.createdAt || new Date().toISOString();
      const date =
        typeof dateValue === "string"
          ? dateValue.slice(0, 10)
          : new Date().toISOString().slice(0, 10);
      return {
        id: `user-${snap.id}`,
        firestoreId: snap.id,
        title: data.title || "Bài viết",
        poster: data.poster || "./img/news-background.jpg",
        detail: `./user-article.html?id=${encodeURIComponent(snap.id)}`,
        releaseDate: date,
        description:
          data.description || "Bài viết do độc giả NEWS 24H đóng góp.",
        category: data.category || "thoi-su",
        isHot: Boolean(data.isHot),
        author: data.authorName || "Cộng tác viên NEWS 24H",
        source: "reader",
      };
    });
  } catch (error) {
    // Các trang vẫn hiển thị đầy đủ dữ liệu mẫu nếu Firestore chưa được cấu hình rules.
    console.warn("Không tải được bài viết cộng tác từ Firestore:", error);
  }
  return [...API_NEWS, ...contributed].sort((a, b) =>
    String(b.releaseDate).localeCompare(String(a.releaseDate)),
  );
}
