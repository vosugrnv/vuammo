/* Blog legacy — chuyển sang trang Chia sẻ */
const BLOG_FEATURED = SHARE_POSTS[0];
const BLOG_POSTS = SHARE_POSTS.slice(1);

function escapeAttr(s){ return String(s).replace(/"/g,"&quot;"); }

const feat = document.getElementById("blogFeatCard");
if(feat && BLOG_FEATURED){
  const href = sharePostHref(BLOG_FEATURED);
  feat.innerHTML = `
    <a href="${href}"><img src="${BLOG_FEATURED.image}" alt="${escapeAttr(BLOG_FEATURED.title)}"></a>
    <div>
      <span class="blog-feat-tag">${BLOG_FEATURED.catLabel}</span>
      <h2><a href="${href}">${BLOG_FEATURED.title}</a></h2>
      <p>${BLOG_FEATURED.excerpt}</p>
      <div class="blog-meta">${BLOG_FEATURED.dateLabel} · ${BLOG_FEATURED.readTime}</div>
    </div>`;
}

const grid = document.getElementById("blogGrid");
if(grid){
  grid.innerHTML = BLOG_POSTS.map(p => {
    const href = sharePostHref(p);
    return `
    <article class="blog-card">
      <a href="${href}"><img src="${p.image}" alt="${escapeAttr(p.title)}" loading="lazy"></a>
      <div class="blog-card-body">
        <span class="blog-tag">${p.catLabel}</span>
        <h3><a href="${href}">${p.title}</a></h3>
        <div class="blog-meta">${p.dateLabel} · ${p.readTime}</div>
      </div>
    </article>`;
  }).join("");
}
