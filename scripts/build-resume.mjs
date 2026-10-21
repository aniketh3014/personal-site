#!/usr/bin/env node
// Builds a one-page resume PDF from the same data as the About page:
//   src/data/resume.yaml      header, summary, projects, education
//   src/data/experience.yaml  roles and bullets
//   src/data/tech.yaml        skills
//
//   npm run resume                                   -> public/resume.pdf (no phone)
//   RESUME_PHONE="+91 …" npm run resume -- --out ~/Aniket-Ghosh-Resume.pdf
//
// The phone number is read from the environment only, so it never lands in
// the repo or on the public site.
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { parse } from "yaml";

const args = process.argv.slice(2);
const outIndex = args.indexOf("--out");
const out = resolve(outIndex >= 0 ? args[outIndex + 1] : "public/resume.pdf");
const phone = process.env.RESUME_PHONE?.trim();

const load = async file => parse(await readFile(file, "utf8"));
const resume = await load("src/data/resume.yaml");
const experience = await load("src/data/experience.yaml");
const tech = await load("src/data/tech.yaml");

const esc = s =>
  String(s).replace(
    /[&<>"']/g,
    c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]
  );
const months = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
const fmt = ym => {
  const [y, m] = ym.split("-").map(Number);
  return `${months[m - 1]} ${y}`;
};
const bare = url => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
const link = url => `<a href="${esc(url)}">${esc(bare(url))}</a>`;

// Current roles first, then by end date; ties keep the file's order.
const roles = [...experience].sort((a, b) =>
  (b.end ?? "9999-99").localeCompare(a.end ?? "9999-99")
);
const skills = [...tech].sort((a, b) => (a.order ?? 100) - (b.order ?? 100));

// Two short lines rather than one that wraps mid-list.
const contactLines = [
  [
    esc(resume.location),
    phone && esc(phone),
    `<a href="mailto:${esc(resume.email)}">${esc(resume.email)}</a>`,
  ],
  [link(resume.website), link(resume.github), link(resume.linkedin)],
].map(line => line.filter(Boolean));

const bullets = items =>
  `<ul>${items.map(i => `<li>${esc(i)}</li>`).join("")}</ul>`;

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>Aniket Ghosh – Resume</title>
<style>
  @page { size: A4; margin: 13mm 15mm; }
  * { box-sizing: border-box; }
  body { font-family: "Noto Sans", "Liberation Sans", Arial, sans-serif;
         font-size: 9.6pt; line-height: 1.38; color: #1a1a1a; margin: 0; }
  a { color: inherit; text-decoration: none; }
  h1 { font-size: 21pt; margin: 0; letter-spacing: 0.2px; }
  .headline { font-size: 10.5pt; color: #333; margin: 1px 0 4px; }
  .contact { font-size: 8.8pt; color: #333; }
  .contact span + span::before { content: "  ·  "; white-space: pre; color: #888; }
  h2 { font-size: 10pt; text-transform: uppercase; letter-spacing: 0.8px;
       color: #1f3a5f; border-bottom: 1px solid #c8d0da;
       margin: 11px 0 5px; padding-bottom: 2px; }
  .row { display: flex; justify-content: space-between; gap: 12px; }
  .row b { font-weight: 700; }
  .when { white-space: nowrap; color: #333; }
  .item { margin-bottom: 6px; break-inside: avoid; }
  ul { margin: 2px 0 0; padding-left: 15px; }
  li { margin: 1px 0; }
  p { margin: 0; }
  .skills div { margin: 1px 0; }
</style></head>
<body>
  <h1>Aniket Ghosh</h1>
  <div class="headline">${esc(resume.headline)}</div>
  ${contactLines.map(line => `<div class="contact">${line.map(c => `<span>${c}</span>`).join("")}</div>`).join("")}

  <h2>Summary</h2>
  <p>${esc(resume.summary)}</p>

  <h2>Experience</h2>
  ${roles
    .map(
      r => `<div class="item">
    <div class="row"><span><b>${esc(r.role)}</b>, ${esc(r.company)}</span>
    <span class="when">${fmt(r.start)} – ${r.end ? fmt(r.end) : "Present"}</span></div>
    ${bullets(r.highlights)}
  </div>`
    )
    .join("")}

  <h2>Projects</h2>
  ${resume.projects
    .map(
      p => `<div class="item">
    <div class="row"><span><b>${esc(p.name)}</b> — ${esc(p.tagline)}</span>
    <span class="when">${link(p.url)}</span></div>
    ${bullets(p.bullets)}
  </div>`
    )
    .join("")}

  <h2>Skills</h2>
  <div class="skills">${skills
    .map(
      g => `<div><b>${esc(g.group)}:</b> ${g.items.map(esc).join(", ")}</div>`
    )
    .join("")}</div>

  <h2>Education</h2>
  <div class="row"><span><b>${esc(resume.education.degree)}</b>, ${esc(resume.education.school)}</span>
  <span class="when">${esc(resume.education.dates)}</span></div>
</body></html>`;

const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL ?? "chromium",
});
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "load" });
const pdf = await page.pdf({ format: "A4", printBackground: true });
await browser.close();

const pages = (pdf.toString("latin1").match(/\/Type\s*\/Page\b(?!s)/g) ?? [])
  .length;
if (pages !== 1) {
  console.error(`✗ resume is ${pages} pages; trim content to fit one page`);
  process.exit(1);
}
await writeFile(out, pdf);
console.log(
  `✓ wrote ${out} (1 page${phone ? ", includes phone" : ", no phone"})`
);
