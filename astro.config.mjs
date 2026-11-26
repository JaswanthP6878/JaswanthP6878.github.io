import { defineConfig } from 'astro/config';

import mdx from "@astrojs/mdx";
import remarkMath from "remark-math";
import rehypeMathjax from "rehype-mathjax";

// https://astro.build/config
export default defineConfig({
  site: 'https://jaswanthp6878.github.io',
  integrations: [mdx()],
  markdown: {
    // Prism emits class-based tokens, which the site's own CSS colors (see BaseLayout).
    syntaxHighlight: 'prism',
    // LaTeX math: $inline$ and $$display$$ blocks, rendered to SVG with MathJax at build time
    // (no client-side JavaScript). MDX posts inherit these plugins.
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeMathjax]
  }
});
