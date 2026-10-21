// Lighthouse CI against the built site. Run `npm run build` first.
// Locally, point CHROME_PATH at a Chromium (see README).
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
