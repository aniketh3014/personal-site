#!/usr/bin/env node
// Cross-post a blog post to dev.to and/or Hashnode as an unpublished draft,
// with the canonical URL pointing back to this site.
//
//   node scripts/crosspost.mjs src/content/posts/my-post.md [--devto] [--hashnode] [--dry-run]
//
// With neither --devto nor --hashnode, both are used. --dry-run prints the
// payloads and makes no network calls (no API keys needed).
//
// Env: DEVTO_API_KEY, HASHNODE_TOKEN, HASHNODE_PUBLICATION_ID,
//      HASHNODE_GQL_URL (optional, defaults to https://gql-beta.hashnode.com/)
import { readFile } from "node:fs/promises";
import { extname, relative, resolve } from "node:path";
import { parse as parseYaml } from "yaml";

const POSTS_DIR = resolve("src/content/posts");
const DEVTO_URL = "https://dev.to/api/articles";
const HASHNODE_URL =
  process.env.HASHNODE_GQL_URL ?? "https://gql-beta.hashnode.com/";

function fail(message) {
  console.error(`crosspost: ${message}`);
  process.exit(1);
}

const args = process.argv.slice(2);
const flags = new Set(args.filter(a => a.startsWith("--")));
const file = args.find(a => !a.startsWith("--"));
const unknown = [...flags].filter(
  f => !["--devto", "--hashnode", "--dry-run"].includes(f)
);
if (!file || unknown.length) {
  fail(
    `${unknown.length ? `unknown flag ${unknown.join(", ")}. ` : ""}` +
      "usage: crosspost.mjs <post.md> [--devto] [--hashnode] [--dry-run]"
  );
}
const dryRun = flags.has("--dry-run");
const both = !flags.has("--devto") && !flags.has("--hashnode");
const targets = {
  devto: both || flags.has("--devto"),
  hashnode: both || flags.has("--hashnode"),
};

// ---- Read the post -------------------------------------------------------

const path = resolve(file);
if (extname(path) !== ".md") fail("only .md posts can be cross-posted (MDX has components)");
const rel = relative(POSTS_DIR, path);
if (rel.startsWith("..")) fail(`post must live under ${POSTS_DIR}`);

const source = await readFile(path, "utf8");
const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
if (!match) fail("no YAML frontmatter found");
const fm = parseYaml(match[1]) ?? {};
let body = match[2].trim();

for (const key of ["title", "description", "date"]) {
  if (!fm[key]) fail(`frontmatter is missing "${key}"`);
}
if (fm.draft) fail("post is marked draft: true; publish it on the site first");

// Same rule as the site: folders starting with "_" are not part of the URL.
const slug = rel
  .replace(/\.md$/, "")
  .split("/")
  .filter(s => !s.startsWith("_"))
  .join("/")
  .toLowerCase();

const config = await readFile("astro-paper.config.ts", "utf8");
const siteUrl = config.match(/url:\s*"(https?:\/\/[^"]+)"/)?.[1]?.replace(/\/$/, "");
if (!siteUrl) fail("could not read site.url from astro-paper.config.ts");

const postUrl = `${siteUrl}/blog/${slug}/`;
const canonical = fm.canonical_url ?? postUrl;
// The site generates an OG image for posts without a cover.
const coverUrl = fm.cover ? undefined : `${postUrl}index.png`;
const tags = Array.isArray(fm.tags) ? fm.tags.map(String) : [];

// ---- Adapt the Markdown for other platforms --------------------------------

// Root-relative links and images → absolute URLs on this site.
body = body.replace(/(\]\()\/(?!\/)/g, `$1${siteUrl}/`);
const relativeImages = [...body.matchAll(/!\[[^\]]*\]\((?!https?:)([^)]+)\)/g)];
if (relativeImages.length) {
  console.warn(
    `warning: ${relativeImages.length} image(s) use relative paths and will break off-site: ` +
      relativeImages.map(m => m[1]).join(", ")
  );
}
// Neither platform reliably renders Mermaid; link to the rendered diagram.
body = body.replace(
  /```mermaid\r?\n[\s\S]*?```/g,
  `*[Diagram: view it in the original post](${canonical})*`
);
body += `\n\n---\n\n*Originally published at [${new URL(canonical).host}](${canonical}).*\n`;

// ---- Payloads --------------------------------------------------------------

const devtoPayload = {
  article: {
    title: fm.title,
    description: fm.description,
    body_markdown: body,
    published: false,
    canonical_url: canonical,
    // dev.to: at most 4 tags, lowercase alphanumeric only.
    tags: tags.map(t => t.toLowerCase().replace(/[^a-z0-9]/g, "")).filter(Boolean).slice(0, 4),
    ...(coverUrl && { main_image: coverUrl }),
  },
};

const hashnodeInput = {
  publicationId: process.env.HASHNODE_PUBLICATION_ID ?? "<HASHNODE_PUBLICATION_ID>",
  title: fm.title,
  subtitle: fm.description,
  contentMarkdown: body,
  originalArticleURL: canonical,
  tags: tags.map(name => ({
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
  })),
  ...(coverUrl && { coverImageOptions: { coverImageURL: coverUrl } }),
};

if (dryRun) {
  console.log(`canonical: ${canonical}\n`);
  if (targets.devto) console.log("dev.to payload:\n" + JSON.stringify(devtoPayload, null, 2));
  if (targets.hashnode) console.log("\nHashnode input:\n" + JSON.stringify(hashnodeInput, null, 2));
  process.exit(0);
}

// ---- Publish drafts ---------------------------------------------------------

async function devto() {
  const key = process.env.DEVTO_API_KEY;
  if (!key) throw new Error("DEVTO_API_KEY is not set");
  const headers = {
    "api-key": key,
    "Content-Type": "application/json",
    Accept: "application/vnd.forem.api-v1+json",
  };

  // Skip if an article with this canonical URL already exists.
  const mine = await fetch(`${DEVTO_URL}/me/all?per_page=1000`, { headers });
  if (!mine.ok) throw new Error(`dev.to list failed: ${mine.status} ${await mine.text()}`);
  const existing = (await mine.json()).find(a => a.canonical_url === canonical);
  if (existing) return `already exists, skipped: ${existing.url}`;

  const res = await fetch(DEVTO_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(devtoPayload),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`dev.to ${res.status}: ${text}`);
  const article = JSON.parse(text);
  return `draft created: https://dev.to/dashboard (id ${article.id})`;
}

async function hashnode() {
  const token = process.env.HASHNODE_TOKEN;
  if (!token) throw new Error("HASHNODE_TOKEN is not set");
  if (!process.env.HASHNODE_PUBLICATION_ID)
    throw new Error("HASHNODE_PUBLICATION_ID is not set");

  const res = await fetch(HASHNODE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query:
        "mutation CreateDraft($input: CreateDraftInput!) { createDraft(input: $input) { draft { id slug title } } }",
      variables: { input: hashnodeInput },
    }),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Hashnode ${res.status}: ${text.slice(0, 300)}`);
  }
  if (!res.ok || json.errors?.length) {
    throw new Error(
      `Hashnode ${res.status}: ${json.errors?.map(e => `${e.extensions?.code ?? ""} ${e.message}`).join("; ") ?? text}`
    );
  }
  return `draft created (id ${json.data.createDraft.draft.id})`;
}

let failed = false;
for (const [name, run] of Object.entries({ devto, hashnode })) {
  if (!targets[name]) continue;
  try {
    console.log(`${name}: ${await run()}`);
  } catch (err) {
    failed = true;
    console.error(`${name}: ${err.message}`);
  }
}
process.exit(failed ? 1 : 0);
