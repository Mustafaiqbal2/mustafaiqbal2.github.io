# mustafaiqbal2.github.io

Portfolio of Mustafa Iqbal — software engineer and founder. A scroll-driven landing page and a set of case-study pages, exported as a static site.

## Stack

- Next.js (App Router, `output: "export"`) + TypeScript
- GSAP ScrollTrigger + Lenis for the landing page's scroll scenes
- Plain CSS: `app/landing.css` (landing, scoped under `.lv`), `app/work.css` (work pages, scoped under `.wk`), `app/globals.css` (shared chrome: footer, buttons, reveals, lightbox)

## Commands

```bash
npm install
npm run dev        # local dev server
npm run typecheck  # tsc --noEmit
npm run build      # static export to out/
```

## Content

- `data/case-studies.json` — the six case studies rendered at `/work/` and `/work/<slug>/`
- `data/portfolio.ts` — profile, secondary projects, media, routes

Edit those files for content changes; the section markup stays put.

## Deployment

Push to `main`. `.github/workflows/pages.yml` builds the static export and deploys `out/` to GitHub Pages (source must be set to **GitHub Actions** in the repo settings). Feature work happens on `revamp`, then fast-forwards into `main`.

## Links

- Site: https://mustafaiqbal2.github.io
- GitHub: https://github.com/Mustafaiqbal2
- LinkedIn: https://www.linkedin.com/in/mustafa-iqbal-ba42b424b/

- and a lil more
