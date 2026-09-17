import manifest from "./route-manifest.json" with { type: "json" };

const origin = "https://cinemahelli.ir";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const target = new URL(url.pathname, origin);
    const id = url.pathname.match(/^\/post\/(\d+)(?:\/|$)/)?.[1];
    if (id && manifest.postPaths[id]) target.pathname = manifest.postPaths[id];
    else {
      const base = url.pathname.replace(/\/$/, "");
      if (manifest.pages[base]) target.pathname = base;
      else if (manifest.pages[base + "/"]) target.pathname = base + "/";
      const page = Number(url.searchParams.get("page"));
      if (Number.isInteger(page) && page > 1) target.searchParams.set("page", page);
    }
    const key = target.pathname + target.search;
    const page = manifest.pages[key];
    const isAsset = /^\/(?:assets|theme|data|files)\//.test(url.pathname)
      || ["/robots.txt", "/sitemap.xml", "/rss.xml", "/app.js"].includes(url.pathname);
    if (page || isAsset) {
      if (isAsset) target.search = url.search;
      if (url.href !== target.href) return Response.redirect(target.href, 301);
      const assetURL = new URL(page ? page.asset : url.pathname + url.search, url);
      const response = await env.ASSETS.fetch(new Request(assetURL, request));
      const headers = new Headers(response.headers);
      if (page || /\.pdf$/i.test(url.pathname)) {
        headers.set("Link", `<${page ? page.canonical : origin + url.pathname}>; rel="canonical"`);
      }
      return new Response(response.body, { status: response.status, headers });
    }
    return new Response("صفحه در دسترس نیست.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "noindex" },
    });
  },
};
