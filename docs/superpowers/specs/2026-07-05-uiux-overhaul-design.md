# UI/UX Overhaul — "Operations Console" Design Spec

Date: 2026-07-05
Status: Approved (all design and content decisions delegated to Claude by Mustafa)
Scope: Full visual redesign of mustafaiqbal2.github.io (Next.js 15 static export, GitHub Pages)

## Intent

Take the portfolio from "polished template" to a distinctive identity. The unifying idea comes
from Mustafa's actual work: automation pipelines whose state is inspectable — syncs, filters,
drafts, approvals, caches, provenance. The site presents itself as a calm **operations console**:
every project is a system with live telemetry, and the design vocabulary (status LEDs, mono
labels, traces, counters) is the vocabulary of his products. Audience is mixed (founders,
recruiters, clients), so the console styling stays legible and professional — instrumentation,
not sci-fi.

## Design tokens

### Color — three-hue semantic system

Dark is the flagship theme; light is a "blueprint paper" counterpart. Theme preference behavior
(system/light/dark toggle) is unchanged.

Dark:
- `--bg` #070B14 (deep blue-ink, never neutral black), `--bg-raised` #0B1120, `--surface` #0F1626
- `--ink` #E9EEF8, `--muted` #94A3BE
- `--line` rgba(148,163,190,.14)
- Aqua `--primary` #22D3EE — actions, links, structure. The only interactive color.
- Violet `--accent` #8B5CF6 — atmosphere only (aurora washes, gradients). Never on controls.
- Amber `--signal` #FFB454 — **live-telemetry semantics only**: status dots, featured metrics,
  count-up numbers, packet pulses in the trace. Amber is a rule, not a decoration; if it is
  amber, it means "live/measured".

Light:
- `--bg` #F4F6FB cool paper, `--surface` #FFFFFF, `--ink` #0B1120
- Aqua #0E7490, violet #6D28D9, amber #B45309 (same semantic rules)

### Typography

- Display: **Bricolage Grotesque** (Google, variable) — replaces Instrument Serif. Weights
  650–800, tracking -0.03em, leading ~0.95. Hero at clamp(2.9rem, 7.2vw, 6.2rem).
- Body: **Geist** (kept) 1rem/1.7.
- Telemetry/labels: **Geist Mono** (kept) 0.72–0.8rem, uppercase, +0.14em tracking.
  Every eyebrow, status label, metric label, and nav link uses mono.

### Layout & texture

- Section rhythm ~96–112px desktop; content width unchanged (min(1760px, …)).
- Hero grid texture replaced by a fine dotted "plot grid" + aurora wash (aqua→violet radial,
  very low alpha) + film grain (SVG noise, ~3% opacity).
- Radius stays 8px; borders 1px; shadows become glows (color-mix with aqua/amber) on dark.

## Signature element — the Workflow Trace

One bold move, spent in the hero. A full-bleed `<canvas>` behind the home hero renders his real
pipeline — SYNC → FILTER → DRAFT → APPROVE → PUBLISH — as a constellation: aqua nodes and dim
edges, with amber light packets slowly traveling edge to edge. Nodes carry tiny mono labels.
Slow parallax with pointer. Vanilla JS in the existing global script (no dependencies),
devicePixelRatio-aware, paused when tab hidden, static (pre-drawn, no packets) under
prefers-reduced-motion, hidden under 680px width (mobile gets the aurora wash only).

## Page-level changes

### Home (structural rebuild)
1. **Hero**: full-viewport. Mono status line with pulsing amber dot ("OPEN TO REMOTE ROLES —
   RAWALPINDI, PK — UTC+5"), stacked Bricolage headline revealed line by line, one-sentence
   sub, actions. Workflow Trace behind. New H1: **"I build AI automation that survives
   contact with production."**
2. **Telemetry band**: proof metrics as mono-labeled counters; numbers count up on scroll
   (amber). Replaces home-signal-strip + proof band duplication.
3. **Stack marquee**: slow mono marquee of the real stack (Next.js · FastAPI · Prisma ·
   Pinecone · CUDA …), pauses on hover, off under reduced motion.
4. **Selected work**: full-width "system dossier" cards (see components).
5. Focus/principles sections re-skinned under new tokens.

### Work / Resume / About / Contact / Case studies (re-skin)
Inherit the new tokens, type, and section headers through shared classes. Case-study bespoke
layouts (platform/performance/classification/cad/music/rag) are kept — they are good IA — and
restyled. Project hero areas get the dotted plot grid + aurora treatment. Numbered markers stay
only where order is real (build loop, pipeline stages); decorative numbering elsewhere is
removed (about operating notes).

## Components

- **Header**: transparent over hero, gains blur + border after ~24px scroll (data-scrolled
  attribute set by global script). Nav links become mono uppercase; active link gets an amber
  dot. Home gradient-text treatment removed (violet is atmosphere-only now).
- **Project cards**: status LED (amber pulse for "Private product"/live systems), media pane,
  mono telemetry row (featured metric + two metrics), pointer-tracked spotlight border
  (radial-gradient at cursor via CSS vars; hover-capable devices only).
- **Buttons**: primary = aqua fill with soft glow; ghost = 1px line, fills on hover. Shine
  sweep removed (replaced by glow) — quieter.
- **Footer**: oversized Bricolage wordmark, mono sitemap columns, closing status line with
  amber dot ("STATUS: OPEN TO REMOTE ROLES").

## Motion system

- Load: orchestrated hero sequence (status line → headline lines clip-reveal stagger →
  sub/actions fade → trace fades in). ~900ms total, cubic-bezier(0.16,1,0.3,1).
- Scroll: `.reveal` upgraded to translateY(18px) + blur(6px) + opacity; existing
  IntersectionObserver kept.
- Counters: IntersectionObserver count-up for `[data-count-up]`, ~1.1s, respects reduced motion
  (jumps straight to value).
- Hover: card spotlight border, link underline sweeps (kept), button glow.
- All motion gated behind prefers-reduced-motion (existing pattern extended).

## Content decisions (delegated)

- New home H1 and tightened hero sub-line ("Revvy, Emmy, and CAD reconstruction — product
  surfaces, queues, retrieval, and recovery paths that behave predictably in real use.").
- Eyebrows rewritten as mono console labels (e.g. "SELECTED WORK — 04 SYSTEMS").
- Everything else content-wise stays: metrics, case studies, resume facts are already strong
  and truthful.

## Constraints & quality floor

- No new runtime dependencies; all motion is vanilla JS in the existing layout script.
- Static export must keep working (`next build`, out/ to GitHub Pages).
- Both themes fully styled; responsive to 320px; keyboard focus visible everywhere;
  reduced-motion honored; contrast ≥ 4.5:1 for text (amber on #070B14 passes).
- Lighthouse: no regression on performance (canvas idles at ~60fps with <1% CPU or is paused).

## Implementation order

1. Foundation: fonts (layout.tsx), tokens + typography + textures (globals.css).
2. Home hero rebuild + Workflow Trace + telemetry band + marquee (page.tsx, layout script).
3. Header/footer restructure.
4. Cards + shared section re-skin (touches all pages via shared classes).
5. Page sweep: work, about, resume, contact, case-study skins.
6. Copy pass (data/portfolio.ts + page copy).
7. Build, visual audit (screenshots light/dark/mobile), commit.
