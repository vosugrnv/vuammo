/**
 * Build SEO policy pages + wire footer/nav links sitewide.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const template = fs.readFileSync(path.join(root, "dieu-khoan-su-dung.html"), "utf8");

const pages = [
  {
    file: "dieu-khoan-dich-vu.html",
    title: "Điều khoản dịch vụ Vua MMO | Quy định sử dụng sàn sản phẩm số",
    h1: "Điều khoản dịch vụ",
    crumb: "Điều khoản dịch vụ",
    desc: "Điều khoản dịch vụ Vua MMO: quyền và nghĩa vụ người mua, người bán; vai trò sàn; thanh toán trên hệ thống; xử lý tranh chấp và cập nhật chính sách.",
    updated: "06/09/2026",
    body: `
      <p class="lead">Quy định khi sử dụng nền tảng giao dịch sản phẩm số Vua MMO. Việc truy cập, tạo tài khoản hoặc đặt đơn trên sàn đồng nghĩa bạn đã đọc và đồng ý với các điều khoản này.</p>
      <p class="info-note"><strong>Cập nhật lần cuối:</strong> 06/09/2026 · Áp dụng cho toàn bộ giao dịch trên <a href="https://vuammo.com/">vuammo.com</a>.</p>
      <h2>1. Chấp nhận điều khoản</h2>
      <p>Khi đăng ký tài khoản, duyệt sản phẩm hoặc thanh toán đơn hàng trên Vua MMO, bạn xác nhận đủ năng lực dân sự theo pháp luật Việt Nam và đồng ý tuân thủ Điều khoản dịch vụ cùng các chính sách liên quan (bảo mật, cookies, bảo hành &amp; hoàn tiền, hình thức thanh toán).</p>
      <h2>2. Vai trò của sàn Vua MMO</h2>
      <p>Vua MMO là nền tảng kết nối người mua với nhiều người bán sản phẩm số (tài khoản AI, phần mềm, game, khóa học…). Sản phẩm do gian hàng cung cấp; sàn hỗ trợ hiển thị, thanh toán trên hệ thống, theo dõi đơn và xử lý tranh chấp theo quy trình công bố.</p>
      <h2>3. Tài khoản người dùng</h2>
      <ul>
        <li>Bạn chịu trách nhiệm bảo mật thông tin đăng nhập và mọi hoạt động phát sinh từ tài khoản.</li>
        <li>Không được tạo tài khoản giả mạo, chia sẻ trái phép hoặc dùng hệ thống cho mục đích gian lận, spam, tấn.</li>
        <li>Vua MMO có quyền tạm khóa / chấm dứt tài khoản khi phát hiện vi phạm nghiêm trọng.</li>
      </ul>
      <h2>4. Trách nhiệm người mua</h2>
      <ul>
        <li>Đọc kỹ mô tả sản phẩm, thời hạn và chính sách bảo hành của từng shop trước khi mua.</li>
        <li>Cung cấp thông tin nhận hàng (email, SĐT…) chính xác để nhận sản phẩm số.</li>
        <li>Ưu tiên giao dịch và yêu cầu bảo hành trên sàn để được bảo vệ bởi cơ chế giữ đơn của Vua MMO.</li>
      </ul>
      <h2>5. Trách nhiệm người bán</h2>
      <ul>
        <li>Mô tả đúng sản phẩm; giao đúng cam kết về chất lượng, thời hạn và hướng dẫn sử dụng.</li>
        <li>Phản hồi khiếu nại trong thời gian quy định; tuân thủ chính sách bảo hành đã công bố trên tin đăng.</li>
        <li>Không yêu cầu khách chuyển khoản ngoài sàn nhằm né tránh cơ chế bảo vệ đơn.</li>
      </ul>
      <h2>6. Thanh toán &amp; phí</h2>
      <p>Khách thanh toán theo <a href="hinh-thuc-thanh-toan.html">Hình thức thanh toán</a> được hỗ trợ trên Vua MMO. Phí dịch vụ (nếu có) được hiển thị rõ trước khi xác nhận đơn. Chi tiết quy trình nhận hàng xem thêm <a href="huong-dan-mua-hang.html">Hướng dẫn mua hàng</a>.</p>
      <h2>7. Sở hữu trí tuệ &amp; nội dung</h2>
      <p>Thương hiệu, giao diện và nội dung thuộc Vua MMO được bảo vệ. Người bán chịu trách nhiệm về quyền cung cấp sản phẩm số mình đăng bán; không được đăng nội dung xâm phạm quyền bên thứ ba.</p>
      <h2>8. Giới hạn trách nhiệm</h2>
      <p>Trong phạm vi pháp luật cho phép, Vua MMO không chịu trách nhiệm thiệt hại gián tiếp phát sinh từ việc sử dụng sản phẩm sau khi đã giao đúng mô tả, trừ khi do lỗi hệ thống hoặc vi phạm nghĩa vụ của sàn đã được xác nhận.</p>
      <h2>9. Thay đổi điều khoản</h2>
      <p>Vua MMO có thể cập nhật điều khoản theo thời gian. Bản mới có hiệu lực khi đăng tải trên website. Tiếp tục sử dụng dịch vụ sau cập nhật đồng nghĩa bạn chấp nhận thay đổi.</p>
      <h2>10. Liên hệ</h2>
      <p>Mọi thắc mắc về điều khoản: <a href="mailto:support@vuammo.com">support@vuammo.com</a> hoặc <a href="lien-he.html">trang Liên hệ</a>.</p>
    `
  },
  {
    file: "chinh-sach-bao-mat.html",
    title: "Chính sách bảo mật Vua MMO | Bảo vệ dữ liệu người dùng",
    h1: "Chính sách bảo mật",
    crumb: "Chính sách bảo mật",
    desc: "Chính sách bảo mật Vua MMO: dữ liệu thu thập khi mua bán sản phẩm số, mục đích sử dụng, lưu trữ, chia sẻ và quyền của bạn theo quy định bảo vệ thông tin cá nhân.",
    updated: "06/09/2026",
    body: `
      <p class="lead">Vua MMO cam kết bảo vệ thông tin cá nhân của người mua và người bán khi sử dụng sàn giao dịch sản phẩm số. Chính sách này giải thích dữ liệu nào được thu thập, dùng để làm gì và cách bạn kiểm soát thông tin của mình.</p>
      <p class="info-note"><strong>Cập nhật lần cuối:</strong> 06/09/2026</p>
      <h2>1. Phạm vi áp dụng</h2>
      <p>Áp dụng cho website <strong>vuammo.com</strong>, form đăng ký, đơn hàng, chat hỗ trợ và tài khoản người dùng trên sàn.</p>
      <h2>2. Dữ liệu chúng tôi thu thập</h2>
      <ul>
        <li><strong>Thông tin tài khoản:</strong> họ tên, email, số điện thoại, mật khẩu (đã mã hóa).</li>
        <li><strong>Thông tin giao dịch:</strong> mã đơn, sản phẩm, số tiền, trạng thái thanh toán, lịch sử bảo hành.</li>
        <li><strong>Thông tin kỹ thuật:</strong> địa chỉ IP, loại trình duyệt, cookie/phiên đăng nhập (xem thêm <a href="chinh-sach-cookies.html">Chính sách Cookies</a>).</li>
        <li><strong>Nội dung bạn gửi:</strong> tin nhắn hỗ trợ, form đăng ký bán hàng, phản hồi khiếu nại.</li>
      </ul>
      <h2>3. Mục đích sử dụng</h2>
      <ul>
        <li>Xử lý đơn hàng, giao sản phẩm số và hỗ trợ bảo hành.</li>
        <li>Xác minh tài khoản, chống gian lận và bảo vệ an toàn sàn.</li>
        <li>Liên hệ về đơn hàng, chính sách hoặc phản hồi yêu cầu hỗ trợ.</li>
        <li>Cải thiện trải nghiệm website (thống kê tổng hợp, không định danh khi có thể).</li>
      </ul>
      <h2>4. Chia sẻ dữ liệu</h2>
      <p>Vua MMO <strong>không bán</strong> dữ liệu cá nhân. Có thể chia sẻ trong các trường hợp:</p>
      <ul>
        <li>Với người bán liên quan đến đơn hàng của bạn (thông tin cần thiết để giao / bảo hành).</li>
        <li>Với nhà cung cấp dịch vụ kỹ thuật (hosting, email, thanh toán) theo hợp đồng bảo mật.</li>
        <li>Khi pháp luật yêu cầu hoặc để bảo vệ quyền lợi hợp pháp của sàn / người dùng.</li>
      </ul>
      <h2>5. Lưu trữ &amp; bảo mật</h2>
      <p>Dữ liệu được lưu trong thời gian cần thiết để vận hành giao dịch, tuân thủ pháp luật và giải quyết khiếu nại. Chúng tôi áp dụng biện pháp kỹ thuật và tổ chức phù hợp (HTTPS, kiểm soát truy cập, mã hóa mật khẩu) để giảm rủi ro truy cập trái phép.</p>
      <h2>6. Quyền của bạn</h2>
      <ul>
        <li>Yêu cầu xem, chỉnh sửa hoặc cập nhật thông tin tài khoản.</li>
        <li>Yêu cầu xóa / hạn chế xử lý dữ liệu khi pháp luật cho phép (có thể ảnh hưởng đến việc sử dụng dịch vụ).</li>
        <li>Rút đồng ý nhận thông tin marketing (nếu có) bất kỳ lúc nào.</li>
      </ul>
      <h2>7. Liên hệ về dữ liệu cá nhân</h2>
      <p>Email: <a href="mailto:support@vuammo.com">support@vuammo.com</a> · <a href="lien-he.html">Liên hệ Vua MMO</a>.</p>
    `
  },
  {
    file: "chinh-sach-cookies.html",
    title: "Chính sách Cookies Vua MMO | Cách website dùng cookie",
    h1: "Chính sách Cookies",
    crumb: "Chính sách Cookies",
    desc: "Chính sách Cookies của Vua MMO: loại cookie sử dụng trên sàn sản phẩm số, mục đích (phiên đăng nhập, giỏ hàng, thống kê) và cách bạn quản lý tùy chọn trình duyệt.",
    updated: "06/09/2026",
    body: `
      <p class="lead">Vua MMO sử dụng cookie và công nghệ tương tự để website hoạt động ổn định, ghi nhớ phiên đăng nhập và cải thiện trải nghiệm mua bán sản phẩm số.</p>
      <p class="info-note"><strong>Cập nhật lần cuối:</strong> 06/09/2026</p>
      <h2>1. Cookie là gì?</h2>
      <p>Cookie là tệp nhỏ lưu trên trình duyệt khi bạn truy cập website. Cookie giúp nhận diện phiên làm việc, giữ trạng thái đăng nhập, giỏ hàng / wishlist và thu thập thống kê tổng hợp về cách sử dụng trang.</p>
      <h2>2. Loại cookie Vua MMO dùng</h2>
      <ul>
        <li><strong>Cookie cần thiết:</strong> duy trì phiên đăng nhập, bảo mật form, chống giả mạo yêu cầu. Không tắt được nếu muốn dùng đủ tính năng sàn.</li>
        <li><strong>Cookie chức năng:</strong> ghi nhớ tùy chọn giao diện, danh mục đã xem, trạng thái chat hỗ trợ.</li>
        <li><strong>Cookie phân tích (nếu bật):</strong> đo lượt truy cập, trang phổ biến để cải thiện nội dung và tốc độ — dạng tổng hợp, không nhằm bán dữ liệu cá nhân.</li>
      </ul>
      <h2>3. Cookie bên thứ ba</h2>
      <p>Một số dịch vụ nhúng (ví dụ mạng xã hội, công cụ thống kê, badge bảo vệ nội dung) có thể đặt cookie riêng theo chính sách của họ. Bạn nên đọc thêm điều khoản của nhà cung cấp đó khi tương tác với phần nhúng.</p>
      <h2>4. Quản lý cookie</h2>
      <ul>
        <li>Bạn có thể xóa hoặc chặn cookie trong phần cài đặt trình duyệt (Chrome, Firefox, Edge, Safari…).</li>
        <li>Chặn toàn bộ cookie có thể làm mất phiên đăng nhập, giỏ hàng hoặc một số tính năng thanh toán.</li>
        <li>Chế độ duyệt riêng tư thường xóa cookie khi đóng cửa sổ.</li>
      </ul>
      <h2>5. Liên quan đến bảo mật</h2>
      <p>Cách Vua MMO xử lý dữ liệu gắn với cookie được mô tả trong <a href="chinh-sach-bao-mat.html">Chính sách bảo mật</a>.</p>
      <h2>6. Liên hệ</h2>
      <p><a href="mailto:support@vuammo.com">support@vuammo.com</a></p>
    `
  },
  {
    file: "bao-hanh-va-hoan-tien.html",
    title: "Bảo hành và hoàn tiền Vua MMO | Chính sách đơn hàng sản phẩm số",
    h1: "Bảo hành và hoàn tiền",
    crumb: "Bảo hành và hoàn tiền",
    desc: "Chính sách bảo hành và hoàn tiền Vua MMO: điều kiện đổi/hoàn với tài khoản AI, phần mềm, game, khóa học; thời hạn bảo vệ đơn và cách gửi yêu cầu trên sàn.",
    updated: "06/09/2026",
    body: `
      <p class="lead">Chính sách này quy định điều kiện bảo hành, đổi sản phẩm và hoàn tiền khi mua sản phẩm số trên Vua MMO — nhằm bảo vệ cả người mua lẫn người bán giao dịch minh bạch trên sàn.</p>
      <p class="info-note"><strong>Cập nhật lần cuối:</strong> 06/09/2026 · Thời hạn / điều kiện cụ thể trên mỗi tin đăng có thể bổ sung thêm; luôn ưu tiên mô tả sản phẩm bạn đã mua.</p>
      <h2>1. Nguyên tắc chung</h2>
      <ul>
        <li>Mỗi sản phẩm có cam kết bảo hành do người bán công bố trên trang sản phẩm (ví dụ bảo hành 1 đổi 1 trong thời hạn gói).</li>
        <li>Yêu cầu bảo hành / hoàn tiền nên thực hiện <strong>trên đơn hàng</strong> hoặc kênh hỗ trợ chính thức của Vua MMO để được đối soát.</li>
        <li>Giao dịch ngoài sàn (chuyển khoản riêng theo yêu cầu shop) thường <strong>không</strong> được sàn bảo vệ.</li>
      </ul>
      <h2>2. Trường hợp được hỗ trợ bảo hành / đổi</h2>
      <ul>
        <li>Tài khoản / mã kích hoạt không đúng mô tả hoặc không đăng nhập được trong thời gian bảo hành (không do lỗi người dùng).</li>
        <li>Sản phẩm bị khóa / mất quyền lợi trái với cam kết của shop trong hạn bảo hành đã ghi.</li>
        <li>Giao thiếu thông tin / hướng dẫn khiến không sử dụng được sản phẩm như mô tả.</li>
      </ul>
      <h2>3. Trường hợp khó hỗ trợ hoàn tiền</h2>
      <ul>
        <li>Đã hết thời hạn bảo hành ghi trên sản phẩm / đơn.</li>
        <li>Người mua tự thay đổi mật khẩu, chia sẻ tài khoản, vi phạm ToS nhà cung cấp gốc dẫn đến khóa.</li>
        <li>Đã sử dụng phần lớn quyền lợi sản phẩm số (tùy loại hàng) rồi yêu cầu hoàn vì “đổi ý”.</li>
        <li>Không cung cấp được bằng chứng lỗi theo hướng dẫn xử lý đơn.</li>
      </ul>
      <h2>4. Quy trình yêu cầu</h2>
      <ol>
        <li>Mở đơn hàng trên tài khoản Vua MMO và mô tả lỗi kèm ảnh/video (nếu có).</li>
        <li>Người bán phản hồi trong thời gian quy định; sàn hỗ trợ hòa giải khi hai bên không thống nhất.</li>
        <li>Hướng xử lý có thể gồm: đổi tài khoản/mã mới, gia hạn, hoặc hoàn tiền một phần/toàn phần theo kết luận.</li>
      </ol>
      <h2>5. Thời gian hoàn tiền</h2>
      <p>Khi được duyệt hoàn, số tiền thường được hoàn về phương thức thanh toán gốc hoặc số dư tài khoản trên sàn theo quy trình kỹ thuật. Thời gian ngân hàng / cổng thanh toán có thể thêm vài ngày làm việc.</p>
      <h2>6. Liên hệ hỗ trợ</h2>
      <p>Chat trên website, email <a href="mailto:support@vuammo.com">support@vuammo.com</a> hoặc <a href="lien-he.html">Liên hệ</a>. Xem thêm <a href="dieu-khoan-dich-vu.html">Điều khoản dịch vụ</a>.</p>
    `
  },
  {
    file: "hinh-thuc-thanh-toan.html",
    title: "Hình thức thanh toán Vua MMO | Chuyển khoản &amp; thanh toán trên sàn",
    h1: "Hình thức thanh toán",
    crumb: "Hình thức thanh toán",
    desc: "Hình thức thanh toán tại Vua MMO: chuyển khoản ngân hàng/QR theo mã đơn, xác nhận tự động, lưu ý nội dung chuyển khoản và bảo mật khi mua sản phẩm số.",
    updated: "06/09/2026",
    body: `
      <p class="lead">Vua MMO hỗ trợ thanh toán trên sàn để đơn hàng được xác nhận nhanh, giao sản phẩm số tự động hoặc qua shop, và được bảo vệ theo chính sách đơn hàng.</p>
      <p class="info-note"><strong>Cập nhật lần cuối:</strong> 06/09/2026 · Hướng dẫn thao tác chi tiết từng bước: <a href="huong-dan-mua-hang.html">Hướng dẫn mua hàng</a>.</p>
      <h2>1. Phương thức chính</h2>
      <ul>
        <li><strong>Chuyển khoản ngân hàng / quét mã QR:</strong> thanh toán đúng số tiền hiển thị trên trang đơn hàng.</li>
        <li>Hệ thống đối soát theo <strong>mã đơn hàng</strong> trong nội dung chuyển khoản — vui lòng ghi chính xác để nhận hàng nhanh (thường vài phút sau khi nhận tiền).</li>
        <li>Các phương thức khác (nếu được bật trên checkout) sẽ hiển thị rõ khi bạn đặt mua.</li>
      </ul>
      <h2>2. Quy trình thanh toán an toàn</h2>
      <ol>
        <li>Chọn sản phẩm → Mua ngay / Giỏ hàng → Điền thông tin nhận hàng (email, SĐT).</li>
        <li>Tại bước thanh toán, kiểm tra số tiền và mã đơn.</li>
        <li>Chuyển khoản / quét QR theo hướng dẫn trên màn hình.</li>
        <li>Giữ lại biên lai; theo dõi trạng thái đơn và email nhận sản phẩm.</li>
      </ol>
      <h2>3. Lưu ý quan trọng</h2>
      <ul>
        <li>Chỉ thanh toán theo thông tin <strong>chính thức trên vuammo.com</strong> gắn với mã đơn của bạn.</li>
        <li>Không chuyển khoản theo số tài khoản cá nhân do người lạ nhắn ngoài đơn — dễ mất bảo vệ sàn.</li>
        <li>Sai số tiền hoặc sai nội dung có thể làm chậm đối soát; hãy chat hỗ trợ kèm ảnh biên lai.</li>
      </ul>
      <h2>4. Hóa đơn &amp; đối soát</h2>
      <p>Thông tin đơn và lịch sử thanh toán lưu trên tài khoản. Cần hỗ trợ xuất chứng từ / đối soát: liên hệ <a href="mailto:support@vuammo.com">support@vuammo.com</a>.</p>
      <h2>5. Hoàn tiền liên quan thanh toán</h2>
      <p>Điều kiện và thời gian hoàn xem <a href="bao-hanh-va-hoan-tien.html">Bảo hành và hoàn tiền</a>.</p>
    `
  }
];

function policyNav(activeFile) {
  const links = [
    ["dieu-khoan-dich-vu.html", "Điều khoản dịch vụ"],
    ["chinh-sach-bao-mat.html", "Chính sách bảo mật"],
    ["chinh-sach-cookies.html", "Chính sách Cookies"],
    ["bao-hanh-va-hoan-tien.html", "Bảo hành và hoàn tiền"],
    ["hinh-thuc-thanh-toan.html", "Hình thức thanh toán"]
  ];
  return `<nav class="policy-toc" aria-label="Chính sách liên quan">
        <p class="policy-toc-title">Chính sách liên quan</p>
        <ul class="policy-toc-links">
          ${links
            .map(([href, label]) => {
              const cur = href === activeFile ? ' aria-current="page"' : "";
              return `<li><a href="${href}"${cur}>${label}</a></li>`;
            })
            .join("\n          ")}
        </ul>
      </nav>`;
}

function injectSeo(html, page) {
  const url = `https://vuammo.com/${page.file}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: page.title,
        description: page.desc,
        url,
        dateModified: "2026-09-06",
        isPartOf: { "@type": "WebSite", name: "Vua MMO", url: "https://vuammo.com/" },
        about: { "@type": "Organization", name: "Vua MMO", url: "https://vuammo.com/" }
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Trang chủ", item: "https://vuammo.com/" },
          { "@type": "ListItem", position: 2, name: page.crumb, item: url }
        ]
      }
    ]
  };

  let h = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${page.title}</title>`);

  const seoBlock = `<title>${page.title}</title>
<meta name="description" content="${page.desc}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index,follow">
<meta property="og:type" content="website">
<meta property="og:locale" content="vi_VN">
<meta property="og:site_name" content="Vua MMO">
<meta property="og:title" content="${page.title}">
<meta property="og:description" content="${page.desc}">
<meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${page.title}">
<meta name="twitter:description" content="${page.desc}">
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;

  h = h.replace(/<title>[\s\S]*?<\/title>/, seoBlock);

  const mainInner = `<div class="simple-page policy-page">
      <nav class="breadcrumb seller-crumb" aria-label="Breadcrumb">
        <a href="index.html">Trang chủ</a><span class="sep">›</span>
        <span class="current">${page.crumb}</span>
      </nav>
      <h1>${page.h1}</h1>
      ${page.body.trim()}
      ${policyNav(page.file)}
      <p style="margin-top:28px"><a href="lien-he.html">Liên hệ hỗ trợ →</a></p>
    </div>`;

  h = h.replace(
    /<div class="simple-page">[\s\S]*?<\/div>\s*<\/div>\s*\n\s*<aside class="page-sidebar">/,
    `${mainInner}\n    </div>\n\n    <aside class="page-sidebar">`
  );

  // Footer links on these pages
  h = patchFooter(h);

  // Nav: Điều khoản sử dụng → dịch vụ
  h = h.replace(/href="dieu-khoan-su-dung\.html"/g, 'href="dieu-khoan-dich-vu.html"');

  return h;
}

function patchFooter(html) {
  return html
    .replace(
      /<a href="#">Điều khoản dịch vụ<\/a>/g,
      '<a href="dieu-khoan-dich-vu.html">Điều khoản dịch vụ</a>'
    )
    .replace(
      /<a href="#">Chính sách bảo mật<\/a>/g,
      '<a href="chinh-sach-bao-mat.html">Chính sách bảo mật</a>'
    )
    .replace(
      /<a href="#">Chính sách Cookies<\/a>/g,
      '<a href="chinh-sach-cookies.html">Chính sách Cookies</a>'
    )
    .replace(
      /<a href="#">Bảo hành và hoàn tiền<\/a>/g,
      '<a href="bao-hanh-va-hoan-tien.html">Bảo hành và hoàn tiền</a>'
    )
    .replace(
      /<a href="huong-dan-mua-hang\.html">Hình thức thanh toán<\/a>/g,
      '<a href="hinh-thuc-thanh-toan.html">Hình thức thanh toán</a>'
    );
}

for (const page of pages) {
  const out = injectSeo(template, page);
  fs.writeFileSync(path.join(root, page.file), out, "utf8");
  console.log("Wrote", page.file);
}

// Redirect old terms URL → new canonical page (SEO-friendly soft redirect)
{
  let old = fs.readFileSync(path.join(root, "dieu-khoan-su-dung.html"), "utf8");
  const canon = "https://vuammo.com/dieu-khoan-dich-vu.html";
  if (!/<link rel="canonical"/i.test(old)) {
    old = old.replace(
      /<title>[\s\S]*?<\/title>/,
      `<title>Điều khoản sử dụng — Vua MMO</title>
<meta name="description" content="Điều khoản sử dụng / điều khoản dịch vụ Vua MMO. Trang này chuyển tới bản điều khoản dịch vụ chính thức.">
<link rel="canonical" href="${canon}">
<meta http-equiv="refresh" content="0;url=dieu-khoan-dich-vu.html">`
    );
  } else {
    old = old.replace(/<link rel="canonical"[^>]*>/i, `<link rel="canonical" href="${canon}">`);
  }
  old = old.replace(
    /<div class="simple-page">[\s\S]*?<\/div>\s*<\/div>\s*\n\s*<aside class="page-sidebar">/,
    `<div class="simple-page">
      <h1>Điều khoản sử dụng</h1>
      <p class="lead">Trang điều khoản đã được cập nhật. Bạn sẽ được chuyển tới <a href="dieu-khoan-dich-vu.html">Điều khoản dịch vụ</a>.</p>
      <p><a href="dieu-khoan-dich-vu.html">Đọc Điều khoản dịch vụ →</a></p>
    </div>
    </div>

    <aside class="page-sidebar">`
  );
  old = patchFooter(old);
  fs.writeFileSync(path.join(root, "dieu-khoan-su-dung.html"), old, "utf8");
  console.log("Updated dieu-khoan-su-dung.html → canonical redirect");
}

// Sitewide footer + nav wiring
function walkHtml(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".git") continue;
      walkHtml(p, files);
    } else if (name.endsWith(".html")) files.push(p);
  }
  return files;
}

let patched = 0;
for (const file of walkHtml(root)) {
  let html = fs.readFileSync(file, "utf8");
  const before = html;
  html = patchFooter(html);
  // Policies dropdown / menu items that still point to old terms
  if (!file.endsWith("dieu-khoan-su-dung.html")) {
    html = html.replace(/href="dieu-khoan-su-dung\.html"/g, 'href="dieu-khoan-dich-vu.html"');
  }
  if (html !== before) {
    fs.writeFileSync(file, html, "utf8");
    patched++;
  }
}
console.log("Patched HTML files:", patched);

// Sitemap
const smPath = path.join(root, "sitemap.xml");
let sm = fs.readFileSync(smPath, "utf8");
const urls = [
  "dieu-khoan-dich-vu.html",
  "chinh-sach-bao-mat.html",
  "chinh-sach-cookies.html",
  "bao-hanh-va-hoan-tien.html",
  "hinh-thuc-thanh-toan.html",
  "dang-ky-nguoi-ban.html"
];
for (const u of urls) {
  const loc = `https://vuammo.com/${u}`;
  if (!sm.includes(loc)) {
    sm = sm.replace(
      "</urlset>",
      `  <url><loc>${loc}</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>\n</urlset>`
    );
  }
}
fs.writeFileSync(smPath, sm, "utf8");
console.log("Sitemap updated");
