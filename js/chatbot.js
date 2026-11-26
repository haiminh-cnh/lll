// NEWS 24H CHATBOT
// Trợ lý hỏi - đáp theo dữ liệu website: tìm bài viết, chuyên mục và hướng dẫn độc giả.
// Không gọi API AI bên ngoài và không yêu cầu người dùng cung cấp khóa API.

import { API_NEWS, NEWS_CATEGORIES, getCategoryName } from "./news-data.js";
import { loadNewsFeed } from "./news-store.js";

const scriptRoot = new URL("../", import.meta.url);
const toSiteUrl = (path) => {
  if (!path) return new URL("index.html", scriptRoot).href;
  try {
    if (/^https?:\/\//i.test(path)) return path;
    return new URL(String(path).replace(/^\.\//, ""), scriptRoot).href;
  } catch {
    return new URL("index.html", scriptRoot).href;
  }
};

const normalize = (value = "") =>
  String(value)
    .toLocaleLowerCase("vi-VN")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const STOP_WORDS = new Set([
  "toi",
  "minh",
  "ban",
  "cho",
  "hoi",
  "la",
  "gi",
  "nao",
  "o",
  "ve",
  "cua",
  "va",
  "voi",
  "cac",
  "nhung",
  "mot",
  "bai",
  "tin",
  "tuc",
  "hay",
  "giup",
  "nhe",
  "di",
  "duoc",
  "khong",
  "co",
  "the",
  "cho",
  "tim",
  "kiem",
  "noi",
  "dung",
  "thong",
  "tin",
  "trong",
  "website",
  "news",
  "24h",
  "moi",
  "nhat",
  "hien",
  "tai",
  "nay",
  "do",
  "theo",
]);

let feedPromise;
async function getNews() {
  if (!feedPromise) {
    feedPromise = loadNewsFeed().catch((error) => {
      console.warn(
        "Chatbot không tải được tin từ Firestore, dùng dữ liệu tĩnh:",
        error,
      );
      return API_NEWS;
    });
  }
  return feedPromise;
}

function categoryLink(category) {
  return toSiteUrl(
    `category.html?category=${encodeURIComponent(category.slug)}`,
  );
}

function getCategoryFromText(text) {
  const normalized = ` ${normalize(text)} `;
  const containsWholePhrase = (phrase) =>
    phrase && normalized.includes(` ${phrase} `);
  return NEWS_CATEGORIES.find((category) => {
    const name = normalize(category.name);
    const slug = normalize(category.slug.replace(/-/g, " "));
    return containsWholePhrase(name) || containsWholePhrase(slug);
  });
}

function scoreArticle(article, query) {
  const q = normalize(query);
  const title = normalize(article.title);
  const description = normalize(article.description);
  const category = normalize(getCategoryName(article.category));
  const combined = `${title} ${description} ${category}`;
  let score = 0;

  if (q.length > 3 && title.includes(q)) score += 12;
  if (q.length > 3 && description.includes(q)) score += 5;
  const words = q
    .split(" ")
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
  for (const word of words) {
    if (title.includes(word)) score += 4;
    if (description.includes(word)) score += 1.5;
    if (category.includes(word)) score += 3;
  }
  if (combined.includes(q) && q.length > 4) score += 3;
  return score;
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function sortedNews(news) {
  return [...news].sort((a, b) =>
    String(b.releaseDate || "").localeCompare(String(a.releaseDate || "")),
  );
}

// Trỏ tới khu vực tương tác của bài đang đọc; nếu người dùng ở trang khác,
// mở bài mới nhất để họ có thể thực hiện thao tác ngay.
function articleSectionLink(news, sectionId) {
  const fileName =
    window.location.pathname.split("/").filter(Boolean).pop() || "";
  const isArticlePage =
    /^post\d+\.html$/i.test(fileName) ||
    (fileName.toLowerCase() === "user-article.html" &&
      new URLSearchParams(window.location.search).has("id"));
  if (isArticlePage) {
    const currentUrl = new URL(window.location.href);
    currentUrl.hash = sectionId;
    return currentUrl.href;
  }
  const latestArticle = sortedNews(news).find((article) => article.detail);
  return latestArticle
    ? `${toSiteUrl(latestArticle.detail)}#${sectionId}`
    : toSiteUrl("index.html");
}

function isGreeting(text) {
  return /^(xin chao|chao|hello|hi|alo|hey|bot oi|tro ly oi)(\s|$)/i.test(
    normalize(text),
  );
}

function makeReply(text, news) {
  const q = normalize(text);
  const links = [];
  const addLink = (label, href) => links.push({ label, href });

  if (!q) return { text: "Bạn hãy nhập câu hỏi để mình hỗ trợ nhé." };
  if (isGreeting(q)) {
    return {
      text: "Xin chào! Mình là Trợ lý truyền thông NEWS 24H. Mình có thể tìm bài viết, giới thiệu chuyên mục và hướng dẫn bạn sử dụng website. Bạn đang muốn tìm thông tin gì?",
      links: [
        { label: "Xem tin mới nhất", href: toSiteUrl("search.html?q=") },
        { label: "Các chuyên mục", href: toSiteUrl("index.html#top") },
      ],
    };
  }

  if (/ban la ai|tro ly nay la gi|chatbot la gi|ban co the lam gi/.test(q)) {
    return {
      text: "Mình là Trợ lý truyền thông NEWS 24H. Mình hỗ trợ độc giả tìm bài viết trong dữ liệu website, tra cứu chuyên mục, xem tin mới và hướng dẫn sử dụng các chức năng như đăng nhập, lưu bài, gửi bài cộng tác hoặc liên hệ tòa soạn.",
    };
  }

  if (/cam on|thank|thanks/.test(q))
    return {
      text: "Rất vui vì đã giúp được bạn! Bạn cứ nhắn khi cần tìm tin hoặc hỗ trợ sử dụng NEWS 24H nhé.",
    };
  if (/tam biet|hen gap|bye/.test(q))
    return {
      text: "Tạm biệt bạn! Chúc bạn có trải nghiệm đọc tin hữu ích cùng NEWS 24H.",
    };

  if (/lien he|so dien thoai|email|toa soan|gui phan hoi|gop y/.test(q)) {
    return {
      text: "Bạn có thể liên hệ tòa soạn NEWS 24H qua các kênh sau:\nĐiện thoại: 0900.24.24.24\nEmail: news24h@gmail.com\nHoặc mở trang Liên hệ để gửi nội dung trực tiếp.",
      links: [
        { label: "Mở trang Liên hệ tòa soạn", href: toSiteUrl("contact.html") },
      ],
    };
  }

  if (/gui bai|cong tac vien|dang bai|viet bai|dong gop bai/.test(q)) {
    return {
      text: "Độc giả có thể gửi bài cộng tác qua trang Soạn thảo bài báo. Bạn cần đăng nhập trước khi gửi; bài viết sẽ được chuyển tới Ban biên tập để xem xét và duyệt trước khi xuất bản.",
      links: [{ label: "Gửi bài cộng tác", href: toSiteUrl("compose.html") }],
    };
  }

  if (/dang ky|tao tai khoan|mo tai khoan/.test(q)) {
    return {
      text: "Bạn có thể tạo tài khoản NEWS 24H bằng email hoặc tài khoản Google tại trang đăng ký.",
      links: [{ label: "Đăng ký tài khoản", href: toSiteUrl("register.html") }],
    };
  }
  if (/dang nhap|quen mat khau|mat khau/.test(q)) {
    return {
      text: "Bạn có thể đăng nhập bằng email/mật khẩu hoặc Google. Trên trang đăng nhập cũng có chức năng gửi email đặt lại mật khẩu.",
      links: [{ label: "Đăng nhập NEWS 24H", href: toSiteUrl("login.html") }],
    };
  }
  if (/thong tin tai khoan|ho so ca nhan|cap nhat ho so/.test(q)) {
    return {
      text: "Trang Thông tin tài khoản cho phép bạn xem và cập nhật hồ sơ cá nhân. Bạn cần đăng nhập để sử dụng.",
      links: [
        { label: "Thông tin tài khoản", href: toSiteUrl("profile.html") },
      ],
    };
  }
  if (/bookmark|da luu|luu bai|bo luu|doc sau/.test(q)) {
    return {
      text: "Bạn có thể nhấn biểu tượng lưu trên bài viết để đưa bài vào danh sách đọc sau. Các bài đã lưu được đồng bộ theo tài khoản; hãy đăng nhập để xem, bỏ lưu hoặc quản lý danh sách.",
      links: [
        { label: "Mở danh sách bài đã lưu", href: toSiteUrl("bookmarks.html") },
      ],
    };
  }
  if (/admin|quan tri|quan ly tai khoan|duyet bai/.test(q)) {
    return {
      text: "Trang quản trị dành cho tài khoản có quyền Admin. Tại đây Admin có thể quản lý bài cộng tác, duyệt bài và quản lý vai trò tài khoản.",
      links: [{ label: "Trang quản trị", href: toSiteUrl("admin.html") }],
    };
  }

  // Xử lý câu hỏi về tương tác trước tìm kiếm bài báo để tránh kết quả sai chủ đề.
  if (
    /danh gia.*(sao|bai viet)|cach.*danh gia|cham sao|cho sao|binh chon sao|rating/.test(
      q,
    )
  ) {
    return {
      text: "Để đánh giá sao, bạn hãy đăng nhập NEWS 24H, mở bài viết muốn đánh giá rồi kéo xuống mục “Đánh giá bài viết”. Chọn từ 1 đến 5 sao để gửi đánh giá. Mỗi tài khoản có một lượt đánh giá cho mỗi bài và bạn có thể thay đổi lại bất cứ lúc nào. Điểm trung bình và số lượt đánh giá sẽ được cập nhật trên bài viết.",
      links: [
        {
          label: "Mở bài viết để đánh giá sao",
          href: articleSectionLink(news, "rating-heading"),
        },
        { label: "Đăng nhập NEWS 24H", href: toSiteUrl("login.html") },
      ],
    };
  }

  if (/binh luan|viet nhan xet|nhan xet bai|comment/.test(q)) {
    return {
      text: "Để bình luận, bạn cần đăng nhập, mở bài viết rồi kéo xuống mục “Ý kiến bạn đọc”. Nhập nội dung (từ 2 đến 1.000 ký tự) và nhấn “Gửi bình luận”. Bình luận được hiển thị công khai với độc giả khác; hãy trao đổi văn minh nhé.",
      links: [
        {
          label: "Mở bài viết để bình luận",
          href: articleSectionLink(news, "commentForm"),
        },
        { label: "Đăng nhập NEWS 24H", href: toSiteUrl("login.html") },
      ],
    };
  }

  if (/chia se bai|gui lien ket|copy link|sao chep lien ket/.test(q)) {
    return {
      text: "Bạn mở bài viết, chọn nút “Chia sẻ” ở khu vực thông tin tác giả và thao tác bài viết. Trình duyệt sẽ mở bảng chia sẻ; nếu không hỗ trợ, NEWS 24H sẽ sao chép liên kết bài viết để bạn gửi cho người khác.",
      links: [
        {
          label: "Mở bài viết để chia sẻ",
          href: articleSectionLink(news, "share-article"),
        },
      ],
    };
  }
  if (/chuyen muc|danh muc|the loai/.test(q)) {
    return {
      text: "NEWS 24H có các chuyên mục như Chính trị, Thời sự, Kinh doanh, Thế giới, Thể thao, Giáo dục, Công nghệ, Đời sống, Sức khỏe, Văn hóa - Giải trí và Du lịch. Bạn chọn một chuyên mục bên dưới để xem các bài liên quan:",
      links: NEWS_CATEGORIES.slice(0, 10).map((category) => ({
        label: category.name,
        href: categoryLink(category),
      })),
    };
  }
  if (/tin moi|moi nhat|tin nong|tieu diem|hom nay/.test(q)) {
    const latest = sortedNews(news).slice(0, 4);
    return {
      text: latest.length
        ? "Đây là những bài viết mới nhất hiện có trên NEWS 24H:"
        : "Hiện chưa tải được danh sách tin. Bạn thử mở trang chủ hoặc tìm kiếm trực tiếp nhé.",
      links: latest.map((article) => ({
        label: `${article.title}${article.releaseDate ? ` · ${formatDate(article.releaseDate)}` : ""}`,
        href: toSiteUrl(article.detail),
      })),
    };
  }

  const category = getCategoryFromText(q);
  if (category) {
    const items = sortedNews(
      news.filter((article) => article.category === category.slug),
    ).slice(0, 5);
    return {
      text: items.length
        ? `Mình tìm thấy ${items.length} bài trong chuyên mục ${category.name}:`
        : `Hiện chưa có bài viết trong chuyên mục ${category.name} ở nguồn dữ liệu đang tải.`,
      links: items
        .map((article) => ({
          label: article.title,
          href: toSiteUrl(article.detail),
        }))
        .concat([
          {
            label: `Xem toàn bộ chuyên mục ${category.name}`,
            href: categoryLink(category),
          },
        ]),
    };
  }

  const results = news
    .map((article) => ({ article, score: scoreArticle(article, q) }))
    .filter((item) => item.score >= 3)
    .sort(
      (a, b) =>
        b.score - a.score ||
        String(b.article.releaseDate || "").localeCompare(
          String(a.article.releaseDate || ""),
        ),
    )
    .slice(0, 4);

  if (results.length) {
    return {
      text: `Mình tìm được ${results.length} bài có nội dung gần với “${text.trim()}”. Bạn chọn bài muốn đọc nhé:`,
      links: results.map(({ article }) => ({
        label: `${article.title}${article.releaseDate ? ` · ${formatDate(article.releaseDate)}` : ""}`,
        href: toSiteUrl(article.detail),
      })),
    };
  }

  if (/news 24h|bao dien tu|gioi thieu|website nay|trang web/.test(q)) {
    return {
      text: "NEWS 24H là website tin tức tổng hợp, cập nhật các chủ đề thời sự, chính trị, kinh doanh, thế giới, thể thao, công nghệ và đời sống. Trợ lý có thể giúp bạn tìm bài viết, duyệt chuyên mục, lưu bài để đọc sau hoặc kết nối với tòa soạn.",
      links: [
        { label: "Về trang chủ NEWS 24H", href: toSiteUrl("index.html") },
        { label: "Liên hệ tòa soạn", href: toSiteUrl("contact.html") },
      ],
    };
  }

  return {
    text: "Mình chưa tìm thấy thông tin phù hợp trong dữ liệu hiện có. Bạn thử nhập tên sự kiện, nhân vật, địa danh hoặc chủ đề cụ thể hơn nhé. Mình cũng có thể giúp bạn tìm tin mới, mở chuyên mục, hướng dẫn đăng nhập, lưu bài hoặc gửi bài cộng tác.",
    links: [
      {
        label: "Tìm kiếm trên NEWS 24H",
        href: toSiteUrl(`search.html?q=${encodeURIComponent(text.trim())}`),
      },
      { label: "Liên hệ tòa soạn", href: toSiteUrl("contact.html") },
    ],
  };
}

function createIcon(name) {
  const svgns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const paths = {
    chat: [
      "M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z",
    ],
    close: ["M18 6 6 18", "m6 6 12 12"],
    minus: ["M5 12h14"],
    send: ["m22 2-7 20-4-9-9-4Z", "M22 2 11 13"],
  };
  for (const pathData of paths[name] || []) {
    const path = document.createElementNS(svgns, "path");
    path.setAttribute("d", pathData);
    svg.append(path);
  }
  return svg;
}

function addMessage(container, { role, text, links = [] }) {
  const wrapper = document.createElement("div");
  wrapper.className = `n24-chat-message ${role === "user" ? "is-user" : "is-bot"}`;
  const bubble = document.createElement("div");
  bubble.className = "n24-chat-bubble";
  bubble.textContent = text;
  wrapper.append(bubble);

  if (links.length && role !== "user") {
    const list = document.createElement("ul");
    list.className = "n24-chat-links";
    links.forEach((item) => {
      const li = document.createElement("li");
      const anchor = document.createElement("a");
      anchor.href = item.href;
      anchor.textContent = item.label;
      li.append(anchor);
      list.append(li);
    });
    wrapper.append(list);
  }

  const meta = document.createElement("span");
  meta.className = "n24-chat-meta";
  meta.textContent = role === "user" ? "Bạn" : "Trợ lý NEWS 24H";
  wrapper.append(meta);
  container.append(wrapper);
  container.scrollTop = container.scrollHeight;
}

function initChatbot() {
  if (document.getElementById("news24h-chatbot")) return;

  const host = document.createElement("div");
  host.id = "news24h-chatbot";
  host.innerHTML = `
    <button class="n24-chat-launcher" type="button" aria-label="Mở trợ lý NEWS 24H" aria-expanded="false" aria-controls="n24-chat-panel">
      <span class="n24-launcher-label">Bạn cần hỗ trợ?</span>
    </button>
    <section class="n24-chat-panel" id="n24-chat-panel" role="dialog" aria-label="Trợ lý truyền thông NEWS 24H" aria-modal="false">
      <header class="n24-chat-head">
        <span class="n24-chat-brand"><img src="${new URL("img/avatar.png", scriptRoot).href}" alt="NEWS 24H"></span>
        <span class="n24-chat-head-copy"><strong>Trợ lý truyền thông NEWS 24H</strong><span><i class="n24-online-dot"></i> Sẵn sàng hỗ trợ bạn</span></span>
        <span class="n24-chat-head-actions">
          <button class="n24-icon-button n24-chat-minimize" type="button" aria-label="Thu nhỏ chatbot"></button>
          <button class="n24-icon-button n24-chat-close" type="button" aria-label="Đóng chatbot"></button>
        </span>
      </header>
      <div class="n24-chat-intro"><strong>Xin chào! Mình có thể giúp gì cho bạn?</strong><p>Hỏi về tin tức, chuyên mục hoặc cách sử dụng website NEWS 24H.</p></div>
      <div class="n24-chat-messages" aria-live="polite" aria-relevant="additions text"></div>
      <div class="n24-chat-suggestions" aria-label="Câu hỏi gợi ý">
        <button type="button" data-question="Tin mới nhất">Tin mới nhất</button>
        <button type="button" data-question="Tìm tin thể thao">Tin thể thao</button>
        <button type="button" data-question="Cách lưu bài viết">Cách lưu bài</button>
        <button type="button" data-question="Cách đánh giá sao">Đánh giá sao</button>
        <button type="button" data-question="Cách bình luận bài viết">Bình luận</button>
        <button type="button" data-question="Liên hệ tòa soạn">Liên hệ</button>
      </div>
      <form class="n24-chat-form">
        <input class="n24-chat-input" type="text" name="message" maxlength="350" autocomplete="off" placeholder="Nhập câu hỏi của bạn..." aria-label="Nhập câu hỏi">
        <button class="n24-chat-send" type="submit" aria-label="Gửi tin nhắn"></button>
      </form>
      <div class="n24-chat-footnote">Thông tin trả lời dựa trên dữ liệu hiện có của NEWS 24H.</div>
    </section>
  `;
  document.body.append(host);

  const launcher = host.querySelector(".n24-chat-launcher");
  const panel = host.querySelector(".n24-chat-panel");
  const closeButton = host.querySelector(".n24-chat-close");
  const minimizeButton = host.querySelector(".n24-chat-minimize");
  const messages = host.querySelector(".n24-chat-messages");
  const form = host.querySelector(".n24-chat-form");
  const input = host.querySelector(".n24-chat-input");
  const sendButton = host.querySelector(".n24-chat-send");
  const suggestions = host.querySelector(".n24-chat-suggestions");

  launcher.append(createIcon("chat"));
  closeButton.append(createIcon("close"));
  minimizeButton.append(createIcon("minus"));
  sendButton.append(createIcon("send"));
  minimizeButton.title = "Thu nhỏ chatbot";
  closeButton.title = "Đóng chatbot";

  let opened = false;
  const setOpen = (value) => {
    opened = value;
    host.classList.toggle("is-open", opened);
    launcher.setAttribute("aria-expanded", String(opened));
    launcher.setAttribute(
      "aria-label",
      opened ? "Chatbot đang mở" : "Mở trợ lý NEWS 24H",
    );
    if (opened) input.focus({ preventScroll: true });
    else launcher.focus({ preventScroll: true });
  };

  addMessage(messages, {
    role: "bot",
    text: "Chào mừng bạn đến với NEWS 24H! Hãy nhập chủ đề hoặc chọn một câu hỏi gợi ý bên dưới để bắt đầu.",
  });

  launcher.addEventListener("click", () => setOpen(true));
  closeButton.addEventListener("click", () => setOpen(false));
  minimizeButton.addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && opened) setOpen(false);
  });

  async function sendMessage(rawText) {
    const message = String(rawText || "").trim();
    if (!message) return;
    addMessage(messages, { role: "user", text: message });
    input.value = "";
    sendButton.disabled = true;
    input.disabled = true;
    try {
      const news = await getNews();
      const reply = makeReply(message, news);
      addMessage(messages, { role: "bot", ...reply });
    } catch (error) {
      console.error("Lỗi chatbot NEWS 24H:", error);
      addMessage(messages, {
        role: "bot",
        text: "Mình đang gặp sự cố khi tải dữ liệu. Bạn vui lòng thử lại hoặc liên hệ trực tiếp với tòa soạn nhé.",
        links: [{ label: "Liên hệ tòa soạn", href: toSiteUrl("contact.html") }],
      });
    } finally {
      sendButton.disabled = false;
      input.disabled = false;
      input.focus({ preventScroll: true });
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    sendMessage(input.value);
  });
  suggestions.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-question]");
    if (button) sendMessage(button.dataset.question);
  });
}

function addStylesheet() {
  const href = new URL("css/chatbot.css", scriptRoot).href;
  if (
    [...document.querySelectorAll('link[rel="stylesheet"]')].some(
      (link) => link.href === href,
    )
  )
    return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.append(link);
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      addStylesheet();
      initChatbot();
    },
    { once: true },
  );
} else {
  addStylesheet();
  initChatbot();
}
