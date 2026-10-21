// Lighthouse CI against the built site. Run `npm run build` first.
// Uses Playwright's Chromium unless CHROME_PATH is set.
const { chromium } = require("playwright");

module.exports = {
  ci: {
    collect: {
      staticDistDir: "./dist",
      url: [
        "/",
        "/blog/",
        "/blog/example-post/",
        "/projects/",
        "/projects/sample-rate-limiter/",
        "/about/",
      ],
      // 3 runs, asserted on the median: one cold-start run can't fail a PR.
      numberOfRuns: 3,
      chromePath: process.env.CHROME_PATH || chromium.executablePath(),
      settings: {
        // Required inside CI containers; harmless locally.
        chromeFlags: "--no-sandbox --headless=new",
      },
    },
    assert: {
      assertions: {
        "categories:performance": [
          "error",
          { minScore: 0.95, aggregationMethod: "median" },
        ],
        "categories:accessibility": [
          "error",
          { minScore: 0.95, aggregationMethod: "median" },
        ],
        "categories:best-practices": [
          "error",
          { minScore: 0.95, aggregationMethod: "median" },
        ],
        "categories:seo": [
          "error",
          { minScore: 0.95, aggregationMethod: "median" },
        ],
      },
    },
    upload: { target: "filesystem", outputDir: "./.lighthouseci" },
  },
};
