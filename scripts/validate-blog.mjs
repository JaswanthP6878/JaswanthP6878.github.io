import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const blogDir = join(process.cwd(), "src/content/blog");
const files = (await readdir(blogDir)).filter((file) => file.endsWith(".md") || file.endsWith(".mdx"));

const tagPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
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

  const tagsMatch = fm.match(/^tags:\s*\[(.*)\]\s*$/m);
  if (!tagsMatch) {
    errors.push(`${file}: tags must be inline YAML array`);
  } else {
    const tags = tagsMatch[1]
      .split(",")
      .map((t) => t.trim().replace(/^"|"$/g, "").replace(/^'|'$/g, ""))
      .filter(Boolean);

    if (tags.length === 0) {
      errors.push(`${file}: at least one tag is required`);
    }

    for (const tag of tags) {
      if (!tagPattern.test(tag)) {
        errors.push(`${file}: tag '${tag}' must be lowercase-slug format`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error("Blog validation failed:\n");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Validated ${files.length} blog posts.`);
