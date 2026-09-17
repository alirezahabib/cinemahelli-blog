import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseHTML } from "linkedom";
import worker from "../worker.mjs";
import manifest from "../route-manifest.json" with { type: "json" };

const env = { ASSETS: { async fetch(request) {
  const pathname = new URL(request.url).pathname;
  const body = await readFile(`public${pathname}`);
  return new Response(request.method === "HEAD" ? null : body, {
    headers: { "Content-Type": pathname.endsWith(".pdf") ? "application/pdf" : "text/html; charset=utf-8" },
  });
} } };
const fetch = (path, options) => worker.fetch(new Request(new URL(path, "https://cinemahelli.ir"), options), env);

for (const [path, target] of [
  ["http://cinemahelli.ir/?page=4", "/?page=4"],
  ["https://www.cinemahelli.ir/", "/"],
  ["/?page=1", "/"],
  ["/category/قاب-های-به-یاد-ماندنی/?page=1", "/category/قاب-های-به-یاد-ماندنی/"],
  ["/post/49/", manifest.postPaths[49]],
  ["/post/49/incorrect-slug", manifest.postPaths[49]],
  ["/?utm_source=example", "/"],
]) {
  const response = await fetch(path);
  assert.equal(response.status, 301, path);
  assert.equal(response.headers.get("location"), new URL(target, "https://cinemahelli.ir").href, path);
}

const homePages = [];
for (const [path, { canonical }] of Object.entries(manifest.pages)) {
  const response = await fetch(path);
  assert.equal(response.status, 200, path);
  assert.equal(response.headers.get("link"), `<${canonical}>; rel="canonical"`);
  const html = await response.text();
  const { document } = parseHTML(html);
  assert.equal(document.querySelectorAll('link[rel="canonical"]').length, 1);
  assert.equal(document.querySelector('link[rel="canonical"]').href, canonical);
  assert.ok(document.querySelector("#content").textContent.trim(), path);
  assert.equal(document.querySelectorAll('img[src*="bayanbox.ir"]').length, 0);
  if (path.startsWith("/post/")) {
    assert.equal(document.querySelectorAll("#content article").length, 1);
    assert.ok(document.querySelector("#comments"));
  }
  if (path === "/" || path.startsWith("/?page=")) {
    homePages.push(document.querySelector("#content").textContent);
  }
}
assert.equal(homePages.length, 4);
assert.equal(new Set(homePages).size, 4, "Pagination must contain different content");
const pdf = await fetch("/files/michael-haneke.pdf");
assert.equal(pdf.headers.get("content-type"), "application/pdf");
assert.equal((await pdf.text()).slice(0, 5), "%PDF-");
assert.equal(pdf.headers.get("link"), '<https://cinemahelli.ir/files/michael-haneke.pdf>; rel="canonical"');
assert.equal((await fetch("/missing-page")).status, 404);
assert.equal((await fetch("/?page=999")).status, 404);
assert.equal((await fetch("/_rendered/0.html")).status, 404);
assert.equal((await fetch("/", { method: "HEAD" })).body, null);
console.log(`SEO checks passed for ${Object.keys(manifest.pages).length} rendered routes, redirects, pagination and PDF.`);
