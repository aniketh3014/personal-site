import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    url: "https://aniketghosh.in/",
    title: "Aniket Ghosh",
    description: "Backend engineer building reliable systems in Go.",
    author: "Aniket Ghosh",
    profile: "https://aniketghosh.in/about/",
    lang: "en",
    timezone: "Asia/Kolkata",
    dir: "ltr",
  },
  home: {
    headline: "Backend engineer building reliable systems in Go.",
    intro:
      "I build backend services in Go and TypeScript: APIs, schedulers and distributed systems, deployed on AWS. I'm a Software Engineer at Optraflow and Technical Lead at SkyBrance, moving deeper into platform engineering and DevOps. This site is where my technical write-ups live.",
    featuredProjects: 4,
  },
  posts: {
    perPage: 10,
    perIndex: 5,
    scheduledPostMargin: 15 * 60 * 1000,
  },
  features: {
    lightAndDarkMode: true,
    dynamicOgImage: true,
    showBackButton: true,
    editPost: { enabled: false },
    search: false,
  },
  analytics: {
    // Cloudflare Web Analytics. Off unless enabled AND a token is set.
    // The beacon token is public by design: it ships in every page's HTML
    // and only identifies the analytics site, so it is not a secret.
    cloudflare: {
      enabled: true,
      token: "3b218c51af7844fe9f00d9a8d2fd4a12", // gitleaks:allow
    },
  },
  socials: [
    { name: "github", url: "https://github.com/aniketh3014" },
    {
      name: "linkedin",
      url: "https://www.linkedin.com/in/aniket-ghosh-8b0b53281/",
    },
    { name: "mail", url: "mailto:ghoshaniket050@gmail.com" },
  ],
  shareLinks: [
    { name: "x", url: "https://x.com/intent/post?url=" },
    {
      name: "linkedin",
      url: "https://www.linkedin.com/sharing/share-offsite/?url=",
    },
    { name: "mail", url: "mailto:?subject=See%20this%20post&body=" },
  ],
});
