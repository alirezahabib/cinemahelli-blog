const categoryLabels = {
  school: "مکتب خانه",
  review: "نقد",
  introduction: "معرفی فیلم",
  frames: "قاب‌های به یاد ماندنی",
  meetings: "جلسات و نشست‌های عمومی",
  gallery: "گالری",
  filmmakers: "فیلمسازان برتر",
};

const categorySlugs = {
  "مکتب-خانه": "school",
  "نقد": "review",
  "معرفی-فیلم": "introduction",
  "قاب-های-به-یاد-ماندنی": "frames",
  "جلسات-و-نشست-های-عمومی": "meetings",
  "گالری": "gallery",
  "فیلمسازان-برتر": "filmmakers",
};

const view = document.querySelector("#view");
const status = document.querySelector("#status");
const search = document.querySelector("#search");
let posts = [];

function normalizeText(value = "") {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().toLocaleLowerCase("fa");
}

function postUrl(post) {
  const suffix = post.archiveUrl.match(/\/post\/\d+\/(.*)$/)?.[1]?.replace(/[?#].*$/, "") || "";
  return `/post/${post.id}/${suffix}`;
}

function safeArchiveLink(src) {
  return /^https:\/\/web\.archive\.org\//.test(src) ? src : null;
}

function hydrateMissingMedia(container, post) {
  const known = new Map(post.images.map((image) => [image.src, image]));
  container.querySelectorAll("img").forEach((img) => {
    const recorded = [...known.values()].find((item) => item.localSrc === img.getAttribute("src") || item.src === img.src);
    const archiveSrc = recorded?.src || img.src;
    img.loading = "lazy";
    img.decoding = "async";
    img.addEventListener("error", () => {
      const placeholder = document.createElement("div");
      placeholder.className = "media-missing";
      placeholder.innerHTML = "این تصویر در صفحهٔ آرشیوی ثبت شده، اما فایل آن در Wayback قابل دریافت نبود.";
      const link = safeArchiveLink(archiveSrc);
      if (link) {
        const a = document.createElement("a");
        a.href = link;
        a.target = "_blank";
        a.rel = "noreferrer";
        a.textContent = "بررسی رکورد آرشیوی";
        placeholder.append(document.createElement("br"), a);
      }
      img.replaceWith(placeholder);
    }, { once: true });
  });
}

function renderCard(post, full = false) {
  const article = document.createElement("article");
  article.className = "post-card";
  const title = document.createElement("h2");
  const titleLink = document.createElement("a");
  titleLink.href = postUrl(post);
  titleLink.dataset.route = "";
  titleLink.textContent = post.title;
  title.append(titleLink);

  const body = document.createElement("div");
  body.className = "post-body";
  body.innerHTML = post.bodyHtml;
  body.querySelectorAll("a").forEach((anchor) => {
    if (anchor.href.startsWith(location.origin)) anchor.dataset.route = "";
    else { anchor.target = "_blank"; anchor.rel = "noreferrer"; }
  });

  const meta = document.createElement("div");
  meta.className = "post-meta";
  meta.textContent = post.detail || `مطلب شمارهٔ ${post.id}`;
  article.append(title, body, meta);
  hydrateMissingMedia(body, post);

  if (!full && normalizeText(post.bodyHtml).length > 800) {
    body.style.maxHeight = "620px";
    body.style.overflow = "hidden";
    const more = document.createElement("a");
    more.href = postUrl(post);
    more.dataset.route = "";
    more.textContent = "ادامه مطلب…";
    article.append(more);
  }
  return article;
}

function renderList(items, title = "آخرین مطالب", page = 1) {
  view.replaceChildren();
  const heading = document.createElement("h1");
  heading.className = "view-title";
  heading.textContent = title;
  view.append(heading);

  const perPage = 10;
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  page = Math.min(Math.max(page, 1), totalPages);
  items.slice((page - 1) * perPage, page * perPage).forEach((post) => view.append(renderCard(post)));

  if (totalPages > 1) {
    const pager = document.createElement("nav");
    pager.className = "pager";
    pager.setAttribute("aria-label", "صفحه‌بندی");
    for (let i = 1; i <= totalPages; i++) {
      const a = document.createElement("a");
      const url = new URL(location.href);
      url.searchParams.set("page", i);
      a.href = url.pathname + url.search;
      a.dataset.route = "";
      a.textContent = String(i);
      if (i === page) a.className = "active";
      pager.append(a);
    }
    view.append(pager);
  }
}

function renderAbout() {
  view.innerHTML = `<article class="post-card about">
    <h1 class="view-title">درباره ما</h1>
    <p>گروه سینماحلّی در سال ۱۳۹۴ تشکیل شد. این گروه کار خود را ابتدا با نمایش و نقد فیلم‌ها آغاز کرد. گروهی که اوّلین خروجی رسمی خود را در نمایشگاه دست‌آوردهای دانش‌آموزی راهنمایی علّامه حلّی (۱) دید و توانست در همین نمایشگاه به سرعت به یک غرفهٔ محبوب تبدیل شود. گروه کم‌کم سعی کرد فعالّیت‌های خود را گسترش دهد و در تابستان سال ۱۳۹۵ نخستین کار کوتاه سینمایی خود را با نام «آزادی در زندان» ساخت. گروه سینماحلّی همواره در تلاش بوده است که علاوه بر مطالعات نظری دربارهٔ سینما و برگزاری نشست‌های نمایش و نقد فیلم، توجه ویژه‌ای به فیلمسازی نیز داشته باشد.</p>
    <p>وبلاگ سینماحلّی نیز در راستای فعالّیت‌های گروه شکل گرفت. بخش‌هایی چون معرفی فیلم، معرفی کتاب، نقد و نمای روز در تلاش هستند که فیلم‌ها و کتاب‌های مرتبط با فیلم و سینما را به شما معرفی کنند و بخش گالری دست‌آورد‌های گروه سینماحلّی است.</p>
  </article>`;
}

function route() {
  status.textContent = "";
  const path = decodeURIComponent(location.pathname);
  const page = Number(new URL(location.href).searchParams.get("page")) || 1;
  const postId = Number(path.match(/^\/post\/(\d+)/)?.[1]);

  if (postId) {
    const post = posts.find((item) => item.id === postId);
    if (!post) return renderList([], "مطلب پیدا نشد");
    document.title = `${post.title} :: سینما حلّی`;
    view.replaceChildren(renderCard(post, true));
  } else if (path.startsWith("/page/about-me")) {
    document.title = "درباره ما :: سینما حلّی";
    renderAbout();
  } else if (path.startsWith("/category/")) {
    const slug = path.split("/").filter(Boolean)[1];
    const key = categorySlugs[slug];
    const items = key ? posts.filter((post) => post.category === key) : posts;
    renderList(items, key ? categoryLabels[key] : "طبقه‌بندی موضوعی", page);
  } else if (path.startsWith("/archive/")) {
    const parts = path.split("/").filter(Boolean);
    const label = `${parts[1] || ""}/${parts[2] || ""}`;
    const tokens = {
      "1397/1": ["۹۷/۰۱", "فروردین ۹۷"],
      "1396/8": ["۹۶/۰۸", "آبان ۹۶"],
      "1395/10": ["۹۵/۱۰", "دی ۹۵"],
      "1395/9": ["۹۵/۰۹", "آذر ۹۵"],
      "1395/8": ["۹۵/۰۸", "آبان ۹۵"],
      "1395/6": ["۹۵/۰۶", "شهریور ۹۵"],
      "1395/5": ["۹۵/۰۵", "مرداد ۹۵"],
    };
    const matches = tokens[label] || ["__none__"];
    renderList(posts.filter((post) => matches.some((token) => post.detail.includes(token))), `بایگانی ${label}`, page);
  } else {
    document.title = "سینما حلّی";
    renderList(posts, "آخرین مطالب", page);
  }
  window.scrollTo({ top: 0, behavior: "instant" });
}

function bindRoutes() {
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-route]");
    if (!link || link.origin !== location.origin || event.metaKey || event.ctrlKey) return;
    event.preventDefault();
    history.pushState({}, "", link.href);
    route();
  });
  addEventListener("popstate", route);
}

function renderCategoryLinks() {
  const host = document.querySelector("#category-links");
  for (const [slug, key] of Object.entries(categorySlugs)) {
    const count = posts.filter((post) => post.category === key).length;
    const a = document.createElement("a");
    a.href = `/category/${slug}/`;
    a.dataset.route = "";
    a.textContent = `${categoryLabels[key]} (${count.toLocaleString("fa")})`;
    host.append(a);
  }
}

search.addEventListener("input", () => {
  const query = normalizeText(search.value);
  if (!query) return route();
  const matches = posts.filter((post) => normalizeText(`${post.title} ${post.bodyHtml} ${post.detail}`).includes(query));
  renderList(matches, `نتایج جستجو برای «${search.value}»`, 1);
});

try {
  const response = await fetch("/data/posts.json");
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  posts = (await response.json()).posts.sort((a, b) => b.id - a.id);
  renderCategoryLinks();
  bindRoutes();
  route();
} catch (error) {
  status.textContent = "بارگذاری آرشیو ممکن نشد. لطفاً صفحه را دوباره باز کنید.";
  console.error(error);
}
