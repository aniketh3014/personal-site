import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";

type Options = {
  /** Allow the Cloudflare Web Analytics beacon in the CSP. */
  cloudflareAnalytics?: boolean;
  /** Extra origins allowed in frame-src, e.g. a public Grafana dashboard. */
  frameSrc?: string[];
};

// Cloudflare ignores _headers lines longer than this.
const MAX_LINE = 2000;

async function htmlFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter(e => e.isFile() && e.name.endsWith(".html"))
    .map(e => join(e.parentPath, e.name));
}

/** sha256 sources for every executable inline <script> in the built HTML. */
async function inlineScriptHashes(dir: string): Promise<string[]> {
  const hashes = new Set<string>();
  for (const file of await htmlFiles(dir)) {
    const html = await readFile(file, "utf8");
    for (const [, attrs, body] of html.matchAll(
      /<script\b([^>]*)>([\s\S]*?)<\/script>/g
    )) {
      // External scripts are covered by 'self'; JSON-LD is data, not code.
      if (
        /\bsrc\s*=/.test(attrs) ||
        /type="application\/(ld\+)?json"/.test(attrs)
      )
        continue;
      const digest = createHash("sha256").update(body).digest("base64");
      hashes.add(`'sha256-${digest}'`);
    }
  }
  return [...hashes].sort();
}

/**
 * Writes dist/_headers (Cloudflare static assets) after the build, with a CSP that
 * allows exactly the inline scripts the build produced. Inline styles stay
 * allowed: Shiki emits per-token style attributes, which hashes can't cover.
 */
export default function securityHeaders(opts: Options = {}): AstroIntegration {
  return {
    name: "security-headers",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const outDir = fileURLToPath(dir);
        const scriptHashes = await inlineScriptHashes(outDir);
        const analytics = opts.cloudflareAnalytics ?? false;

        const csp = {
          "default-src": ["'self'"],
          "script-src": [
            "'self'",
            ...scriptHashes,
            ...(analytics ? ["https://static.cloudflareinsights.com"] : []),
          ],
          "style-src": ["'self'", "'unsafe-inline'"],
          "img-src": ["'self'", "data:"],
          "font-src": ["'self'"],
          "connect-src": [
            "'self'",
            ...(analytics ? ["https://cloudflareinsights.com"] : []),
          ],
          "frame-src": opts.frameSrc?.length ? opts.frameSrc : ["'none'"],
          "object-src": ["'none'"],
          "base-uri": ["'self'"],
          "form-action": ["'self'"],
          "frame-ancestors": ["'none'"],
          "upgrade-insecure-requests": [],
        };
        const cspValue = Object.entries(csp)
          .map(([k, v]) => [k, ...v].join(" "))
          .join("; ");

        const headers = [
          "/*",
          `  Content-Security-Policy: ${cspValue}`,
          "  Strict-Transport-Security: max-age=31536000; includeSubDomains",
          "  X-Content-Type-Options: nosniff",
          "  X-Frame-Options: DENY",
          "  Referrer-Policy: strict-origin-when-cross-origin",
          "  Permissions-Policy: accelerometer=(), browsing-topics=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
          "  Cross-Origin-Opener-Policy: same-origin",
          "",
          "/_astro/*",
          "  Cache-Control: public, max-age=31536000, immutable",
          "",
        ];

        const tooLong = headers.find(line => line.length > MAX_LINE);
        if (tooLong) {
          throw new Error(
            `_headers line is ${tooLong.length} chars (Cloudflare limit ${MAX_LINE}). ` +
              "Too many distinct inline scripts; move some into bundled <script> tags."
          );
        }

        await writeFile(join(outDir, "_headers"), headers.join("\n"));
        logger.info(
          `wrote _headers (${scriptHashes.length} inline script hashes)`
        );
      },
    },
  };
}
