# Personal Blog and Portfolio

Source code for my blog and portfolio website, written using Astro.

## Blog content model

- Blog posts live in `src/content/blog/*.md`.
- Frontmatter is schema-validated in `src/content/config.ts`.
- Run `npm run validate:blog` to check frontmatter and dates before deploy.
- Tags are free-form topic names (e.g. `Rust`, `machine learning`); matching ignores case and `-` vs spaces.
- Change to github actions for deployment
