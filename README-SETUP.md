# NEWS 24H – hướng dẫn cập nhật

## 1. Cấu trúc bổ sung

- `category.html`: trang hiển thị các bài viết theo chuyên mục.
- `search.html`: trang hiển thị kết quả tìm kiếm.
- `profile.html`: trang xem và cập nhật thông tin tài khoản.
- `admin.html`: trang tổng quan chỉ hiển thị với tài khoản có vai trò `admin`.
- `js/news-data.js`: dữ liệu bài viết và danh sách chuyên mục dùng chung.
- `js/header.js`: dựng thanh điều hướng, ô tìm kiếm và menu tài khoản.
- `js/category-search.js`: lọc bài theo chuyên mục và từ khóa.


## Chatbot truyền thông NEWS 24H

Project đã tích hợp một cửa sổ **Trợ lý truyền thông NEWS 24H** ở góc dưới bên phải trên các trang HTML, bao gồm trang chủ, chuyên mục, tìm kiếm, bài viết, tài khoản và quản trị.

- `js/chatbot.js`: xử lý hội thoại, tìm kiếm tiêu đề/mô tả tin, lọc theo chuyên mục và hướng dẫn sử dụng website.
- `css/chatbot.css`: giao diện cửa sổ chat, nút mở nhanh và bố cục responsive cho điện thoại/máy tính.
- Chatbot đọc mảng `API_NEWS` và thử tải thêm bài cộng tác đã được Admin duyệt qua `loadNewsFeed()` trong `js/news-store.js`. Nếu Firestore không tải được, website vẫn có nguồn tin tĩnh để tìm kiếm.
- Các câu hỏi được xử lý ngay trong trình duyệt theo từ khóa/ngữ cảnh đã lập trình; phiên bản này **không kết nối mô hình AI bên ngoài**, không cần API key và không gửi nội dung chat lên máy chủ.
- Chatbot có thể hướng dẫn đăng nhập/đăng ký, hồ sơ cá nhân, bookmark, gửi bài cộng tác, trang quản trị và cách liên hệ tòa soạn.

Để chạy, dùng Live Server hoặc hosting HTTPS như các chức năng Firebase hiện có. Không cần cài thêm thư viện. Khi muốn nâng cấp thành chatbot AI có khả năng trả lời tự do, cần bổ sung backend/Cloud Functions và quản lý khóa API ở máy chủ; không đặt khóa bí mật trong JavaScript phía trình duyệt.

## 2. Cách thêm bài viết

Mở `js/news-data.js`, thêm một object vào mảng `API_NEWS`. Mỗi bài cần có các trường:

- `id`: mã bài viết duy nhất.
- `title`: tiêu đề.
- `poster`: URL ảnh đại diện.
- `detail`: đường dẫn trang chi tiết bài viết.
- `releaseDate`: ngày đăng theo định dạng `YYYY-MM-DD`.
- `description`: mô tả ngắn.
- `category`: slug chuyên mục, ví dụ `chinh-tri`, `kinh-doanh`, `the-thao`.
- `isHot`: `true` nếu muốn bài xuất hiện trong mục Tin nóng/tiêu điểm.

Các slug chuyên mục được khai báo trong `NEWS_CATEGORIES` ở cùng file. Có thể bổ sung/chỉnh tên hoặc slug tại đó.

## 3. Phân quyền Admin / User bằng Firebase Firestore

### Chuyển dữ liệu cũ từ `users` sang `account`

Firestore không tự đổi tên collection khi sửa JavaScript. Trước khi đưa phiên bản này lên chạy, hãy chuyển các document đang nằm trong `users` sang collection mới `account`:

1. Mở collection `users`, chọn từng document tài khoản.
2. Tạo document tương ứng trong collection `account` với **Document ID giữ nguyên bằng UID** (không dùng ID tự động).
3. Sao chép toàn bộ các field của document cũ sang document mới, đặc biệt là `uid`, `role`, `email`, `username` và `photoURL`.
4. Kiểm tra document Admin trong `account` vẫn có `role: "admin"`.
5. Chỉ xóa collection `users` cũ sau khi đã đăng nhập và kiểm tra trang quản trị hoạt động bình thường.

Nếu chưa chuyển document Admin, website sẽ không nhận ra quyền Admin cũ; khi đăng nhập, tài khoản có thể được tạo mới trong `account` với `role: "user"`.

Tất cả tài khoản đăng ký mới mặc định có `role: "user"`. User không thể tự nâng quyền; chỉ Admin hiện tại mới được thay đổi vai trò trong trang quản trị.

Để cấp quyền admin:

1. Đăng nhập bằng tài khoản muốn làm quản trị viên ít nhất một lần để website tạo hồ sơ.
2. Mở Firebase Console → Firestore Database → collection `account`.
3. Mở document có ID trùng với `UID` của tài khoản trong Firebase Authentication.
4. Thêm hoặc sửa trường `role` (kiểu string) thành `admin`.
5. Đăng xuất rồi đăng nhập lại. Menu tài khoản sẽ xuất hiện mục **Trang quản trị**.

Tài khoản có `role: "user"` chỉ thấy chức năng tài khoản cá nhân; tài khoản có `role: "admin"` mới được hiển thị trang quản trị. Sau khi có Admin đầu tiên, Admin có thể vào `admin.html` → **Quản lý tài khoản** để tìm và đổi vai trò những tài khoản khác.

## 4. Firestore Security Rules

File `firestore.rules.example` là Rules mẫu cho `account`, collection con `bookmarks`, `articles` và các collection con `comments`, `ratings`. Hãy đọc kỹ, gộp với Rules đang dùng (nếu có), sau đó dán vào Firebase Console → Firestore Database → Rules và Publish.

Rules không cho user tự nâng quyền `role`; người dùng chỉ được cập nhật hồ sơ của chính mình. User chỉ tạo/sửa bản nháp hoặc bài bị yêu cầu chỉnh sửa; Admin mới được duyệt, biên tập, ẩn và xóa bài cộng tác.

## 5. Firebase Authentication và Google

Trong Firebase Console → Authentication → Sign-in method, bật Email/Password và Google. Trong mục Authorized domains, thêm domain đang chạy website (ví dụ `localhost` khi chạy local và domain hosting khi triển khai).

Nên chạy website bằng Live Server hoặc hosting có HTTPS thay vì mở trực tiếp file HTML bằng `file://`, vì Firebase Authentication dùng module và domain hợp lệ.

## 6. Dữ liệu bài viết

Bảy bài VietNamNet được đưa vào mảng JavaScript `API_NEWS` cùng bốn bài ban đầu. Bài do người dùng đóng góp được lưu trên Firestore và xuất hiện công khai sau khi Admin duyệt. Hãy cập nhật Firestore Rules theo mục 9 để bật CMS.

### Sửa lỗi thanh điều hướng (31/10/2026)

Header được tách hoàn toàn khỏi các selector CSS toàn cục `header`, `header nav`, `header a` ở các stylesheet cũ. Trên desktop, phần thương hiệu/tìm kiếm/tài khoản nằm ở hàng trên; toàn bộ chuyên mục nằm thành một hàng ngang bên dưới. Trên màn hình nhỏ, danh sách chuyên mục có thể cuộn ngang thay vì tự xuống thành nhiều dòng.

## Giao diện trang chủ và bài viết

Bản cập nhật giao diện bổ sung:

- `css/home-premium.css`: bố cục trang chủ mới, dải tin mới, thanh chủ đề nhanh, tin tiêu điểm dạng slider, thẻ bài viết và sidebar tin nóng; có responsive cho máy tính bảng/điện thoại.
- `css/article-premium.css`: giao diện đọc bài viết, thông tin tác giả và thời gian đọc, tin liên quan, sidebar chuyên mục, bình luận và đánh giá sao.
- `js/article-enhance.js`: tự nhận diện bài viết từ `news-data.js`, hiển thị tin đề xuất, tính thời gian đọc, chia sẻ/in bài và thanh tiến độ đọc. Bình luận và đánh giá sao được xử lý riêng bởi `js/article-engagement.js` và lưu đồng bộ trên Cloud Firestore.
- `js/news-render.js`: dựng dải tin mới, slider có nút chuyển/dấu chấm, danh sách bài mới và tin nóng từ `API_NEWS`.

Các trang bài viết hiện sử dụng chung dữ liệu ở `js/news-data.js`. Khi thêm bài mới, hãy thêm trường `title`, `poster`, `detail`, `releaseDate`, `description`, `category` và `isHot` vào `API_NEWS`; đồng thời tạo trang HTML tương ứng trong thư mục `Posts`.

Để kiểm tra các module JavaScript và Firebase, nên chạy project qua localhost (ví dụ tiện ích Live Server trong VS Code) thay vì mở trực tiếp file bằng đường dẫn `file://`.


## 7. Cộng tác viên: nhập và soạn thảo bài báo

- Người dùng đã đăng nhập mở **Soạn thảo bài báo** trong menu tài khoản hoặc vào `compose.html`. Trang chủ và các trang đọc tin vẫn cho phép khách truy cập xem bài đã xuất bản.
- Nhập tiêu đề, chuyên mục, mô tả, URL ảnh và nội dung. Thanh công cụ hỗ trợ in đậm, in nghiêng, gạch chân, tiêu đề, danh sách và trích dẫn.
- **Lưu bản nháp** tạo bài ở trạng thái `draft`; tác giả có thể mở lại để chỉnh sửa.
- **Gửi biên tập** chuyển bài sang `pending`. Bài chưa xuất hiện công khai cho đến khi Admin duyệt.
- Trong `admin.html`, Admin đăng nhập bằng tài khoản có `account/{UID}.role = "admin"`, mở mục **Bài gửi chờ duyệt** và nhấn **Duyệt & đăng**. Khi đó trạng thái đổi thành `published`; `js/news-store.js` mới tải bài này lên trang chủ/chuyên mục/tìm kiếm. User không thể tự đặt `published` vì Firestore Rules chỉ cho tạo `draft`/`pending` và chỉ Admin mới được đổi trạng thái.
- Luồng xuất bản dùng Firestore động, không tạo file HTML riêng cho mỗi bài. Bạn cần cập nhật/deploy bộ mã nguồn NEWS 24H mới lên hosting một lần; sau đó mỗi lần Admin duyệt bài, bài sẽ tự xuất hiện trên website ở lần tải dữ liệu kế tiếp, không cần deploy lại hosting.
- Có thể nhập nội dung từ tệp `.txt` hoặc `.html`; sau khi nhập, tác giả vẫn cần rà soát, chỉnh sửa và kiểm chứng trước khi gửi.
- Trang soạn thảo có danh sách bài của tác giả và trạng thái xử lý. Bài bị yêu cầu sửa có thể mở lại và gửi lại.

## 8. Admin biên tập, duyệt bài và quản lý tài khoản

Trong trang `admin.html`, khu vực **Quản lý tài khoản** hiển thị các hồ sơ đã đăng nhập, cho phép tìm theo tên/email/UID và đổi vai trò giữa `user` và `admin`. Tài khoản Admin hiện tại được khóa thao tác tự hạ quyền để tránh tự mất quyền quản trị. Khu vực này chỉ quản lý vai trò trong website; việc vô hiệu hóa/xóa tài khoản Firebase Authentication cần máy chủ hoặc Cloud Functions dùng Admin SDK.


Trong `admin.html`, Admin có thể xem hàng đợi bài do User/cộng tác viên gửi; mở **Chỉnh sửa** để cập nhật tiêu đề, chuyên mục, ảnh, mô tả, nội dung và trạng thái; **Duyệt & đăng**, **Yêu cầu sửa**, **Ẩn bài** hoặc **Xóa**. Những bài mẫu tĩnh `post1`–`post11` vẫn được lưu trong mã nguồn `js/news-data.js` và các file HTML, chưa phải bản ghi CMS có thể sửa từ Admin. Chỉ bài `published` mới được đưa lên trang chủ, kết quả tìm kiếm và trang chuyên mục. Bài do user gửi được xem bằng `user-article.html?id=DOCUMENT_ID`.

## 9. Firestore cần cập nhật trước khi chạy CMS

Mở Firebase Console → Firestore Database → Rules, mở file `firestore.rules.example` trong thư mục dự án, sao chép nội dung vào Console rồi Publish. Rules bảo vệ hồ sơ `account`, bookmark riêng tư `account/{UID}/bookmarks`, bài viết `articles`, bình luận `comments` và đánh giá `ratings`. User không thể tự đổi vai trò, tự xuất bản bài hoặc sửa bài đã gửi/chờ duyệt; Admin mới được phân quyền tài khoản, phê duyệt, chỉnh sửa, ẩn hoặc xóa bài.

**Lưu ý:** Nếu đang có Firestore Rules tùy chỉnh cho các collection khác, hãy gộp rules mới với rules hiện hành thay vì ghi đè mù quáng. Cấu hình Firebase hiện tại được giữ nguyên trong `js/firebase-config.js`. Cần bật Authentication Email/Password hoặc Google và chạy website qua localhost/HTTPS.

## 10. Bảy bài viết bổ sung từ VietNamNet

Đã thêm `Posts/post5.html` đến `Posts/post11.html` và bổ sung vào `API_NEWS`. Mỗi bài dùng cùng khung trình bày của post1–post4, có liên kết về bài gốc VietNamNet. Nội dung là bản tóm lược/biên soạn lại, không sao chép nguyên văn toàn bài. Một số ảnh là ảnh tư liệu/ảnh minh họa từ đơn vị báo chí hoặc tổ chức khác, được ghi nguồn ngay dưới ảnh.

Các bài cộng tác được lưu trên Firestore; `js/news-store.js` tự tải các bài có trạng thái `published` để thêm vào trang chủ, trang chuyên mục và tìm kiếm. Nếu Firestore chưa được cấu hình hoặc chưa có bài cộng tác, website vẫn hiển thị các bài dữ liệu tĩnh.

---

## Cập nhật giao diện ngày 31/10/2026

- Khu vực **Tin mới nhất** trên `index.html` chỉ hiển thị tối đa 3 bài, lấy theo thứ tự ngày đăng mới nhất. Các khu vực Tin tiêu điểm, Tin nóng, ticker và trang tìm kiếm/chuyên mục vẫn dùng toàn bộ nguồn bài viết.
- Đồng bộ font chữ cho trang bài viết bằng **Be Vietnam Pro**, có font dự phòng `Segoe UI` và `Arial` để hiển thị tiếng Việt ổn định khi không tải được Google Fonts.
- Các trang bài viết đều khai báo UTF-8. Nội dung HTML hiện tại đã được kiểm tra, không có ký tự thay thế `�` hoặc lỗi mã hóa tiếng Việt.


## 11. Bình luận công khai và hệ thống đánh giá sao

### Cách hoạt động

- Bình luận của mỗi bài được lưu trong `articles/{articleId}/comments/{commentId}` trên Cloud Firestore. Bài viết tĩnh dùng ID `post1` đến `post11`; bài cộng tác dùng ID document Firestore từ URL `user-article.html?id=...`.
- Bình luận được đọc công khai theo thời gian thực, hiển thị toàn bộ danh sách theo thứ tự mới nhất trước. Người đọc chỉ cần mở bài viết để xem bình luận của mọi tài khoản; muốn gửi bình luận phải đăng nhập.
- Khu vực bình luận hiển thị ảnh đại diện tài khoản (photoURL từ Google/Firebase) hoặc chữ cái dự phòng nếu tài khoản chưa có ảnh, thời gian, nhãn “Bạn” và nhãn vàng “Quản trị viên” cho bình luận của tài khoản Admin.
- Vai trò và ảnh đại diện người bình luận được lưu trong `authorRole` và `authorPhotoURL`; Firestore Rules đối chiếu cả hai với `account/{UID}`, nên User không thể tự gắn nhãn Admin hoặc giả mạo ảnh đại diện.
- Admin mở từng bài viết để hệ thống bổ sung `authorRole` và `authorPhotoURL` cho các bình luận cũ còn thiếu; việc cập nhật chỉ được phép thay đổi hai trường metadata này, không thay đổi nội dung bình luận.
- Tài khoản được xóa bình luận của chính mình; Admin được xóa bình luận không phù hợp.
- Đánh giá được lưu ở `articles/{articleId}/ratings/{uid}`. Mỗi tài khoản có đúng một phiếu trên mỗi bài; khi chấm sao lần nữa, điểm cũ được cập nhật, không tạo phiếu mới.
- Điểm trung bình /5 và tổng lượt đánh giá được tính từ các phiếu đã lưu trên Firestore và đồng bộ theo thời gian thực cho mọi người xem.
- Khách chưa đăng nhập vẫn xem được bình luận và điểm trung bình, nhưng cần đăng nhập để bình luận hoặc đánh giá.

### Bật chức năng

1. Mở Firebase Console → Firestore Database → Rules.
2. Cập nhật rules theo `firestore.rules.example` (có thêm các nhánh con `comments` và `ratings`), kiểm tra kỹ rules hiện tại rồi Publish.
3. Chạy website qua Live Server/localhost hoặc hosting HTTPS, đăng nhập bằng tài khoản Firebase để gửi bình luận và đánh giá.
4. Mở cùng một bài trên cửa sổ/trình duyệt khác để kiểm tra bình luận và điểm trung bình được đồng bộ.

**Lưu ý:** Các bình luận demo trước đây chỉ nằm trong HTML đã được bỏ đi; không tự chuyển thành bình luận Firestore. Chỉ bình luận mới được gửi sau khi áp dụng Rules mới mới được lưu đồng bộ. Điểm trung bình trong phiên bản này được tính phía trình duyệt từ các phiếu công khai; với website có lượng đánh giá rất lớn, nên chuyển sang Cloud Function/Firestore aggregate để giảm số document cần đọc.

## Giao diện Bootstrap NEWS 24H

Project hiện sử dụng **Bootstrap 5.3.8** qua CDN jsDelivr cho hệ thống lưới, thẻ nội dung, nút bấm, form và các tiện ích responsive. Giao diện biên tập riêng của NEWS 24H được đặt trong `css/bootstrap-news-theme.css` và tải sau các stylesheet cũ để giữ nguyên những selector/ID mà JavaScript đang sử dụng.

- Cần có kết nối Internet để trình duyệt tải Bootstrap 5.3.8 từ CDN và tải font Be Vietnam Pro.
- Không cần cài npm hay chạy bước build; tiếp tục mở project bằng VS Code Live Server hoặc hosting HTTPS như trước.
- Khi tùy chỉnh giao diện, ưu tiên chỉnh `css/bootstrap-news-theme.css`; hạn chế xóa các ID trong HTML vì các module Firebase và CMS đang truy cập chúng.
- Bootstrap được giữ ở nhánh 5.3.8 ổn định, không sử dụng nhánh Bootstrap 6 alpha.


## Logo NEWS 24H và biểu tượng Google

- `img/avatar.png` là logo NEWS 24H do chủ website cung cấp; được dùng trong header chung, nhận diện Ban biên tập, trang đăng nhập/đăng ký và favicon của các trang.
- `img/google-g.svg` là biểu tượng Google nhiều màu dùng ở nút đăng nhập/đăng ký Google. Biểu tượng được lưu cục bộ trong project, không phụ thuộc thư viện icon bên ngoài.
- Firebase Google Authentication vẫn dùng `GoogleAuthProvider` và luồng popup/redirect hiện có; chỉ phần hiển thị biểu tượng trên nút được thay đổi.

## 12. Khôi phục mật khẩu

Trang `login.html` có mục **Quên mật khẩu?**. Người dùng nhập email và website gọi `sendPasswordResetEmail()` của Firebase Authentication. Firebase gửi liên kết khôi phục theo mẫu email cấu hình trong Firebase Console; website không biết và không lưu mật khẩu mới.

Để bật: Firebase Console → Authentication → Sign-in method → bật **Email/Password**; Authentication → Templates → Password reset để tùy chỉnh nội dung email và domain quay về. Khi test, kiểm tra cả Inbox/Spam và xác nhận domain đang chạy đã được cho phép. Tính năng này không áp dụng cho đăng nhập Google nếu người dùng không có mật khẩu Email/Password.

## 13. Ghi chú quyền Admin quan trọng

- Website đang dùng `account/{UID}.role === "admin"` làm nguồn phân quyền. Cấp quyền thủ công trong Firebase Console → Authentication để lấy UID, sau đó Firestore Database → `account` → document có ID bằng UID → đặt `role` (String) thành `admin`. Đăng xuất/đăng nhập lại để tải lại hồ sơ.
- User mới luôn được tạo với `role: "user"`. Form hồ sơ không có trường chỉnh role. Firestore Rules chặn user sửa role, UID và thời điểm tạo hồ sơ; không được cấp admin bằng cách sửa JavaScript hoặc localStorage.
- `admin.html`, `admin-articles.js` và `admin-users.js` chỉ hiển thị công cụ theo role. Bảo mật thật phải nằm trong Firestore Rules: quyền xuất bản/sửa/xóa bài và đổi vai trò tài khoản chỉ dành cho Admin. Không triển khai nếu chưa publish Rules đã rà soát.
- Với hệ thống production hoặc cần quản trị nhiều cấp, nên chuyển quyền sang **Firebase custom claims** được đặt bằng Admin SDK trong Cloud Functions/server có xác thực quản trị. Không bao giờ đặt custom claim từ trình duyệt. Khi chuyển sang custom claims, cần đồng bộ `isAdmin()` trong Rules theo `request.auth.token.admin == true`.
- Tài khoản quản trị nên bật xác thực đa yếu tố nếu chính sách dự án hỗ trợ, dùng email riêng, giới hạn số admin và thu hồi quyền khi không còn phụ trách.

## 14. Bản đồ các file JavaScript

| File | Vai trò / phần cần chú ý |
|---|---|
| `js/script.js` | Đăng ký, đăng nhập, Google OAuth, quên mật khẩu, đồng bộ hồ sơ, theo dõi phiên và hiển thị role. **Không dùng localStorage để cấp quyền.** |
| `js/header.js` | Dựng header, menu tài khoản/chuyên mục và tìm kiếm; phần xử lý `is-open` điều khiển ô search trên mobile. |
| `js/firebase-client.js` | Khởi tạo Firebase dùng chung và export `auth`, `db`. |
| `js/firebase-config.js` | Cấu hình Firebase web app; bảo mật phụ thuộc Rules/Auth, không phải giữ bí mật API key. |
| `js/admin-articles.js` | CMS quản trị: lấy danh sách bài, biên tập HTML, đổi trạng thái, xóa bài. Firestore Rules phải bảo vệ từng thao tác. |
| `js/admin-users.js` | Quản lý danh sách tài khoản và đổi vai trò `user`/`admin`; không vô hiệu hóa Firebase Authentication. |
| `js/article-compose.js` | Soạn bài, kiểm tra dữ liệu, làm sạch HTML, lưu `draft`/`pending`. |
| `js/article-engagement.js` | Bình luận, đánh giá sao và listener thời gian thực. |
| `js/bookmarks.js` | Lưu/bỏ lưu bài viết trong Firestore theo UID và cập nhật trạng thái nút theo thời gian thực. |
| `js/bookmarks-page.js` | Hiển thị danh sách bài viết đã lưu tại `bookmarks.html`. |
| `js/article-enhance.js` | Tính năng bổ trợ trang bài viết tĩnh: bài liên quan, chia sẻ, in, thanh đọc. |
| `js/category-search.js` | Lọc kết quả trang tìm kiếm/chuyên mục từ query string. |
| `js/news-data.js` | Dữ liệu tin tĩnh `API_NEWS` và danh sách slug `NEWS_CATEGORIES`. |
| `js/news-store.js` | Ghép bài tĩnh với bài CMS đã xuất bản từ Firestore. |
| `js/news-render.js` | Render các khối tin tại trang chủ. |
| `js/profile-page.js` | Hiển thị form hồ sơ và gửi sự kiện lưu. |
| `js/user-article.js` | Tải/kiểm tra quyền xem bài cộng tác và lọc nội dung HTML. |

Các module đã được thêm comment đầu file để giúp tìm đúng nơi cần sửa. Khi thay cấu trúc HTML, hãy giữ hoặc cập nhật các ID mà JavaScript đang sử dụng.

## 15. Lưu bài viết (Bookmark)

- Người dùng đăng nhập có thể nhấn **Lưu bài** trên thẻ tin ở trang chủ, trang chuyên mục/tìm kiếm hoặc trên trang đọc bài. Nhấn **Đã lưu** lần nữa để bỏ lưu.
- Mục **Bài viết đã lưu** nằm trong menu tài khoản và menu chức năng. Trang `bookmarks.html` hiển thị danh sách theo thời gian lưu mới nhất và cho phép bỏ lưu trực tiếp.
- Bookmark được đồng bộ theo tài khoản trong Firestore tại `account/{UID}/bookmarks/{bookmarkId}`. Người dùng chỉ có quyền đọc, tạo và xóa bookmark dưới UID của chính mình; dữ liệu không dùng chung giữa các tài khoản.
- Để bật chức năng trên Firebase, hãy Publish nội dung mới trong `firestore.rules.example`. Quy tắc mới có nhánh `/account/{userId}/bookmarks/{bookmarkId}`. Nếu chưa Publish Rules, nút vẫn hiển thị nhưng thao tác lưu có thể bị Firestore từ chối.
- Khách chưa đăng nhập có thể xem nút lưu; khi nhấn, website chuyển đến trang đăng nhập và quay lại trang đang đọc sau khi đăng nhập thành công.
