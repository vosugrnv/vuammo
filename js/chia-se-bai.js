/* Chia sẻ — article detail */
(function(){
  function esc(s){
    return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  function resolvePost(){
    const params = new URLSearchParams(location.search);
    if(params.get("slug")) return sharePostBySlug(params.get("slug"));
    const m = location.pathname.match(/\/vi\/chia-se\/([^/]+?)(?:\.html)?\/?$/i);
    if(m){
      const raw = decodeURIComponent(m[1]).replace(/\.html$/i,"");
      return sharePostBySlug(raw);
    }
    return SHARE_POSTS[0];
  }

  function renderArticle(){
  const post = resolvePost() || SHARE_POSTS[0];
  if(!post) return;
  const seoPath = post.canonicalPath || shareSeoPath(post);

  document.title = (post.metaTitle || post.title) + " | Chia sẻ Vua MMO";
  const setMeta = (attr, key, content) => {
    let el = document.querySelector(`meta[${attr}="${key}"]`);
    if(!el){
      el = document.createElement("meta");
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute("content", content || "");
  };
  const desc = post.metaDescription || post.excerpt || "";
  setMeta("name", "description", desc);
  setMeta("name", "keywords", post.keywords || "");
  setMeta("property", "og:title", post.metaTitle || post.title);
  setMeta("property", "og:description", desc);
  setMeta("property", "og:type", "article");
  setMeta("property", "og:image", post.ogImage || post.image || "");
  let canon = document.querySelector('link[rel="canonical"]');
  if(!canon){
    canon = document.createElement("link");
    canon.rel = "canonical";
    document.head.appendChild(canon);
  }
  try { canon.href = new URL(seoPath, location.origin).href; }
  catch { canon.href = seoPath; }

  if(location.protocol.startsWith("http") && !/\/vi\/chia-se\//i.test(location.pathname)){
    try { history.replaceState(null, "", seoPath); } catch(_){}
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: desc,
    image: [post.ogImage || post.image].filter(Boolean),
    datePublished: post.date,
    dateModified: post.date,
    author: {"@type":"Organization", name:"Vua MMO"},
    publisher: {
      "@type":"Organization",
      name:"Vua MMO",
      logo: {"@type":"ImageObject", url: "https://vuammo.com/images/logo-vuammo.png"}
    },
    mainEntityOfPage: seoPath
  };
  let ld = document.getElementById("articleJsonLd");
  if(!ld){
    ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.id = "articleJsonLd";
    document.head.appendChild(ld);
  }
  ld.textContent = JSON.stringify(jsonLd);

  document.getElementById("articleBreadcrumb").innerHTML =
    `<a href="index.html">Trang chủ</a><span class="sep">›</span>` +
    `<a href="chia-se.html">Chia sẻ</a><span class="sep">›</span>` +
    `<span class="current">${esc(post.title)}</span>`;

  document.getElementById("articleCat").textContent = post.catLabel;
  document.getElementById("articleTitle").textContent = post.title;
  document.getElementById("articleMeta").textContent = `${post.dateLabel} · ${post.readTime}`;
  document.getElementById("articleCover").src = post.image;
  document.getElementById("articleCover").alt = post.title;
  document.getElementById("articleBody").innerHTML = post.body;

  const related = SHARE_POSTS.filter(p => p.id !== post.id && p.cat === post.cat).slice(0, 3);
  const relatedFallback = related.length ? related : SHARE_POSTS.filter(p => p.id !== post.id).slice(0, 3);
  document.getElementById("articleRelated").innerHTML = relatedFallback.map(p => `
    <article class="blog-card share-card">
      <a href="${sharePostHref(p)}"><img src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy"></a>
      <div class="blog-card-body">
        <span class="blog-tag">${esc(p.catLabel)}</span>
        <h3><a href="${sharePostHref(p)}">${esc(p.title)}</a></h3>
        <div class="blog-meta">${esc(p.dateLabel)}</div>
      </div>
    </article>`).join("");

  const side = document.getElementById("shareSidePosts");
  if(side){
    side.innerHTML = SHARE_POSTS.filter(p => p.id !== post.id).slice(0, 5).map(p =>
      `<li><a href="${sharePostHref(p)}">${esc(p.title)}</a><span class="sb-post-date">${esc(p.dateLabel)}</span></li>`
    ).join("");
  }
  }

  const ready = window.VuammoBlogReady;
  if (ready && typeof ready.then === "function") ready.then(renderArticle).catch(renderArticle);
  else renderArticle();
})();
