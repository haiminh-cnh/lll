// ARTICLE ENGAGEMENT: bình luận và đánh giá sao theo thời gian thực trên Firestore.
// Các listener onSnapshot cần được hủy khi đổi ngữ cảnh; Rules kiểm tra quyền tạo/xóa dữ liệu.

import { auth, db } from "./firebase-client.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(window.location.search);
const fileName =
  window.location.pathname.split("/").filter(Boolean).pop() || "";
const isContributedArticle = fileName === "user-article.html";
const articleId = isContributedArticle
  ? params.get("id")
  : fileName.match(/^(post\d+)\.html$/i)?.[1] || null;

const commentForm = $("commentForm");
const commentInput = $("commentInput");
const commentList = $("commentList");
const commentCount = $("comment-count");
const commentStatus = $("comment-status");
const commentButton = $("commentSubmitButton");
const commentHint = $("comment-login-hint");
const ratingHint = $("rating-login-hint");
const ratingStatus = $("rating-status");
const ratingAverage = $("rating-average");
const ratingAverageStars = $("rating-average-stars");
const ratingCount = $("rating-count");
const ratingInputs = [
  ...document.querySelectorAll('.stars input[name="rating"]'),
];

let currentUser = null;
let currentProfile = {};
let isAdmin = false;
let unsubscribeComments = null;
let unsubscribeRatings = null;
const migratingCommentIds = new Set();

function setStatus(node, message, kind = "") {
  if (!node) return;
  node.textContent = message;
  node.classList.toggle("is-error", kind === "error");
  node.classList.toggle("is-success", kind === "success");
}

function niceName(user, profile) {
  return (
    profile?.username ||
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "Độc giả NEWS 24H"
  ).slice(0, 80);
}

function formatDate(timestamp) {
  const date = timestamp?.toDate ? timestamp.toDate() : null;
  if (!date) return "Vừa xong";
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 60000),
  );
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  if (hours < 48) return "Hôm qua";
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function makeCommentNode(commentId, data) {
  const item = document.createElement("article");
  item.className = "comment-item";
  const avatar = document.createElement("span");
  avatar.className = "comment-avatar";
  avatar.setAttribute("aria-hidden", "true");
  const initials = (data.authorName || "Đ").trim().charAt(0).toUpperCase();
  // Dùng ảnh đã lưu cùng bình luận; với bình luận cũ của chính tài khoản hiện tại,
  // có thể lấy ảnh từ hồ sơ vừa tải để avatar không phải chờ Admin backfill.
  const profilePhoto =
    data.authorId && data.authorId === currentUser?.uid
      ? currentProfile.photoURL || currentUser?.photoURL || ""
      : "";
  const photoURL =
    typeof data.authorPhotoURL === "string" && data.authorPhotoURL.trim()
      ? data.authorPhotoURL.trim()
      : profilePhoto;
  let validPhotoURL = "";
  try {
    const parsedPhotoURL = new URL(photoURL);
    if (["https:", "http:"].includes(parsedPhotoURL.protocol))
      validPhotoURL = parsedPhotoURL.href;
  } catch {
    /* URL không hợp lệ thì dùng avatar chữ cái */
  }

  const showInitials = () => {
    avatar.replaceChildren();
    avatar.textContent = initials;
  };
  if (validPhotoURL) {
    const image = document.createElement("img");
    image.src = validPhotoURL;
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    image.addEventListener("error", showInitials, { once: true });
    avatar.append(image);
  } else {
    showInitials();
  }

  const bodyWrap = document.createElement("div");
  bodyWrap.className = "comment-body";
  const heading = document.createElement("div");
  heading.className = "comment-heading";
  const name = document.createElement("strong");
  name.className = "comment-user";
  name.textContent = data.authorName || "Độc giả NEWS 24H";
  const date = document.createElement("time");
  date.className = "comment-date";
  date.textContent = formatDate(data.createdAt);
  heading.append(name);
  if (data.authorRole === "admin") {
    const adminBadge = document.createElement("span");
    adminBadge.className = "comment-admin-badge";
    adminBadge.textContent = "Quản trị viên";
    adminBadge.setAttribute("aria-label", "Tài khoản quản trị viên");
    heading.append(adminBadge);
  }
  heading.append(date);
  if (data.authorId && currentUser?.uid === data.authorId) {
    const own = document.createElement("span");
    own.className = "comment-author-tag";
    own.textContent = "Bạn";
    heading.append(own);
  }
  const text = document.createElement("p");
  text.className = "comment-text";
  text.textContent = data.content || "";
  bodyWrap.append(heading, text);

  if (currentUser && (currentUser.uid === data.authorId || isAdmin)) {
    const actions = document.createElement("div");
    actions.className = "comment-actions";
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "comment-delete";
    remove.textContent = "Xóa";
    remove.setAttribute("aria-label", "Xóa bình luận này");
    remove.addEventListener("click", async () => {
      if (!window.confirm("Bạn có chắc muốn xóa bình luận này?")) return;
      remove.disabled = true;
      try {
        await deleteDoc(doc(db, "articles", articleId, "comments", commentId));
        setStatus(commentStatus, "Đã xóa bình luận.", "success");
      } catch (error) {
        console.error(error);
        setStatus(
          commentStatus,
          "Không thể xóa bình luận. Hãy kiểm tra quyền Firestore.",
          "error",
        );
        remove.disabled = false;
      }
    });
    actions.append(remove);
    bodyWrap.append(actions);
  }
  item.append(avatar, bodyWrap);
  return item;
}

function renderCommentDocs() {
  if (!commentList) return;
  const docs = window.__news24hCommentDocs || [];
  commentList.replaceChildren();
  if (commentCount) commentCount.textContent = String(docs.length);
  if (!docs.length) {
    const empty = document.createElement("p");
    empty.className = "comments-empty";
    empty.textContent =
      "Chưa có bình luận. Hãy là người đầu tiên chia sẻ ý kiến!";
    commentList.append(empty);
  } else {
    docs.forEach((snap) =>
      commentList.append(makeCommentNode(snap.id, snap.data())),
    );
  }
  commentList.setAttribute("aria-busy", "false");
}

// Bổ sung huy hiệu và ảnh đại diện cho bình luận cũ.
// Chỉ Admin được đọc hồ sơ của tác giả khác; Rules đối chiếu chính xác cả role lẫn photoURL.
async function migrateLegacyCommentMetadata(commentDocs = []) {
  if (!isAdmin || !Array.isArray(commentDocs) || !commentDocs.length) return;

  for (const commentSnap of commentDocs) {
    const commentData = commentSnap.data();
    const missingRole = !Object.prototype.hasOwnProperty.call(
      commentData,
      "authorRole",
    );
    const missingPhoto = !Object.prototype.hasOwnProperty.call(
      commentData,
      "authorPhotoURL",
    );
    if (
      (!missingRole && !missingPhoto) ||
      !commentData.authorId ||
      migratingCommentIds.has(commentSnap.id)
    )
      continue;

    migratingCommentIds.add(commentSnap.id);
    try {
      const authorProfile = await getDoc(
        doc(db, "account", commentData.authorId),
      );
      if (!authorProfile.exists()) continue;
      const profile = authorProfile.data();
      const patch = {};
      if (missingRole)
        patch.authorRole = profile.role === "admin" ? "admin" : "user";
      if (missingPhoto)
        patch.authorPhotoURL =
          typeof profile.photoURL === "string" ? profile.photoURL : "";
      if (Object.keys(patch).length) {
        await updateDoc(
          doc(db, "articles", articleId, "comments", commentSnap.id),
          patch,
        );
      }
    } catch (error) {
      // Không làm gián đoạn hiển thị bình luận nếu dữ liệu cũ không thể cập nhật.
      console.warn(
        "Chưa thể bổ sung avatar/vai trò cho bình luận cũ:",
        commentSnap.id,
        error,
      );
    } finally {
      migratingCommentIds.delete(commentSnap.id);
    }
  }
}

function subscribeComments() {
  if (!articleId || !commentList) return;
  unsubscribeComments?.();
  const commentsRef = collection(db, "articles", articleId, "comments");
  const commentsQuery = query(commentsRef, orderBy("createdAt", "desc"));
  commentList.setAttribute("aria-busy", "true");
  unsubscribeComments = onSnapshot(
    commentsQuery,
    (snapshot) => {
      window.__news24hCommentDocs = snapshot.docs;
      renderCommentDocs();
      if (isAdmin) migrateLegacyCommentMetadata(snapshot.docs);
    },
    (error) => {
      console.error("Không tải được bình luận:", error);
      commentList.replaceChildren();
      const message = document.createElement("p");
      message.className = "comments-empty is-error";
      message.textContent =
        "Chưa thể tải bình luận. Hãy kiểm tra Firestore Rules và kết nối mạng.";
      commentList.append(message);
      commentList.setAttribute("aria-busy", "false");
    },
  );
}

function renderRatingSummary(snapshot) {
  window.__news24hRatingSnapshot = snapshot;
  const scores = snapshot.docs
    .map((item) => Number(item.data().score))
    .filter((score) => Number.isInteger(score) && score >= 1 && score <= 5);
  const count = scores.length;
  const average = count
    ? scores.reduce((sum, score) => sum + score, 0) / count
    : 0;
  if (ratingAverage)
    ratingAverage.textContent = count ? average.toFixed(1) : "—";
  if (ratingCount)
    ratingCount.textContent = count
      ? `${count} lượt đánh giá`
      : "Chưa có lượt đánh giá";
  if (ratingAverageStars) {
    ratingAverageStars.style.setProperty(
      "--rating-fill",
      `${(average / 5) * 100}%`,
    );
    ratingAverageStars.setAttribute(
      "aria-label",
      count
        ? `Trung bình ${average.toFixed(1)} trên 5 sao`
        : "Chưa có đánh giá",
    );
  }
  if (currentUser) {
    const ownRating = snapshot.docs.find((item) => item.id === currentUser.uid);
    const ownScore = Number(ownRating?.data()?.score || 0);
    ratingInputs.forEach((input) => {
      input.checked = Number(input.value) === ownScore;
    });
  }
}

function subscribeRatings() {
  if (!articleId || !ratingAverage) return;
  unsubscribeRatings?.();
  const ratingsRef = collection(db, "articles", articleId, "ratings");
  unsubscribeRatings = onSnapshot(ratingsRef, renderRatingSummary, (error) => {
    console.error("Không tải được đánh giá:", error);
    setStatus(
      ratingStatus,
      "Chưa tải được điểm đánh giá. Hãy kiểm tra Firestore Rules.",
      "error",
    );
  });
}

function updateAuthControls() {
  const enabled = Boolean(currentUser);
  if (commentInput) {
    commentInput.disabled = !enabled;
    commentInput.placeholder = enabled
      ? "Chia sẻ ý kiến của bạn về bài viết..."
      : "Đăng nhập để tham gia bình luận bài viết...";
  }
  if (commentButton) commentButton.disabled = !enabled;
  ratingInputs.forEach((input) => {
    input.disabled = !enabled;
  });
  if (commentHint)
    commentHint.innerHTML = enabled
      ? "Bình luận của bạn sẽ hiển thị công khai với mọi độc giả. Vui lòng trao đổi văn minh."
      : 'Vui lòng <a href="' +
        (isContributedArticle ? "./login.html" : "../login.html") +
        '">đăng nhập</a> để gửi bình luận. Bình luận sẽ hiển thị với mọi độc giả.';
  if (ratingHint)
    ratingHint.innerHTML = enabled
      ? "Bạn có thể thay đổi đánh giá bất cứ lúc nào. Mỗi tài khoản có một lượt đánh giá cho bài viết."
      : 'Vui lòng <a href="' +
        (isContributedArticle ? "./login.html" : "../login.html") +
        '">đăng nhập</a> để đánh giá bài viết.';
}

if (commentForm) {
  commentForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!currentUser || !articleId) {
      setStatus(commentStatus, "Bạn cần đăng nhập để gửi bình luận.", "error");
      return;
    }
    const content = commentInput.value.trim();
    if (content.length < 2) {
      setStatus(commentStatus, "Bình luận cần có ít nhất 2 ký tự.", "error");
      commentInput.focus();
      return;
    }
    if (content.length > 1000) {
      setStatus(
        commentStatus,
        "Bình luận không được vượt quá 1.000 ký tự.",
        "error",
      );
      return;
    }
    commentButton.disabled = true;
    setStatus(commentStatus, "Đang gửi bình luận…");
    try {
      await addDoc(collection(db, "articles", articleId, "comments"), {
        authorId: currentUser.uid,
        authorName: niceName(currentUser, currentProfile),
        // Vai trò được Firestore Rules đối chiếu trực tiếp với account/{uid}; không tin dữ liệu do client tự khai.
        authorRole: currentProfile.role === "admin" ? "admin" : "user",
        // Ảnh đại diện được lưu vào comment để mọi độc giả đều xem được mà không cần đọc hồ sơ riêng tư.
        authorPhotoURL:
          typeof currentProfile.photoURL === "string"
            ? currentProfile.photoURL
            : "",
        content,
        createdAt: serverTimestamp(),
      });
      commentInput.value = "";
      setStatus(
        commentStatus,
        "Bình luận đã được đăng và hiển thị với mọi độc giả.",
        "success",
      );
    } catch (error) {
      console.error("Gửi bình luận thất bại:", error);
      setStatus(
        commentStatus,
        "Không gửi được bình luận. Hãy kiểm tra Firestore Rules và thử lại.",
        "error",
      );
    } finally {
      commentButton.disabled = !currentUser;
    }
  });
}

ratingInputs.forEach((input) => {
  input.addEventListener("change", async () => {
    if (!currentUser || !articleId) {
      setStatus(ratingStatus, "Bạn cần đăng nhập để đánh giá.", "error");
      return;
    }
    const score = Number(input.value);
    if (!Number.isInteger(score) || score < 1 || score > 5) return;
    ratingInputs.forEach((item) => {
      item.disabled = true;
    });
    setStatus(ratingStatus, "Đang lưu đánh giá…");
    try {
      await setDoc(
        doc(db, "articles", articleId, "ratings", currentUser.uid),
        {
          userId: currentUser.uid,
          score,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      setStatus(
        ratingStatus,
        `Đã ghi nhận đánh giá ${score}/5 sao. Cảm ơn bạn!`,
        "success",
      );
    } catch (error) {
      console.error("Lưu đánh giá thất bại:", error);
      setStatus(
        ratingStatus,
        "Không lưu được đánh giá. Hãy kiểm tra Firestore Rules và thử lại.",
        "error",
      );
    } finally {
      ratingInputs.forEach((item) => {
        item.disabled = !currentUser;
      });
    }
  });
});

if (articleId) {
  subscribeComments();
  subscribeRatings();
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    currentProfile = {};
    isAdmin = false;
    if (user) {
      try {
        const profileRef = doc(db, "account", user.uid);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          currentProfile = profileSnap.data();
          // Một số hồ sơ cũ chưa được đồng bộ ảnh Google; bổ sung để comment có thể dùng đúng avatar.
          if (!currentProfile.photoURL && user.photoURL) {
            try {
              await setDoc(
                profileRef,
                { photoURL: user.photoURL },
                { merge: true },
              );
              currentProfile.photoURL = user.photoURL;
            } catch (syncError) {
              console.warn(
                "Chưa thể đồng bộ ảnh đại diện vào hồ sơ:",
                syncError,
              );
            }
          }
        }
        isAdmin = currentProfile.role === "admin";
      } catch (error) {
        console.warn("Không đọc được hồ sơ tài khoản:", error);
      }
    }
    updateAuthControls();
    // Khôi phục sao đã chấm của tài khoản hiện tại và quyền xóa bình luận.
    if (window.__news24hRatingSnapshot)
      renderRatingSummary(window.__news24hRatingSnapshot);
    renderCommentDocs();
    if (isAdmin)
      migrateLegacyCommentMetadata(window.__news24hCommentDocs || []);
  });
} else {
  console.warn("Không xác định được mã bài viết để tải bình luận và đánh giá.");
}
