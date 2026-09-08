const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
let h = fs.readFileSync(path.join(root, "lien-he.html"), "utf8");

h = h.replace(
  /href="lien-he\.html" class="header-phone"/g,
  'href="dang-ky-nguoi-ban.html" class="header-phone"'
);

const title = "Đăng ký làm người bán trên Vua MMO | Mở gian hàng sản phẩm số";
const desc =
  "Đăng ký làm người bán trên Vua MMO — mở gian hàng sản phẩm số (AI, Game, Khóa học). Tiếp cận khách hàng, thanh toán trên sàn, hỗ trợ rõ ràng. Điền form để được duyệt gian.";

h = h.replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);
if (!/<meta name="description"/i.test(h)) {
  h = h.replace(
    "</title>",
    `</title>\n<meta name="description" content="${desc}">\n<link rel="canonical" href="https://vuammo.com/dang-ky-nguoi-ban.html">\n<meta property="og:type" content="website">\n<meta property="og:title" content="${title}">\n<meta property="og:description" content="${desc}">\n<meta property="og:url" content="https://vuammo.com/dang-ky-nguoi-ban.html">`
  );
}

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: title,
      description: desc,
      url: "https://vuammo.com/dang-ky-nguoi-ban.html",
      isPartOf: { "@type": "WebSite", name: "Vua MMO", url: "https://vuammo.com/" }
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Trang chủ", item: "https://vuammo.com/" },
        {
          "@type": "ListItem",
          position: 2,
          name: "Đăng ký làm người bán",
          item: "https://vuammo.com/dang-ky-nguoi-ban.html"
        }
      ]
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Đăng ký bán hàng trên Vua MMO có mất phí không?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Đăng ký và xét duyệt gian hàng không thu phí mở tài khoản. Phí giao dịch (nếu có) được công bố rõ trên hệ thống trước khi bạn lên đơn."
          }
        },
        {
          "@type": "Question",
          name: "Mất bao lâu để được duyệt làm người bán?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Thường trong 1–3 ngày làm việc sau khi bạn gửi form đầy đủ thông tin. Đội ngũ Vua MMO sẽ liên hệ qua Zalo/SĐT hoặc email đã đăng ký."
          }
        },
        {
          "@type": "Question",
          name: "Tôi có thể bán những gì trên Vua MMO?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Các sản phẩm số phù hợp: tài khoản & công cụ AI, game, khóa học và dịch vụ số liên quan. Nội dung phải đúng mô tả và tuân thủ điều khoản sàn."
          }
        },
        {
          "@type": "Question",
          name: "Tiền hàng được thanh toán thế nào?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Khách thanh toán trên sàn. Sau khi giao hàng đúng cam kết và hết thời gian bảo vệ đơn, số dư được đối soát theo chính sách người bán của Vua MMO."
          }
        }
      ]
    }
  ]
};

const main = `
<main class="seller-page">
  <section class="seller-hero" aria-label="Đăng ký làm người bán">
    <div class="seller-hero-bg" aria-hidden="true"></div>
    <div class="container seller-hero-inner">
      <div class="seller-hero-copy seller-reveal">
        <p class="seller-brand">Vua MMO</p>
        <h1>Đăng ký làm người bán trên Vua MMO</h1>
        <p class="seller-hero-lead">Mở gian hàng sản phẩm số — tiếp cận người mua đang tìm tài khoản AI, Game và Khóa học. Thanh toán trên sàn, vận hành rõ ràng.</p>
        <a class="btn btn-primary seller-hero-cta" href="#form-dang-ky">Đăng ký ngay</a>
      </div>
      <div class="seller-hero-visual seller-reveal" style="--d:.12s">
        <img src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1400&q=80" width="1400" height="900" alt="Gian hàng số và thanh toán trên sàn thương mại điện tử" loading="eager">
      </div>
    </div>
  </section>

  <div class="container">
    <nav class="breadcrumb seller-crumb" aria-label="Breadcrumb">
      <a href="index.html">Trang chủ</a><span class="sep">›</span>
      <span class="current">Đăng ký làm người bán</span>
    </nav>
  </div>

  <section class="seller-section seller-intro">
    <div class="container seller-narrow">
      <h2 class="seller-reveal">Giới thiệu dành cho người bán</h2>
      <p class="seller-reveal" style="--d:.06s">Vua MMO là sàn kết nối người mua và người bán sản phẩm số. Bạn đăng sản phẩm (tài khoản AI, phần mềm, game, khóa học…), khách thanh toán trên hệ thống, giao nhận và bảo hành theo dõi trên đơn hàng.</p>
      <p class="seller-reveal" style="--d:.1s">Thay vì bán rời rạc ngoài sàn, gian hàng trên Vua MMO giúp bạn có mặt trước đúng đối tượng đang tìm mua — với quy trình bảo vệ hai bên và hỗ trợ khi phát sinh tranh chấp.</p>
    </div>
  </section>

  <section class="seller-section seller-benefits" aria-labelledby="seller-benefits-title">
    <div class="container">
      <h2 id="seller-benefits-title" class="seller-reveal">Lợi ích khi bán trên Vua MMO</h2>
      <p class="seller-section-sub seller-reveal" style="--d:.05s">Những điểm giúp gian hàng vận hành ổn định hơn trên sàn.</p>
      <ul class="seller-benefit-list">
        <li class="seller-reveal" style="--d:.08s"><strong>Tiếp cận người mua sẵn nhu cầu</strong><span>Khách đang lọc ChatGPT, CapCut, Steam, khóa học… ngay trên sàn.</span></li>
        <li class="seller-reveal" style="--d:.12s"><strong>Thanh toán trên hệ thống</strong><span>Giảm rủi ro chuyển khoản ngoài; đối soát theo đơn hàng.</span></li>
        <li class="seller-reveal" style="--d:.16s"><strong>Quản lý đơn &amp; bảo hành rõ</strong><span>Trao đổi trên đơn, lưu lịch sử — dễ xử lý khiếu nại.</span></li>
        <li class="seller-reveal" style="--d:.2s"><strong>Phí và chính sách minh bạch</strong><span>Biết trước điều kiện trước khi lên sản phẩm.</span></li>
        <li class="seller-reveal" style="--d:.24s"><strong>Hỗ trợ từ đội ngũ sàn</strong><span>Chat/email trong giờ làm việc khi cần hỗ trợ vận hành.</span></li>
      </ul>
    </div>
  </section>

  <section class="seller-section seller-steps" aria-labelledby="seller-steps-title">
    <div class="container">
      <h2 id="seller-steps-title" class="seller-reveal">3 bước mở gian hàng</h2>
      <ol class="seller-steps-list">
        <li class="seller-reveal" style="--d:.06s"><span class="seller-step-num">1</span><div><strong>Gửi form đăng ký</strong><p>Điền thông tin liên hệ và nhóm hàng bạn muốn bán.</p></div></li>
        <li class="seller-reveal" style="--d:.1s"><span class="seller-step-num">2</span><div><strong>Chờ xét duyệt</strong><p>Vua MMO kiểm tra và phản hồi trong 1–3 ngày làm việc.</p></div></li>
        <li class="seller-reveal" style="--d:.14s"><span class="seller-step-num">3</span><div><strong>Mở gian &amp; đăng sản phẩm</strong><p>Sau khi duyệt, bạn lên tin và bắt đầu nhận đơn trên sàn.</p></div></li>
      </ol>
    </div>
  </section>

  <section class="seller-section seller-form-section" id="form-dang-ky" aria-labelledby="seller-form-title">
    <div class="container seller-form-wrap">
      <div class="seller-form-intro seller-reveal">
        <h2 id="seller-form-title">Form đăng ký làm người bán</h2>
        <p>Điền form bên dưới. Chúng tôi liên hệ qua Zalo/SĐT hoặc email để hoàn tất hồ sơ gian hàng.</p>
      </div>
      <form class="seller-form seller-reveal" style="--d:.08s" id="sellerRegForm" novalidate>
        <div class="seller-form-grid">
          <label class="seller-field">
            <span>Họ và tên <abbr title="bắt buộc">*</abbr></span>
            <input type="text" name="fullName" id="sellerFullName" autocomplete="name" required maxlength="80" placeholder="Nguyễn Văn A">
          </label>
          <label class="seller-field">
            <span>Số điện thoại / Zalo <abbr title="bắt buộc">*</abbr></span>
            <input type="tel" name="phone" id="sellerPhone" autocomplete="tel" required maxlength="20" placeholder="09xx xxx xxx" inputmode="tel">
          </label>
          <label class="seller-field">
            <span>Email <abbr title="bắt buộc">*</abbr></span>
            <input type="email" name="email" id="sellerEmail" autocomplete="email" required maxlength="120" placeholder="ban@email.com">
          </label>
          <label class="seller-field">
            <span>Tên gian hàng mong muốn <abbr title="bắt buộc">*</abbr></span>
            <input type="text" name="shopName" id="sellerShop" required maxlength="60" placeholder="VD: AccVIP Pro">
          </label>
          <label class="seller-field seller-field-full">
            <span>Nhóm hàng chính <abbr title="bắt buộc">*</abbr></span>
            <select name="category" id="sellerCategory" required>
              <option value="">— Chọn nhóm —</option>
              <option value="tai-khoan-cong-cu-ai">Tài khoản &amp; Công cụ AI</option>
              <option value="game">Game</option>
              <option value="khoa-hoc">Khóa học</option>
              <option value="khac">Khác</option>
            </select>
          </label>
          <label class="seller-field seller-field-full">
            <span>Mô tả ngắn về sản phẩm / kinh nghiệm</span>
            <textarea name="note" id="sellerNote" rows="4" maxlength="800" placeholder="Bạn dự định bán gì? Đã bán ở đâu chưa?"></textarea>
          </label>
        </div>
        <label class="seller-check">
          <input type="checkbox" name="agree" id="sellerAgree" required>
          <span>Tôi đồng ý với <a href="dieu-khoan-su-dung.html" target="_blank" rel="noopener">Điều khoản sử dụng</a> của Vua MMO.</span>
        </label>
        <p class="seller-form-error" id="sellerFormError" hidden></p>
        <button type="submit" class="btn btn-primary seller-submit">Gửi đăng ký</button>
        <p class="seller-form-note">Đây là bản đăng ký sơ bộ. Sau khi duyệt, bạn sẽ nhận hướng dẫn mở gian chi tiết.</p>
      </form>
    </div>
  </section>

  <section class="seller-section seller-faq" aria-labelledby="seller-faq-title">
    <div class="container seller-narrow">
      <h2 id="seller-faq-title" class="seller-reveal">Câu hỏi thường gặp</h2>
      <div class="seller-faq-list">
        <article class="seller-faq-item seller-reveal" style="--d:.06s">
          <h3>Đăng ký bán hàng có mất phí không?</h3>
          <p>Đăng ký và xét duyệt không thu phí mở tài khoản. Phí giao dịch (nếu có) được công bố rõ trên hệ thống trước khi bạn lên đơn.</p>
        </article>
        <article class="seller-faq-item seller-reveal" style="--d:.1s">
          <h3>Mất bao lâu để được duyệt?</h3>
          <p>Thường 1–3 ngày làm việc sau khi gửi form đầy đủ. Vua MMO liên hệ qua Zalo/SĐT hoặc email đã đăng ký.</p>
        </article>
        <article class="seller-faq-item seller-reveal" style="--d:.14s">
          <h3>Tôi có thể bán những gì?</h3>
          <p>Sản phẩm số phù hợp: tài khoản &amp; công cụ AI, game, khóa học và dịch vụ số liên quan — đúng mô tả, đúng điều khoản sàn.</p>
        </article>
        <article class="seller-faq-item seller-reveal" style="--d:.18s">
          <h3>Tiền hàng thanh toán thế nào?</h3>
          <p>Khách thanh toán trên sàn. Sau khi giao đúng cam kết và hết thời gian bảo vệ đơn, số dư đối soát theo chính sách người bán.</p>
        </article>
      </div>
    </div>
  </section>
</main>
`;

h = h.replace(/<main>[\s\S]*?<\/main>/, main);

if (!/id="sellerJsonLd"/.test(h)) {
  h = h.replace(
    "</head>",
    `<script type="application/ld+json" id="sellerJsonLd">${JSON.stringify(jsonLd)}</script>\n</head>`
  );
}

h = h.replace(
  /<script src="js\/layout\.js"><\/script>/,
  `<script src="js/layout.js"></script>\n<script src="js/dang-ky-nguoi-ban.js"></script>`
);

fs.writeFileSync(path.join(root, "dang-ky-nguoi-ban.html"), h);
console.log("Wrote dang-ky-nguoi-ban.html");
