# Cinema Helli archive

A static reconstruction of `cinemahelli.ir`, recovered from the Internet Archive and prepared for Cloudflare Workers Static Assets (the current successor path for new Cloudflare Pages-style static deployments).

## What was recovered

- 151 distinct first-party URLs found in Wayback's URL inventory.
- All 54 numbered posts, including eight deleted posts missing from the surviving homepage pagination: 20, 21, 22, 24, 29, 31, 53, and 54.
- The complete archived text/HTML for all posts, the About page, original Persian RTL presentation, old post routes, category routes, archive routes, client-side search, RSS, and a sitemap.
- 33 post-media files plus the recoverable original theme, logo, favicon, and support assets are hosted locally.

Wayback references another 52 post-media files whose archived responses do not contain a downloadable file. The site renders a clear unavailable-media notice for these instead of showing a silent broken image. Six linked Bayanbox PDF attachments likewise no longer return a file; their original and Wayback URLs are preserved in the audit. Every recovered and unavailable reference is listed in [`archive/recovery-report.json`](archive/recovery-report.json).

The original comment forms, voting controls, followers, and Bayan backend operations are intentionally read-only/not reproduced because this is a static archive.

## Build and preview

Install Node.js 20 or newer, then run:

```sh
npm install
npm run build
npm run dev
```

The build step rewrites archived image URLs to locally recovered files, generates `public/data/posts.json`, the recovery report, RSS, and the sitemap.

## Deploy to Cloudflare Workers

```sh
npx wrangler login
npm run deploy
```

Wrangler uses [`wrangler.jsonc`](wrangler.jsonc) and uploads `public/` as Worker static assets. It will print a `*.workers.dev` URL after deployment.

To use `cinemahelli.ir`, open the Worker in the Cloudflare dashboard, go to **Settings → Domains & Routes**, choose **Add → Custom Domain**, and enter `cinemahelli.ir`. Add `www.cinemahelli.ir` separately if you want both hostnames.

## Source and audit files

- `archive/source/posts.json` — raw browser-extracted archive dataset before local-asset rewriting.
- `archive/recovery-report.json` — machine-readable media recovery audit.
- `public/` — deployable static site.
- `scripts/build.mjs` — deterministic rebuild script.
