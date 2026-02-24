import { getCollection, type CollectionEntry } from "astro:content";

export type BlogPost = CollectionEntry<"blog">;

export function sortPosts(posts: BlogPost[]): BlogPost[] {
  return [...posts].sort((a, b) => {
    const dateDelta = Date.parse(b.data.date) - Date.parse(a.data.date);
    if (dateDelta !== 0) return dateDelta;
    return a.slug.localeCompare(b.slug);
  });
}

export function formatTagLabel(tag: string): string {
  return tag
    .split("-")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

export function isPublished(post: BlogPost): boolean {
  return !post.data.draft;
}

export async function getPublishedPosts(): Promise<BlogPost[]> {
  const posts = await getCollection("blog");
  return sortPosts(posts.filter(isPublished));
}
