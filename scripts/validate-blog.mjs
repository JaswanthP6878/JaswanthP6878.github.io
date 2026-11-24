import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const blogDir = join(process.cwd(), "src/content/blog");
const files = (await readdir(blogDir)).filter((file) => file.endsWith(".md") || file.endsWith(".mdx"));

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const errors = [];

for (const file of files) {
  const fullPath = join(blogDir, file);
  const raw = await readFile(fullPath, "utf8");
  const frontmatter = raw.match(/^---\n([\s\S]*?)\n---/);

  if (!frontmatter) {
    errors.push(`${file}: missing frontmatter block`);
    continue;
  }

  const fm = frontmatter[1];
  const dateMatch = fm.match(/^date:\s*["']?([^"'\n]+)["']?$/m);
  if (!dateMatch || !datePattern.test(dateMatch[1].trim())) {
    errors.push(`${file}: date must be YYYY-MM-DD`);
  }

  // Tags are free-form and validated by the content schema (src/content/config.ts) at build time.
}

if (errors.length > 0) {
  console.error("Blog validation failed:\n");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Validated ${files.length} blog posts.`);
