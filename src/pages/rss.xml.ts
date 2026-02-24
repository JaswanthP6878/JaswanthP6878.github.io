import { getPublishedPosts } from "../lib/blog";

function escapeXml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function GET({ site }: { site?: URL }) {
  if (!site) {
    return new Response("Missing site URL", { status: 500 });
  }

  const posts = await getPublishedPosts();
  const items = posts
    .map((post) => {
      const link = new URL(`/blog/${post.slug}/`, site).toString();
      return `<item><title>${escapeXml(post.data.title)}</title><link>${escapeXml(link)}</link><guid>${escapeXml(link)}</guid><pubDate>${new Date(`${post.data.date}T00:00:00.000Z`).toUTCString()}</pubDate><description>${escapeXml(post.data.summary)}</description></item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>JP's blog</title><link>${escapeXml(site.toString())}</link><description>Backend and distributed systems engineering posts.</description><lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${items}</channel></rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8"
    }
  });
}
