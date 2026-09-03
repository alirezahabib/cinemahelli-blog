import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sourcePath = path.join(root, "archive", "source", "posts.json");
const outputPath = path.join(root, "archive", "source", "comments.json");
const source = JSON.parse(await readFile(sourcePath, "utf8"));

const captures = new Map([
  [47, "20211025020017"],
  [45, "20211025020812"],
  [39, "20211025015734"],
  [37, "20210724074912"],
  [36, "20211025010759"],
  [8, "20211025003024"],
  [5, "20211025010051"],
]);

function originalUrl(value) {
  return value.replace(/^https?:\/\/web\.archive\.org\/web\/\d+(?:[a-z_]+)?\//i, "");
}

function decodeEntities(value) {
  const named = { nbsp: " ", amp: "&", quot: "\"", lt: "<", gt: ">", apos: "'", "#34": "\"" };
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#([0-9]+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&(nbsp|amp|quot|lt|gt|apos|#34);/gi, (all, name) => named[name.toLowerCase()] || all);
}

function plainText(value = "") {
  return decodeEntities(value
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(?:div|p|li)>/gi, "\n")
    .replace(/<[^>]*>/g, ""))
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseComments(html) {
  const comments = [];
  const pattern = /<a name="comment-([^"]+)"><\/a>\s*<div class="post_comments align">([\s\S]*?)(?=<div class="cmt_break">)/g;
  for (const match of html.matchAll(pattern)) {
    const block = match[2];
    const date = plainText(block.match(/<span class="cmt_date"><a[^>]*>([\s\S]*?)<\/a>/i)?.[1]);
    const author = plainText(block.match(/<span class="inline txt">([\s\S]*?)<\/span>/i)?.[1]) || "مهمان";
    const body = plainText(block.match(/<div class="body_cmt"><div class="cnt">\s*<span class="cnt_l">([\s\S]*?)<\/span>\s*<\/div><\/div>/i)?.[1]);
    const reply = plainText(block.match(/<div class="align">\s*<div class="cmt_reply[^"]*">([\s\S]*?)<\/div>\s*<\/div>\s*$/i)?.[1])
      .replace(/^پاسخ:\s*/u, "");
    if (!body) throw new Error(`Comment ${match[1]} has no recoverable body`);
    comments.push({ id: match[1], author, date, body, ...(reply ? { reply } : {}) });
  }
  return comments;
}

async function fetchCapture(url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

const posts = [];
for (const [postId, capturedAt] of captures) {
  const post = source.posts.find((item) => item.id === postId);
  if (!post) throw new Error(`Post ${postId} is missing from the source data`);
  const url = `https://web.archive.org/web/${capturedAt}id_/${originalUrl(post.archiveUrl)}`;
  const html = await fetchCapture(url);
  const comments = parseComments(html);
  posts.push({ postId, capturedAt, comments });
  console.log(`Recovered ${comments.length} comments for post ${postId}.`);
}

await writeFile(outputPath, `${JSON.stringify({ posts }, null, 2)}\n`);
console.log(`Saved ${posts.reduce((total, post) => total + post.comments.length, 0)} comments.`);
