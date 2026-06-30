# Mustafa Iqbal Portfolio

Evidence-driven portfolio for Mustafa Iqbal, a software engineer focused on AI automation, full-stack product systems, RAG workflows, OAuth-heavy integrations, and systems depth.

## Stack

- Next.js + TypeScript
- Static export compatible with GitHub Pages
- Vercel-ready with no server dependency
- Local typed content model for projects, experience, skills, and SEO
- System-aware light/dark theme with manual override
- Branded GitHub/LinkedIn links and optimized static assets

## Commands

```bash
npm install
npm run prepare:media
npm run typecheck
npm run dev
npm run build
npm run verify:site
```

`npm run build` emits the static site to `out/`.

## Content

Primary content lives in `data/portfolio.ts`. Update that file for project/case-study edits instead of changing section markup directly.

## Deployment

Vercel can import this repository directly.

GitHub Pages is supported for the `mustafaiqbal2.github.io` user site:

1. Push to the `main` branch.
2. In GitHub, set Pages source to **GitHub Actions**.
3. `.github/workflows/pages.yml` runs `npm ci`, `npm run build`, and deploys the static `out/` artifact.

The current Next config uses `output: "export"`, `trailingSlash: true`, and unoptimized images, so the exported site works on GitHub Pages without a server.

## Links

- Site: https://mustafaiqbal2.github.io
- GitHub: https://github.com/Mustafaiqbal2
- LinkedIn: https://www.linkedin.com/in/mustafa-iqbal-ba42b424b/
