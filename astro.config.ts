import {
  defineConfig,
  envField,
  fontProviders,
  svgoOptimizer,
} from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { unified } from "@astrojs/markdown-remark";
import rehypeCallouts from "rehype-callouts";
import rehypeMermaid from "rehype-mermaid";
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from "@shikijs/transformers";
import { transformerFileName } from "./src/utils/transformers/fileName";
import config from "./astro-paper.config";
import securityHeaders from "./src/integrations/securityHeaders";

export default defineConfig({
  site: config.site.url,
  integrations: [
    mdx(),
    sitemap(),
    securityHeaders({
      cloudflareAnalytics:
        !!config.analytics?.cloudflare?.enabled &&
        !!config.analytics.cloudflare.token,
    }),
  ],
  i18n: {
    locales: ["en"],
    defaultLocale: "en",
    routing: {
      prefixDefaultLocale: false,
    },
  },
  markdown: {
    processor: unified({
      rehypePlugins: [
        rehypeCallouts,
        // Mermaid is rendered to SVG at build time (headless Chromium via
        // Playwright), so no Mermaid JS ships to readers.
        [
          rehypeMermaid,
          {
            strategy: "img-svg",
            mermaidConfig: { theme: "neutral" },
            launchOptions: { channel: "chromium" },
          },
        ],
      ],
    }),
    syntaxHighlight: { type: "shiki", excludeLangs: ["mermaid", "math"] },
    shikiConfig: {
      // Both themes keep comments above 4.5:1 contrast (Lighthouse a11y).
      themes: { light: "github-light-default", dark: "github-dark-default" },
      defaultColor: false,
      wrap: false,
      transformers: [
        transformerFileName({ style: "v2", hideDot: false }),
        transformerNotationHighlight(),
        transformerNotationWordHighlight(),
        transformerNotationDiff({ matchAlgorithm: "v3" }),
      ],
    },
  },
  vite: {
    plugins: [tailwindcss()],
    // Emit bundled scripts as files instead of inlining them. Inline module
    // scripts make the client router inject a data: script, which the CSP
    // blocks; this also keeps the list of CSP script hashes short.
    build: { assetsInlineLimit: 0 },
  },
  fonts: [
    {
      name: "Google Sans Code",
      cssVariable: "--font-google-sans-code",
      provider: fontProviders.google(),
      fallbacks: ["monospace"],
      // Two weights only (code 400, headings 700): every extra face is
      // another request on content-heavy pages.
      weights: [400, 700],
      styles: ["normal", "italic"],
      // woff2 for browsers (smallest); ttf for the OG image renderer (satori
      // can't read woff2; see utils/getFontPathByWeight.ts).
      formats: ["woff2", "ttf"],
    },
    {
      name: "IBM Plex Sans",
      cssVariable: "--font-ibm-plex-sans",
      provider: fontProviders.google(),
      fallbacks: ["sans-serif"],
      weights: [400, 600],
      styles: ["normal", "italic"],
      formats: ["woff2"],
    },
  ],
  env: {
    schema: {
      PUBLIC_GOOGLE_SITE_VERIFICATION: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
    },
  },
  experimental: {
    svgOptimizer: svgoOptimizer(),
  },
});
