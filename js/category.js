const CATEGORY_META = {
  "cong-cu-ai": {
    title: "Công Cụ AI",
    parent: {name:"Ứng dụng & Phần mềm khác", href:"category.html?cat=ung-dung-phan-mem-khac"},
    match: p => p.cats.includes("Công Cụ AI"),
    intro: "Danh mục Công Cụ AI tại Vua MMO tổng hợp các tài khoản AI phổ biến nhất hiện nay cho học tập, làm việc, lập trình, viết content, research và sáng tạo ảnh/video/âm thanh. Bạn có thể mua công cụ AI giá rẻ, chính chủ, giao nhanh — chọn theo đúng nhu cầu thay vì mua theo cảm tính.",
    chips: ["Viết lách & Nghiên cứu","Lập trình","Ảnh & Video AI","Âm thanh AI"],
  },
  "hoc-tap": {
    title: "Học Tập",
    match: p => p.cats.includes("Học tập"),
    intro: "Tài khoản phục vụ học tập và ngoại ngữ — từ nền tảng khoá học quốc tế, luyện thi đến ứng dụng học ngôn ngữ, tất cả đều chính chủ, giá tốt, bảo hành trọn thời hạn.",
    chips: ["Khoá học online","Ngoại ngữ","Ghi chú & năng suất","Luyện thi"],
  },
  "lam-viec": {
    title: "Làm Việc",
    match: p => p.cats.includes("Làm việc"),
    intro: "Bộ công cụ giúp công việc hiệu quả hơn: từ ghi âm, chuyển văn bản, thiết kế đến các phần mềm chuyên dụng cho dân văn phòng và freelancer, giao tài khoản tự động trong 5–15 phút.",
    chips: ["Năng suất","Thiết kế","Ghi âm & phiên âm","Quản lý dự án"],
  },
  "giai-tri": {
    title: "Giải Trí",
    match: p => p.cats.includes("Giải trí"),
    intro: "Tài khoản giải trí chính hãng giá rẻ: xem phim, nghe nhạc, mạng xã hội và các nền tảng streaming được yêu thích nhất, thanh toán QR, nhận tài khoản ngay sau khi chuyển khoản.",
    chips: ["Xem phim","Nghe nhạc","Mạng xã hội","Truyện & sách"],
  },
  "vpn": {
    title: "VPN",
    match: p => p.cats.includes("VPN"),
    intro: "Các dịch vụ VPN uy tín giúp bảo mật kết nối, đổi IP quốc tế và truy cập nội dung không giới hạn — bản quyền chính hãng, kích hoạt nhanh, bảo hành 1 đổi 1 trọn thời hạn.",
    chips: ["Bảo mật","Đổi IP quốc tế","Tốc độ cao","Nhiều thiết bị"],
  },
  "luu-tru": {
    title: "Lưu Trữ",
    match: p => p.cats.includes("Lưu trữ") || p.cats.includes("Lưu trữ đám mây"),
    intro: "Nâng cấp dung lượng lưu trữ đám mây chính chủ với giá tốt hơn nhiều so với mua trực tiếp — dữ liệu an toàn, đồng bộ đa thiết bị, hỗ trợ nâng cấp nhanh trong ngày.",
    chips: ["Google One","Lưu trữ tệp","Đồng bộ đa thiết bị","Sao lưu"],
  },
  "anti-virus": {
    title: "Anti Virus",
    match: p => p.cats.includes("Anti Virus"),
    intro: "Bản quyền phần mềm diệt virus chính hãng từ các thương hiệu bảo mật hàng đầu — bảo vệ máy tính toàn diện, kích hoạt trực tiếp bằng key bản quyền, hỗ trợ cài đặt tận tình.",
    chips: ["Diệt virus","Tường lửa","Bảo vệ thời gian thực","Key bản quyền"],
  },
  "ung-dung-phan-mem-khac": {
    title: "Ứng Dụng & Phần Mềm Khác",
    match: p => p.cats.includes("Tài khoản khác") || p.cats.includes("Công Cụ AI"),
    intro: "Tổng hợp các tài khoản, phần mềm bản quyền khác không thuộc nhóm chính — từ công cụ AI, SEO, hẹn hò đến ứng dụng tiện ích hàng ngày, đầy đủ lựa chọn cho mọi nhu cầu.",
    chips: ["Công cụ AI","SEO & Marketing","Tiện ích","Hẹn hò"],
  },
};

const params = new URLSearchParams(location.search);
const catSlug = params.get("cat") || "cong-cu-ai";
const meta = CATEGORY_META[catSlug] || CATEGORY_META["cong-cu-ai"];

document.title = `${meta.title} Giá Rẻ | Vua MMO`;
document.getElementById("catTitle").textContent = meta.title;
document.getElementById("catIntro").textContent = meta.intro;
document.getElementById("catChips").innerHTML = meta.chips.map(c=>`<span class="category-chip">${c}</span>`).join("");

const crumbHtml = [`<a href="index.html">Trang chủ</a>`];
if(meta.parent) crumbHtml.push(`<span class="sep">›</span><a href="${meta.parent.href}">${meta.parent.name}</a>`);
crumbHtml.push(`<span class="sep">›</span><span class="current">${meta.title}</span>`);
document.getElementById("breadcrumb").innerHTML = crumbHtml.join("");

const items = RAW_PRODUCTS.filter(meta.match);
const PAGE_SIZE = 15;
let page = 1;

function renderCategory(){
  const start = (page-1)*PAGE_SIZE;
  const pageItems = items.slice(start, start+PAGE_SIZE);
  document.getElementById("catGrid").innerHTML = pageItems.length
    ? pageItems.map(productCard).join("")
    : `<div class="category-empty">Chưa có sản phẩm nào trong danh mục này.</div>`;
  document.getElementById("catCount").textContent = `${items.length} sản phẩm`;
  renderCategoryPagination();
  window.scrollTo(0,0);
}
function renderCategoryPagination(){
  const totalPages = Math.max(1, Math.ceil(items.length/PAGE_SIZE));
  const el = document.getElementById("catPagination");
  let html = "";
  for(let i=1;i<=totalPages;i++){
    html += `<button class="${i===page?"active":""}" onclick="goCatPage(${i})">${i}</button>`;
  }
  el.innerHTML = totalPages > 1 ? html : "";
}
window.goCatPage = p => { page = p; renderCategory(); };
renderCategory();
