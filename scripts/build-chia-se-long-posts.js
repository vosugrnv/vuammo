/**
 * Build js/chia-se-data.js — 60 SEO articles (20/cat), long body + inline images.
 * Run: node scripts/build-chia-se-long-posts.js
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

const IMG = {
  ai: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80",
  neural: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1200&q=80",
  robot: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80",
  code: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80",
  laptop: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
  desk: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80",
  video: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1200&q=80",
  camera: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&q=80",
  film: "https://images.unsplash.com/photo-1485846234645-a62644f84781?auto=format&fit=crop&w=1200&q=80",
  design: "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=1200&q=80",
  palette: "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&w=1200&q=80",
  marketing: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80",
  social: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=1200&q=80",
  write: "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80",
  phone: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=1200&q=80",
  team: "https://images.unsplash.com/photo-1522071820411-536006b32aa6?auto=format&fit=crop&w=1200&q=80",
  data: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80",
  security: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80",
  notebook: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
  meeting: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80",
  search: "https://images.unsplash.com/photo-1432888498266-38ffec0b7d14?auto=format&fit=crop&w=1200&q=80",
  cloud: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80",
  music: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80",
  abstract: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1200&q=80",
  office: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80",
  ecommerce: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1200&q=80",
  chatgpt: "https://santhovn.com/wp-content/uploads/2013/08/Annotation-2026-01-02-081101.png",
  capcut: "https://santhovn.com/wp-content/uploads/2014/07/tai-xuong-2.png",
  canva: "https://santhovn.com/wp-content/uploads/2014/06/425c149c-7692-434e-970b-431dc28d0d76.png"
};

function fig(src, alt, caption){
  return `<figure class="share-figure"><img src="${src}" alt="${alt}" loading="lazy" width="1200" height="675"><figcaption>${caption}</figcaption></figure>`;
}

function faqBlock(items){
  const lis = items.map(i =>
    `<div class="share-faq-item"><h3>${i.q}</h3><p>${i.a}</p></div>`
  ).join("\n");
  return `<h2>Câu hỏi thường gặp</h2>\n${lis}`;
}

function dateLabel(iso){
  const [y,m,d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function buildBody(p){
  const parts = [];
  parts.push(`<p>${p.lead}</p>`);
  if(p.coverNote) parts.push(`<p><em>${p.coverNote}</em></p>`);

  for(const s of p.sections){
    parts.push(`<h2>${s.h2}</h2>`);
    for(const para of s.paras) parts.push(`<p>${para}</p>`);
    if(s.bullets && s.bullets.length){
      parts.push("<ul>" + s.bullets.map(b => `<li>${b}</li>`).join("") + "</ul>");
    }
    if(s.img) parts.push(fig(s.img.src, s.img.alt, s.img.cap));
    if(s.quote) parts.push(`<blockquote class="share-quote"><p>${s.quote}</p></blockquote>`);
    if(s.prompt) parts.push(`<pre class="share-prompt"><code>${s.prompt}</code></pre>`);
  }

  parts.push(`<h2>Kết luận &amp; gợi ý tiếp theo</h2>`);
  parts.push(`<p>${p.outro}</p>`);
  if(p.cta) parts.push(`<p><a href="${p.cta.href}">${p.cta.text}</a></p>`);
  parts.push(faqBlock(p.faq));
  return "\n      " + parts.join("\n      ") + "\n    ";
}

/** @type {Array<object>} */
const RAW = [];

function add(cat, catLabel, item){
  RAW.push({ cat, catLabel, ...item });
}

/* ===================== TIN TỨC AI (20) ===================== */
add("tin-tuc-ai", "Tin tức AI", {
  slug: "cap-nhat-chatgpt-2026-tinh-nang-moi-nen-biet",
  title: "Cập nhật ChatGPT 2026: những tính năng mới người dùng nên biết",
  excerpt: "Tổng hợp cập nhật ChatGPT 2026 đáng chú ý: mô hình mới, làm việc với file, agent và lưu ý khi chọn gói Plus/Pro trên Vua MMO.",
  keywords: "cập nhật ChatGPT 2026, tin tức ChatGPT, ChatGPT Plus Pro, tin tức AI",
  date: "2026-09-05", image: IMG.chatgpt, readTime: "12 phút đọc",
  lead: "ChatGPT vẫn là công cụ AI được người làm content, freelance và team marketing dùng nhiều nhất. Năm 2026, các bản cập nhật tập trung vào chất lượng suy luận, tốc độ phản hồi và khả năng xử lý ngữ cảnh dài — những yếu tố quyết định hiệu suất làm việc hàng ngày.",
  coverNote: "Bài viết thuộc chuyên mục Tin tức AI trên Vua MMO, cập nhật xu hướng để bạn chọn đúng gói tài khoản.",
  sections: [
    { h2: "Bức tranh ChatGPT năm 2026", paras: [
      "So với giai đoạn chỉ dùng chat văn bản, ChatGPT hiện hướng tới trợ lý làm việc đa phương thức: đọc tài liệu, phân tích bảng, hỗ trợ viết code và kết nối công cụ. Người dùng trả phí thường nhận ưu tiên tốc độ và hạn mức cao hơn bản miễn phí.",
      "Với dân MMO và seller, điều quan trọng không phải “model nào mới nhất” mà là <strong>gói nào ổn định cho workflow</strong>: viết content mỗi ngày, soạn kịch bản ads, hỗ trợ CSKH hay research sản phẩm."
    ], img: { src: IMG.ai, alt: "Giao diện công nghệ AI và mô hình ngôn ngữ lớn 2026", cap: "ChatGPT 2026 nhấn mạnh chất lượng trả lời và workflow thực tế." }},
    { h2: "Các nhóm tính năng đáng theo dõi", paras: [
      "Dưới đây là các nhóm nâng cấp thường được cộng đồng thảo luận nhiều nhất — giúp bạn lọc tin đồn và tập trung vào giá trị thực."
    ], bullets: [
      "<strong>Suy luận sâu hơn:</strong> phù hợp task phức tạp như lập kế hoạch chiến dịch, phân tích brief, review code.",
      "<strong>Làm việc với file:</strong> tóm tắt PDF, bảng tính, tài liệu dài — giảm thời gian đọc thủ công.",
      "<strong>Tùy biến theo dự án:</strong> giữ ngữ cảnh brand, tone và quy tắc nội bộ để output nhất quán.",
      "<strong>Agent / tool:</strong> chuỗi thao tác nhiều bước thay vì trả lời một lần rồi dừng."
    ]},
    { h2: "Ảnh hưởng tới người mua tài khoản Plus/Pro", paras: [
      "Gói Plus/Pro thường ổn định hơn khi dùng liên tục trong giờ cao điểm. Tuy nhiên, bạn vẫn cần đọc kỹ loại gói trên sàn: tài khoản riêng, share, hay nâng cấp chính chủ — vì mỗi loại có rủi ro và bảo hành khác nhau.",
      "Trên Vua MMO, hãy so sánh đánh giá shop, thời hạn bảo hành và mô tả hạn mức trước khi đặt hàng. Kiểm tra đăng nhập ngay trong thời gian giữ tiền để phát hiện lỗi sớm."
    ], img: { src: IMG.laptop, alt: "Người dùng làm việc với laptop và công cụ AI", cap: "Chọn gói phù hợp nhu cầu dùng hàng ngày quan trọng hơn chạy theo mọi update." }},
    { h2: "Cách tận dụng update mà không rối workflow", paras: [
      "Mỗi lần có tính năng mới, hãy thử trên một dự án nhỏ trước khi áp dụng toàn bộ quy trình. Ghi lại prompt/template hiệu quả thành thư viện nội bộ để team dùng chung.",
      "Kết hợp ChatGPT với CapCut (video) hoặc Canva (thiết kế) thường mang lại tốc độ sản xuất content cao hơn dùng một công cụ đơn lẻ."
    ], quote: "Update chỉ có giá trị khi giúp bạn ra nội dung/kết quả nhanh hơn và ít sửa hơn — không phải vì “mới”." }
  ],
  outro: "ChatGPT 2026 tiếp tục là lựa chọn đa năng cho content và vận hành. Theo dõi tin tức AI có chọn lọc, ưu tiên gói ổn định và bảo hành rõ ràng trên Vua MMO sẽ giúp bạn tiết kiệm chi phí thử-sai.",
  cta: { href: "tat-ca-san-pham.html?cat=chatgpt", text: "Xem tài khoản ChatGPT trên Vua MMO →" },
  faq: [
    { q: "Có cần nâng Pro ngay khi có update mới?", a: "Không bắt buộc. Hãy xem bạn có chạm hạn mức hoặc cần tốc độ/ưu tiên cao không. Nhiều việc vẫn ổn với Plus nếu prompt và quy trình tốt." },
    { q: "Bản miễn phí còn dùng được không?", a: "Có, nhưng dễ chậm và hạn chế hơn vào giờ cao điểm. Nếu làm việc chuyên nghiệp mỗi ngày, gói trả phí thường đáng hơn." },
    { q: "Mua ChatGPT ở đâu an toàn?", a: "Ưu tiên giao dịch trên sàn như Vua MMO, đọc bảo hành, không chuyển khoản ngoài và kiểm tra hàng ngay sau bàn giao." }
  ]
});

add("tin-tuc-ai", "Tin tức AI", {
  slug: "claude-4-va-claude-code-xu-huong-ai-lap-trinh-2026",
  title: "Claude 4 & Claude Code: xu hướng AI lập trình đáng chú ý 2026",
  excerpt: "Vì sao Claude và Claude Code đang được developer, product team ưa chuộng cho review code, viết spec và agent coding năm 2026.",
  keywords: "Claude 4, Claude Code, tin tức AI lập trình, Claude Pro",
  date: "2026-09-04", image: IMG.code, readTime: "11 phút đọc",
  lead: "Claude ngày càng nổi trong cộng đồng developer nhờ xử lý ngữ cảnh dài và phong cách trả lời cẩn thận khi review code. Năm 2026, xu hướng Claude Code / agent coding khiến nhiều team cân nhắc chuyển một phần workflow sang Anthropic.",
  sections: [
    { h2: "Claude khác gì so với chatbot thông thường?", paras: [
      "Điểm mạnh thường được nhắc tới là khả năng đọc tài liệu/codebase dài, giữ mạch logic và chỉ ra rủi ro thay vì chỉ “viết thêm code”. Với product manager, Claude hữu ích khi viết PRD, changelog và tóm tắt ticket.",
      "Với freelancer làm web/app, Claude giúp rút ngắn thời gian debug và viết test — nhưng vẫn cần tự review trước khi merge."
    ], img: { src: IMG.neural, alt: "Minh họa mạng neural và AI lập trình", cap: "Claude được ưa chuộng cho task kỹ thuật cần độ chính xác cao." }},
    { h2: "Claude Code và làn sóng agent coding", paras: [
      "Agent coding không thay thế kỹ sư, mà đẩy nhanh các bước lặp: đọc lỗi, đề xuất patch, viết test, cập nhật docs. Team nhỏ có thể tăng throughput nếu có quy trình review rõ."
    ], bullets: [
      "Phù hợp refactor có phạm vi kiểm soát",
      "Hữu ích khi onboard codebase mới",
      "Cần policy: không commit code chưa hiểu",
      "Theo dõi chi phí token khi chạy agent dài"
    ]},
    { h2: "Ai nên quan tâm Claude Pro/Max?", paras: [
      "Lập trình viên, technical writer, team product và agency cần phân tích tài liệu dài. Nếu bạn chủ yếu viết caption ngắn, ChatGPT hoặc Gemini có thể đủ; Claude tỏa sáng ở độ sâu văn bản và code."
    ], img: { src: IMG.desk, alt: "Bàn làm việc lập trình viên với nhiều màn hình", cap: "Chọn Claude khi công việc nghiêng về code và tài liệu dài." }}
  ],
  outro: "Claude và Claude Code là xu hướng đáng theo dõi trong tin tức AI 2026. Trên Vua MMO, đọc kỹ loại gói Pro/Max và bảo hành trước khi mua.",
  cta: { href: "tat-ca-san-pham.html?cat=claude", text: "Xem tài khoản Claude →" },
  faq: [
    { q: "Claude có thay ChatGPT được không?", a: "Có thể bổ sung hoặc thay thế tùy việc. Nhiều người dùng song song: Claude cho code/docs, ChatGPT cho content đa năng." },
    { q: "Claude Code có an toàn với repo private?", a: "Cần tuân thủ chính sách bảo mật công ty. Không đưa secret, key API vào prompt khi chưa có quy định rõ." },
    { q: "Nên mua gói nào?", a: "Xem tần suất dùng và hạn mức. Đọc mô tả sản phẩm trên Vua MMO và hỏi shop nếu chưa rõ share/riêng." }
  ]
});

add("tin-tuc-ai", "Tin tức AI", {
  slug: "gemini-ultra-veo-cap-nhat-google-ai-2026",
  title: "Gemini Ultra & Veo: cập nhật Google AI đáng theo dõi 2026",
  excerpt: "Tóm tắt xu hướng Gemini Ultra và Veo trong hệ sinh thái Google AI 2026 — lợi ích cho content, research và người mua tài khoản.",
  keywords: "Gemini Ultra, Veo Google, tin tức Google AI 2026, Gemini",
  date: "2026-09-03", image: IMG.cloud, readTime: "11 phút đọc",
  lead: "Google đẩy mạnh Gemini gắn với tìm kiếm, Workspace và tạo media. Song song, Veo hướng tới video AI chất lượng cao hơn — mở ra cơ hội cho creator và marketer cần B-roll nhanh.",
  sections: [
    { h2: "Gemini trong hệ sinh thái Google", paras: [
      "Lợi thế lớn của Gemini là gắn với tài liệu Drive, Gmail và dữ liệu tìm kiếm. Người làm research hoặc team dùng Workspace thường cảm thấy “ít ma sát” hơn khi chuyển đổi công cụ.",
      "Gói Ultra/Advanced thường hướng tới hạn mức cao và ưu tiên model mạnh — phù hợp khi bạn xử lý khối lượng lớn mỗi ngày."
    ], img: { src: IMG.search, alt: "Tìm kiếm và nghiên cứu thông tin với AI", cap: "Gemini nổi bật khi research gắn với hệ Google." }},
    { h2: "Veo và cuộc đua AI video", paras: [
      "AI video đang nóng với Runway, Kling và các model của big tech. Veo được kỳ vọng giúp tạo clip minh họa, storyboard chuyển động và ý tưởng quảng cáo nhanh hơn quy trình quay truyền thống."
    ], bullets: [
      "Phù hợp prototype creative trước khi quay thật",
      "Cần kiểm soát bản quyền nhạc/hình khi commercial",
      "Chi phí credit cần theo dõi chặt",
      "Output nên qua bước chỉnh CapCut trước khi đăng"
    ], img: { src: IMG.film, alt: "Quay dựng video và công nghệ film AI", cap: "Veo là một phần của làn sóng AI video 2026." }}
  ],
  outro: "Gemini + Veo mở rộng lựa chọn cho người làm nội dung trong hệ Google. Theo dõi cập nhật và chọn gói đúng hạn mức trên Vua MMO.",
  cta: { href: "tat-ca-san-pham.html?cat=gemini", text: "Xem Gemini / Google AI →" },
  faq: [
    { q: "Gemini có tốt hơn ChatGPT không?", a: "Tùy việc. Gemini mạnh khi gắn Google; ChatGPT mạnh đa năng workflow. Hãy thử theo use-case của bạn." },
    { q: "Veo thay thế quay video thật?", a: "Chưa hoàn toàn. Nhiều team dùng AI video cho B-roll/ý tưởng, vẫn quay UGC thật cho trust." },
    { q: "Mua Gemini ở đâu?", a: "Tìm trên Vua MMO, đọc loại gói và bảo hành, thanh toán trên sàn." }
  ]
});

add("tin-tuc-ai", "Tin tức AI", {
  slug: "so-sanh-midjourney-va-chatgpt-image-nen-dung-cong-cu-nao",
  title: "Midjourney vs ChatGPT Image: nên dùng công cụ tạo ảnh nào năm 2026?",
  excerpt: "So sánh Midjourney và ChatGPT Image theo use-case: key visual nghệ thuật, minh họa bài viết, iterate nhanh cho ads.",
  keywords: "Midjourney vs ChatGPT Image, tạo ảnh AI 2026, tin tức AI image",
  date: "2026-09-02", image: IMG.palette, readTime: "12 phút đọc",
  lead: "Thị trường tạo ảnh AI phân hóa rõ theo mục đích. Midjourney thường thắng về thẩm mỹ key visual; ChatGPT Image tiện khi iterate ngay trong luồng viết content. Hiểu đúng sẽ tránh mua thừa gói.",
  sections: [
    { h2: "Khi nào chọn Midjourney?", paras: [
      "Poster, moodboard, concept art, thumbnail “đẹp nghệ thuật” thường nghiêng Midjourney. Cộng đồng prompt và style reference mạnh giúp ra look nhất quán cho brand sáng tạo."
    ], img: { src: IMG.design, alt: "Thiết kế đồ họa và tạo ảnh nghệ thuật bằng AI", cap: "Midjourney phù hợp key visual cần cảm xúc thẩm mỹ cao." }},
    { h2: "Khi nào chọn ChatGPT Image?", paras: [
      "Khi bạn đang viết bài/landing và cần minh họa đúng mô tả ngay trong chat. Vòng lặp chỉnh sửa nhanh: “đổi nền”, “thêm sản phẩm”, “giảm text trên ảnh”."
    ], bullets: [
      "Tiện cho blog, FAQ visual, slide",
      "Ít chuyển app hơn",
      "Phụ thuộc chất lượng mô tả tiếng Việt/Anh",
      "Vẫn cần kiểm tra lỗi chữ trên ảnh"
    ], img: { src: IMG.abstract, alt: "Hình ảnh trừu tượng AI generative art", cap: "ChatGPT Image mạnh ở vòng iterate trong cùng cuộc hội thoại." }},
    { h2: "Xu hướng 2026: dùng kết hợp", paras: [
      "Nhiều agency lấy mood từ Midjourney rồi hoàn thiện layout trên Canva/Photoshop. Người làm MMO có thể bắt đầu một công cụ, nâng thêm khi nhu cầu tăng."
    ] }
  ],
  outro: "Không có công cụ “nhất” tuyệt đối — chỉ có công cụ đúng việc. Xem danh mục tạo ảnh AI trên Vua MMO và chọn theo ngân sách + output mong muốn.",
  cta: { href: "tat-ca-san-pham.html?cat=midjourney", text: "Xem Midjourney & AI image →" },
  faq: [
    { q: "Người mới nên bắt đầu từ đâu?", a: "Nếu đã dùng ChatGPT: thử Image trước. Nếu làm design chuyên: cân nhắc Midjourney." },
    { q: "Ảnh AI dùng ads được không?", a: "Được nếu tuân chính sách nền tảng và không vi phạm bản quyền/nhái thương hiệu." },
    { q: "Có cần cả hai không?", a: "Chỉ khi volume và yêu cầu thẩm mỹ đủ lớn. Bắt đầu một stack đơn giản hơn." }
  ]
});

add("tin-tuc-ai", "Tin tức AI", {
  slug: "ai-video-runway-kling-cap-nhat-cong-cu-dung-video-2026",
  title: "AI video 2026: Runway, Kling và cuộc đua công cụ dựng video",
  excerpt: "Cập nhật cục diện AI video: Runway, Kling và lưu ý credit, chất lượng, quy trình hậu kỳ với CapCut.",
  keywords: "Runway AI, Kling AI, AI video 2026, tin tức AI video",
  date: "2026-09-01", image: IMG.video, readTime: "11 phút đọc",
  lead: "Creator đang chuyển một phần khâu dựng clip sang AI video để tạo B-roll, storyboard chuyển động và ý tưởng quảng cáo nhanh. Runway quen với editor/motion; Kling nổi nhờ clip ngắn và tốc độ thử nghiệm.",
  sections: [
    { h2: "Vì sao AI video nóng năm 2026?", paras: [
      "Chi phí sản xuất video truyền thống cao, trong khi nền tảng đòi hỏi đăng đều. AI giúp giảm thời gian prototype — dù chất lượng commercial vẫn cần chọn lọc và hậu kỳ."
    ], img: { src: IMG.camera, alt: "Máy quay và sản xuất video nội dung số", cap: "AI video bổ sung, không luôn thay thế quay thật." }},
    { h2: "Runway vs Kling: góc nhìn thực tế", paras: [
      "Runway thường được editor dùng trong pipeline có kiểm soát. Kling hấp dẫn creator cần ra clip test nhanh cho TikTok/Reels. Hạn mức credit là yếu tố quyết định chi phí thực."
    ], bullets: [
      "Theo dõi giá credit theo tháng",
      "Lưu prompt/seed hiệu quả",
      "Xuất rồi chỉnh CapCut (caption, nhịp, CTA)",
      "Tránh phụ thuộc 100% AI cho trust UGC"
    ], img: { src: IMG.capcut, alt: "Công cụ CapCut chỉnh sửa video ngắn", cap: "Hậu kỳ CapCut giúp AI video sẵn sàng đăng mạng xã hội." }}
  ],
  outro: "Cuộc đua AI video chưa có người thắng tuyệt đối. Chọn nền tảng theo tốc độ thử nghiệm và ngân sách, kết hợp CapCut Pro để hoàn thiện.",
  cta: { href: "tat-ca-san-pham.html?cat=kling", text: "Xem Kling AI & video tools →" },
  faq: [
    { q: "AI video có bị nền tảng phạt?", a: "Tùy chính sách và mức độ trung thực khi quảng cáo. Tránh claim sai sự thật về sản phẩm." },
    { q: "Có cần máy mạnh không?", a: "Hầu hết render trên cloud; máy yếu vẫn dùng được nếu mạng ổn định." },
    { q: "Nên mua gói nào trước?", a: "Gói đủ credit cho 2–4 tuần test. Đánh giá ROI trước khi nâng hạn mức." }
  ]
});

add("tin-tuc-ai", "Tin tức AI", {
  slug: "xu-huong-ai-agent-tu-dong-hoa-cong-viec-2026",
  title: "Xu hướng AI Agent 2026: tự động hóa công việc đang đi đến đâu?",
  excerpt: "Từ chatbot trả lời đơn giản đến AI Agent thực thi nhiều bước — tác động tới marketing, freelancer và vận hành MMO.",
  keywords: "AI Agent 2026, tự động hóa AI, tin tức AI agent",
  date: "2026-08-30", image: IMG.robot, readTime: "12 phút đọc",
  lead: "AI Agent không chỉ trả lời mà còn lập kế hoạch và thực hiện chuỗi thao tác: tìm thông tin, soạn thảo, gọi tool. Đây là chủ đề nóng trong tin tức AI 2026 và đang thay đổi cách team phân công việc.",
  sections: [
    { h2: "Agent khác chatbot thế nào?", paras: [
      "Chatbot trả lời một lượt; agent có thể chia task, kiểm tra kết quả trung gian và lặp lại. Điều này hữu ích cho research, báo cáo và hỗ trợ vận hành — nhưng tăng rủi ro sai số liệu nếu thiếu kiểm soát."
    ], img: { src: IMG.data, alt: "Dashboard dữ liệu và tự động hóa công việc", cap: "Agent mạnh khi có dữ liệu rõ và bước kiểm duyệt." }},
    { h2: "Ứng dụng thực tế cho dân MMO", paras: [
      "Soạn lịch content, draft mô tả sản phẩm, tóm tắt feedback khách, chuẩn bị FAQ shop. Agent không thay bạn chịu trách nhiệm pháp lý/chính sách — hãy giữ bước duyệt người."
    ], bullets: [
      "Giảm thời gian việc lặp",
      "Cần checklist chất lượng output",
      "Tài khoản Pro thường cần thiết khi chạy nặng",
      "Không đưa mật khẩu/secret vào prompt"
    ], img: { src: IMG.team, alt: "Team làm việc cộng tác với công cụ số", cap: "Agent hiệu quả nhất khi gắn vào quy trình team rõ ràng." }}
  ],
  outro: "AI Agent là hướng đi dài hạn. Hãy bắt đầu tự động hóa việc lặp ít rủi ro, đo thời gian tiết kiệm được, rồi mới mở rộng.",
  cta: { href: "tat-ca-san-pham.html", text: "Khám phá tài khoản AI trên Vua MMO →" },
  faq: [
    { q: "Doanh nghiệp nhỏ có cần agent không?", a: "Có thể bắt đầu đơn giản với GPT/Claude + checklist. Agent phức tạp khi quy trình đã ổn định." },
    { q: "Rủi ro lớn nhất?", a: "Blind trust: đăng nội dung/sai số liệu chưa kiểm. Luôn có bước duyệt." },
    { q: "Công cụ nào hỗ trợ agent tốt?", a: "Tùy hệ sinh thái: ChatGPT, Claude, Gemini và các IDE AI đều đang đẩy mạnh hướng này." }
  ]
});

// Continue with remaining tin-tuc-ai posts 7-20 in compact-but-long form
const moreNews = [
  ["openai-reasoning-model-xu-huong-ai-suy-luan-2026","OpenAI và làn sóng mô hình suy luận: điều gì đổi với người dùng 2026?","Mô hình reasoning giúp giải bài khó hơn nhưng tốn token — cách dùng hợp lý cho content và phân tích.","mô hình suy luận OpenAI, reasoning AI, tin tức OpenAI",IMG.ai,"2026-08-28",
    "Các mô hình suy luận (reasoning) ưu tiên chất lượng bước trung gian thay vì trả lời tức thì. Phù hợp toán, logic, kế hoạch phức tạp; kém tối ưu nếu chỉ cần caption ngắn.",
    "Với marketer: dùng reasoning cho strategy/brief, dùng model nhanh cho biến thể copy. Theo dõi chi phí vì mỗi câu trả lời có thể tốn nhiều token hơn."],
  ["perplexity-ai-thay-doi-cach-tim-kiem-thong-tin","Perplexity AI: tìm kiếm có trích dẫn đang đổi thói quen research","Perplexity nổi bật với câu trả lời kèm nguồn — phù hợp research nhanh trước khi viết bài SEO hoặc so sánh sản phẩm.","Perplexity AI, tìm kiếm AI, tin tức AI search",IMG.search,"2026-08-26",
    "Khác chatbot thuần, Perplexity nhấn mạnh trích dẫn nguồn giúp kiểm chứng. Dân content dùng để dựng outline và danh sách câu hỏi người dùng.",
    "Vẫn cần mở link gốc với chủ đề YMYL (tài chính, sức khỏe). Kết hợp Perplexity + viết lại bằng góc nhìn thực tế tăng chất lượng SEO."],
  ["cursor-ai-ide-xu-huong-lap-trinh-voi-ai","Cursor AI và xu hướng IDE tích hợp AI năm 2026","IDE AI như Cursor đang trở thành chuẩn mới cho freelancer và team product — lợi ích, rủi ro bảo mật và chi phí.","Cursor AI, IDE AI, tin tức AI coding",IMG.code,"2026-08-24",
    "Lập trình ngay trong editor với AI giảm chuyển đổi context sang chat web. Năng suất tăng rõ ở boilerplate, test và giải thích code lạ.",
    "Doanh nghiệp cần policy về repo private và secret. Freelancer nên đo ROI theo giờ tiết kiệm trước khi nâng gói."],
  ["microsoft-copilot-2026-ai-trong-office","Microsoft Copilot 2026: AI trong Office đổi cách làm việc văn phòng","Copilot gắn Word, Excel, Teams — tin tức và lưu ý cho nhân viên văn phòng, agency dùng bộ Microsoft 365.","Microsoft Copilot, Copilot 365, tin tức AI văn phòng",IMG.office,"2026-08-22",
    "Copilot rút ngắn soạn thảo đề xuất, tóm tắt họp, phân tích bảng. Hiệu quả phụ thuộc dữ liệu nội bộ sạch và quyền truy cập đúng.",
    "Team nên đào tạo prompt nội bộ thay vì để mỗi người tự mày mò. Kiểm soát dữ liệu nhạy cảm trước khi bật tính năng rộng."],
  ["apple-intelligence-ai-tren-thiet-bi-apple","Apple Intelligence: AI trên thiết bị Apple và tác động tới người dùng","Apple đẩy AI on-device nhấn mạnh riêng tư — ý nghĩa với creator dùng iPhone/Mac và hệ sinh thái app.","Apple Intelligence, AI Apple, tin tức AI 2026",IMG.phone,"2026-08-20",
    "On-device AI giúp xử lý nhanh một số tác vụ mà ít phụ thuộc cloud. Creator quay/edit trên iPhone hưởng lợi từ đề xuất và công cụ chỉnh sửa thông minh.",
    "Chưa thay được model cloud mạnh cho task nặng. Nhiều người dùng kết hợp Apple Intelligence + ChatGPT/Claude trên máy tính."],
  ["adobe-firefly-cap-nhat-ai-cho-designer","Adobe Firefly: cập nhật AI cho designer và đội marketing","Firefly gắn Photoshop/Illustrator/Express — xu hướng thiết kế có kiểm soát bản quyền thương mại.","Adobe Firefly, AI Adobe, tin tức AI design",IMG.design,"2026-08-18",
    "Firefly hấp dẫn doanh nghiệp cần generative AI trong pipeline Adobe sẵn có. Điểm bán hàng thường là hướng commercial an toàn hơn một số công cụ mở.",
    "Designer vẫn cần mắt thẩm mỹ và brand guideline. AI là lớp tăng tốc, không thay art direction."],
  ["suno-udio-ai-music-xu-huong-nhac-nen","Suno & AI music: nhạc nền AI cho video ngắn năm 2026","Nhạc AI giúp creator có BGM nhanh cho TikTok/Reels — lưu ý bản quyền nền tảng và brand safety.","Suno AI, AI music, nhạc AI video ngắn",IMG.music,"2026-08-16",
    "AI music giảm phụ thuộc thư viện đắt đỏ khi test content. Chất lượng đủ dùng cho nhiều video ngắn, nhưng campaign lớn vẫn nên có clearance rõ.",
    "Kết hợp CapCut + nhạc AI + caption tốt thường đủ để tăng tốc lịch đăng. Kiểm tra policy TikTok/YouTube Shorts trước khi scale ads."],
  ["deepseek-va-mo-hinh-open-source-tai-viet-nam","DeepSeek và mô hình open-source: vì sao được bàn tán tại Việt Nam?","Open-source LLM giảm chi phí thử nghiệm — cơ hội và rủi ro khi triển khai cho shop, agency nhỏ.","DeepSeek, LLM open source, tin tức AI Việt Nam",IMG.neural,"2026-08-14",
    "Mô hình mở giúp research và self-host linh hoạt hơn. Shop nhỏ có thể thử nghiệm chatbot nội bộ với chi phí hạ tầng kiểm soát được.",
    "Rủi ro: vận hành, bảo mật, chất lượng tiếng Việt. Nhiều team vẫn dùng SaaS (ChatGPT/Claude) cho việc khách hàng thấy."],
  ["ai-multimodal-van-ban-anh-video-2026","AI đa phương thức 2026: văn bản, ảnh, video trong một trợ lý","Multimodal AI rút ngắn quy trình: mô tả ảnh, phân tích video, viết lại content — xu hướng hợp nhất công cụ.","AI multimodal, tin tức AI đa phương thức 2026",IMG.abstract,"2026-08-12",
    "Người dùng không còn tách silo chat/image/video. Một cuộc hội thoại có thể nhận ảnh sản phẩm và trả về caption + ý tưởng video.",
    "Điều này thúc đẩy mua gói “all-in-one” thay vì nhiều subscription rời. Hãy đo đúng bottleneck của bạn trước khi chồng gói."],
  ["ai-search-doi-cuoc-choi-seo-va-traffic","AI Search đổi cuộc chơi SEO và traffic website 2026","Tìm kiếm AI tóm tắt câu trả lời ngay trên SERP — publisher và shop cần chiến lược nội dung mới.","AI search SEO, tin tức SEO AI 2026",IMG.marketing,"2026-08-10",
    "Zero-click tăng khiến bài mỏng kém hiệu quả. Nội dung sâu, có trải nghiệm, số liệu và công cụ đi kèm giữ chân người dùng tốt hơn.",
    "Shop trên Vua MMO nên đầu tư bài hướng dẫn/mẹo kèm internal link sản phẩm — vừa SEO vừa chuyển đổi."],
  ["grok-xai-va-cuc-dien-chatbot-mang-xa-hoi","Grok và xAI: chatbot gắn mạng xã hội đáng chú ý","Grok nổi bật với phong cách trả lời và gắn dữ liệu xã hội — góc nhìn tin tức cho marketer theo dõi trend.","Grok xAI, tin tức Grok AI, chatbot X",IMG.social,"2026-08-08",
    "Chatbot gắn mạng xã hội giúp bắt trend nhanh hơn nghiên cứu thủ công. Marketer dùng để brainstorm hook theo sóng đang nổi.",
    "Vẫn cần lọc nhiễu và kiểm chứng. Trend sống ngắn — tốc độ thử creative quan trọng hơn hoàn hảo lần đầu."],
  ["quy-dinh-ai-va-noi-dung-quang-cao-2026","Quy định AI & quảng cáo 2026: marketer cần lưu ý gì?","Tin tức về minh bạch nội dung AI, claim sản phẩm và an toàn thương hiệu khi chạy ads.","quy định AI quảng cáo, compliance AI marketing",IMG.security,"2026-08-06",
    "Nền tảng và cơ quan quản lý ngày càng yêu cầu trung thực hơn về claim và nguồn gốc nội dung. Dùng AI không miễn trừ trách nhiệm quảng cáo sai sự thật.",
    "Checklist: không phóng đại công dụng, ghi nguồn khi cần, giữ landing khớp ad. Bảo vệ brand quan trọng hơn scale ảo."],
  ["local-llm-chay-ai-tren-may-tinh-ca-nhan","Local LLM: chạy AI trên máy cá nhân có đáng năm 2026?","Self-host model mang lại riêng tư và kiểm soát — yêu cầu phần cứng và kỹ thuật ra sao.","local LLM, chạy AI offline, tin tức AI local",IMG.laptop,"2026-08-04",
    "Local LLM phù hợp dữ liệu nhạy cảm và thử nghiệm không giới hạn API. Rào cản là VRAM, tối ưu model và chất lượng tiếng Việt.",
    "Người dùng phổ thông thường vẫn nên dùng ChatGPT/Claude cloud cho tốc độ. Local là lựa chọn nâng cao."],
  ["ai-cho-thuong-mai-dien-tu-xu-huong-2026","AI cho thương mại điện tử: xu hướng cá nhân hóa 2026","Từ mô tả sản phẩm đến chatbot CSKH — AI đang thâm nhập vận hành shop online và seller MMO.","AI thương mại điện tử, tin tức AI ecommerce",IMG.ecommerce,"2026-08-02",
    "Seller dùng AI để viết mô tả, trả lời FAQ, phân loại đánh giá. Cá nhân hóa gợi ý sản phẩm giúp tăng chuyển đổi nếu dữ liệu sạch.",
    "Trên sàn số như Vua MMO, mô tả rõ gói + FAQ tốt giảm khiếu nại. AI hỗ trợ soạn thảo, shop vẫn chịu trách nhiệm thông tin đúng."],
];

for(const t of moreNews){
  const [slug,title,excerpt,keywords,image,date,p1,p2] = t;
  add("tin-tuc-ai","Tin tức AI",{
    slug, title, excerpt, keywords, date, image, readTime: "10 phút đọc",
    lead: p1,
    sections: [
      { h2: "Vì sao chủ đề này đáng quan tâm?", paras: [p1, p2], img: { src: image, alt: title, cap: "Cập nhật xu hướng trong chuyên mục Tin tức AI — Vua MMO." } },
      { h2: "Tác động tới người dùng và người bán tài khoản", paras: [
        "Người dùng cuối quan tâm trải nghiệm ổn định và chi phí hợp lý. Người bán trên sàn cần cập nhật mô tả sản phẩm đúng với thay đổi tính năng để giảm khiếu nại.",
        "Hãy theo dõi nguồn tin chính thống và cộng đồng uy tín, tránh quyết định mua chỉ vì tin đồn tăng giá đột ngột."
      ], bullets: [
        "Đọc kỹ loại gói và hạn mức",
        "Ưu tiên shop có bảo hành rõ",
        "Test workflow trước khi scale",
        "Giữ thư viện prompt/template riêng"
      ], img: { src: IMG.meeting, alt: "Thảo luận chiến lược công nghệ và AI", cap: "Tin tức AI chỉ hữu ích khi gắn với quyết định mua/dùng cụ thể." } },
      { h2: "Gợi ý hành động trong tuần này", paras: [
        "Chọn 1 thay đổi liên quan trực tiếp công việc của bạn (ví dụ: model mới, hạn mức, tool video). Thử trên dự án nhỏ, ghi kết quả, rồi mới nâng gói hoặc đổi stack."
      ] }
    ],
    outro: "Bám sát tin tức AI theo nhu cầu thực tế giúp bạn không bỏ lỡ cơ hội nhưng cũng không lãng phí ngân sách. Khám phá thêm bài Hướng dẫn và Mẹo trên Vua MMO để triển khai ngay.",
    cta: { href: "tat-ca-san-pham.html", text: "Xem sản phẩm AI liên quan →" },
    faq: [
      { q: "Có nên đổi công cụ ngay khi có tin mới?", a: "Chỉ khi tool hiện tại đang là nút thắt (hạn mức, chất lượng, tốc độ). Đổi stack có chi phí học lại." },
      { q: "Đọc tin ở đâu cho chuẩn?", a: "Trang chủ hãng, blog kỹ thuật uy tín và tổng hợp có chọn lọc như chuyên mục Chia sẻ Vua MMO." },
      { q: "Mua tài khoản khi nào hợp lý?", a: "Khi đã xác định use-case dùng ít nhất vài ngày/tuần và cần hạn mức ổn định hơn bản free." }
    ]
  });
}

/* ===================== HƯỚNG DẪN (20) ===================== */
function guide(slug,title,excerpt,keywords,image,date,steps,extraImg,cta,prompt){
  const sections = steps.map((st,i) => {
    const sec = {
      h2: st.h2,
      paras: st.paras,
      bullets: st.bullets
    };
    if(i === 1 && extraImg) sec.img = { src: extraImg, alt: st.h2, cap: st.cap || "Minh họa bước thực hiện trong hướng dẫn." };
    if(i === 0) sec.img = { src: image, alt: title, cap: "Hình minh họa chủ đề hướng dẫn trên Vua MMO." };
    if(st.prompt) sec.prompt = st.prompt;
    return sec;
  });
  add("huong-dan","Hướng dẫn",{
    slug, title, excerpt, keywords, date, image, readTime: "12 phút đọc",
    lead: excerpt + " Bài hướng dẫn bên dưới đi theo từng bước để bạn làm theo được ngay, kèm lưu ý lỗi thường gặp.",
    sections: sections.concat([{
      h2: "Lỗi thường gặp & cách xử lý",
      paras: ["Nếu kết quả chưa đạt, hãy quay lại bước brief/prompt hoặc kiểm tra đúng gói Pro. Nhiều lỗi đến từ thiếu ngữ cảnh (đối tượng, tone, kích thước xuất) chứ không phải do công cụ yếu."],
      bullets: ["Thiếu brief rõ → output chung chung","Quên duyệt người → lỗi số liệu/brand","Sai kích thước xuất → bị cắt trên mobile","Share account không đúng loại → rủi ro đăng nhập"]
    }]),
    outro: "Làm đúng quy trình vài lần sẽ thành cơ bắp nhớ. Lưu checklist này và tái sử dụng cho dự án tiếp theo trên Vua MMO.",
    cta, faq: [
      { q: "Mất bao lâu để thành thạo?", a: "Thường 2–3 phiên làm thật là đủ nắm quy trình cơ bản. Tối ưu sâu cần thực hành đều." },
      { q: "Có cần máy cấu hình cao?", a: "Hầu hết công cụ cloud; ổn định mạng quan trọng hơn. Edit video nặng thì nên có máy khá." },
      { q: "Mua tài khoản ở đâu?", a: "Trên Vua MMO — đọc bảo hành, thanh toán trên sàn, kiểm tra ngay sau bàn giao." }
    ]
  });
}

guide("huong-dan-capcut-pro-chinh-video-ngan-cho-tiktok",
  "Hướng dẫn CapCut Pro: chỉnh video ngắn cho TikTok trong 15 phút",
  "Quy trình từ import clip, cắt nhịp, gắn caption đến xuất video không watermark với CapCut Pro.",
  "hướng dẫn CapCut Pro, edit TikTok CapCut, xuất video không logo",
  IMG.capcut,"2026-09-05", [
    { h2: "Bước 1: Chuẩn bị footage và cấu trúc", paras: [
      "Quay hoặc lấy clip tỷ lệ 9:16, ánh sáng đủ. Chia 3 phần: hook 1–3 giây, thân bài, CTA cuối. Import vào CapCut và sắp timeline theo đúng nhịp kể chuyện.",
      "Đặt thư mục dự án rõ tên ngày + chủ đề để tái sử dụng asset sau này."
    ], bullets: ["Hook mạnh ngay giây đầu","Bỏ đoạn chết, giữ nhịp","Chuẩn bị nhạc/beat sẵn"] },
    { h2: "Bước 2: Cắt nhịp, zoom và chữ", paras: [
      "Cắt theo beat, thêm zoom nhẹ ở điểm nhấn. Bật captions, sửa chính tả và từ khóa quan trọng. Chữ ngắn, tương phản cao, nằm vùng an toàn."
    ], cap: "Caption rõ giúp giữ người xem trên TikTok/Reels.", bullets: ["Font dày, size lớn","Tối đa 1 ý/đoạn chữ","CTA cuối clip"] },
    { h2: "Bước 3: Xuất bản Pro và kiểm tra", paras: [
      "Chọn chất lượng cao, tắt watermark (Pro). Xem lại trên điện thoại trước khi đăng. Lưu project để làm biến thể A/B."
    ], bullets: ["Kiểm tra âm lượng","Cover/frame đầu hấp dẫn","Hashtag vừa đủ, không spam"] }
  ], IMG.phone, { href: "tat-ca-san-pham.html?cat=capcut", text: "Mua CapCut Pro →" });

guide("huong-dan-dung-chatgpt-plus-viet-content-hang-ngay",
  "Hướng dẫn dùng ChatGPT Plus viết content hàng ngày",
  "Thiết lập chat/project, brief và vòng iterate để ra content ổn định với ChatGPT Plus.",
  "hướng dẫn ChatGPT Plus, viết content ChatGPT, quy trình content AI",
  IMG.chatgpt,"2026-09-04", [
    { h2: "Bước 1: Tách chat theo mục tiêu", paras: ["Tạo chat/project riêng cho SEO, caption, email. Tránh nhồi mọi việc vào một hội thoại dài gây nhiễu ngữ cảnh."], bullets: ["Đặt tên chat rõ","Ghim brief gốc","Lưu bản tốt vào docs"] },
    { h2: "Bước 2: Viết brief chuẩn", paras: ["Nêu đối tượng, pain, tone, độ dài, từ khóa, ví dụ bài mẫu. Càng rõ, càng ít vòng sửa."], prompt: "Bạn là content strategist. Viết bài [LOẠI] về [CHỦ ĐỀ] cho [ĐỐI TƯỢNG]. Tone [TONE]. Dài [SỐ] từ. Từ khóa: [KW]. Có H2 rõ, ví dụ thực tế, CTA mềm." },
    { h2: "Bước 3: Iterate và duyệt", paras: ["Yêu cầu rút gọn, thêm ví dụ, đổi CTA. Tự kiểm số liệu và chính sách trước khi đăng."], bullets: ["Không đăng bản đầu","Thêm góc nhìn riêng","Internal link sản phẩm"] }
  ], IMG.write, { href: "tat-ca-san-pham.html?cat=chatgpt", text: "Tài khoản ChatGPT →" });

guide("huong-dan-canva-pro-thiet-ke-anh-quang-cao-nhanh",
  "Hướng dẫn Canva Pro: thiết kế ảnh quảng cáo nhanh cho shop",
  "Tạo Brand Kit, chọn size đúng và hoàn thiện banner/feed/story bằng Canva Pro.",
  "hướng dẫn Canva Pro, thiết kế quảng cáo Canva, Brand Kit",
  IMG.canva,"2026-09-03", [
    { h2: "Bước 1: Brand Kit", paras: ["Lưu logo, màu, font. Mọi design sau sẽ đồng bộ thương hiệu, giảm lệch nhận diện."], bullets: ["2–3 màu chính","Font tiêu đề/phụ","Logo nền trong/ngoài"] },
    { h2: "Bước 2: Chọn kích thước", paras: ["Feed 1:1 hoặc 4:5, story 9:16, banner theo chuẩn ads. Sai size khiến bị crop xấu trên điện thoại."], cap: "Thiết kế đúng tỷ lệ giúp quảng cáo sắc nét trên mobile." },
    { h2: "Bước 3: Template + CTA", paras: ["Thay ảnh sản phẩm, headline ngắn, CTA rõ. Xuất PNG/JPG chất lượng cao và lưu brand template."], bullets: ["1 thông điệp chính","Giá/ưu đãi dễ đọc","Contrast cao"] }
  ], IMG.design, { href: "tat-ca-san-pham.html?cat=canva", text: "Mua Canva Pro →" });

guide("huong-dan-capcut-auto-caption-va-template",
  "Hướng dẫn CapCut: auto caption và template tăng tương tác",
  "Bật caption tự động, sửa chữ và dùng template Pro để dựng video ngắn nhanh hơn.",
  "hướng dẫn CapCut caption, template CapCut Pro, video ngắn",
  IMG.video,"2026-09-02", [
    { h2: "Auto caption đúng cách", paras: ["Bật nhận diện giọng nói, sửa từ khóa, tách dòng ngắn. Đặt chữ vùng an toàn tránh UI TikTok che."], bullets: ["Sửa tên riêng","Highlight từ khóa","Đồng bộ nhịp nói"] },
    { h2: "Dùng template Pro", paras: ["Chọn template phù hợp niche, thay footage, chỉnh nhạc và màu. Giữ nhận diện brand thay vì dùng nguyên style viral lệch ngành."], cap: "Template giúp tăng tốc nhưng vẫn cần chỉnh cho đúng brand." },
    { h2: "Tối ưu trước khi đăng", paras: ["Xem ở chế độ im lặng (chỉ chữ), kiểm tra hook. Xuất Pro không watermark."], bullets: ["Frame đầu rõ mặt/sản phẩm","CTA cuối","Thử 2 caption khác nhau"] }
  ], IMG.social, { href: "tat-ca-san-pham.html?cat=capcut", text: "CapCut Pro →" });

guide("huong-dan-chon-gemini-claude-hay-chatgpt",
  "Hướng dẫn chọn Gemini, Claude hay ChatGPT cho đúng việc",
  "Ma trận chọn công cụ theo viết lách, code, research — tránh mua nhầm gói.",
  "hướng dẫn chọn AI, Gemini Claude ChatGPT, so sánh AI",
  IMG.ai,"2026-09-01", [
    { h2: "Xác định việc chiếm nhiều thời gian", paras: ["Liệt kê 5 việc bạn làm mỗi tuần với AI. Công cụ thắng ở việc chiếm nhiều giờ nhất mới đáng đầu tư."], bullets: ["Content đa năng → ChatGPT","Code/docs dài → Claude","Research Google → Gemini"] },
    { h2: "Ma trận lựa chọn nhanh", paras: ["Đừng tìm “AI tốt nhất thế giới”. Tìm AI tốt nhất cho bottleneck của bạn. Nhiều người dùng 2 công cụ bổ sung."], cap: "Chọn stack đơn giản trước, mở rộng khi có nhu cầu." },
    { h2: "Kiểm tra gói trên sàn", paras: ["Đọc riêng/share, bảo hành, hạn mức. Hỏi shop nếu mô tả chưa rõ trước khi thanh toán."], bullets: ["So sánh 2–3 shop","Đọc đánh giá gần đây","Kiểm tra ngay sau nhận"] }
  ], IMG.data, { href: "tat-ca-san-pham.html", text: "Xem các tài khoản AI →" });

guide("huong-dan-mua-va-kich-hoat-tai-khoan-ai-tren-vuammo",
  "Hướng dẫn mua và kích hoạt tài khoản AI trên Vua MMO",
  "Từ chọn gói, thanh toán, nhận bàn giao đến kiểm tra bảo hành đúng quy trình sàn.",
  "hướng dẫn mua tài khoản AI, Vua MMO, kích hoạt tài khoản",
  IMG.ecommerce,"2026-08-30", [
    { h2: "Bước 1: Chọn đúng loại gói", paras: ["Đọc mô tả: riêng, share, nâng cấp chính chủ, thời hạn. Đây là nguyên nhân lớn nhất của hiểu nhầm sau mua."], bullets: ["Khớp nhu cầu dùng","Xem bảo hành","Ưu tiên shop uy tín"] },
    { h2: "Bước 2: Thanh toán trên sàn", paras: ["Không chuyển khoản ngoài. Giữ chứng từ đơn hàng để bảo vệ quyền lợi."], cap: "Giao dịch trong sàn giúp dễ bảo hành và xử lý sự cố." },
    { h2: "Bước 3: Nhận bàn giao & kiểm tra", paras: ["Làm theo hướng dẫn shop trên đơn. Đăng nhập/kiểm tra tính năng ngay trong thời gian giữ tiền. Có lỗi thì mở bảo hành đúng luồng."], bullets: ["Đổi mật khẩu nếu được phép","Bật 2FA khi phù hợp","Không chia sẻ lại trái phép"] }
  ], IMG.security, { href: "tat-ca-san-pham.html", text: "Tất cả sản phẩm →" });

const moreGuides = [
  ["huong-dan-midjourney-prompt-co-ban-cho-nguoi-moi","Hướng dẫn Midjourney: prompt cơ bản cho người mới","Cấu trúc prompt subject–style–lighting–camera để ra ảnh đẹp hơn từ sớm.","hướng dẫn Midjourney, prompt Midjourney cơ bản",IMG.palette,"2026-08-28",IMG.design],
  ["huong-dan-claude-viet-tai-lieu-ky-thuat","Hướng dẫn Claude: viết tài liệu kỹ thuật và PRD rõ ràng","Quy trình brief → dàn ý → bản đầy đủ → checklist review với Claude.","hướng dẫn Claude, viết PRD Claude, tài liệu kỹ thuật AI",IMG.code,"2026-08-26",IMG.write],
  ["huong-dan-gemini-nghien-cuu-va-tom-tat-tai-lieu","Hướng dẫn Gemini: nghiên cứu và tóm tắt tài liệu hiệu quả","Cách đưa nguồn, yêu cầu trích dẫn và biến research thành outline bài viết.","hướng dẫn Gemini, research Gemini, tóm tắt tài liệu AI",IMG.search,"2026-08-24",IMG.notebook],
  ["huong-dan-chatgpt-custom-gpt-cho-brand","Hướng dẫn tạo Custom GPT cho brand và đội sale","Thiết lập instructions, knowledge và câu hỏi gợi ý để team dùng thống nhất.","hướng dẫn Custom GPT, ChatGPT brand, GPT nội bộ",IMG.chatgpt,"2026-08-22",IMG.team],
  ["huong-dan-kling-ai-tao-clip-dau-tien","Hướng dẫn Kling AI: tạo clip video đầu tiên từ ý tưởng","Từ prompt cảnh, chọn tỷ lệ, xuất clip và mang vào CapCut hoàn thiện.","hướng dẫn Kling AI, tạo video Kling, AI video cơ bản",IMG.film,"2026-08-20",IMG.capcut],
  ["huong-dan-chatgpt-phan-tich-so-lieu-csv","Hướng dẫn ChatGPT phân tích số liệu CSV/bảng tính","Upload bảng, đặt câu hỏi đúng, yêu cầu biểu đồ/ý tưởng insight có kiểm chứng.","hướng dẫn ChatGPT Excel, phân tích CSV AI",IMG.data,"2026-08-18",IMG.laptop],
  ["huong-dan-canva-magic-studio-lam-anh-san-pham","Hướng dẫn Canva Magic Studio làm ảnh sản phẩm nhanh","Xóa nền, tạo biến thể và xuất bộ ảnh phục vụ ads/shop.","hướng dẫn Canva Magic Studio, ảnh sản phẩm AI",IMG.canva,"2026-08-16",IMG.ecommerce],
  ["huong-dan-capcut-chuyen-canh-va-am-thanh","Hướng dẫn CapCut: chuyển cảnh và âm thanh chuyên nghiệp hơn","Chọn transition vừa phải, sidechain nhạc-lời, tránh hiệu ứng rối.","hướng dẫn CapCut transition, âm thanh CapCut",IMG.video,"2026-08-14",IMG.music],
  ["huong-dan-viet-prompt-engineering-co-ban","Hướng dẫn prompt engineering cơ bản cho marketer","Vai trò, ngữ cảnh, ràng buộc, ví dụ mẫu — công thức dùng được cho mọi chatbot.","hướng dẫn prompt engineering, viết prompt AI",IMG.write,"2026-08-12",IMG.notebook],
  ["huong-dan-notion-ai-quan-ly-cong-viec-content","Hướng dẫn Notion AI quản lý lịch content và brief","Dựng database content, dùng AI tóm tắt brief và sinh checklist xuất bản.","hướng dẫn Notion AI, lịch content Notion",IMG.office,"2026-08-10",IMG.meeting],
  ["huong-dan-photoshop-generative-fill-co-ban","Hướng dẫn Photoshop Generative Fill cơ bản cho ads","Mở rộng nền, sửa chi tiết sản phẩm và xuất file phục vụ banner.","hướng dẫn Generative Fill, Photoshop AI ads",IMG.design,"2026-08-08",IMG.palette],
  ["huong-dan-vpn-khi-dung-cong-cu-ai-quoc-te","Hướng dẫn dùng VPN ổn định khi truy cập công cụ AI quốc tế","Chọn vị trí, kiểm tra DNS/leak cơ bản và thói quen bảo mật khi đăng nhập.","hướng dẫn VPN AI, VPN ChatGPT, bảo mật tài khoản",IMG.security,"2026-08-06",IMG.cloud],
  ["huong-dan-xuat-video-capcut-chat-luong-cao","Hướng dẫn xuất video CapCut chất lượng cao cho ads","Bitrate, frame rate, kiểm tra trên thiết bị thật trước khi lên chiến dịch.","hướng dẫn xuất CapCut, chất lượng video ads",IMG.capcut,"2026-08-04",IMG.camera],
  ["huong-dan-soan-kich-ban-reels-voi-ai","Hướng dẫn soạn kịch bản Reels với AI rồi dựng CapCut","Framework hook–demo–CTA, chuyển thành timeline và checklist đăng bài.","hướng dẫn kịch bản Reels, AI script TikTok",IMG.social,"2026-08-02",IMG.phone]
];

for(const g of moreGuides){
  const [slug,title,excerpt,keywords,image,date,extra] = g;
  guide(slug,title,excerpt,keywords,image,date,[
    { h2: "Chuẩn bị trước khi bắt đầu", paras: [
      "Xác định mục tiêu đầu ra (ảnh, video, bài viết, báo cáo), đối tượng và tiêu chí “đạt”. Chuẩn bị tài khoản đúng gói và ví dụ mẫu nếu có.",
      excerpt
    ], bullets: ["Mục tiêu đo được","Asset/brand sẵn","Thời gian block 30–60 phút"] },
    { h2: "Các bước thực hiện chính", paras: [
      "Làm lần lượt: brief → draft bằng AI → chỉnh tay → kiểm tra trên thiết bị thật. Đừng nhảy cóc sang xuất bản khi chưa có checklist chất lượng.",
      "Ghi lại thiết lập/prompt thành công để lần sau chỉ việc nhân bản."
    ], cap: "Thực hành có ghi chép giúp bạn tái lập kết quả tốt.", bullets: ["Một thay đổi mỗi vòng iterate","Lưu version","So sánh trước/sau"] },
    { h2: "Hoàn thiện và đo kết quả", paras: [
      "Xuất bản hoặc bàn giao, theo dõi metric liên quan (giữ chân, CTR, thời gian làm). Tối ưu lại brief dựa trên dữ liệu thật."
    ], bullets: ["CTA rõ","Internal link nếu là bài web","Backup file dự án"] }
  ], extra, { href: "tat-ca-san-pham.html", text: "Tìm công cụ phù hợp trên Vua MMO →" });
}

/* ===================== MẸO (20) ===================== */
function tip(slug,title,excerpt,keywords,image,date,tips,prompts,extraImg,cta){
  const sections = [
    { h2: "Vì sao mẹo này hữu ích?", paras: [excerpt, "Áp dụng đúng ngữ cảnh sẽ giảm thời gian làm việc lặp và tăng chất lượng đầu ra. Dưới đây là các tips cụ thể kèm ví dụ."], img: { src: image, alt: title, cap: "Mẹo thực chiến trong chuyên mục Mẹo — Vua MMO." } },
    { h2: "Các tips áp dụng ngay", paras: ["Ưu tiên làm lần lượt 2–3 tips thay vì áp dụng hết một lúc. Đo thời gian tiết kiệm được sau một tuần."], bullets: tips, img: { src: extraImg, alt: "Minh họa mẹo làm việc với AI và content", cap: "Tips ngắn nhưng cần kỷ luật thực hành mới có hiệu quả." } }
  ];
  if(prompts && prompts.length){
    sections.push({
      h2: "Prompt mẫu copy-paste",
      paras: ["Chỉnh phần trong ngoặc [ ] theo sản phẩm/ngành của bạn. Giữ ràng buộc độ dài và tone để output ổn định."],
      prompt: prompts.join("\n\n---\n\n")
    });
  }
  sections.push({
    h2: "Checklist chất lượng trước khi dùng",
    paras: ["Dù AI hỗ trợ, bạn vẫn chịu trách nhiệm nội dung cuối. Rà lại brand, số liệu và chính sách nền tảng."],
    bullets: ["Đúng sự thật sản phẩm","Không copy nguyên văn đối thủ","CTA khớp landing","Lưu bản đã duyệt"]
  });
  add("meo","Mẹo",{
    slug, title, excerpt, keywords, date, image, readTime: "11 phút đọc",
    lead: "Chuyên mục Mẹo trên Vua MMO tập trung tips tiện lợi, thủ thuật và prompt dùng ngay cho content, ads và vận hành tài khoản số.",
    sections,
    outro: "Giữ một file “prompt + tips” riêng cho team. Càng tái sử dụng, tốc độ ra việc càng tăng mà vẫn kiểm soát chất lượng.",
    cta, faq: [
      { q: "Prompt có dùng được cho mọi ngành?", a: "Khung dùng chung được; hãy thay pain, USP và từ ngữ ngành để tự nhiên hơn." },
      { q: "Làm sao tránh nội dung giống nhau?", a: "Thêm case thật, số liệu, ảnh riêng và viết lại mở/kết bằng giọng bạn." },
      { q: "Có cần Pro không?", a: "Nếu dùng hàng ngày hoặc cần hạn mức cao thì Pro/Plus thường đáng. Test vài ngày rồi quyết." }
    ]
  });
}

tip("meo-quang-cao-facebook-voi-ai-2026",
  "Mẹo quảng cáo Facebook 2026: dùng AI viết ad copy nhanh",
  "Kết hợp ChatGPT + CapCut để sản xuất creative và ad copy nhanh, vẫn kiểm soát chất lượng trước khi tốn ngân sách.",
  "mẹo quảng cáo Facebook, AI ad copy, tips Facebook Ads",
  IMG.marketing,"2026-09-05",
  ["Framework Hook–Pain–Solution–Proof–CTA","Sinh 5 hook rồi A/B","Video UGC dưới 30 giây","Landing khớp promise ad","Test ngân sách nhỏ trước scale"],
  ["Bạn là performance marketer. Viết 5 biến thể ad Facebook cho [SẢN PHẨM], đối tượng [AI ĐÓ], pain [VẤN ĐỀ], USP [ĐIỂM MẠNH]. Mỗi biến thể dưới 80 từ, có CTA rõ."],
  IMG.social, { href: "tat-ca-san-pham.html?cat=chatgpt", text: "ChatGPT cho viết ads →" });

tip("prompt-chatgpt-viet-content-quang-cao-ban-hang",
  "Prompt ChatGPT viết content quảng cáo bán hàng (copy dùng ngay)",
  "Bộ prompt ad copy, landing section và kịch bản video bán hàng — chỉnh theo ngành là chạy được.",
  "prompt ChatGPT quảng cáo, mẹo viết ads, tips prompt bán hàng",
  IMG.chatgpt,"2026-09-04",
  ["Một prompt = một mục tiêu","Ép độ dài và format","Yêu cầu 3 biến thể","Tự thêm social proof thật"],
  ["Viết 3 section landing: Pain, Giải pháp, CTA cho [SẢN PHẨM]. Giọng [TONE], mỗi section 60–90 từ.",
   "Viết kịch bản Reels 30 giây: cảnh 1 hook, cảnh 2 demo, cảnh 3 CTA. Không phóng đại."],
  IMG.write, { href: "tat-ca-san-pham.html?cat=chatgpt", text: "Mua ChatGPT Plus →" });

tip("meo-seo-noi-dung-voi-ai-khong-bi-trung-lap",
  "Mẹo SEO với AI: tránh bài trùng, vẫn giữ trải nghiệm đọc",
  "Dùng AI nghiên cứu và phác thảo nhưng thêm góc nhìn riêng, ảnh và internal link trước khi xuất bản.",
  "mẹo SEO AI, tips viết bài SEO ChatGPT, content chống trùng",
  IMG.search,"2026-09-03",
  ["AI dựng outline + FAQ","Tự thêm case/ảnh","Viết lại mở và kết","Internal link sản phẩm/bài","Kiểm tra ý định tìm kiếm"],
  ["Phân tích ý định từ khóa [KW]. Đề xuất dàn ý H2/H3, 5 câu hỏi FAQ, góc độc đáo người dùng quan tâm."],
  IMG.notebook, { href: "chia-se.html", text: "Xem thêm bài Chia sẻ →" });

tip("meo-mua-tai-khoan-ai-an-toan-tren-san",
  "Mẹo mua tài khoản AI an toàn trên sàn: checklist trước khi đặt",
  "Tips kiểm tra shop, mô tả gói và bảo hành để giảm rủi ro khi mua ChatGPT, CapCut, VPN…",
  "mẹo mua tài khoản AI, tips bảo hành Vua MMO, mua an toàn",
  IMG.security,"2026-09-02",
  ["Đọc loại gói riêng/share","Xem thời hạn bảo hành","Ưu tiên shop đánh giá tốt","Thanh toán trên sàn","Kiểm tra trong thời gian giữ tiền"],
  null, IMG.ecommerce, { href: "tat-ca-san-pham.html", text: "Mua trên Vua MMO →" });

tip("meo-prompt-capcut-script-video-ngan",
  "Mẹo prompt + CapCut: lên script video ngắn trong 5 phút",
  "ChatGPT viết hook, CapCut dựng nhanh — công thức ra Reels/TikTok đều đặn.",
  "mẹo CapCut, prompt video ngắn, tips content TikTok",
  IMG.capcut,"2026-09-01",
  ["7 hook dưới 12 từ","Chọn 1 hook mạnh","3 cảnh dựng","Caption lớn","Đăng đều 4–5 ngày/tuần"],
  ["Viết 7 hook mở đầu dưới 12 từ cho chủ đề [X], giọng tò mò, phù hợp TikTok."],
  IMG.phone, { href: "tat-ca-san-pham.html?cat=capcut", text: "CapCut Pro →" });

tip("bo-prompt-chatgpt-cho-dan-mmo-va-freelancer",
  "Bộ prompt ChatGPT cho dân MMO và freelancer (copy dùng ngay)",
  "Prompt báo giá, email CSKH, mô tả sản phẩm, lịch content — tiết kiệm thời gian mỗi ngày.",
  "prompt ChatGPT MMO, mẹo freelancer, tips bán hàng online",
  IMG.team,"2026-08-30",
  ["Tách prompt theo việc","Lưu bản hay vào Notion","Đồng bộ tone brand","Đo thời gian tiết kiệm"],
  ["Viết báo giá freelance cho dịch vụ [X], gồm phạm vi, thời gian, 3 gói giá, điều khoản thanh toán.",
   "Viết mô tả sản phẩm tài khoản [TÊN GÓI] 120–150 từ, lợi ích, lưu ý, CTA mua.",
   "Lên lịch 7 bài TikTok cho niche [Y], mỗi bài hook + ý chính + CTA."],
  IMG.write, { href: "tat-ca-san-pham.html?cat=chatgpt", text: "ChatGPT cho freelancer →" });

const moreTips = [
  ["meo-prompt-email-cskh-chuyen-nghiep","Mẹo prompt viết email CSKH chuyên nghiệp","Mẫu prompt xin lỗi, xác nhận đơn, upsell nhẹ — giữ quan hệ khách bền.","prompt email CSKH, mẹo chăm sóc khách AI",IMG.write,"2026-08-28",IMG.meeting,
    ["Phân loại intent khách trước khi trả lời","Giọng chân thành, không đổ lỗi","Đề xuất bước tiếp rõ","Lưu macro theo tình huống"],
    ["Soạn email xin lỗi vì chậm bàn giao [SẢN PHẨM], đề xuất bồi thường hợp lý, giọng chân thành, dưới 120 từ."]],
  ["meo-prompt-landing-page-chuyen-doi","Mẹo prompt dựng dàn ý landing page chuyển đổi","Cấu trúc above-the-fold, social proof, FAQ và CTA — sinh nhanh rồi chỉnh brand.","prompt landing page, mẹo chuyển đổi, tips copywriting AI",IMG.marketing,"2026-08-26",IMG.ecommerce,
    ["1 trang 1 mục tiêu","Headline Benefít rõ","Social proof thật","FAQ xử lý objection"],
    ["Dựng dàn ý landing bán [SẢN PHẨM] gồm: headline, 3 lợi ích, demo, testimonials, FAQ, CTA. Giọng [TONE]."]],
  ["meo-tiet-kiem-credit-ai-video-va-image","Mẹo tiết kiệm credit AI video và image","Giảm cháy hạn mức: lên ý trước, prompt chặt, tái sử dụng seed/style.","mẹo tiết kiệm credit AI, tips Runway Kling Midjourney",IMG.film,"2026-08-24",IMG.data,
    ["Brainstorm text trước khi generate","1 biến thể/lần chỉnh","Lưu prompt thắng","Dùng AI cho B-roll, quay thật phần trust"], null],
  ["meo-ab-test-creative-voi-ai","Mẹo A/B test creative với AI mà không loạn","Sinh biến thể có kiểm soát: chỉ đổi 1 yếu tố mỗi test để đọc ra học được gì.","mẹo A/B test ads, tips creative AI",IMG.social,"2026-08-22",IMG.marketing,
    ["Đổi hook hoặc visual, không đổi cả hai","Chạy đủ dữ liệu","Kill sớm variant yếu","Ghi nhật ký học được"],
    ["Từ ad gốc sau, tạo 3 biến thể chỉ khác hook, giữ nguyên offer và CTA: [DÁN AD GỐC]"]],
  ["meo-prompt-youtube-script-10-phut","Mẹo prompt viết script YouTube 10 phút","Outline mở–thân–CTA giữa–outro giúp giữ retention khi dùng AI.","prompt script YouTube, mẹo content dài",IMG.camera,"2026-08-20",IMG.write,
    ["Hook 15 giây đầu","Chia chương rõ","CTA giữa video","Outro + end screen"],
    ["Viết outline video YouTube 10 phút về [CHỦ ĐỀ], có hook, 4 chương, CTA phút 4 và 8, outro."]],
  ["meo-to-chuc-chat-va-thu-vien-prompt","Mẹo tổ chức chat và thư viện prompt gọn","Đặt tên chat, tag, và file prompt trung tâm để team không mất bản tốt.","mẹo tổ chức ChatGPT, thư viện prompt, tips productivity AI",IMG.notebook,"2026-08-18",IMG.office,
    ["Quy ước đặt tên","Folder theo kênh","Review prompt tháng 1 lần","Xóa chat rác định kỳ"], null],
  ["meo-prompt-mo-ta-san-pham-san-so","Mẹo prompt mô tả sản phẩm trên sàn số","Viết mô tả rõ loại gói, bảo hành, lưu ý dùng — giảm dispute.","prompt mô tả sản phẩm, mẹo bán tài khoản AI",IMG.ecommerce,"2026-08-16",IMG.security,
    ["Nêu đúng riêng/share","Bảo hành bao nhiêu ngày","Hướng dẫn nhận hàng","Không overclaim"],
    ["Viết mô tả sản phẩm [TÊN] gồm: đối tượng phù hợp, quyền lợi, cách nhận, bảo hành, lưu ý. 140–180 từ, trung thực."]],
  ["meo-tao-thumbnail-bang-ai","Mẹo tạo thumbnail bằng AI thu hút click","Công thức mặt/chữ lớn/tương phản + kiểm tra size nhỏ trên mobile.","mẹo thumbnail AI, tips click YouTube TikTok",IMG.palette,"2026-08-14",IMG.design,
    ["Chữ ≤ 4 từ","Tương phản mạnh","Tránh rối chi tiết","Test nhìn ở size nhỏ"],
    ["Đề xuất 5 ý tưởng thumbnail cho video [TIÊU ĐỀ], mô tả bố cục, chữ lớn, cảm xúc."]],
  ["meo-xu-ly-khach-kho-bang-ai","Mẹo xử lý khách khó bằng AI (vẫn giữ người duyệt)","AI soạn draft, bạn chỉnh đồng cảm và chính sách — giảm stress CSKH.","mẹo CSKH AI, tips trả lời khách khó",IMG.meeting,"2026-08-12",IMG.write,
    ["Không gửi draft thô","Giữ chính sách shop","Đề xuất phương án 2 lựa chọn","Escalation khi cần"],
    ["Khách phàn nàn: [DÁN TIN NHẮN]. Soạn 2 phương án trả lời: trấn an + giải pháp; giữ lịch sự, không nhận sai nếu chưa rõ."]],
  ["meo-batch-content-mot-buoi-mot-tuan","Mẹo batch content: một buổi làm cả tuần","Gom research–viết–thiết kế–edit thành block tập trung, AI hỗ trợ từng khâu.","mẹo batch content, tips lịch đăng bài, năng suất content",IMG.team,"2026-08-10",IMG.social,
    ["Block 2–3 giờ không distrac","AI outline hàng loạt","Canva/CapCut theo lô","Lên lịch sẵn"], null],
  ["meo-prompt-phan-tich-doi-thu","Mẹo prompt phân tích competitor content","Bóc tách hook, offer, CTA đối thủ để lấy cảm hứng — không sao chép.","prompt phân tích đối thủ, mẹo competitive analysis",IMG.data,"2026-08-08",IMG.marketing,
    ["Thu thập 5–10 mẫu","Tách pattern","Tạo biến thể khác biệt","Giữ USP riêng"],
    ["Phân tích các ad/content sau, chỉ ra hook, pain, offer, CTA, điểm yếu. Đề xuất hướng khác biệt cho brand [TÊN]: [DÁN MẪU]"]],
  ["meo-dung-claude-projects-cho-doi-nhom","Mẹo dùng Claude Projects cho đội nhóm","Nhồi brand guide và mẫu văn bản để output đồng bộ giữa nhiều người.","mẹo Claude Projects, tips team AI",IMG.code,"2026-08-06",IMG.team,
    ["Upload guideline","Đặt rules ngắn","Phân quyền rõ","Review định kỳ knowledge"], null],
  ["meo-prompt-bao-cao-tuan-marketing","Mẹo prompt viết báo cáo tuần marketing","Từ số liệu thô thành insight + đề xuất tuần sau trong 10 phút.","prompt báo cáo marketing, mẹo báo cáo tuần AI",IMG.marketing,"2026-08-04",IMG.data,
    ["Dán số liệu có cấu trúc","Ép format mục","Phân biệt fact vs suy luận","Thêm đề xuất hành động"],
    ["Từ số liệu sau, viết báo cáo tuần: tóm tắt, cái làm tốt, vấn đề, 3 đề xuất tuần sau. Giọng chuyên nghiệp. Dán số liệu vào cuối prompt."]],
  ["meo-tranh-hallucination-khi-dung-ai","Mẹo tránh hallucination khi dùng AI cho nội dung","Ép trích nguồn, tách phần chắc/không chắc, và luôn verify số liệu nhạy cảm.","mẹo tránh hallucination, tips kiểm chứng AI",IMG.security,"2026-08-02",IMG.notebook,
    ["Yêu cầu nêu giả định","Cấm bịa số","Verify YMYL","Dùng AI brainstorm, người chốt fact"],
    ["Trả lời câu hỏi [X]. Tách rõ: (1) thông tin chắc từ giả định tôi cung cấp, (2) phần suy đoán, (3) cần tôi bổ sung gì. Không bịa số liệu."]]
];

for(const t of moreTips){
  const [slug,title,excerpt,keywords,image,date,extra,tipsArr,promptsArr] = t;
  tip(slug,title,excerpt,keywords,image,date,tipsArr,promptsArr,extra,{ href: "tat-ca-san-pham.html", text: "Khám phá công cụ trên Vua MMO →" });
}

/* ========== emit file ========== */
function escTitle(s){ return String(s).replace(/&/g,"&amp;"); }

const posts = RAW.map((p, idx) => {
  const body = buildBody(p);
  return {
    id: idx + 1,
    slug: p.slug,
    title: escTitle(p.title),
    excerpt: p.excerpt,
    cat: p.cat,
    catLabel: p.catLabel,
    date: p.date,
    dateLabel: dateLabel(p.date),
    readTime: p.readTime || "10 phút đọc",
    image: p.image,
    keywords: p.keywords,
    body
  };
});

// sort by date desc
posts.sort((a,b) => b.date.localeCompare(a.date));
posts.forEach((p,i) => p.id = i + 1);

const byCat = {};
for(const p of posts) byCat[p.cat] = (byCat[p.cat]||0)+1;
console.log("Counts:", byCat, "total", posts.length);
if(byCat["tin-tuc-ai"] !== 20 || byCat["huong-dan"] !== 20 || byCat.meo !== 20){
  console.error("Expected 20 per category");
  process.exit(1);
}

function serializePost(p){
  return `  {
    id: ${p.id},
    slug: ${JSON.stringify(p.slug)},
    title: ${JSON.stringify(p.title)},
    excerpt: ${JSON.stringify(p.excerpt)},
    cat: ${JSON.stringify(p.cat)},
    catLabel: ${JSON.stringify(p.catLabel)},
    date: ${JSON.stringify(p.date)},
    dateLabel: ${JSON.stringify(p.dateLabel)},
    readTime: ${JSON.stringify(p.readTime)},
    image: ${JSON.stringify(p.image)},
    keywords: ${JSON.stringify(p.keywords)},
    body: ${JSON.stringify(p.body)}
  }`;
}

const header = `/* Chia sẻ — blog data + SEO helpers (generated) */
function postSlugify(str){
  return String(str || "").normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").replace(/đ/gi,"d")
    .toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
}

const SHARE_CATS = [
  {slug:"all", title:"Tất cả"},
  {slug:"tin-tuc-ai", title:"Tin tức AI"},
  {slug:"huong-dan", title:"Hướng dẫn"},
  {slug:"meo", title:"Mẹo"}
];

const SHARE_POSTS = [
`;

const footer = `
];

function sharePostBySlug(slug){
  if(!slug) return null;
  return SHARE_POSTS.find(p => p.slug === slug) || null;
}

function sharePostHref(p){
  const file = \`\${p.slug}.html\`;
  try {
    if(typeof location !== "undefined" && /\\/vi\\/chia-se\\//i.test(location.pathname + location.href)){
      return file;
    }
  } catch(_){}
  return \`vi/chia-se/\${file}\`;
}

function shareSeoPath(p){
  return \`/vi/chia-se/\${p.slug}\`;
}

function sharePostsByCat(catSlug){
  if(!catSlug || catSlug === "all") return SHARE_POSTS.slice();
  return SHARE_POSTS.filter(p => p.cat === catSlug);
}
`;

const out = header + posts.map(serializePost).join(",\n") + footer;
fs.writeFileSync(path.join(root, "js", "chia-se-data.js"), out, "utf8");
console.log("Wrote js/chia-se-data.js", (out.length/1024).toFixed(1), "KB");
