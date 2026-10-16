import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";
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

export const collections = { posts, pages };
