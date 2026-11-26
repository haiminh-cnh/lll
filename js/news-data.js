// Dữ liệu tin tức dùng chung cho trang chủ, chuyên mục, tìm kiếm và quản trị.
export const NEWS_CATEGORIES = [
  { slug: "chinh-tri", name: "Chính trị" },
  { slug: "thoi-su", name: "Thời sự" },
  { slug: "kinh-doanh", name: "Kinh doanh" },
  { slug: "dan-toc-ton-giao", name: "Dân tộc và Tôn giáo" },
  { slug: "giao-duc", name: "Giáo dục" },
  { slug: "the-gioi", name: "Thế giới" },
  { slug: "the-thao", name: "Thể thao" },
  { slug: "van-hoa-giai-tri", name: "Văn hóa - Giải trí" },
  { slug: "doi-song", name: "Đời sống" },
  { slug: "suc-khoe", name: "Sức khỏe" },
  { slug: "cong-nghe", name: "Công nghệ" },
  { slug: "xe", name: "Xe" },
  { slug: "bat-dong-san", name: "Bất động sản" },
  { slug: "du-lich", name: "Du lịch" },
];

export const API_NEWS = [
  {
    id: 101,
    title: "Thượng tướng Đổng Quân chủ trì lễ đón Đại tướng Phan Văn Giang",
    poster:
      "https://static-images.vnncdn.net/vps_images_publish/000001/000003/2026/3/19/thuong-tuong-dong-quan-chu-tri-le-don-dai-tuong-phan-van-giang-1079.jpg",
    detail: "./Posts/post1.html",
    releaseDate: "2026-03-19",
    description:
      "Sáng nay, giao lưu hữu nghị quốc phòng biên giới Việt Nam - Trung Quốc lần thứ 10 tiếp tục diễn ra trang trọng.",
    category: "thoi-su",
    isHot: true,
  },
  {
    id: 102,
    title:
      "Phản ứng của Việt Nam trước việc Mỹ mở cuộc điều tra thương mại mới",
    poster:
      "https://static-images.vnncdn.net/vps_images_publish/000001/000003/2026/3/19/phan-ung-cua-viet-nam-truoc-viec-my-mo-cuoc-dieu-tra-thuong-mai-moi-2174.jpg",
    detail: "./Posts/post2.html",
    releaseDate: "2026-03-19",
    description:
      "Việt Nam thường xuyên trao đổi, đối thoại với phía Mỹ để đảm bảo công bằng thương mại giữa hai nước.",
    category: "kinh-doanh",
    isHot: true,
  },
  {
    id: 103,
    title: "Chủ tịch Quốc hội: Chuẩn bị nội dung nhân sự nhiệm kỳ mới",
    poster:
      "https://static-images.vnncdn.net/vps_images_publish/000001/000003/2026/3/19/chu-tich-quoc-hoi-chuan-bi-chu-dao-noi-dung-ve-cong-tac-nhan-su-nhiem-ky-moi-1758.jpg?width=360",
    detail: "./Posts/post3.html",
    releaseDate: "2026-03-19",
    description:
      "Chủ tịch Quốc hội Trần Thanh Mẫn đề nghị cần chuẩn bị chu đáo nội dung về công tác nhân sự.",
    category: "chinh-tri",
    isHot: true,
  },
  {
    id: 104,
    title: "Barca thắng Newcastle 7-2: 'Máy dội bom' của Hansi Flick",
    poster:
      "https://static-images.vnncdn.net/vps_images_publish/000001/000003/2026/3/19/barca-thang-newcastle-7-2-may-doi-bom-cua-hansi-flick-659.jpg?width=360",
    detail: "./Posts/post4.html",
    releaseDate: "2026-03-19",
    description:
      "Sức mạnh tấn công khủng khiếp của Barca đã khiến Newcastle hoàn toàn vỡ trận tại Camp Nou.",
    category: "the-thao",
    isHot: true,
  },

  {
    id: 105,
    title:
      "Chung cư hơn 50 năm tuổi có nguy cơ sập, 141 hộ dân vẫn chưa di dời",
    poster:
      "https://cdn-i.vtcnews.vn/resize/ma/upload/2025/07/10/chung-cu-vinh-hoi-cho-sap5-14100759.JPG",
    detail: "./Posts/post5.html",
    releaseDate: "2026-10-29",
    description:
      "Chung cư Vĩnh Hội tại TPHCM được xếp vào nhóm nguy hiểm cấp D, trong khi 141 hộ dân vẫn đang sinh sống và chờ phương án di dời.",
    category: "thoi-su",
    isHot: true,
    sourceUrl:
      "https://vietnamnet.vn/chung-cu-hon-50-nam-tuoi-co-nguy-co-sap-141-ho-dan-van-chua-di-doi-2569377.html",
    author: "Tuấn Hùng",
    posterCredit: "VTC News (ảnh tư liệu)",
  },
  {
    id: 106,
    title:
      "Huy động 10.000 người tăng tốc thi công đường sắt Bến Thành - Cần Giờ",
    poster:
      "https://cdn2.tuoitre.vn/471584752817336320/2026/1/26/anh-man-hinh-2026-01-26-luc-135115-17694168221321088157144.png",
    detail: "./Posts/post6.html",
    releaseDate: "2026-10-30",
    description:
      "Dự án đường sắt Bến Thành - Cần Giờ bước vào giai đoạn thi công đồng loạt, với kế hoạch huy động khoảng 10.000 lao động, kỹ sư và nhân lực kỹ thuật.",
    category: "thoi-su",
    isHot: true,
    sourceUrl:
      "https://vietnamnet.vn/huy-dong-10-000-nguoi-tong-luc-thi-cong-duong-sat-ben-thanh-can-gio-2569856.html",
    author: "Tuấn Kiệt",
    posterCredit: "Tuổi Trẻ (ảnh tư liệu lễ động thổ)",
  },
  {
    id: 107,
    title:
      "TPHCM duyệt ý tưởng thiết kế Đường hoa Nguyễn Huệ Tết Đinh Mùi 2027",
    poster:
      "https://phunuvietnam.mediacdn.vn/179072216278405120/2026/1/20/duong-hoa-tet-nguyen-hue-27-1768882217193759726853.jpg",
    detail: "./Posts/post7.html",
    releaseDate: "2026-10-28",
    description:
      "Đường hoa Nguyễn Huệ năm 2027 dự kiến được kể thành ba chương chủ đề, kết hợp bản sắc truyền thống với công nghệ và tinh thần đổi mới của thành phố.",
    category: "van-hoa-giai-tri",
    isHot: true,
    sourceUrl:
      "https://vietnamnet.vn/tphcm-phe-duyet-phuong-an-thiet-ke-duong-hoa-nguyen-hue-tet-dinh-mui-2027-2569395.html",
    author: "Tuấn Kiệt",
    posterCredit: "Phụ Nữ Việt Nam (ảnh tư liệu Đường hoa Nguyễn Huệ)",
  },
  {
    id: 108,
    title:
      "Hà Nội rào chắn đường Cổ Linh trong 3 tháng để thi công đường trên cao",
    poster:
      "https://cdn-i.vtcnews.vn/resize/ma/upload/2026/05/25/ham-chui-co-linh-3-21153311.jpg",
    detail: "./Posts/post8.html",
    releaseDate: "2026-10-30",
    description:
      "Một phần đường Cổ Linh, phường Long Biên, được tổ chức rào chắn từ cuối tháng 10/2026 đến cuối tháng 1/2027 để phục vụ thi công và mở rộng mặt đường.",
    category: "thoi-su",
    isHot: true,
    sourceUrl:
      "https://vietnamnet.vn/ha-noi-rao-chan-duong-co-linh-3-thang-de-thi-cong-duong-tren-cao-2569502.html",
    author: "Vũ Điệp",
    posterCredit: "VTC News (ảnh tư liệu khu vực Cổ Linh)",
  },
  {
    id: 109,
    title:
      "Gần 95% hộ dân Hà Nội đồng ý điều chỉnh địa giới với 3 xã của Phú Thọ",
    poster:
      "https://baoxaydung.mediacdn.vn/thumb_w/1200/603483875699699712/2026/6/11/vuon-quoc-gia-ba-vi-1781170115904601593897-33-0-533-800-crop-17811701212321569322264.jpg",
    detail: "./Posts/post9.html",
    releaseDate: "2026-10-28",
    description:
      "Đề án điều chỉnh địa giới liên quan khu vực Vườn quốc gia Ba Vì nhận được tỷ lệ đồng thuận cao tại Hà Nội và Phú Thọ sau đợt lấy ý kiến hộ dân.",
    category: "chinh-tri",
    isHot: false,
    sourceUrl:
      "https://vietnamnet.vn/gan-95-ho-dan-ha-noi-dong-y-sap-nhap-3-xa-cua-phu-tho-2569278.html",
    author: "Thành Huế",
    posterCredit: "Báo Xây dựng (ảnh Vườn quốc gia Ba Vì)",
  },
  {
    id: 110,
    title: "Nga và Ukraine xác nhận đoàn xe cứu trợ nhân đạo đã tới Oleshky",
    poster:
      "https://www.unhcr.org/ua/sites/ua/files/styles/standard_08/public/legacy-images/img-51439-0.jpeg?h=1640a7d8&itok=Pi1etO6o",
    detail: "./Posts/post10.html",
    releaseDate: "2026-10-30",
    description:
      "Hai bên cho biết hoạt động phối hợp nhân đạo tại Oleshky đang được triển khai, tạo điều kiện để người dân có nguyện vọng rời khỏi khu vực.",
    category: "the-gioi",
    isHot: true,
    sourceUrl:
      "https://vietnamnet.vn/nga-va-ukraine-xac-nhan-doan-xe-cuu-tro-nhan-dao-da-toi-oleshky-2570034.html",
    author: "Việt Dũng",
    posterCredit: "UNHCR (ảnh tư liệu cứu trợ tại Kherson)",
  },
  {
    id: 111,
    title:
      "Cầu đi bộ 1.000 tỷ đồng nối trung tâm TPHCM với Thủ Thiêm chính thức hợp long",
    poster:
      "https://cafefcdn.com/203337114487263232/2026/6/24/cau-di-bo-nghin-ty-noi-2-khu-dat-vang-tphcm7-09590223-1782283270871-1782283271172856273437.jpg",
    detail: "./Posts/post11.html",
    releaseDate: "2026-10-21",
    description:
      "Công trình cầu đi bộ dài khoảng 720m qua sông Sài Gòn hoàn tất mốc hợp long, kết nối bến Bạch Đằng với khu đô thị mới Thủ Thiêm.",
    category: "thoi-su",
    isHot: true,
    sourceUrl:
      "https://vietnamnet.vn/canh-hop-long-cau-di-bo-1-000-ty-dong-noi-lien-hai-bo-song-sai-gon-2566836.html",
    author: "Tuấn Kiệt, Tuấn Hùng",
    posterCredit: "CafeF (ảnh tư liệu thi công cầu đi bộ)",
  },
];

export function getCategoryName(slug) {
  return (
    NEWS_CATEGORIES.find((category) => category.slug === slug)?.name ||
    "Tin tức"
  );
}
