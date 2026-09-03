import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const publicDir = path.join(root, "public");
const archiveDir = path.join(root, "archive");
const source = JSON.parse(await readFile(path.join(archiveDir, "source", "posts.json"), "utf8"));

function archiveOriginal(value = "") {
  const decoded = value.replace(/^\/\//, "https://");
  const match = decoded.match(/^https?:\/\/web\.archive\.org\/web\/\d+(?:[a-z_]+)?\/(https?:\/\/.*)$/i);
  return (match ? match[1] : decoded)
    .replace(/^https:/i, "http:")
    .replace(/[?#].*$/, "");
}

function resourceKey(value = "") {
  const original = archiveOriginal(value);
  try {
    const url = new URL(original);
    return decodeURIComponent(`${url.hostname}${url.pathname}`).toLowerCase();
  } catch {
    return decodeURIComponent(original).toLowerCase();
  }
}

async function findManifests(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await findManifests(full)));
    else if (entry.name === "manifest.json") found.push(full);
  }
  return found;
}

const manifests = await findManifests(path.join(publicDir, "assets"));
const localAssets = new Map();

for (const manifestPath of manifests) {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const relativeDir = path.relative(publicDir, path.dirname(manifestPath));
  for (const asset of manifest.assets || []) {
    const basename = path.basename(asset.path);
    const relative = `/${path.posix.join(relativeDir.split(path.sep).join("/"), basename)}`;
    localAssets.set(resourceKey(asset.url), relative);
  }
}

const localAttachments = new Map([
  [
    resourceKey("http://bayanbox.ir/view/3794612651311894150/%DA%A9%D8%A7%D8%B1%DA%AF%D8%B1%D8%AF%D8%A7%D9%86-%D9%87%D8%A7%DB%8C-%D8%A8%D8%B1%D8%AA%D8%B1-%D9%85%DB%8C%D8%B4%D8%A7%D8%A6%DB%8C%D9%84-%D9%87%D8%A7%D9%86%DA%A9%D9%87.pdf"),
    "/files/michael-haneke.pdf",
  ],
  [
    resourceKey("http://bayanbox.ir/view/810997987145321501/%D9%86%D9%82%D8%AF-%D9%81%DB%8C%D9%84%D9%85-%D8%AC%D9%84%D8%B3%D9%87-1.pdf"),
    "/files/session-1-film-review.pdf",
  ],
]);

function localPath(url) {
  const key = resourceKey(url);
  return localAssets.get(key) || localAttachments.get(key) || null;
}

function cleanBody(html = "") {
  let clean = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, "")
    .replace(/\s(?:height|width)=("[^"]*"|'[^']*')/gi, "");

  clean = clean.replace(/\b(src|href)=("|')([^"']+)\2/gi, (all, attr, quote, url) => {
    const local = localPath(url);
    if (local) return `${attr}=${quote}${local}${quote}`;

    if (attr.toLowerCase() === "src" && /bayanbox\.ir/i.test(url)) {
      return `data-unavailable-src=${quote}${url}${quote}`;
    }

    const internal = url.match(/^(?:https?:\/\/web\.archive\.org)?\/web\/\d+(?:[a-z_]+)?\/https?:\/\/cinemahelli\.ir(?::80)?(\/[^"']*)$/i);
    if (internal) return `${attr}=${quote}${internal[1]}${quote}`;

    if (attr.toLowerCase() === "href" && /bayanbox\.ir\/(?:download|view)\/.*\.pdf(?:[?#].*)?$/i.test(url)) {
      const original = archiveOriginal(url);
      return `${attr}=${quote}https://web.archive.org/web/20210918102921/${original}${quote}`;
    }
    return all;
  });

  return clean;
}

const categories = {
  school: new Set([1, 2, 3, 15]),
  review: new Set([27, 28]),
  introduction: new Set([6, 14, 19, 26, 50]),
  meetings: new Set([8, 10]),
  filmmakers: new Set([46]),
  gallery: new Set([20, 21, 22, 23, 24, 29, 31, 33, 39, 41, 53, 54]),
};

function categoryFor(id) {
  for (const [name, ids] of Object.entries(categories)) if (ids.has(id)) return name;
  return "frames";
}

const knownAuthors = [
  "علیرضا حبیب زاده",
  "سروش شهبازی",
  "Ha di!",
  "آقای طاهری",
];
const taheriPostIds = new Set([49, 48, 42, 28, 27, 10, 7, 5, 4]);

function authorFor(post) {
  if (post.bodyHtml.includes("محمّد عبّاسی")) return "محمّد عبّاسی";
  if (taheriPostIds.has(post.id)) return "آقای طاهری";
  return knownAuthors.find((author) => post.detail.includes(author)) || "";
}

function bodyFor(post) {
  const body = cleanBody(post.bodyHtml);
  if (post.id !== 46) return body;
  return body.replace(
    /<div\s+style=("|')text-align:\s*right;?\1>\s*<font\b[^>]*>\s*نویسنده:\s*<\/font>\s*<font\b[^>]*>\s*محمّد عبّاسی\s*<\/font>\s*<\/div>/i,
    "",
  );
}

const recovered = [];
const unavailable = [];
const linkedAttachments = new Map();
const posts = source.posts.map((post) => {
  const images = (post.images || []).map((image) => {
    const local = localPath(image.src);
    const record = { postId: post.id, archivedUrl: image.src, localPath: local };
    (local ? recovered : unavailable).push(record);
    return { ...image, localSrc: local };
  });
  for (const match of post.bodyHtml.matchAll(/https?:[^"'<>\s]+?\.pdf/gi)) {
    const originalUrl = archiveOriginal(match[0].replace(/\\+$/, ""));
    linkedAttachments.set(resourceKey(originalUrl), {
      postId: post.id,
      originalUrl,
      archiveUrl: `https://web.archive.org/web/20210918102921/${originalUrl}`,
      localPath: localPath(originalUrl),
    });
  }
  return {
    ...post,
    author: authorFor(post),
    category: categoryFor(post.id),
    bodyHtml: bodyFor(post),
    images,
  };
});

function plainText(html = "") {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const hiddenUnavailablePosts = posts
  .filter((post) => plainText(post.bodyHtml).length === 0 && post.images.length > 0 && post.images.every((image) => !image.localSrc))
  .map((post) => ({ id: post.id, title: post.title }));
const hiddenIds = new Set(hiddenUnavailablePosts.map((post) => post.id));
const publishedPosts = posts.filter((post) => !hiddenIds.has(post.id));

await mkdir(path.join(publicDir, "data"), { recursive: true });
await writeFile(
  path.join(publicDir, "data", "posts.json"),
  JSON.stringify({ ...source, posts }, null, 2) + "\n",
);

const report = {
  site: source.site,
  indexedUrls: 151,
  recoveredPosts: posts.length,
  recoveredPostMedia: recovered.length,
  unavailablePostMedia: unavailable.length,
  hiddenUnavailablePosts,
  linkedAttachments: [...linkedAttachments.values()],
  localAssetFiles: localAssets.size,
  note: "Unavailable media and linked attachments were referenced by the source HTML but no longer return a downloadable file.",
  recovered,
  unavailable,
};

await writeFile(path.join(archiveDir, "recovery-report.json"), JSON.stringify(report, null, 2) + "\n");

const xml = (value) => String(value).replace(/[<>&'\"]/g, (char) => ({
  "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", "\"": "&quot;",
})[char]);

const rssItems = publishedPosts.slice(0, 20).map((post) => `
    <item>
      <title>${xml(post.title)}</title>
      <link>https://cinemahelli.ir/post/${post.id}/</link>
      <guid>https://cinemahelli.ir/post/${post.id}/</guid>
      <description>${xml(post.detail)}</description>
    </item>`).join("");

await writeFile(path.join(publicDir, "rss.xml"), `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0"><channel>
  <title>سینما حلّی</title>
  <link>https://cinemahelli.ir/</link>
  <description>سرآغازی برای ساخت فیلم</description>${rssItems}
</channel></rss>\n`);

const sitemapEntries = [
  "<url><loc>https://cinemahelli.ir/</loc></url>",
  "<url><loc>https://cinemahelli.ir/page/about-me</loc></url>",
  ...publishedPosts.map((post) => {
    const suffix = post.archiveUrl.match(/\/post\/\d+\/(.*)$/)?.[1]?.replace(/[?#].*$/, "") || "";
    return `<url><loc>${xml(`https://cinemahelli.ir/post/${post.id}/${suffix}`)}</loc></url>`;
  }),
];

await writeFile(path.join(publicDir, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapEntries.join("")}</urlset>\n`);

console.log(`Built ${posts.length} records (${publishedPosts.length} visible); ${recovered.length} media files local, ${unavailable.length} unavailable at source.`);
