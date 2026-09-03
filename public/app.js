const categoryLabels = {
  school: "مکتب خانه",
  review: "نقد",
  frames: "قاب‌های به یاد ماندنی",
  introduction: "معرفی فیلم",
  meetings: "جلسات و نشست های عمومی",
  gallery: "گالری",
  filmmakers: "فیلمسازان برتر",
};

const categorySlugs = {
  "مکتب-خانه": "school",
  "نقد": "review",
  "قاب-های-به-یاد-ماندنی": "frames",
  "معرفی-فیلم": "introduction",
  "جلسات-و-نشست-های-عمومی": "meetings",
  "گالری": "gallery",
  "فیلمسازان-برتر": "filmmakers",
};

const authorRoutes = {
  lrageTUqBgc: "علیرضا حبیب زاده",
  N9HDt4eq1II: "سروش شهبازی",
  "-LTsnNt0RVE": "Ha di!",
  "7xABrqRo-90": "آقای طاهری",
  "mohammad-abbasi": "محمّد عبّاسی",
};

const homepageOrder = [8, 6, 5, 46, 40, 38, 49, 7, 50, 52];

const archiveTokens = {
  "1397/1": ["۹۷/۰۱", "فروردین ۹۷"],
  "1396/8": ["۹۶/۰۸", "آبان ۹۶"],
  "1395/10": ["۹۵/۱۰", "دی ۹۵"],
  "1395/9": ["۹۵/۰۹", "آذر ۹۵"],
  "1395/8": ["۹۵/۰۸", "آبان ۹۵"],
  "1395/6": ["۹۵/۰۶", "شهریور ۹۵"],
  "1395/5": ["۹۵/۰۵", "مرداد ۹۵"],
};

const content = document.querySelector("#content");
const searchForm = document.querySelector("#search-form");
const searchInput = document.querySelector("#search");
let posts = [];

function plainText(html = "") {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function unavailableImageOnly(post) {
  return plainText(post.bodyHtml).length === 0 && post.images.length > 0 && post.images.every((image) => !image.localSrc);
}

function postUrl(post) {
  const suffix = post.archiveUrl.match(/\/post\/\d+\/(.*)$/)?.[1]?.replace(/[?#].*$/, "") || "";
  return `/post/${post.id}/${suffix}`;
}

function postAuthor(post) {
  return post.author || "";
}

function homepagePosts(items) {
  const byId = new Map(items.map((post) => [post.id, post]));
  const featured = homepageOrder.map((id) => byId.get(id)).filter(Boolean);
  const featuredIds = new Set(homepageOrder);
  return [...featured, ...items.filter((post) => !featuredIds.has(post.id))];
}

function postDate(post) {
  return post.detail.match(/[۰-۹]{2}\/[۰-۹]{2}\/[۰-۹]{2}/)?.[0]
    || post.detail.match(/[۰-۹]{2}\s+(?:فروردین|مرداد|شهریور|آبان|آذر|دی)\s+[۰-۹]{2}(?:\s*،\s*[۰-۹:]+)?/)?.[0]
    || "";
}

function commentCount(post) {
  return post.detail.match(/([۰-۹]+)\s*نظر/)?.[1] || "۰";
}

function prepareBody(post, full) {
  const wrapper = document.createElement("div");
  const safeHtml = post.bodyHtml.replace(/\s(src|srcset)=("|')([^"']*bayanbox\.ir[^"']*)\2/gi, (all, attribute, quote, url) => (
    ` data-unavailable-${attribute.toLowerCase()}=${quote}${url}${quote}`
  ));
  wrapper.innerHTML = safeHtml;
  wrapper.querySelectorAll("script, form, iframe, object, embed").forEach((node) => node.remove());
  wrapper.querySelectorAll("img").forEach((image) => {
    const source = image.getAttribute("src") || "";
    if (!source.startsWith("/assets/") && !source.startsWith("/theme/")) {
      const parent = image.parentElement;
      image.remove();
      if (parent?.tagName === "A" && !parent.textContent.trim() && !parent.querySelector("img")) parent.remove();
      return;
    }
    image.removeAttribute("width");
    image.removeAttribute("height");
    image.loading = "lazy";
  });
  wrapper.querySelectorAll("a").forEach((anchor) => {
    if (/\b(?:web\.archive\.org|bayanbox\.ir)\b/i.test(anchor.href) && /\.pdf(?:$|[?#])/i.test(anchor.href)) {
      const unavailable = document.createElement("span");
      unavailable.className = "unavailable-file";
      unavailable.textContent = "فایل در دسترس نیست.";
      anchor.replaceWith(unavailable);
      return;
    }
    if (anchor.href.startsWith(location.origin)) anchor.dataset.route = "";
    else { anchor.target = "_blank"; anchor.rel = "noopener"; }
  });

  if (!full && plainText(post.bodyHtml).length > 500) {
    const firstImage = wrapper.querySelector("img");
    wrapper.replaceChildren();
    if (firstImage) {
      const link = document.createElement("a");
      link.href = postUrl(post);
      link.dataset.route = "";
      link.append(firstImage);
      const paragraph = document.createElement("p");
      paragraph.append(link);
      wrapper.append(paragraph);
    }
    const more = document.createElement("div");
    more.className = "readmore";
    more.innerHTML = `<a href="${postUrl(post)}" data-route>ادامه مطلب...</a>`;
    wrapper.append(more);
  }
  return wrapper.innerHTML;
}

function renderPost(post, full = false) {
  const article = document.createElement("article");
  article.className = "post";
  article.innerHTML = `
    <div class="title align"><h2><a href="${postUrl(post)}" data-route>${post.title}</a></h2></div>
    <div class="body align"><div class="cnt${full ? "" : " post_list"}">${prepareBody(post, full)}</div></div>
    <div class="post_detail"><div class="cnt">
      <div class="det_left">
        <span class="inline"><span class="cmt">${commentCount(post)}&nbsp;نظر</span></span>
        <span class="inline"><span class="date">${postDate(post)}</span></span>
      </div>
      <div class="det_right"><span class="author2">${postAuthor(post)}</span></div>
    </div></div>`;
  article.querySelectorAll("img").forEach((image) => {
    image.addEventListener("error", () => {
      const parent = image.parentElement;
      image.remove();
      if (parent?.tagName === "A" && !parent.textContent.trim() && !parent.querySelector("img")) parent.remove();
    }, { once: true });
  });
  return article;
}

function renderList(items, page = 1) {
  content.replaceChildren();
  const perPage = 10;
  const pages = Math.max(1, Math.ceil(items.length / perPage));
  page = Math.min(Math.max(1, page), pages);
  items.slice((page - 1) * perPage, page * perPage).forEach((post, index) => {
    if (index === 0) {
      const postBreak = document.createElement("div");
      postBreak.className = "post_break";
      content.append(postBreak);
    }
    content.append(renderPost(post));
  });

  if (!items.length) content.innerHTML = '<div class="messages"><div class="cnt"><h2>مطلبی در دسترس نیست.</h2></div></div>';
  if (pages > 1) {
    const align = document.createElement("div");
    align.className = "align";
    const pagination = document.createElement("div");
    pagination.className = "pagination";
    for (let number = 1; number <= pages; number++) {
      const link = document.createElement("a");
      const url = new URL(location.href);
      url.searchParams.set("page", number);
      link.href = url.pathname + url.search;
      link.dataset.route = "";
      link.textContent = number.toLocaleString("fa");
      if (number === page) link.className = "selected";
      pagination.append(link);
    }
    align.append(pagination);
    content.append(align);
  }
}

function renderAbout() {
  content.innerHTML = `<article class="post">
    <div class="title align"><h2><a>درباره ما</a></h2></div>
    <div class="body align"><div class="cnt">
      <p>گروه سینماحلّی در سال ۱۳۹۴ تشکیل شد. این گروه کار خود را ابتدا با نمایش و نقد فیلم‌ها آغاز کرد. گروهی که اوّلین خروجی رسمی خود را در نمایشگاه دست‌آوردهای دانش‌آموزی راهنمایی علّامه حلّی (۱) دید و توانست در همین نمایشگاه به سرعت به یک غرفهٔ محبوب تبدیل شود. گروه کم‌کم سعی کرد فعالّیت‌های خود را گسترش دهد و در تابستان سال ۱۳۹۵ نخستین کار کوتاه سینمایی خود را با نام «آزادی در زندان» ساخت.</p>
      <p>وبلاگ سینماحلّی نیز در راستای فعالّیت‌های گروه شکل گرفت. بخش‌هایی چون معرفی فیلم، معرفی کتاب، نقد و نمای روز در تلاش هستند که فیلم‌ها و کتاب‌های مرتبط با فیلم و سینما را به شما معرفی کنند و بخش گالری دست‌آورد‌های گروه سینماحلّی است.</p>
    </div></div>
  </article>`;
}

function setSelectedMenu() {
  document.querySelectorAll(".main_menu a[data-route]").forEach((link) => {
    link.classList.toggle("selected", link.pathname === location.pathname || (link.pathname === "/" && location.pathname === "/"));
  });
}

function route() {
  const path = decodeURIComponent(location.pathname);
  const page = Number(new URL(location.href).searchParams.get("page")) || 1;
  const visible = posts.filter((post) => !unavailableImageOnly(post));
  const postId = Number(path.match(/^\/post\/(\d+)/)?.[1]);
  setSelectedMenu();

  if (postId) {
    const post = posts.find((item) => item.id === postId);
    if (!post || unavailableImageOnly(post)) renderList([]);
    else {
      document.title = `${post.title} :: سینما حلّی`;
      content.replaceChildren(renderPost(post, true));
    }
  } else if (path.startsWith("/page/about-me")) {
    document.title = "درباره ما :: سینما حلّی";
    renderAbout();
  } else if (path.startsWith("/category/")) {
    const key = categorySlugs[path.split("/").filter(Boolean)[1]];
    renderList(key ? visible.filter((post) => post.category === key) : visible, page);
  } else if (path.startsWith("/archive/")) {
    const parts = path.split("/").filter(Boolean);
    const tokens = archiveTokens[`${parts[1]}/${parts[2]}`] || [];
    renderList(visible.filter((post) => tokens.some((token) => post.detail.includes(token))), page);
  } else if (path.startsWith("/by_author/")) {
    const author = authorRoutes[path.split("/").filter(Boolean)[1]];
    renderList(author ? visible.filter((post) => post.author === author) : [], page);
  } else {
    document.title = "سینما حلّی";
    renderList(homepagePosts(visible), page);
  }
  window.scrollTo(0, 0);
}

function renderCategories() {
  const list = document.querySelector("#category-list");
  const visible = posts.filter((post) => !unavailableImageOnly(post));
  for (const [slug, key] of Object.entries(categorySlugs)) {
    const item = document.createElement("li");
    const count = visible.filter((post) => post.category === key).length;
    item.innerHTML = `<a href="/category/${slug}/" data-route><h3>${categoryLabels[key]} </h3></a><span class="count">&nbsp;(${count.toLocaleString("fa")})</span>`;
    list.append(item);
  }
}

document.addEventListener("click", (event) => {
  const link = event.target.closest("a[data-route]");
  if (!link || link.origin !== location.origin || event.metaKey || event.ctrlKey) return;
  event.preventDefault();
  history.pushState({}, "", link.href);
  route();
});
addEventListener("popstate", route);

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = plainText(searchInput.value).toLocaleLowerCase("fa");
  if (!query) return route();
  const matches = posts.filter((post) => !unavailableImageOnly(post) && plainText(`${post.title} ${post.bodyHtml} ${post.detail}`).toLocaleLowerCase("fa").includes(query));
  renderList(matches);
});

try {
  const response = await fetch("/data/posts.json");
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  posts = (await response.json()).posts.sort((a, b) => b.id - a.id);
  renderCategories();
  route();
} catch (error) {
  content.innerHTML = '<div class="messages"><div class="cnt"><h2>مطالب در حال حاضر در دسترس نیستند.</h2></div></div>';
  console.error(error);
}
