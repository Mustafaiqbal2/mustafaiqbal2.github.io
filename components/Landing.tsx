"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { BlackHole } from "@/components/BlackHole";
import { GalaxyDoodleA, GalaxyDoodleB, ShootingStarDoodle, SketchPortrait } from "@/components/SketchPortrait";

gsap.registerPlugin(ScrollTrigger);

const ArrowUpRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 17L17 7" />
    <path d="M8 7h9v9" />
  </svg>
);

const ArrowDown = () => (
  <svg viewBox="0 0 14 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 1v14" />
    <path d="M1.5 9.5L7 15l5.5-5.5" />
  </svg>
);

/* ---- sleek celestial marks (logo-style line art; strokes travel their paths) ---- */

const GalaxyMark = () => (
  <svg viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <circle cx="60" cy="60" r="3.5" fill="currentColor" stroke="none" />
    <path className="lv-orb__dash" pathLength={100} d="M60 52 a12 12 0 0 1 12 12 a28 28 0 0 1 -28 28" />
    <path className="lv-orb__dash" pathLength={100} d="M60 68 a12 12 0 0 1 -12 -12 a28 28 0 0 1 28 -28" />
  </svg>
);

const PlanetMark = () => (
  <svg viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <circle cx="60" cy="60" r="17" />
    <ellipse className="lv-orb__dash" pathLength={100} cx="60" cy="60" rx="33" ry="9" transform="rotate(-18 60 60)" />
  </svg>
);

const OrbitMark = () => (
  <svg viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <circle cx="60" cy="60" r="9" />
    <circle className="lv-orb__dot" pathLength={100} cx="60" cy="60" r="33" strokeWidth="4" />
    <circle cx="60" cy="60" r="33" strokeWidth="1" opacity="0.35" />
  </svg>
);

const agents = [
  {
    name: "Emmy",
    role: "Email",
    desc: "Sorts a business inbox, labels every email, and keeps a log of why.",
    href: "https://github.com/Mustafaiqbal2/Emmy",
    linkLabel: "GitHub"
  },
  {
    name: "Revvy",
    role: "Reviews",
    desc: "Watches Google reviews and drafts the owner's replies for approval.",
    href: "https://github.com/Mustafaiqbal2/Revvy",
    linkLabel: "GitHub"
  },
  {
    name: "Adsy",
    role: "Ads",
    desc: "Turns a brand brief into finished ad creatives.",
    href: "https://simplabots.com/agents/adsy/",
    linkLabel: "Simplabots"
  },
  {
    name: "Dominic",
    role: "Domains",
    desc: "Hunts available domain names and ranks the candidates.",
    href: "https://simplabots.com/agents/dominic/",
    linkLabel: "Simplabots"
  },
  {
    name: "Quill",
    role: "Content",
    desc: "Writes long-form content from a brief.",
    href: "https://simplabots.com/agents/quill/",
    linkLabel: "Simplabots"
  }
];

const billRows = [
  { n: "01", item: "Excavation to formation level", unit: "m³" },
  { n: "02", item: "Concrete 1:2:4, strip foundation", unit: "m³" },
  { n: "03", item: "Blockwork, 200 mm", unit: "m²" },
  { n: "04", item: "Plaster, internal", unit: "m²" },
  { n: "05", item: "Single-leaf doors", unit: "no." }
];

const tickerText =
  "Now — building ArchPHI  //  running pilonecables.com  //  agents for Simplabots  // ";

/* Production-style ground-floor plan. Walls/windows/doors carry .lv-draw
   (stroke-drawn on scroll); fixtures, labels, dimensions and grid bubbles
   sit in the .lv-plan__text group and fade in once the walls are up. */
function FloorPlan() {
  const wall = { stroke: "#F2F2EE", fill: "none" };
  const thin = { stroke: "#F2F2EE", fill: "none", strokeWidth: 1 };
  const door = { stroke: "#F2F2EE", fill: "none", strokeWidth: 1.4 };
  const swing = { stroke: "#B79CFF", fill: "none", strokeWidth: 1.1 };
  const aux = { stroke: "#6B7080", fill: "none", strokeWidth: 1 };
  return (
    <svg className="lv-plan" viewBox="0 0 575 400" fill="none" aria-hidden="true">
      {/* ---- outer wall, double line; gaps only at the window + entrance ---- */}
      {["M40 40 H100", "M170 40 H520", "M520 40 V340", "M520 340 H400", "M330 340 H296", "M250 340 H40", "M40 340 V40"].map((d) => (
        <path key={d} className="lv-draw" pathLength={1} d={d} {...wall} strokeWidth={2.2} />
      ))}
      {["M48 48 H100", "M170 48 H512", "M512 48 V332", "M512 332 H400", "M330 332 H296", "M250 332 H48", "M48 332 V48"].map((d) => (
        <path key={d} className="lv-draw" pathLength={1} d={d} {...wall} strokeWidth={1.1} />
      ))}
      {/* windows (triple lines + jambs) */}
      {["M100 40 H170", "M100 44 H170", "M100 48 H170", "M100 40 V48", "M170 40 V48", "M330 332 H400", "M330 336 H400", "M330 340 H400", "M330 332 V340", "M400 332 V340"].map((d) => (
        <path key={d} className="lv-draw" pathLength={1} d={d} {...thin} />
      ))}
      {/* entrance jambs */}
      {["M250 332 V340", "M296 332 V340"].map((d) => (
        <path key={d} className="lv-draw" pathLength={1} d={d} {...thin} />
      ))}
      {/* interior walls: one vertical (bedroom), one L for the bath */}
      {["M230 48 V170", "M230 210 V332", "M380 48 V150", "M380 150 H430", "M470 150 H512"].map((d) => (
        <path key={d} className="lv-draw" pathLength={1} d={d} {...wall} strokeWidth={2} />
      ))}
      {/* doors: leaf + quarter swing, hinged at the jamb */}
      <path className="lv-draw" pathLength={1} d="M250 332 V286" {...door} />
      <path className="lv-draw" pathLength={1} d="M296 332 A46 46 0 0 0 250 286" {...swing} />
      <path className="lv-draw" pathLength={1} d="M230 170 H190" {...door} />
      <path className="lv-draw" pathLength={1} d="M230 210 A40 40 0 0 1 190 170" {...swing} />
      <path className="lv-draw" pathLength={1} d="M430 150 V110" {...door} />
      <path className="lv-draw" pathLength={1} d="M470 150 A40 40 0 0 0 430 110" {...swing} />

      {/* ---- fixtures, labels, dimensions, grid — fade group ---- */}
      <g className="lv-plan__text">
        {/* bed */}
        <rect x="64" y="72" width="96" height="140" {...aux} />
        <path d="M64 104 H160" {...aux} />
        {/* sofa + table */}
        <rect x="300" y="240" width="120" height="30" {...aux} />
        <path d="M300 248 H420" {...aux} />
        <circle cx="352" cy="192" r="14" {...aux} />
        {/* bath: basin + wc */}
        <circle cx="408" cy="80" r="9" {...aux} />
        <rect x="478" y="58" width="20" height="10" {...aux} />
        <ellipse cx="488" cy="82" rx="9" ry="12" {...aux} />

        {/* room labels — clear floor only */}
        <text x="139" y="262" textAnchor="middle" fill="#9094A3" fontSize="10" fontFamily="var(--font-mono), monospace" letterSpacing="1">BEDROOM</text>
        <text x="487" y="132" textAnchor="middle" fill="#9094A3" fontSize="10" fontFamily="var(--font-mono), monospace" letterSpacing="1">BATH</text>
        <text x="350" y="300" textAnchor="middle" fill="#9094A3" fontSize="10" fontFamily="var(--font-mono), monospace" letterSpacing="1">LIVING</text>

        {/* dimension chains — bottom */}
        <path d="M40 340 V360 M230 340 V360 M520 340 V360" {...aux} strokeWidth={0.8} />
        <path d="M40 356 H520" {...aux} strokeWidth={0.8} />
        <path d="M36 360 L44 352 M226 360 L234 352 M516 360 L524 352" {...aux} strokeWidth={0.8} />
        <text x="135" y="370" textAnchor="middle" fill="#9094A3" fontSize="9" fontFamily="var(--font-mono), monospace">4 700</text>
        <text x="375" y="370" textAnchor="middle" fill="#9094A3" fontSize="9" fontFamily="var(--font-mono), monospace">7 250</text>
        <path d="M40 366 V382 M520 366 V382" {...aux} strokeWidth={0.8} />
        <path d="M40 378 H520" {...aux} strokeWidth={0.8} />
        <path d="M36 382 L44 374 M516 382 L524 374" {...aux} strokeWidth={0.8} />
        <text x="280" y="392" textAnchor="middle" fill="#9094A3" fontSize="9" fontFamily="var(--font-mono), monospace">11 950</text>
        {/* dimension chain — right */}
        <path d="M520 40 H536 M520 150 H536 M520 340 H536" {...aux} strokeWidth={0.8} />
        <path d="M532 40 V340" {...aux} strokeWidth={0.8} />
        <path d="M528 44 L536 36 M528 154 L536 146 M528 344 L536 336" {...aux} strokeWidth={0.8} />
        <text x="540" y="99" fill="#9094A3" fontSize="9" fontFamily="var(--font-mono), monospace">2 750</text>
        <text x="540" y="249" fill="#9094A3" fontSize="9" fontFamily="var(--font-mono), monospace">4 750</text>

        {/* grid bubbles */}
        {[
          { x: 40, l: "A" },
          { x: 230, l: "B" },
          { x: 380, l: "C" },
          { x: 520, l: "D" }
        ].map((g) => (
          <g key={g.l}>
            <circle cx={g.x} cy="18" r="9" {...aux} />
            <text x={g.x} y="22" textAnchor="middle" fill="#9094A3" fontSize="10" fontFamily="var(--font-mono), monospace">{g.l}</text>
            <path d={`M${g.x} 27 V40`} {...aux} strokeWidth={0.8} strokeDasharray="3 4" />
          </g>
        ))}
        {[
          { y: 40, l: "1" },
          { y: 150, l: "2" },
          { y: 340, l: "3" }
        ].map((g) => (
          <g key={g.l}>
            <circle cx="14" cy={g.y} r="9" {...aux} />
            <text x="14" y={g.y + 4} textAnchor="middle" fill="#9094A3" fontSize="10" fontFamily="var(--font-mono), monospace">{g.l}</text>
            <path d={`M23 ${g.y} H40`} {...aux} strokeWidth={0.8} strokeDasharray="3 4" />
          </g>
        ))}

        {/* title strip */}
        <text x="40" y="399" fill="#6B7080" fontSize="9" fontFamily="var(--font-mono), monospace" letterSpacing="1">GROUND FLOOR PLAN · 1:100</text>
        <text x="520" y="399" textAnchor="end" fill="#6B7080" fontSize="9" fontFamily="var(--font-mono), monospace" letterSpacing="1">A-101</text>
      </g>
    </svg>
  );
}

/* The interview agent, as actually built (mapped from the Deployment repo):
   a LOOP — orchestrator → chain-of-thought strategy → question generation →
   TTS → candidate → Whisper STT → back to the orchestrator — laid out as a
   ring. Structured CV/JD intake feeds in; the report engine exits on
   conclusion. Shafts draw first, heads land after, labels last, and a pulse
   orbits the loop once it is drawn. */
function TalentFlowDiagram() {
  const box = { stroke: "#0B0C12", fill: "#F2F2EE", strokeWidth: 2 };
  const label = { fill: "#0B0C12", fontSize: "10.5", fontFamily: "var(--font-mono), monospace", letterSpacing: "1" };
  const sub = { fill: "#6E6E68", fontSize: "8.5", fontFamily: "var(--font-mono), monospace", letterSpacing: "1" };
  const nodes: Array<{ cx: number; cy: number; w: number; h: number; l: string; s?: string }> = [
    { cx: 75, cy: 195, w: 130, h: 44, l: "CV/JD INTAKE", s: "STRUCTURED JSON" },
    { cx: 250, cy: 195, w: 140, h: 56, l: "ORCHESTRATOR", s: "MEMORY · GAP CHECKS" },
    { cx: 327.5, cy: 61, w: 130, h: 48, l: "STRATEGY COT" },
    { cx: 482.5, cy: 61, w: 130, h: 48, l: "QUESTION GEN", s: "ANTI-TEMPLATE" },
    { cx: 560, cy: 195, w: 110, h: 44, l: "TTS VOICE" },
    { cx: 482.5, cy: 329, w: 120, h: 44, l: "CANDIDATE" },
    { cx: 327.5, cy: 329, w: 130, h: 44, l: "WHISPER STT" },
    { cx: 105, cy: 329, w: 140, h: 48, l: "REPORT ENGINE", s: "AUDIO + SCORING" }
  ];
  const edges: Array<{ shaft: string; head: string; violet?: boolean }> = [
    { shaft: "M140 195 H168", head: "M180 195 L170 191 L170 199 Z" },
    { shaft: "M266.2 167 L308.6 93.7", head: "M313.6 85 L312.1 95.7 L305.1 91.7 Z", violet: true },
    { shaft: "M392.5 61 H407.5", head: "M417.5 61 L407.5 57 L407.5 65 Z", violet: true },
    { shaft: "M496.4 85 L542.3 164.3", head: "M547.3 173 L545.8 162.3 L538.8 166.3 Z", violet: true },
    { shaft: "M547.3 217 L500.2 298.3", head: "M495.2 307 L503.7 300.3 L496.7 296.3 Z", violet: true },
    { shaft: "M422.5 329 H402.5", head: "M392.5 329 L402.5 333 L402.5 325 Z", violet: true },
    { shaft: "M314.8 307 L271.2 231.7", head: "M266.2 223 L274.7 229.7 L267.7 233.7 Z", violet: true },
    { shaft: "M250 223 V321 Q250 329 242 329 H185", head: "M175 329 L185 325 L185 333 Z" }
  ];
  return (
    <svg className="lv-flow" viewBox="0 0 640 400" fill="none" aria-hidden="true">
      {/* orbiting pulse (under the nodes) */}
      <circle className="lv-flow__pulse" r="3.5" fill="#6D28D9" />
      {/* edge shafts */}
      {edges.map((e) => (
        <path
          key={e.shaft}
          className="lv-draw lv-flow__edge"
          pathLength={1}
          d={e.shaft}
          stroke={e.violet ? "#6D28D9" : "#0B0C12"}
          strokeWidth={e.violet ? 1.8 : 1.6}
          fill="none"
        />
      ))}
      {/* arrowheads (filled, land after their shafts) */}
      {edges.map((e) => (
        <path key={e.head} className="lv-flow__head" d={e.head} fill={e.violet ? "#6D28D9" : "#0B0C12"} />
      ))}
      {/* edge labels (after everything) */}
      <g className="lv-flow__labels">
        <text x="302" y="272" {...sub}>TRANSCRIPT</text>
        <text x="258" y="278" textAnchor="end" {...sub}>ON CONCLUDE</text>
      </g>
      {/* nodes */}
      {nodes.map((n) => (
        <g className="lv-flow__node" key={n.l}>
          <rect x={n.cx - n.w / 2} y={n.cy - n.h / 2} width={n.w} height={n.h} {...box} />
          <text x={n.cx} y={n.cy + (n.s ? -1 : 4)} textAnchor="middle" {...label}>{n.l}</text>
          {n.s ? (
            <text x={n.cx} y={n.cy + 15} textAnchor="middle" {...sub}>{n.s}</text>
          ) : null}
        </g>
      ))}
    </svg>
  );
}

export function Landing() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;

    const mm = gsap.matchMedia(el);

    mm.add(
      {
        desktop: "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
        mobile: "(max-width: 767px) and (prefers-reduced-motion: no-preference)"
      },
      (ctx) => {
        const desktop = Boolean(ctx.conditions?.desktop);
        const q = gsap.utils.selector(el);

        /* ---------- intro (time-based, plays once) ---------- */
        const intro = gsap.timeline({ defaults: { ease: "power4.out" } });
        intro
          .from(q(".lv-hero__name-1 > span"), { xPercent: -60, opacity: 0, duration: 1.1 }, 0.1)
          .from(q(".lv-hero__name-2 > span"), { xPercent: 60, opacity: 0, duration: 1.1 }, 0.18)
          .from(q(".lv-hero__status, .lv-hero__foot"), { y: 28, opacity: 0, duration: 0.8, stagger: 0.1 }, 0.55);
        // from-states are applied; release the pre-paint gate
        document.documentElement.classList.remove("lv-intro");

        /* ---------- hero parallax out ---------- */
        gsap.to(q(".lv-hero__name"), {
          yPercent: -14,
          ease: "none",
          scrollTrigger: { trigger: q(".lv-hero")[0], start: "top top", end: "bottom top", scrub: 0.6 }
        });
        gsap.to(q(".lv-hero__foot"), {
          yPercent: -40,
          opacity: 0,
          ease: "none",
          scrollTrigger: { trigger: q(".lv-hero")[0], start: "top top", end: "70% top", scrub: 0.6 }
        });

        /* ---------- ArchPHI: pin + draw the plan into a bill ---------- */
        {
          const section = q(".lv-arch")[0];
          const tl = gsap.timeline({
            scrollTrigger: desktop
              ? { trigger: section, start: "top top", end: "+=200%", pin: true, scrub: 0.8, anticipatePin: 1 }
              : { trigger: section, start: "top 70%", end: "bottom 60%", scrub: 0.8 }
          });
          tl.from(q(".lv-arch .lv-h2 .lv-line > span"), { yPercent: 110, stagger: 0.08, duration: 0.5 }, 0)
            .from(q(".lv-arch__copy .lv-body, .lv-arch__copy .lv-link"), { y: 32, opacity: 0, stagger: 0.08, duration: 0.4 }, 0.12)
            .from(q(".lv-bill"), { opacity: 0, duration: 0.25 }, 0.1)
            .fromTo(
              q(".lv-plan .lv-draw"),
              { strokeDashoffset: 1 },
              { strokeDashoffset: 0, stagger: 0.022, duration: 1.1, ease: "none" },
              0.15
            )
            .from(q(".lv-plan__text"), { opacity: 0, duration: 0.35 }, 1.35)
            .fromTo(q(".lv-arch__arrow path"), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.3, ease: "none" }, 1.45)
            .from(q(".lv-bill__row"), { x: 40, opacity: 0, stagger: 0.1, duration: 0.4 }, 1.6)
            .from(q(".lv-arch .lv-caption"), { opacity: 0, duration: 0.35 }, 2.1);
        }

        /* ---------- Fleet: pinned horizontal pan ---------- */
        {
          const section = q(".lv-fleet")[0];
          const track = q(".lv-fleet__track")[0] as HTMLElement;
          gsap.from(q(".lv-fleet__head > *"), {
            y: 36,
            opacity: 0,
            stagger: 0.08,
            scrollTrigger: { trigger: section, start: "top 75%", end: "top 40%", scrub: 0.8 }
          });
          if (desktop && track) {
            gsap.to(track, {
              x: () => -(track.scrollWidth - el.clientWidth),
              ease: "none",
              scrollTrigger: {
                trigger: section,
                start: "top top",
                end: "+=260%",
                pin: true,
                scrub: 0.8,
                anticipatePin: 1,
                invalidateOnRefresh: true
              }
            });
          } else {
            gsap.utils.toArray<HTMLElement>(q(".lv-card")).forEach((card) => {
              gsap.from(card, {
                y: 48,
                opacity: 0,
                scrollTrigger: { trigger: card, start: "top 88%", end: "top 60%", scrub: 0.8 }
              });
            });
          }
        }

        /* ---------- Pilone: pin + counters ---------- */
        {
          const section = q(".lv-pilone")[0];
          const clicksEl = q(".lv-fig__clicks")[0] as HTMLElement;
          const counter = { v: 1070 };
          const tl = gsap.timeline({
            scrollTrigger: desktop
              ? { trigger: section, start: "top top", end: "+=200%", pin: true, scrub: 0.8, anticipatePin: 1 }
              : { trigger: section, start: "top 70%", end: "bottom 60%", scrub: 0.8 }
          });
          tl.from(q(".lv-pilone .lv-h2 .lv-line > span"), { yPercent: 110, stagger: 0.08, duration: 0.5 }, 0)
            .from(q(".lv-pilone__copy .lv-body, .lv-pilone__copy .lv-link"), { y: 32, opacity: 0, stagger: 0.08, duration: 0.4 }, 0.12)
            .from(q(".lv-fig--clicks"), { y: 40, opacity: 0, duration: 0.4 }, 0.35)
            .fromTo(
              counter,
              { v: 204 },
              {
                v: 1070,
                duration: 1.2,
                ease: "none",
                onUpdate: () => {
                  if (clicksEl) clicksEl.textContent = Math.round(counter.v).toLocaleString("en-US");
                }
              },
              0.4
            )
            .from(q(".lv-fig--position"), { y: 40, opacity: 0, duration: 0.5 }, 1.2)
            .from(q(".lv-fig--ai"), { y: 40, opacity: 0, duration: 0.5 }, 1.6)
            .from(q(".lv-pilone .lv-caption"), { opacity: 0, duration: 0.4 }, 2.0);
        }

        /* ---------- TalentFlow: pin + the interview loop ---------- */
        {
          const section = q(".lv-talent")[0];
          const tl = gsap.timeline({
            scrollTrigger: desktop
              ? { trigger: section, start: "top top", end: "+=220%", pin: true, scrub: 0.8, anticipatePin: 1 }
              : { trigger: section, start: "top 72%", end: "bottom 55%", scrub: 0.8 }
          });
          tl.from(q(".lv-talent .lv-h2 .lv-line > span"), { yPercent: 110, stagger: 0.08, duration: 0.5 }, 0)
            .from(q(".lv-talent__copy .lv-body"), { y: 32, opacity: 0, stagger: 0.08, duration: 0.4 }, 0.12)
            .from(q(".lv-flow__node"), { opacity: 0, scale: 0.92, transformOrigin: "center", stagger: 0.07, duration: 0.3 }, 0.25);
          const shafts = q(".lv-flow__edge");
          const heads = q(".lv-flow__head");
          let at = 0.85;
          shafts.forEach((shaft, i) => {
            tl.fromTo(shaft, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.16, ease: "none" }, at);
            if (heads[i]) tl.fromTo(heads[i], { opacity: 0 }, { opacity: 1, duration: 0.06 }, at + 0.14);
            at += 0.2;
          });
          tl.from(q(".lv-flow__labels"), { opacity: 0, duration: 0.25 }, at)
            .fromTo(q(".lv-flow__pulse"), { opacity: 0 }, { opacity: 1, duration: 0.15 }, at + 0.15)
            .from(q(".lv-talent .lv-caption"), { opacity: 0, duration: 0.3 }, at + 0.15);
        }

        /* ---------- About me: title → Gargantua → sketchbook ---------- */
        {
          const section = q(".lv-about")[0] as HTMLElement;
          const bhWrap = q(".lv-about__bh")[0] as HTMLElement;
          const bhRoot = q("[data-bh-root]")[0] as HTMLElement;
          if (desktop) {
            section.classList.add("lv-about--live");
            const tl = gsap.timeline({
              scrollTrigger: { trigger: section, start: "top top", end: "+=380%", pin: true, scrub: 0.8, anticipatePin: 1 }
            });
            tl.fromTo(q(".lv-about__title"), { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 0.4 }, 0)
              .to(q(".lv-about__title"), { opacity: 0, y: -40, scale: 0.96, duration: 0.3 }, 0.55)
              .fromTo(bhWrap, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.45 }, 0.7);
            if (bhRoot) {
              tl.fromTo(bhRoot, { attr: { "data-intensity": 0.2 } }, { attr: { "data-intensity": 1 }, duration: 1.7, ease: "none" }, 0.7);
            }
            tl.fromTo(q(".lv-about__love"), { opacity: 0 }, { opacity: 1, duration: 0.3 }, 1.2)
              .to(bhWrap, { x: 3, y: -2, duration: 0.045, repeat: 9, yoyo: true, ease: "none" }, 1.95)
              .set(bhWrap, { x: 0, y: 0 }, 2.42)
              .to(bhWrap, { opacity: 0, scale: 1.05, duration: 0.3 }, 2.5)
              .to(q(".lv-about__love"), { opacity: 0, duration: 0.2 }, 2.5)
              .fromTo(q(".lv-about__paper"), { opacity: 0 }, { opacity: 1, duration: 0.35 }, 2.55)
              .fromTo(q(".lv-about__sketch"), { opacity: 0 }, { opacity: 1, duration: 0.25 }, 2.8)
              .fromTo(
                q(".lv-about__sketch .sk-draw"),
                { strokeDashoffset: 1 },
                { strokeDashoffset: 0, stagger: 0.011, duration: 0.9, ease: "none" },
                2.85
              )
              .from(q(".lv-about__list li"), { y: 30, opacity: 0, stagger: 0.12, duration: 0.35 }, 3.6);
          } else {
            gsap.from(q(".lv-about__title"), {
              y: 40,
              opacity: 0,
              scrollTrigger: { trigger: section, start: "top 80%", end: "top 55%", scrub: 0.8 }
            });
            gsap.from(bhWrap, {
              scale: 0.86,
              opacity: 0,
              scrollTrigger: { trigger: bhWrap, start: "top 85%", end: "top 45%", scrub: 0.8 }
            });
            const sk = q(".lv-about__sketch")[0];
            gsap.fromTo(
              q(".lv-about__sketch .sk-draw"),
              { strokeDashoffset: 1 },
              {
                strokeDashoffset: 0,
                stagger: 0.008,
                ease: "none",
                scrollTrigger: { trigger: sk, start: "top 80%", end: "top 20%", scrub: 0.8 }
              }
            );
            gsap.from(q(".lv-about__list li"), {
              y: 24,
              opacity: 0,
              stagger: 0.08,
              scrollTrigger: { trigger: q(".lv-about__list")[0], start: "top 88%", end: "top 60%", scrub: 0.8 }
            });
          }
        }

        /* ---------- Contact ---------- */
        gsap.from(q(".lv-contact__inner > *"), {
          y: 44,
          opacity: 0,
          stagger: 0.1,
          scrollTrigger: { trigger: q(".lv-contact")[0], start: "top 80%", end: "top 45%", scrub: 0.8 }
        });

        return () => {
          intro.kill();
          (q(".lv-about")[0] as HTMLElement)?.classList.remove("lv-about--live");
        };
      }
    );

    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener("load", onLoad);
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => ScrollTrigger.refresh()).catch(() => {});
    }

    return () => {
      window.removeEventListener("load", onLoad);
      mm.revert();
    };
  }, []);

  return (
    <main id="main" className="lv" ref={root}>
      {/* ================= Hero ================= */}
      <section className="lv-hero" aria-label="Intro">
        <span className="lv-orb lv-orb--ink lv-orb--sm" style={{ right: "8%", top: "30%" }} aria-hidden="true"><OrbitMark /></span>
        <span className="lv-orb lv-orb--ink lv-orb--sm" style={{ left: "38%", bottom: "24%", opacity: 0.3 }} aria-hidden="true"><PlanetMark /></span>
        <div className="lv-hero__status lv-mono">
          <span>Software engineer &amp; founder</span>
          <span>Pakistan</span>
        </div>

        <h1 className="lv-hero__name">
          <span className="lv-line lv-hero__name-1">
            <span>Mustafa</span>
          </span>
          <span className="lv-line lv-hero__name-2">
            <span>Iqbal</span>
          </span>
        </h1>

        <div className="lv-hero__foot">
          <div>
            <p className="lv-hero__statement">
              I build software that has to be right<b>.</b>
            </p>
            <p className="lv-hero__sub">
              AI agents in production, a search platform for a factory, and a company that reads architects&apos; drawings.
            </p>
          </div>
          <div className="lv-hero__cue lv-mono">
            <span>Scroll</span>
            <ArrowDown />
          </div>
        </div>
      </section>

      {/* ================= Ticker ================= */}
      <div className="lv-ticker" aria-hidden="true">
        <div className="lv-ticker__track">
          <span className="lv-ticker__chunk lv-mono">{tickerText}</span>
          <span className="lv-ticker__chunk lv-mono">{tickerText}</span>
        </div>
      </div>

      {/* ================= ArchPHI ================= */}
      <section className="lv-section--ink lv-arch lv-pin lv-space" aria-label="ArchPHI">
        <span className="lv-orb lv-orb--bone lv-orb--sm" style={{ right: "6%", top: "12%" }} aria-hidden="true"><GalaxyMark /></span>
        <span className="lv-orb lv-orb--violet lv-orb--sm" style={{ left: "4%", bottom: "10%" }} aria-hidden="true"><OrbitMark /></span>
        <div className="lv-arch__grid">
          <div className="lv-arch__copy">
            <p className="lv-eyebrow">01 — ArchPHI · Founder &amp; CTO</p>
            <h2 className="lv-h2 lv-display">
              <span className="lv-line">
                <span>Reads the drawing.</span>
              </span>
              <span className="lv-line">
                <span>Writes the bill.</span>
              </span>
            </h2>
            <p className="lv-body">
              ArchPHI turns architectural CAD packages into bills of quantities. It reads what the drawings declare —
              geometry, layers, counts — and where a drawing carries no answer, it says so instead of guessing.
              <b> Coming soon.</b>
            </p>
            <a className="lv-link" href="https://archphi.com" target="_blank" rel="noreferrer">
              archphi.com <ArrowUpRight />
            </a>
          </div>

          <div>
            <div className="lv-arch__visual">
              <FloorPlan />
              <svg className="lv-arch__arrow" viewBox="0 0 56 24" fill="none" aria-hidden="true">
                <path pathLength={1} style={{ strokeDasharray: 1 }} d="M2 12 H46 M38 4 L48 12 L38 20" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="lv-bill" role="presentation">
                {billRows.map((row) => (
                  <div className="lv-bill__row" key={row.n}>
                    <i>{row.n}</i>
                    <span>{row.item}</span>
                    <u />
                    <em>{row.unit}</em>
                  </div>
                ))}
              </div>
            </div>
            <p className="lv-caption lv-mono">Tested on real projects</p>
          </div>
        </div>
      </section>

      {/* ================= Simplabots fleet ================= */}
      <section className="lv-section--bone lv-fleet" aria-label="Simplabots agents">
        <span className="lv-orb lv-orb--ink lv-orb--lg" style={{ left: "3%", top: "4%" }} aria-hidden="true"><GalaxyMark /></span>
        <span className="lv-orb lv-orb--ink lv-orb--sm" style={{ right: "10%", top: "16%" }} aria-hidden="true"><PlanetMark /></span>
        <span className="lv-orb lv-orb--ink" style={{ left: "44%", bottom: "8%" }} aria-hidden="true"><OrbitMark /></span>
        <span className="lv-shoot lv-shoot--ink" style={{ right: "22%", top: "10%", animationDelay: "1.2s" }} aria-hidden="true" />
        <span className="lv-shoot lv-shoot--ink" style={{ left: "30%", top: "24%", animationDelay: "4.6s" }} aria-hidden="true" />
        <div className="lv-fleet__head">
          <div>
            <p className="lv-eyebrow">02 — Simplabots</p>
            <h2 className="lv-h2 lv-display">Five working agents.</h2>
          </div>
          <p className="lv-body">
            Simplabots sells AI agents to small businesses.
          </p>
        </div>

        <div className="lv-fleet__viewport">
          <div className="lv-fleet__track">
            {agents.map((agent) => (
              <article className="lv-card" key={agent.name}>
                <p className="lv-card__role lv-mono">{agent.role}</p>
                <h3 className="lv-card__name">{agent.name}</h3>
                <p className="lv-card__desc">{agent.desc}</p>
                <a className="lv-card__link" href={agent.href} target="_blank" rel="noreferrer">
                  {agent.linkLabel} <ArrowUpRight />
                </a>
              </article>
            ))}
            <article className="lv-card" aria-label="All agents">
              <p className="lv-card__role lv-mono">Platform</p>
              <h3 className="lv-card__name">All agents</h3>
              <p className="lv-card__desc">The full lineup, live on the platform.</p>
              <a className="lv-card__link" href="https://simplabots.com" target="_blank" rel="noreferrer">
                simplabots.com <ArrowUpRight />
              </a>
            </article>
          </div>
        </div>
      </section>

      {/* ================= Pilone ================= */}
      <section className="lv-section--ink lv-pilone lv-pin lv-space" aria-label="PiloneCables">
        <span className="lv-orb lv-orb--bone lv-orb--sm" style={{ right: "5%", bottom: "14%" }} aria-hidden="true"><PlanetMark /></span>
        <span className="lv-orb lv-orb--violet lv-orb--sm" style={{ left: "42%", top: "8%" }} aria-hidden="true"><GalaxyMark /></span>
        <div className="lv-pilone__grid">
          <div className="lv-pilone__copy">
            <p className="lv-eyebrow">03 — pilonecables.com</p>
            <h2 className="lv-h2 lv-display">
              <span className="lv-line">
                <span>A factory site</span>
              </span>
              <span className="lv-line">
                <span>on page one.</span>
              </span>
            </h2>
            <p className="lv-body">
              Pilone manufactures electrical cable in Pakistan. I build and run their site — product pages, guides, and
              sizing calculators generated from factory data, with build checks that fail on broken links or bad schema.
            </p>
            <a className="lv-link" href="https://www.pilonecables.com" target="_blank" rel="noreferrer">
              pilonecables.com <ArrowUpRight />
            </a>
          </div>

          <div className="lv-pilone__figures">
            <div className="lv-fig lv-fig--clicks">
              <div className="lv-fig__big">
                <span className="lv-fig__clicks">1,070</span> <small>clicks</small>
              </div>
              <p className="lv-fig__label lv-mono">Organic clicks, six months — up from 204</p>
            </div>
            <div className="lv-fig lv-fig--position">
              <div className="lv-fig__mid">
                17.8 <b>→</b> 8.4
              </div>
              <p className="lv-fig__label lv-mono">Average position in Google Search</p>
            </div>
            <div className="lv-fig lv-fig--ai">
              <div className="lv-fig__mid">
                0 <b>→</b> 3.9k
              </div>
              <p className="lv-fig__label lv-mono">Impressions in AI search, three months</p>
            </div>
            <p className="lv-caption lv-mono">Google Search Console · Feb–Aug 2026</p>
          </div>
        </div>
      </section>

      {/* ================= TalentFlow ================= */}
      <section className="lv-section--bone lv-talent lv-pin" aria-label="TalentFlow">
        <span className="lv-orb lv-orb--ink lv-orb--sm" style={{ right: "6%", top: "10%" }} aria-hidden="true"><OrbitMark /></span>
        <span className="lv-orb lv-orb--ink lv-orb--sm" style={{ left: "5%", bottom: "10%", opacity: 0.3 }} aria-hidden="true"><GalaxyMark /></span>
        <div className="lv-talent__grid">
          <div className="lv-talent__copy">
            <p className="lv-eyebrow">04 — TalentFlow · Genesys Research Lab</p>
            <h2 className="lv-h2 lv-display">
              <span className="lv-line">
                <span>Recruitment,</span>
              </span>
              <span className="lv-line">
                <span>end to end.</span>
              </span>
            </h2>
            <p className="lv-body">
              An internal recruitment platform. Five candidate sources feed one pipeline: profiles are cleaned,
              embedded, and matched to roles by meaning rather than keywords.
            </p>
            <p className="lv-body">
              A conversational agent then runs the first-round interview. Built by a team of four engineers I led.
            </p>
          </div>
          <div>
            <TalentFlowDiagram />
            <p className="lv-caption lv-mono">The interview agent, as built — Llama 3 on Groq · Whisper STT</p>
          </div>
        </div>
      </section>

      {/* ================= About me — Gargantua + sketchbook ================= */}
      <section className="lv-section--ink lv-about lv-pin lv-space" aria-label="About me">
        <div className="lv-about__paper" aria-hidden="true"></div>
        <div className="lv-about__inner">
          <h2 className="lv-about__title lv-display">About me<b>.</b></h2>
          <div className="lv-about__bh" data-about-bh>
            <BlackHole className="lv-bh2" />
            <p className="lv-about__love lv-mono">I love space</p>
          </div>
          <div className="lv-about__sketch">
            <div className="lv-about__me">
              <SketchPortrait />
            </div>
            <ul className="lv-about__list">
              <li>
                <i>01</i>
                <p>Founder &amp; CTO at ArchPHI.</p>
              </li>
              <li>
                <i>02</i>
                <p>I build agents that do my work.</p>
              </li>
              <li>
                <i>03</i>
                <p>Space, obviously.</p>
              </li>
            </ul>
            <span className="lv-doodle lv-doodle--a" aria-hidden="true">
              <GalaxyDoodleA />
            </span>
            <span className="lv-doodle lv-doodle--b" aria-hidden="true">
              <GalaxyDoodleB />
            </span>
            <span className="lv-doodle lv-doodle--c" aria-hidden="true">
              <ShootingStarDoodle />
            </span>
          </div>
        </div>
      </section>

      {/* ================= Contact ================= */}
      <section className="lv-contact lv-space" aria-label="Contact">
        <span className="lv-orb lv-orb--bone lv-orb--lg" style={{ right: "7%", top: "14%" }} aria-hidden="true"><GalaxyMark /></span>
        <span className="lv-orb lv-orb--violet" style={{ left: "16%", bottom: "24%" }} aria-hidden="true"><OrbitMark /></span>
        <span className="lv-orb lv-orb--bone lv-orb--sm" style={{ right: "28%", bottom: "12%" }} aria-hidden="true"><PlanetMark /></span>
        <span className="lv-shoot" style={{ right: "24%", top: "8%", animationDelay: "0.8s" }} aria-hidden="true" />
        <span className="lv-shoot" style={{ left: "48%", top: "16%", animationDelay: "3.4s" }} aria-hidden="true" />
        <span className="lv-shoot" style={{ right: "8%", bottom: "36%", animationDelay: "6.1s" }} aria-hidden="true" />
        <div className="lv-contact__inner">
          <h2 className="lv-contact__title lv-display">Talk to me.</h2>
          <a className="lv-contact__email" href="mailto:therealmustafaiqbal@gmail.com">
            therealmustafaiqbal@gmail.com
          </a>
          <div className="lv-contact__row">
            <a href="https://github.com/Mustafaiqbal2" target="_blank" rel="noreferrer">
              GitHub <ArrowUpRight />
            </a>
            <a href="https://www.linkedin.com/in/mustafa-iqbal-ba42b424b/" target="_blank" rel="noreferrer">
              LinkedIn <ArrowUpRight />
            </a>
            <a href="/resume/Mustafa_Iqbal_Resume.pdf" download>
              Résumé
            </a>
            <a href="/work/">All work</a>
          </div>
          <div className="lv-contact__bottom lv-mono">
            <span>© 2026 · Mustafa Iqbal</span>
            <span>Pakistan</span>
          </div>
        </div>
      </section>
    </main>
  );
}
