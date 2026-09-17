import { readFile, writeFile, mkdir } from "node:fs/promises";
import vm from "node:vm";
import { parseHTML } from "linkedom";

// Run the same renderer used by visitors so content, order and comments agree.
export async function prerender(paths) {
  const template = await readFile("public/index.html", "utf8");
  const app = await readFile("public/app.js", "utf8");
  const data = JSON.parse(await readFile("public/data/posts.json", "utf8"));
  const code = app.slice(0, app.lastIndexOf("\ntry {"));
  const queue = [...paths];
  const pages = {};
  const postPaths = {};
  await mkdir("public/_rendered", { recursive: true });
  for (let i = 0; i < queue.length; i++) {
    const pathname = queue[i];
    const { document } = parseHTML(template);
    const location = new URL(pathname, "https://cinemahelli.ir");
    const context = vm.createContext({
      document, location, URL, console,
      addEventListener() {}, requestAnimationFrame() {},
    });
    context.postData = data.posts;
    vm.runInContext(`${code}\nposts = postData.sort((a,b) => b.id-a.id); renderCategories(); route();`, context);
    const canonical = document.querySelector('link[rel="canonical"]').href;
    const page = Number(location.searchParams.get("page")) || 1;
    if (page > 1) document.title += ` — صفحه ${page}`;
    const asset = `/_rendered/${i}.html`;
    const key = location.pathname + location.search;
    pages[key] = { asset, canonical };
    const id = location.pathname.match(/^\/post\/(\d+)\//)?.[1];
    if (id) postPaths[id] = location.pathname;
    for (const link of document.querySelectorAll(".pagination a")) {
      const url = new URL(link.getAttribute("href"), location);
      const next = url.pathname + url.search;
      if (!queue.includes(next)) queue.push(next);
    }
    await writeFile(`public${asset}`, document.toString());
  }
  await writeFile("route-manifest.json", JSON.stringify({ pages, postPaths }, null, 2) + "\n");
  const entries = Object.values(pages).map(({ canonical }) => `<url><loc>${canonical.replace(/&/g, "&amp;")}</loc></url>`);
  await writeFile("public/sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.join("")}</urlset>\n`);
  console.log(`Rendered ${queue.length} complete HTML pages including pagination.`);
}
