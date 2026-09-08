/* Gán nhãn danh mục từ CSV + suy luận brand khi SP chỉ có parent “Tài khoản”. */
const GENERIC_CAT = /^(tài khoản|sản phẩm bán chạy|sản phẩm|uncategorized|chưa phân loại|khác)$/i;

/** Brand suy từ tên — ưu tiên khớp dài / rõ ràng trước. */
const BRAND_NAME_RULES = [
  { title: "Tiktok", re: /tik\s*tok/i, serviceTitle: "Dịch Vụ Tiktok" },
  { title: "INSTAGRAM", re: /insta\s*gram|\binsta\b/i, serviceTitle: "Dịch Vụ Instagram" },
  { title: "Facebook", re: /face\s*book|\bfb\b/i, serviceTitle: "Dịch Vụ Facebook" },
  { title: "Youtube", re: /you\s*tube/i, serviceTitle: "Dịch Vụ Youtube" },
  { title: "TWITTER", re: /twitter|\bx\s*\(/i, serviceTitle: "Dịch Vụ Twitter" },
  { title: "Telegram", re: /telegram/i, serviceTitle: "Dịch vụ Telegram" },
  { title: "THREADS", re: /\bthreads\b/i },
  { title: "ChatGPT", re: /chat\s*gpt|openai/i },
  { title: "Claude", re: /\bclaude\b/i },
  { title: "Gemini", re: /\bgemini\b/i },
  { title: "Grok", re: /\bgrok\b/i },
  { title: "Monica", re: /\bmonica\b/i },
  { title: "Manus AI", re: /\bmanus\b/i },
  { title: "POE Premium", re: /\bpoe\b/i },
  { title: "Perplexity", re: /perplexity/i },
  { title: "Midjourney", re: /mid\s*journey/i },
  { title: "Cursor", re: /\bcursor\b/i },
  { title: "Copilot", re: /\bcopilot\b/i },
  { title: "Heygen", re: /hey\s*gen/i },
  { title: "Elevenlabs", re: /eleven\s*labs/i },
  { title: "Capcut", re: /cap\s*cut/i },
  { title: "Canva", re: /\bcanva\b/i },
  { title: "Adobe", re: /\badobe\b|photoshop|premiere/i },
  { title: "Figma", re: /\bfigma\b/i },
  { title: "Netflix", re: /netflix/i },
  { title: "Spotify", re: /spotify/i },
  { title: "iQIYI", re: /iqiyi|i\s*qiyi/i },
  { title: "FPT Play", re: /fpt\s*play/i },
  { title: "Galaxy Play", re: /galaxy\s*play/i },
  { title: "Vieon", re: /\bvieon\b/i },
  { title: "Wink", re: /\bwink\b/i },
  { title: "Youku", re: /\byouku\b/i },
  { title: "ExpressVPN", re: /express\s*vpn/i },
  { title: "Nord VPN", re: /nord\s*vpn|nordvpn/i },
  { title: "Surfshark", re: /surfshark/i },
  { title: "Steam", re: /\bsteam\b/i },
  { title: "Duolingo", re: /duolingo/i },
  { title: "Elsa Speak", re: /\belsa\b/i },
  { title: "Notion", re: /\bnotion\b/i },
  { title: "Locket", re: /\blocket\b/i },
  { title: "PicsArt", re: /pics\s*art/i },
  { title: "DeepL", re: /\bdeepl\b/i },
  { title: "Quillbot", re: /quill\s*bot/i },
  { title: "Ideogram AI", re: /ideogram/i },
  { title: "Shakker AI", re: /shakker/i },
  { title: "Magnific AI", re: /magnific/i },
  { title: "Zoom", re: /\bzoom\b/i },
  { title: "Google Drive", re: /google\s*drive|\bgg\s*drive\b/i },
  { title: "Tradingview", re: /trading\s*view/i },
  { title: "Turnitin", re: /turnitin/i },
  { title: "grammarly", re: /grammarly/i },
  { title: "Nitro Discord", re: /discord|nitro/i },
  { title: "Meitu", re: /\bmeitu\b/i },
  { title: "Vbee", re: /\bvbee\b/i },
  { title: "Runway", re: /\brunway\b/i },
  { title: "Kling AI", re: /\bkling\b/i },
  { title: "Hailou", re: /hailou|hailuo/i },
  { title: "Leonardo AI", re: /leonardo/i },
  { title: "Suno", re: /\bsuno\b/i },
  { title: "Gamma Pro", re: /\bgamma\b/i }
];

function isServiceName(name){
  return /dịch\s*vụ|nuôi\s*kênh|tăng\s*(view|follow|like|tương tác)|seeding|buff\b/i.test(name)
    && !/tài\s*khoản|\bacc\b|\bnick\b/i.test(name);
}

function inferBrandFromName(name){
  const n = String(name || "");
  if(/khóa\s*học|khoá\s*học/i.test(n)) return "Khoá học";
  for(const rule of BRAND_NAME_RULES){
    if(!rule.re.test(n)) continue;
    if(rule.serviceTitle && isServiceName(n)) return rule.serviceTitle;
    return rule.title;
  }
  return null;
}

/**
 * Nhãn leaf dùng để lọc listing.
 * - Có leaf CSV → dùng leaf (đổi “Khác” → “Tài Khoản Khác”)
 * - Chỉ parent “Tài khoản” → suy brand từ tên, không được thì “Tài Khoản Khác”
 */
function productTypeLabels(p){
  const raw = (p.cats || [])
    .map(c => String(c).trim())
    .filter(c => c && !GENERIC_CAT.test(c));

  if(raw.length){
    return raw.map(l => /^khác$/i.test(l) ? "Tài Khoản Khác" : l);
  }

  const inferred = inferBrandFromName(p.name);
  return [inferred || "Tài Khoản Khác"];
}

const CHILD_SLUG_ALIASES = {
  "game::game": "tai-khoan-game",
  "khoa-hoc::khoa-hoc": "khoa-hoc-tong-hop"
};

function leafSlug(parentSlug, title, preferredSlug){
  let slug = preferredSlug || (typeof slugify === "function" ? slugify(title) : String(title).toLowerCase().replace(/\s+/g, "-"));
  const alias = CHILD_SLUG_ALIASES[parentSlug + "::" + slug];
  if(alias) return alias;
  if(slug === parentSlug) return slug + "-con";
  return slug;
}

/**
 * Cha + con theo taxonomy SEO (3 danh mục cha).
 * @returns {{ parent:{slug,title}, child:{slug,title}, labels:string[] }}
 */
function resolveProductCategory(p){
  const labels = typeof productTypeLabels === "function" ? productTypeLabels(p) : [];
  const tax = (typeof CATEGORY_TAXONOMY !== "undefined" && CATEGORY_TAXONOMY.parents) || [];
  const fallbackParent = tax[0] || {
    slug: "tai-khoan-cong-cu-ai",
    title: "Tài khoản & Công cụ AI"
  };

  for(const label of labels){
    const key = String(label).toLowerCase();
    for(const parent of tax){
      for(const child of parent.children || []){
        if(String(child.title).toLowerCase() !== key) continue;
        return {
          parent: { slug: parent.slug, title: parent.title },
          child: {
            slug: leafSlug(parent.slug, child.title, child.slug),
            title: label
          },
          labels
        };
      }
    }
  }

  const leafTitle = labels[0] || "Tài Khoản Khác";
  return {
    parent: { slug: fallbackParent.slug, title: fallbackParent.title },
    child: {
      slug: leafSlug(fallbackParent.slug, leafTitle),
      title: leafTitle
    },
    labels
  };
}
