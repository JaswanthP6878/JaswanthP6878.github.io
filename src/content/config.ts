import { defineCollection, z } from "astro:content";

const tagPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

const blog = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string().min(8),
    date: z.string().regex(isoDatePattern, "Date must use YYYY-MM-DD"),
    tags: z.array(z.string().regex(tagPattern, "Use lowercase slug tags")).min(1),
    summary: z.string().min(24),
    heroImage: z.string().optional(),
    draft: z.boolean().default(false),
    canonicalUrl: z.string().url().optional(),
    series: z.string().optional(),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional()
  })
});

export const collections = {
  blog
};
