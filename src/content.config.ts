import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { file, glob } from "astro/loaders";
import config from "@/config";

export const BLOG_PATH = "src/content/posts";

const posts = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: `./${BLOG_PATH}` }),
  // Authoring frontmatter (see README) is mapped onto the field names the
  // theme components use, so theme code stays close to upstream.
  schema: ({ image }) =>
    z
      .object({
        title: z.string(),
        description: z.string(),
        date: z.coerce.date(),
        updated: z.coerce.date().optional(),
        tags: z.array(z.string()).default(["others"]),
        draft: z.boolean().default(false),
        cover: image().optional(),
        cover_alt: z.string().optional(),
        canonical_url: z.url().optional(),
        featured: z.boolean().optional(),
        author: z.string().default(config.site.author),
        timezone: z.string().optional(),
      })
      .transform(({ date, updated, cover, canonical_url, ...rest }) => ({
        ...rest,
        cover,
        pubDatetime: date,
        modDatetime: updated ?? null,
        ogImage: cover,
        canonicalURL: canonical_url,
        hideEditPost: true,
      })),
});

const pages = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/pages" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    ogImage: z.string().optional(),
    canonicalURL: z.string().optional(),
  }),
});

// Body Markdown holds the "Architecture" and "Key decisions" sections; the
// detail page renders problem → body → results → links around it.
const projects = defineCollection({
  loader: glob({
    pattern: "**/[^_]*.{md,mdx}",
    base: "./src/content/projects",
  }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    problem: z.string(),
    stack: z.array(z.string()),
    role: z.string(),
    results: z.array(z.string()).default([]),
    repo_url: z.url().optional(),
    demo_url: z.url().optional(),
    // A blog post on this site ("/blog/slug/") or an external URL.
    writeup_url: z.string().optional(),
    featured: z.boolean().default(false),
    order: z.number().default(100),
    draft: z.boolean().default(false),
  }),
});

const experience = defineCollection({
  loader: file("src/data/experience.yaml"),
  schema: z.object({
    role: z.string(),
    company: z.string(),
    company_url: z.url().optional(),
    location: z.string().optional(),
    start: z.string(), // e.g. "2023-04"
    end: z.string().optional(), // omit while current
    highlights: z.array(z.string()).min(1).max(4),
  }),
});

const tech = defineCollection({
  loader: file("src/data/tech.yaml"),
  schema: z.object({
    group: z.string(),
    items: z.array(z.string()).min(1),
  }),
});

export const collections = { posts, pages, projects, experience, tech };
