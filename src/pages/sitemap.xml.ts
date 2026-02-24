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
  const staticPages = ["/", "/blog/", "/blog/by-tags/"];
  const allPaths = [
    ...staticPages.map((path) => ({
      path,
      lastmod: null as string | null
    })),
    ...posts.map((post) => ({
      path: `/blog/${post.slug}/`,
      lastmod: `${post.data.date}T00:00:00.000Z`
    }))
  ];

  const urls = allPaths
    .map(({ path, lastmod }) => {
      const loc = new URL(path, site).toString();
      if (!lastmod) {
        return `<url><loc>${escapeXml(loc)}</loc></url>`;
      }
      return `<url><loc>${escapeXml(loc)}</loc><lastmod>${escapeXml(lastmod)}</lastmod></url>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8"
    }
  });
}
