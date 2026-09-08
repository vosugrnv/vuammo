/* Chia sẻ — listing page */
(function(){
  function boot(){
  const params = new URLSearchParams(location.search);
  let activeCat = params.get("cat") || "all";
  if(!SHARE_CATS.find(c => c.slug === activeCat)) activeCat = "all";
  let page = 1;
  const PAGE_SIZE = 6;

  function esc(s){
    return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  function renderCats(){
    const el = document.getElementById("shareCatFilters");
    if(!el) return;
    el.innerHTML = SHARE_CATS.map(c => {
      const count = c.slug === "all" ? SHARE_POSTS.length : sharePostsByCat(c.slug).length;
      const active = c.slug === activeCat ? " is-active" : "";
      const href = c.slug === "all" ? "chia-se.html" : `chia-se.html?cat=${c.slug}`;
      return `<a class="share-cat-chip${active}" href="${href}">${esc(c.title)} <span>(${count})</span></a>`;
    }).join("");
  }

  function renderList(){
    const posts = sharePostsByCat(activeCat);
    const totalPages = Math.max(1, Math.ceil(posts.length / PAGE_SIZE));
    if(page > totalPages) page = totalPages;
    const slice = posts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const feat = posts[0];
    const featEl = document.getElementById("shareFeatured");
    if(featEl && feat && page === 1 && activeCat){
      const href = sharePostHref(feat);
      featEl.innerHTML = `
        <a class="share-feat-media" href="${href}"><img src="${esc(feat.image)}" alt="${esc(feat.title)}" width="640" height="400" loading="eager"></a>
        <div class="share-feat-body">
          <span class="blog-feat-tag">${esc(feat.catLabel)}</span>
          <h2><a href="${href}">${esc(feat.title)}</a></h2>
          <p>${esc(feat.excerpt)}</p>
          <div class="blog-meta">${esc(feat.dateLabel)} · ${esc(feat.readTime)}</div>
          <a class="btn btn-primary share-feat-cta" href="${href}">Đọc bài viết</a>
        </div>`;
      featEl.hidden = false;
    } else if(featEl){
      featEl.hidden = true;
    }

    const gridPosts = (page === 1 && feat) ? slice.filter(p => p.id !== feat.id) : slice;
    /* On page 1 show featured separately + rest of first page excluding featured if it was in slice */
    let list = slice;
    if(page === 1 && feat){
      list = posts.slice(1, PAGE_SIZE);
    }

    document.getElementById("shareGrid").innerHTML = list.map(p => {
      const href = sharePostHref(p);
      return `
        <article class="blog-card share-card">
          <a href="${href}"><img src="${esc(p.image)}" alt="${esc(p.title)}" width="400" height="250" loading="lazy"></a>
          <div class="blog-card-body">
            <span class="blog-tag">${esc(p.catLabel)}</span>
            <h3><a href="${href}">${esc(p.title)}</a></h3>
            <p class="share-card-excerpt">${esc(p.excerpt)}</p>
            <div class="blog-meta">${esc(p.dateLabel)} · ${esc(p.readTime)}</div>
          </div>
        </article>`;
    }).join("") || `<p class="share-empty">Chưa có bài trong chuyên mục này.</p>`;

    document.getElementById("shareResultCount").textContent =
      `${posts.length} bài viết` + (activeCat !== "all" ? ` · ${SHARE_CATS.find(c=>c.slug===activeCat)?.title || ""}` : "");

    const pag = document.getElementById("sharePagination");
    let html = "";
    if(totalPages > 1){
      html += `<button type="button" ${page<=1?"disabled":""} data-page="${page-1}">‹</button>`;
      for(let i=1;i<=totalPages;i++){
        html += `<button type="button" class="${i===page?"active":""}" data-page="${i}">${i}</button>`;
      }
      html += `<button type="button" ${page>=totalPages?"disabled":""} data-page="${page+1}">›</button>`;
    }
    pag.innerHTML = html;
    pag.querySelectorAll("button[data-page]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const p = parseInt(btn.dataset.page,10);
        if(!p || p===page) return;
        page = p;
        renderList();
        document.getElementById("shareMain")?.scrollIntoView({behavior:"smooth", block:"start"});
      });
    });

    /* Sidebar recent */
    const side = document.getElementById("shareSidePosts");
    if(side){
      side.innerHTML = SHARE_POSTS.slice(0, 5).map(p =>
        `<li><a href="${sharePostHref(p)}">${esc(p.title)}</a><span class="sb-post-date">${esc(p.dateLabel)}</span></li>`
      ).join("");
    }
    const sideCats = document.getElementById("shareSideCats");
    if(sideCats){
      sideCats.innerHTML = SHARE_CATS.filter(c=>c.slug!=="all").map(c =>
        `<li><a href="chia-se.html?cat=${c.slug}">${esc(c.title)}</a></li>`
      ).join("");
    }
  }

  renderCats();
  renderList();
  }

  const ready = window.VuammoBlogReady;
  if (ready && typeof ready.then === "function") ready.then(boot).catch(boot);
  else boot();
})();
