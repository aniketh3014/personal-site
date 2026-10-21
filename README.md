# aniketghosh.in

Source for [aniketghosh.in](https://aniketghosh.in): portfolio and blog of
Aniket Ghosh. Built with [Astro](https://astro.build/) on the
[AstroPaper](https://github.com/satnaing/astro-paper) theme, deployed to
Cloudflare (Workers static assets).

- [Local development](#local-development)
- [Site configuration](#site-configuration)
- [Adding a post](#adding-a-post)
- [Adding a project](#adding-a-project)
- [Editing experience and the tech list](#editing-experience-and-the-tech-list)
- [Cross-posting to dev.to and Hashnode](#cross-posting-to-devto-and-hashnode)
- [Deployment setup](#deployment-setup)
- [CI checks](#ci-checks)
- [Security headers](#security-headers)
- [Placeholders to replace](#placeholders-to-replace)

## Local development

Requirements: Node 26 (see `.node-version`) and npm.

```bash
npm ci
# Headless Chromium renders Mermaid diagrams during the build
# and runs the CSP and Lighthouse checks. One-time download.
npx playwright install --no-shell chromium

npm run dev        # http://localhost:4321, live reload
npm run build      # astro check + static build into dist/
npm run preview    # serve dist/ locally
npm run check      # every CI check, in CI order
```

The dev server doesn't apply the security headers. Use `npm run build &&
npm run check:csp` to test the site under its real CSP.

| Path                                  | What it holds                                 |
| ------------------------------------- | --------------------------------------------- |
| `astro-paper.config.ts`               | name, headline, intro, socials, feature flags |
| `src/content/posts/`                  | blog posts (Markdown)                         |
| `src/content/projects/`               | portfolio projects (Markdown)                 |
| `src/content/pages/about.md`          | About page bio                                |
| `src/data/experience.yaml`            | work experience                               |
| `src/data/tech.yaml`                  | grouped tech list on the About page           |
| `public/resume.pdf`                   | resume download                               |
| `src/integrations/securityHeaders.ts` | generates `dist/_headers` (CSP etc.)          |
| `scripts/`                            | cross-post script and CSP check               |

## Site configuration

Everything personal lives in `astro-paper.config.ts`: the site URL, name,
home page headline and intro, social links, share links, and feature flags.

Cloudflare Web Analytics is off by default. To turn it on, create a site in
the Cloudflare dashboard (Analytics & Logs → Web Analytics), choose the manual
JavaScript snippet, and copy the token from it:

```ts
analytics: {
  cloudflare: { enabled: true, token: "your-beacon-token" },
},
```

The beacon script and its CSP allowances are only emitted when both are set.
Don't enable Cloudflare's automatic injection for the site: that
injected script isn't in the CSP and will be blocked.

## Adding a post

Create `src/content/posts/<slug>.md`. The filename becomes the URL:
`/blog/<slug>/`. Use lowercase kebab-case names.

```yaml
---
title: "Designing idempotent webhooks in Go" # required
description: "One or two sentences for listings, SEO and social cards." # required
date: 2026-11-02 # required, publish date
updated: 2026-11-10 # optional, last meaningful update
tags: [go, distributed-systems] # optional
draft: false # optional; true hides it everywhere
cover: ./assets/cover.png # optional, path relative to the post
cover_alt: "Sequence diagram of a retry" # optional, alt text for cover
canonical_url: "https://…" # optional, only if first published elsewhere
---
```

- **Canonical URL.** Every page emits `<link rel="canonical">`. It points at
  the page on aniketghosh.in unless `canonical_url` is set.
- **Social image.** Posts without a `cover` get an auto-generated Open Graph
  image at `/blog/<slug>/index.png`.
- **Table of contents.** Added automatically when a post has three or more
  `##`/`###` headings.
- **Code blocks.** Highlighted at build time with a copy button. Go, YAML,
  HCL, Bash and Dockerfile all work, as does any language Shiki supports.
- **Diagrams.** A fenced ` ```mermaid ` block becomes an SVG image at build
  time. Add `accTitle:` and `accDescr:` lines to give it alt text.
- **Callouts.** `> [!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`,
  `[!CAUTION]`.
- **Scheduling.** A post with a future `date` stays hidden until that time
  after the next build.

`src/content/posts/example-post.md` shows every formatting feature.

## Adding a project

Create `src/content/projects/<slug>.md`, which becomes `/projects/<slug>/`:

````yaml
---
title: "Distributed rate limiter"
summary: "One line for cards and meta description."
problem: "What was broken or missing, and why it mattered."
stack: [Go, Redis, Terraform]
role: "Sole engineer: design, implementation, rollout"
results:
  - "Measured outcome, ideally with a number."
repo_url: "https://github.com/aniketh3014/…" # optional
demo_url: "https://…" # optional
writeup_url: "/blog/<slug>/" # optional: a post here, or any URL
featured: true # shown on the home page (up to 4)
order: 1 # lower comes first
draft: false # optional
---

## Architecture

An image (`![alt](./diagram.png)`) or a ```mermaid block.

## Key decisions

- **Decision.** Why, and what it cost.
````

The detail page renders, in order: problem (frontmatter), the Markdown body
(architecture and key decisions), results, then links.

## Editing experience and the tech list

`src/data/experience.yaml` holds one entry per role, newest first:

```yaml
- id: acme # unique key
  role: Backend Engineer
  company: Acme
  company_url: "https://acme.example" # optional
  location: Remote # optional
  start: "2024-01" # YYYY-MM
  end: "2025-06" # omit for your current role
  highlights: # 1–4 bullets; aim for 2–3 impact statements
    - "Cut p99 latency from 800 ms to 120 ms by …"
```

`src/data/tech.yaml` holds groups shown on the About page, sorted by `order`:

```yaml
- id: languages
  group: Languages
  order: 1
  items: [Go, SQL, Bash]
```

Both files are schema-checked: a typo in a field name fails the build.

## Cross-posting to dev.to and Hashnode

Publish the post on this site first. Then:

```bash
npm run crosspost -- src/content/posts/<slug>.md --dry-run   # print payloads only
npm run crosspost -- src/content/posts/<slug>.md             # both platforms
npm run crosspost -- src/content/posts/<slug>.md --devto     # just one
```

The script creates **unpublished drafts** with the canonical URL set to this
site, so search engines credit the original. Review and publish them in each
platform's editor. It also:

- rewrites root-relative links (`/about/`) to absolute URLs;
- replaces Mermaid blocks with a link to the original post, since neither
  platform renders them reliably;
- appends an "Originally published at aniketghosh.in" line;
- uses the site's generated OG image as the cover;
- skips dev.to if an article with the same canonical URL already exists
  (Hashnode has no such check, so running it twice creates two drafts);
- refuses `draft: true` posts and `.mdx` files, and warns about relative
  image paths, which won't resolve on other sites.

API keys come from environment variables only:

| Variable                  | Where to get it                                                  |
| ------------------------- | ---------------------------------------------------------------- |
| `DEVTO_API_KEY`           | dev.to → Settings → Extensions → DEV Community API Keys          |
| `HASHNODE_TOKEN`          | Hashnode → Account settings → Developer → Personal access tokens |
| `HASHNODE_PUBLICATION_ID` | The ID in your blog dashboard URL: `hashnode.com/<id>/dashboard` |

In fish:

```fish
set -lx DEVTO_API_KEY …; set -lx HASHNODE_TOKEN …; set -lx HASHNODE_PUBLICATION_ID …
npm run crosspost -- src/content/posts/<slug>.md
```

> [!WARNING]
> Since 13 May 2026 Hashnode's GraphQL API requires a **Pro plan** on the
> publication; without it the API returns `FORBIDDEN`. The script uses the
> current endpoint, `https://gql-beta.hashnode.com/`; the old
> `gql.hashnode.com` now redirects to the deprecation notice. Override the
> endpoint with `HASHNODE_GQL_URL` if it moves again. dev.to is unaffected.

## Deployment setup

The site is hosted as a **Cloudflare Workers static-assets** site, which
Cloudflare now treats as the successor to Pages (new Pages projects are
redirected to Workers). `wrangler.jsonc` describes it. Deploys happen from
GitHub Actions on every push to `main`, after all checks pass: Cloudflare
receives the checked `dist/` and doesn't build anything.

Already done: the Worker `aniketghosh-in` exists (first deployed from a
laptop) at `https://aniketghosh-in.ghoshaniket1000.workers.dev`, and the
domain's DNS is on Cloudflare.

### 1. API token for CI

Cloudflare dashboard → My Profile → API Tokens → Create Token → **Edit
Cloudflare Workers** template. Limit it to your account and to the
`aniketghosh.in` zone. Your **Account ID** is on the Workers & Pages
overview page, or run `npx wrangler whoami`.

### 2. GitHub secrets

Repository → Settings → Secrets and variables → Actions → New repository
secret:

| Name                    | Value                 |
| ----------------------- | --------------------- |
| `CLOUDFLARE_API_TOKEN`  | the token from step 1 |
| `CLOUDFLARE_ACCOUNT_ID` | your account ID       |

The deploy job runs in a GitHub environment named `production`, created on
the first deploy. You can add protection rules to it, such as a required
reviewer.

### 3. Custom domain

1. Cloudflare dashboard → DNS → Records for `aniketghosh.in`: delete any old
   `A`, `AAAA` or `CNAME` records for `aniketghosh.in` and `www`. A custom
   domain can't be attached while other records hold the name.
2. Workers & Pages → `aniketghosh-in` → Settings → Domains & Routes → Add →
   Custom domain → `aniketghosh.in`. Cloudflare creates the DNS record and
   the TLS certificate.
3. Optional: add `www.aniketghosh.in` the same way, then a redirect rule
   (Rules → Redirect Rules) sending `www` to the apex with a 301.

### 4. Cloudflare settings to leave off

These rewrite or inject scripts and would break the hash-based CSP:

- Speed → Optimization → **Rocket Loader**: off.
- Web Analytics **automatic setup**: off (use the config flag above instead).

### Deploying by hand

```bash
npm run build && npx wrangler@4.151.3 deploy
```

CI pins wrangler with `wranglerVersion` in `.github/workflows/ci.yml`;
Dependabot doesn't update that string, so bump it occasionally.

## CI checks

`.github/workflows/ci.yml` runs on every pull request and on pushes to
`main`:

| Step            | Command                    | Fails when                                               |
| --------------- | -------------------------- | -------------------------------------------------------- |
| Formatting      | `npm run format:check`     | Prettier would change a file                             |
| Lint            | `npm run lint`             | ESLint errors                                            |
| Markdown lint   | `npm run lint:md`          | markdownlint errors (config: `.markdownlint-cli2.jsonc`) |
| Build           | `npm run build`            | type errors, invalid frontmatter, failed diagram         |
| Broken links    | `npm run check:links`      | a link, image or `#fragment` doesn't resolve             |
| CSP check       | `npm run check:csp`        | any page logs a CSP violation or JS error                |
| Lighthouse      | `npm run check:lighthouse` | any category below 95 (median of 3 runs)                 |
| Secret scan     | Gitleaks                   | a secret appears anywhere in git history                 |
| Deploy (`main`) | `wrangler deploy`          | runs only if everything above passed                     |

`npm run check` runs all of these except Gitleaks locally. To scan for
secrets locally, install [Gitleaks](https://github.com/gitleaks/gitleaks)
and run `gitleaks git .`.

The link checker rewrites `https://aniketghosh.in/` links to local paths, and
skips LinkedIn and X share links, which block automated requests.

Workflow hardening: every action is pinned to a commit SHA (with the version
in a comment), the default token permission is `contents: read`, checkout
doesn't persist credentials, and Dependabot opens weekly grouped PRs for npm
packages and GitHub Actions.

## Security headers

`dist/_headers` is **generated** after each build by
`src/integrations/securityHeaders.ts`. Don't add a `public/_headers`. It sets:

- **Content-Security-Policy**: `script-src 'self'` plus the SHA-256 hash of
  each inline script found in the built HTML. The hashes are recomputed on
  every build, so editing an inline script can't silently break the site.
  `style-src` allows `'unsafe-inline'` because Shiki colours code with inline
  `style` attributes. Images allow `data:` for the rendered Mermaid SVGs.
  Frames are blocked.
- **Strict-Transport-Security**: one year, including subdomains. Add
  `preload` only once you're sure every subdomain will always serve HTTPS.
- **X-Content-Type-Options**, **X-Frame-Options**, **Referrer-Policy**,
  **Permissions-Policy**, **Cross-Origin-Opener-Policy**.
- Long-lived immutable caching for hashed assets under `/_astro/`.

To embed something later, such as a public Grafana dashboard on the Status
page, pass its origin in `frameSrc` where the integration is registered in
`astro.config.ts`:

```ts
securityHeaders({ frameSrc: ["https://grafana.example.com"] }),
```

## Placeholders to replace

These are marked `PLACEHOLDER` and exist to show the format:

- `src/content/pages/about.md`: bio
- `src/data/experience.yaml`: experience entries
- `src/data/tech.yaml`: tech groups
- `src/content/projects/sample-rate-limiter.md`: sample project
- `public/resume.pdf`: placeholder PDF
- `src/content/posts/example-post.md`: formatting reference; delete or keep
  it as a `draft: true` cheat sheet

## Credits

Theme: [AstroPaper](https://github.com/satnaing/astro-paper) by Sat Naing,
MIT licensed (see `LICENSE-astro-paper`).
