#!/usr/bin/env node
// Serves dist/ with the headers from dist/_headers, opens every page in the
// sitemap with headless Chromium, and fails on CSP violations or JS errors.
// Usage: npm run check:csp   (after npm run build)
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { chromium } from "playwright";

const root = resolve("dist");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".xml": "application/xml",
  ".pdf": "application/pdf",
};

// Only the "/*" block matters for HTML pages. upgrade-insecure-requests is
// dropped because the local server is plain http.
const headersFile = await readFile(join(root, "_headers"), "utf8");
const globalHeaders = headersFile
  .split(/\n\s*\n/)[0]
  .split("\n")
  .slice(1)
  .map(line => line.trim())
  .filter(Boolean)
  .map(line => {
    const i = line.indexOf(":");
    return [line.slice(0, i), line.slice(i + 1).trim()];
  })
  .map(([k, v]) => [k, v.replace(/;\s*upgrade-insecure-requests/, "")]);

const server = http.createServer(async (req, res) => {
  let file = join(root, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!file.startsWith(root)) return res.writeHead(403).end();
  try {
    if ((await stat(file)).isDirectory()) file = join(file, "index.html");
    await stat(file);
  } catch {
    file = join(root, "404.html");
    res.statusCode = 404;
  }
  for (const [k, v] of globalHeaders) res.setHeader(k, v);
  res.setHeader("Content-Type", types[extname(file)] ?? "application/octet-stream");
  res.end(await readFile(file));
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

const sitemap = await readFile(join(root, "sitemap-0.xml"), "utf8");
const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
  ([, loc]) => new URL(loc).pathname
);

const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL ?? "chromium",
});
const page = await browser.newPage();
const problems = [];
await page.addInitScript(() =>
  document.addEventListener("securitypolicyviolation", e =>
    console.error(`CSP violation: ${e.violatedDirective} blocked ${e.blockedURI}`)
  )
);
page.on("console", m => {
  // The 404 page's own status is expected.
  if (m.type() === "error" && !/status of 404/.test(m.text()))
    problems.push(`${page.url()}: ${m.text()}`);
});
page.on("pageerror", e => problems.push(`${page.url()}: ${e.message}`));

for (const path of [...paths, "/this-page-does-not-exist/"]) {
  await page.goto(base + path, { waitUntil: "networkidle" });
}

// Client-side navigation re-executes page scripts under the first page's CSP.
await page.goto(base + "/", { waitUntil: "networkidle" });
const firstPost = page.locator('#recent-posts a[href^="/blog/"]').first();
if (await firstPost.count()) {
  await firstPost.click();
  await page.waitForLoadState("networkidle");
}

await browser.close();
server.close();

if (problems.length) {
  console.error(`✗ ${problems.length} problem(s):\n` + problems.join("\n"));
  process.exit(1);
}
console.log(`✓ ${paths.length + 1} pages loaded with no CSP violations or JS errors`);
