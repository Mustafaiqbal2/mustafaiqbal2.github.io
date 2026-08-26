"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { BlackHole } from "@/components/BlackHole";
import { TypedBrand } from "@/components/TypedBrand";
import { GalaxyDoodleA, GalaxyDoodleB, ShootingStarDoodle, SketchPortrait } from "@/components/SketchPortrait";

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

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

/* ---- the asteroid act (storyboard-sketch style, ink on paper) ---- */

const AsteroidDoodle = () => (
  <svg viewBox="0 0 220 120" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {/* speed lines trailing left */}
    <path d="M4 44 H74" strokeWidth="1.6" opacity="0.7" />
    <path d="M14 62 H88" strokeWidth="1.6" opacity="0.5" />
    <path d="M2 80 H64" strokeWidth="1.6" opacity="0.6" />
    {/* the rock */}
    <path d="M132 22 L162 18 L190 34 L202 58 L192 84 L166 98 L138 94 L120 74 L118 46 Z" />
    {/* craters + hatching */}
    <ellipse cx="152" cy="46" rx="9" ry="6" strokeWidth="1.4" />
    <ellipse cx="176" cy="68" rx="7" ry="5" strokeWidth="1.4" />
    <circle cx="140" cy="72" r="4" strokeWidth="1.4" />
    <path d="M128 84 L138 74 M146 90 L158 78 M168 90 L178 80" strokeWidth="1.2" opacity="0.8" />
    {/* motion nicks */}
    <path d="M112 30 L100 26 M110 96 L98 102" strokeWidth="1.4" opacity="0.7" />
  </svg>
);

const ImpactBurst = () => (
  <svg viewBox="0 0 240 240" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M120 14 L128 66 M120 226 L114 176 M14 120 L64 116 M226 120 L178 124 M45 45 L84 82 M195 45 L158 80 M45 195 L82 160 M195 195 L156 158" />
    <path d="M120 42 L134 90 L182 92 L146 122 L166 170 L120 144 L76 172 L92 122 L58 94 L106 92 Z" strokeWidth="2" />
    <path d="M104 60 L110 76 M150 200 L144 182 M60 130 L78 128" strokeWidth="1.4" opacity="0.7" />
  </svg>
);

const DebrisBit = ({ variant = 0 }: { variant?: number }) => (
  <svg viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {variant === 0 ? <path d="M6 12 L16 4 L26 12 L20 24 L8 22 Z" /> : null}
    {variant === 1 ? <path d="M8 6 L24 10 L20 24 L6 18 Z" /> : null}
    {variant === 2 ? <path d="M14 4 L26 14 L16 26 L4 16 Z M12 14 L18 16" /> : null}
  </svg>
);

const SparkleDoodle = () => (
  <svg viewBox="0 0 60 60" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M30 8 V24 M30 36 V52 M8 30 H24 M36 30 H52" />
    <path d="M18 18 L23 23 M42 42 L37 37 M42 18 L37 23 M18 42 L23 37" strokeWidth="1.4" opacity="0.7" />
  </svg>
);

/* ---- the black hole finale: impact frames + japanese hanabi fireworks ----
   All coordinates are hand-authored literals (no runtime trig) so server
   and client render byte-identical markup. */

const ImpactLines = () => (
  <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" fill="none" stroke="currentColor" strokeLinecap="round" aria-hidden="true">
    {[
      { d: "M1020 450 L1820 450", w: 6 },
      { d: "M1108 611 L1736 871", w: 3 },
      { d: "M960 690 L1498 1228", w: 4 },
      { d: "M896 875 L1141 1466", w: 3 },
      { d: "M720 760 L720 1550", w: 6 },
      { d: "M555 847 L299 1466", w: 3 },
      { d: "M465 705 L-58 1228", w: 4 },
      { d: "M313 618 L-296 871", w: 3 },
      { d: "M420 450 L-380 450", w: 6 },
      { d: "M332 289 L-296 29", w: 3 },
      { d: "M480 210 L-58 -328", w: 4 },
      { d: "M544 25 L299 -566", w: 3 },
      { d: "M720 140 L720 -650", w: 6 },
      { d: "M885 53 L1141 -566", w: 3 },
      { d: "M975 195 L1498 -328", w: 4 },
      { d: "M1127 282 L1736 29", w: 3 }
    ].map((l) => (
      <path key={l.d} d={l.d} strokeWidth={l.w} />
    ))}
  </svg>
);

const HanabiBurst = () => (
  <svg viewBox="0 0 140 140" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle className="lv-boom__draw" cx="70" cy="70" r="8" />
    {[
      "M86 70 L126 70",
      "M84 78 L118 98",
      "M78 84 L92 108",
      "M70 88 L70 122",
      "M62 84 L48 108",
      "M56 78 L22 98",
      "M54 70 L14 70",
      "M56 62 L26 45",
      "M62 56 L45 27",
      "M70 52 L70 18",
      "M78 56 L97 23",
      "M84 62 L114 45"
    ].map((d) => (
      <path key={d} className="lv-boom__draw" d={d} />
    ))}
    {[
      [131, 70],
      [122, 101],
      [70, 127],
      [17, 101],
      [9, 70],
      [22, 41],
      [70, 13],
      [101, 20]
    ].map(([x, y]) => (
      <circle key={`${x}-${y}`} cx={x} cy={y} r="1.8" fill="currentColor" stroke="none" />
    ))}
    <path className="lv-boom__draw" d="M96 90 L104 96 M44 92 L37 97 M92 44 L98 38" strokeWidth="1.4" />
  </svg>
);

const SparkStreak = () => (
  <svg viewBox="0 0 90 44" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path className="lv-boom__draw" d="M2 24 L32 19 L46 26 L70 14" />
    <path className="lv-boom__draw" d="M46 26 L60 33" strokeWidth="1.4" />
    <path className="lv-boom__draw" d="M32 19 L38 8" strokeWidth="1.4" />
    <circle cx="74" cy="12" r="1.6" fill="currentColor" stroke="none" />
  </svg>
);

/* impact-frame easter egg: one graffiti wall — IMPOSTER SYNDROME sprayed
   big, CATHARSIS tagged over it in violet outline, like layered writers on
   the same wall. Deterministic coords only (this renders on the server too). */
const GraffitiWall = () => (
  <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <g transform="rotate(-7 720 450)">
      <text className="lv-tag__echo" x="731" y="346" textAnchor="middle">
        IMPOSTER
      </text>
      <text className="lv-tag__echo" x="731" y="560" textAnchor="middle">
        SYNDROME
      </text>
      <text className="lv-tag__txt" x="720" y="336" textAnchor="middle">
        IMPOSTER
      </text>
      <text className="lv-tag__txt" x="720" y="550" textAnchor="middle">
        SYNDROME
      </text>
      <path className="lv-tag__swash" d="M250 622 Q720 690 1195 600" />
      <path className="lv-tag__drip" d="M430 636 l7 84 M712 656 l-4 104 M968 630 l9 68 M575 648 l2 52" />
    </g>
    <g transform="rotate(6 720 640)">
      <text className="lv-tag__over" x="712" y="812" textAnchor="middle">
        CATHARSIS
      </text>
    </g>
    <g className="lv-tag__spray">
      {Array.from({ length: 30 }).map((_, i) => (
        <circle
          key={i}
          cx={175 + ((i * 467) % 1090)}
          cy={205 + ((i * 641) % 490)}
          r={0.9 + (i % 4) * 0.8}
          opacity={0.18 + ((i * 7) % 5) * 0.09}
        />
      ))}
    </g>
  </svg>
);

/* a background star detonating: hot dot, cross flare, two shock rings */
const NovaStar = () => (
  <svg viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeLinecap="round" aria-hidden="true">
    <circle cx="60" cy="60" r="3.5" fill="currentColor" stroke="none" />
    <path d="M60 14 L60 42 M60 78 L60 106 M14 60 L42 60 M78 60 L106 60" strokeWidth="2" />
    <path d="M31 31 L45 45 M75 75 L89 89 M89 31 L75 45 M45 75 L31 89" strokeWidth="1.3" />
    <circle cx="60" cy="60" r="26" strokeWidth="1.4" />
    <circle cx="60" cy="60" r="44" strokeWidth="0.8" opacity="0.6" />
  </svg>
);

/* supernova ray burst: every spoke dash-draws outward from the core */
const NovaRays = () => (
  <svg viewBox="0 0 560 560" fill="none" stroke="currentColor" strokeLinecap="round" aria-hidden="true">
    {Array.from({ length: 24 }).map((_, i) => {
      const th = (i / 24) * Math.PI * 2 + 0.13;
      const r0 = 86 + (i % 3) * 15;
      const r1 = 224 + ((i * 7) % 4) * 13;
      const x0 = (280 + r0 * Math.cos(th)).toFixed(1);
      const y0 = (280 + r0 * Math.sin(th)).toFixed(1);
      const x1 = (280 + r1 * Math.cos(th)).toFixed(1);
      const y1 = (280 + r1 * Math.sin(th)).toFixed(1);
      return <path key={i} className="lv-boom__draw" d={`M${x0} ${y0} L${x1} ${y1}`} strokeWidth={i % 3 ? 2 : 3.6} />;
    })}
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
  "Now — building ArchPHI  //  running pilonecables.com  // ";

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
        <path key={d} className="lv-draw" d={d} {...wall} strokeWidth={2.2} />
      ))}
      {["M48 48 H100", "M170 48 H512", "M512 48 V332", "M512 332 H400", "M330 332 H296", "M250 332 H48", "M48 332 V48"].map((d) => (
        <path key={d} className="lv-draw" d={d} {...wall} strokeWidth={1.1} />
      ))}
      {/* windows (triple lines + jambs) */}
      {["M100 40 H170", "M100 44 H170", "M100 48 H170", "M100 40 V48", "M170 40 V48", "M330 332 H400", "M330 336 H400", "M330 340 H400", "M330 332 V340", "M400 332 V340"].map((d) => (
        <path key={d} className="lv-draw" d={d} {...thin} />
      ))}
      {/* entrance jambs */}
      {["M250 332 V340", "M296 332 V340"].map((d) => (
        <path key={d} className="lv-draw" d={d} {...thin} />
      ))}
      {/* interior walls: one vertical (bedroom), one L for the bath */}
      {["M230 48 V170", "M230 210 V332", "M380 48 V150", "M380 150 H430", "M470 150 H512"].map((d) => (
        <path key={d} className="lv-draw" d={d} {...wall} strokeWidth={2} />
      ))}
      {/* doors: leaf + quarter swing, hinged at the jamb */}
      <path className="lv-draw" d="M250 332 V286" {...door} />
      <path className="lv-draw" d="M296 332 A46 46 0 0 0 250 286" {...swing} />
      <path className="lv-draw" d="M230 170 H190" {...door} />
      <path className="lv-draw" d="M230 210 A40 40 0 0 1 190 170" {...swing} />
      <path className="lv-draw" d="M430 150 V110" {...door} />
      <path className="lv-draw" d="M470 150 A40 40 0 0 0 430 110" {...swing} />

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
   conclusion. Each arrow is ONE path (shaft + chevron head) so it draws as
   a single unbroken pen stroke; labels last, and a pulse orbits the loop
   once it is drawn. */
function TalentFlowDiagram() {
  const box = { stroke: "#0B0C12", fill: "#F2F2EE", strokeWidth: 2 };
  const label = { fill: "#0B0C12", fontSize: "10.5", fontFamily: "var(--font-mono), monospace", letterSpacing: "1" };
  const sub = { fill: "#6E6E68", fontSize: "8.5", fontFamily: "var(--font-mono), monospace", letterSpacing: "1" };
  const nodes: Array<{ cx: number; cy: number; w: number; h: number; l: string; s?: string }> = [
    { cx: 75, cy: 195, w: 130, h: 44, l: "CV/JD INTAKE", s: "STRUCTURED JSON" },
    { cx: 250, cy: 195, w: 140, h: 56, l: "ORCHESTRATOR", s: "MEMORY · GAP CHECKS" },
    { cx: 317.5, cy: 61, w: 130, h: 48, l: "PICKS NEXT TOPIC", s: "STEP-BY-STEP" },
    { cx: 492.5, cy: 61, w: 130, h: 48, l: "QUESTION GEN", s: "ANTI-TEMPLATE" },
    { cx: 560, cy: 195, w: 110, h: 44, l: "TTS VOICE" },
    { cx: 327.5, cy: 329, w: 130, h: 44, l: "WHISPER STT" },
    { cx: 105, cy: 329, w: 140, h: 48, l: "REPORT ENGINE", s: "AUDIO + SCORING" }
  ];
  const edges: Array<{ shaft: string; head: string; violet?: boolean }> = [
    { shaft: "M140 195 H168", head: "M170 191 L180 195 L170 199" },
    { shaft: "M266.2 167 L308.6 93.7", head: "M312.1 95.7 L313.6 85 L305.1 91.7", violet: true },
    { shaft: "M382.5 61 H417.5", head: "M417.5 57 L427.5 61 L417.5 65", violet: true },
    { shaft: "M496.4 85 L542.3 164.3", head: "M545.8 162.3 L547.3 173 L538.8 166.3", violet: true },
    { shaft: "M547.3 217 L502.5 294.3", head: "M506 296.3 L497.5 303 L499 292.3", violet: true },
    { shaft: "M458 329 H402.5", head: "M402.5 333 L392.5 329 L402.5 325", violet: true },
    { shaft: "M314.8 307 L271.2 231.7", head: "M274.7 229.7 L266.2 223 L267.7 233.7", violet: true },
    { shaft: "M250 223 V321 Q250 329 242 329 H185", head: "M185 325 L175 329 L185 333" }
  ];
  return (
    <svg className="lv-flow" viewBox="0 0 640 400" fill="none" aria-hidden="true">
      {/* orbiting pulse (under the nodes) */}
      <circle className="lv-flow__pulse" r="3.5" fill="#6D28D9" />
      {/* shafts crawl in first; each head flicks on AFTER its shaft lands */}
      {edges.map((e) => (
        <path
          key={e.shaft}
          className="lv-flow__edge"
          d={e.shaft}
          stroke={e.violet ? "#6D28D9" : "#0B0C12"}
          strokeWidth={e.violet ? 1.8 : 1.6}
          fill="none"
        />
      ))}
      {edges.map((e) => (
        <path
          key={e.head}
          className="lv-flow__head"
          d={e.head}
          stroke={e.violet ? "#6D28D9" : "#0B0C12"}
          strokeWidth={e.violet ? 1.8 : 1.6}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {/* edge labels (after everything) */}
      <g className="lv-flow__labels">
        <text x="302" y="272" {...sub}>TRANSCRIPT</text>
        <text x="242" y="270" textAnchor="end" {...sub}>ON CONCLUDE</text>
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
      {/* the candidate is a person, not a box */}
      <g className="lv-flow__node">
        <circle cx="482.5" cy="305" r="8" stroke="#0B0C12" strokeWidth="2" fill="#F2F2EE" />
        <path d="M482.5 313 V335 M482.5 318 L468 328 M482.5 318 L497 328 M482.5 335 L470 351 M482.5 335 L495 351" stroke="#0B0C12" strokeWidth="2" strokeLinecap="round" fill="none" />
        <text x="482.5" y="368" textAnchor="middle" {...label}>CANDIDATE</text>
      </g>
    </svg>
  );
}

export function Landing() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;

    if ("scrollRestoration" in history) history.scrollRestoration = "manual";

    // Lenis smooths the discrete wheel notches into continuous motion — the
    // single biggest "butter" lever on capable hardware. But it also makes
    // scrolling itself depend on the main thread, which on a weak machine
    // inverts into the worst possible feel: the page freezes mid-wheel.
    // So it is skipped up front on low-end devices, and a watchdog sheds it
    // at runtime if sustained frame times say this machine can't afford it —
    // native scroll + numeric scrub keeps the whole story working either way.
    let lenis: Lenis | null = null;
    let lenisRaf: ((time: number) => void) | null = null;
    const navi = navigator as Navigator & { deviceMemory?: number };
    const weakMachine =
      (navi.hardwareConcurrency || 8) <= 4 || (navi.deviceMemory !== undefined && navi.deviceMemory <= 4);
    const dropLenis = () => {
      if (!lenis) return;
      if (lenisRaf) gsap.ticker.remove(lenisRaf);
      lenis.destroy();
      lenis = null;
      gsap.ticker.lagSmoothing(500, 33); // back to GSAP's default
    };
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches && !weakMachine) {
      lenis = new Lenis({ duration: 1.05, smoothWheel: true });
      lenis.on("scroll", ScrollTrigger.update);
      let lastMs = 0;
      let bad = 0;
      lenisRaf = (time: number) => {
        if (!lenis) return;
        lenis.raf(time * 1000);
        // sustained-jank watchdog: isolated hitches (first-paint of a heavy
        // scene) decay away; a machine that can't hold ~30fps for a couple
        // of seconds straight sheds Lenis for native scroll.
        const ms = time * 1000;
        if (lastMs) {
          bad = ms - lastMs > 34 ? bad + 1 : Math.max(0, bad - 2);
          if (bad >= 45) dropLenis();
        }
        lastMs = ms;
      };
      gsap.ticker.add(lenisRaf);
      gsap.ticker.lagSmoothing(0);
    }

    // Infinite decorative animations (orb dashes, shooting stars, the
    // ticker marquee, the diagram pulse) cost paint/composite work every
    // frame, page-wide — the kind of drain that only shows on battery or
    // weak hardware. Run each only while it is actually on screen.
    const liveIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => en.target.classList.toggle("lv-live", en.isIntersecting));
      },
      { rootMargin: "15% 0px" }
    );
    el.querySelectorAll(".lv-orb, .lv-shoot, .lv-ticker, .lv-flow").forEach((o) => liveIO.observe(o));

    const refreshState = { introDone: false, queued: false };
    const mm = gsap.matchMedia(el);

    mm.add(
      {
        desktop: "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
        mobile: "(max-width: 767px) and (prefers-reduced-motion: no-preference)"
      },
      (ctx) => {
        const desktop = Boolean(ctx.conditions?.desktop);
        const q = gsap.utils.selector(el);

        // Every drawn stroke dashes in TRUE user units (getTotalLength),
        // never the pathLength="1" normalization trick: normalized dash
        // intervals get scaled by ~1/length and land exactly where
        // GPU-rasterized Chrome loses float precision — the stroke then
        // snaps 0 -> 100 instead of interpolating (software-raster
        // headless hides it, which is why screenshots looked fine).
        // Gap runs 2 units longer than the dash and the offset starts 1 unit
        // past the length: float slivers at the dash boundary would otherwise
        // poke a round-cap DOT out of every hidden stroke.
        const drawFrom = () => ({
          strokeDasharray: (_i: number, t: Element) => {
            const len = (t as SVGGeometryElement).getTotalLength();
            return `${len} ${len + 2}`;
          },
          strokeDashoffset: (_i: number, t: Element) => (t as SVGGeometryElement).getTotalLength() + 1
        });

        /* ---------- intro (time-based, plays once) ---------- */
        const intro = gsap.timeline({ paused: true, defaults: { ease: "power4.out", force3D: true } });
        intro
          .from(q(".lv-hero__name-1 > span"), { xPercent: -60, opacity: 0, duration: 1.1 }, 0.1)
          .from(q(".lv-hero__name-2 > span"), { xPercent: 60, opacity: 0, duration: 1.1 }, 0.18)
          .from(q(".lv-hero__top, .lv-hero__foot"), { y: 28, opacity: 0, duration: 0.8, stagger: 0.1 }, 0.55);
        // Hold the intro until fonts are ready (capped) so the giant name
        // rasterizes once, then release the pre-paint gate and play.
        const startIntro = () => {
          document.documentElement.classList.remove("lv-intro");
          intro.play();
        };
        const fontsReady =
          typeof document !== "undefined" && document.fonts && document.fonts.ready
            ? document.fonts.ready.catch(() => undefined)
            : Promise.resolve(undefined);
        Promise.race([fontsReady, new Promise((r) => window.setTimeout(r, 650))]).then(() => startIntro());

        // Scene construction is chunked one section per frame after the
        // intro: six small slices instead of one long freeze. Built
        // top-to-bottom so each pin's measurements already include the
        // spacers above it — no full refresh needed afterwards.
        const sceneBuilders: Array<() => void> = [];
        sceneBuilders.push(() => {

        /* ---------- hero parallax out ---------- */
        gsap.to(q(".lv-hero__name"), {
          yPercent: -14,
          ease: "none",
          scrollTrigger: { trigger: q(".lv-hero")[0], start: "top top", end: "bottom top", scrub: 0.6 }
        });
        gsap.fromTo(
          q(".lv-hero__foot"),
          { yPercent: 0, opacity: 1 },
          {
            yPercent: -40,
            opacity: 0,
            ease: "none",
            immediateRender: false,
            scrollTrigger: { trigger: q(".lv-hero")[0], start: "top top", end: "70% top", scrub: 0.6 }
          }
        );

        });
        sceneBuilders.push(() => {
        /* ---------- ArchPHI: pin + draw the plan into a bill ---------- */
        {
          const section = q(".lv-arch")[0];
          const tl = gsap.timeline({
            scrollTrigger: desktop
              ? { trigger: section, start: "top top", end: "+=240%", pin: true, scrub: 1, anticipatePin: 1, fastScrollEnd: true }
              : { trigger: section, start: "top 70%", end: "bottom 60%", scrub: 0.8 }
          });
          tl.from(q(".lv-arch .lv-h2 .lv-line > span"), { yPercent: 110, stagger: 0.08, duration: 0.5 }, 0)
            .from(q(".lv-arch__copy .lv-body, .lv-arch__copy .lv-link"), { y: 32, opacity: 0, stagger: 0.08, duration: 0.4 }, 0.12)
            .from(q(".lv-bill"), { opacity: 0, duration: 0.2 }, 1.45)
            .fromTo(
              q(".lv-plan .lv-draw"),
              drawFrom(),
              { strokeDashoffset: 0, stagger: 0.022, duration: 1.1, ease: "none" },
              0.15
            )
            .from(q(".lv-plan__text"), { opacity: 0, duration: 0.35 }, 1.35)
            .fromTo(q(".lv-arch__arrow path"), drawFrom(), { strokeDashoffset: 0, duration: 0.45, ease: "none" }, 1.45)
            .from(q(".lv-bill__row"), { x: 40, opacity: 0, stagger: 0.1, duration: 0.4 }, 1.7)
            .from(q(".lv-arch .lv-caption"), { opacity: 0, duration: 0.35 }, 2.1);
        }

        });
        sceneBuilders.push(() => {
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
                scrub: 0.7,
                fastScrollEnd: true,
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

        });
        sceneBuilders.push(() => {
        /* ---------- Pilone: pin + counters ---------- */
        {
          const section = q(".lv-pilone")[0];
          const clicksEl = q(".lv-fig__clicks")[0] as HTMLElement;
          const counter = { v: 1070 };
          const imprEl = q(".lv-fig__imprv")[0] as HTMLElement;
          const impr = { v: 46200 };
          const tl = gsap.timeline({
            scrollTrigger: desktop
              ? { trigger: section, start: "top top", end: "+=200%", pin: true, scrub: 0.7, anticipatePin: 1, fastScrollEnd: true }
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
            .from(q(".lv-fig--impr"), { y: 40, opacity: 0, duration: 0.4 }, 0.5)
            .fromTo(
              impr,
              { v: 9920 },
              {
                v: 46200,
                duration: 1.1,
                ease: "none",
                onUpdate: () => {
                  if (imprEl) imprEl.textContent = Math.round(impr.v).toLocaleString("en-US");
                }
              },
              0.55
            )
            .from(q(".lv-fig--position"), { y: 40, opacity: 0, duration: 0.5 }, 1.2)
            .from(q(".lv-fig--ai"), { y: 40, opacity: 0, duration: 0.5 }, 1.6)
            .from(q(".lv-pilone .lv-caption"), { opacity: 0, duration: 0.4 }, 2.0);
        }

        });
        sceneBuilders.push(() => {
        /* ---------- TalentFlow: pin + the interview loop ---------- */
        {
          const section = q(".lv-talent")[0];
          const tl = gsap.timeline({
            scrollTrigger: desktop
              ? { trigger: section, start: "top top", end: "+=560%", pin: true, scrub: 1.2, anticipatePin: 1, fastScrollEnd: true }
              : { trigger: section, start: "top 72%", end: "bottom 55%", scrub: 0.8 }
          });
          tl.from(q(".lv-talent .lv-h2 .lv-line > span"), { yPercent: 110, stagger: 0.08, duration: 0.5 }, 0)
            .from(q(".lv-talent__copy .lv-body"), { y: 32, opacity: 0, stagger: 0.08, duration: 0.4 }, 0.12)
            .from(q(".lv-flow__node"), { opacity: 0, scale: 0.92, transformOrigin: "center", stagger: 0.07, duration: 0.3 }, 0.25);
          const arrows = q(".lv-flow__edge");
          const heads = q(".lv-flow__head");
          // one pen: each shaft crawls across ~380px of scroll (scrub 1.2
          // stretches every wheel notch into >1s of visible tip movement),
          // and the HEAD flicks on only after its shaft fully lands
          let at = 1.0;
          arrows.forEach((arrow, i) => {
            tl.fromTo(arrow, drawFrom(), { strokeDashoffset: 0, duration: 0.46, ease: "none" }, at);
            if (heads[i]) tl.fromTo(heads[i], drawFrom(), { strokeDashoffset: 0, duration: 0.08, ease: "none" }, at + 0.46);
            at += 0.56;
          });
          tl.from(q(".lv-flow__labels"), { opacity: 0, duration: 0.3 }, at)
            .fromTo(q(".lv-flow__pulse"), { opacity: 0 }, { opacity: 1, duration: 0.2 }, at + 0.2)
            .from(q(".lv-talent .lv-caption"), { opacity: 0, duration: 0.3 }, at + 0.2);
        }

        });
        sceneBuilders.push(() => {
        /* ---------- About me: title → Gargantua → sketchbook ---------- */
        {
          const section = q(".lv-about")[0] as HTMLElement;
          const bhWrap = q(".lv-about__bh")[0] as HTMLElement;
          const bhRoot = q("[data-bh-root]")[0] as HTMLElement;
          if (desktop) {
            section.classList.add("lv-about--live");
            const tl = gsap.timeline({
              scrollTrigger: { trigger: section, start: "top top", end: "+=770%", pin: true, scrub: 1, anticipatePin: 1, fastScrollEnd: true, invalidateOnRefresh: true }
            });
            /* impact frames pop in REAL time: a fixed hold, then gone. A
               stopped scroll can never freeze on one (only the plain flash
               is scrubbed); crossing a trigger backwards just re-blinks it */
            const popEls = [".lv-boom__frame", ".lv-boom__tag", ".lv-boom__cover"].map(
              (s) => q(s)[0] as HTMLElement | undefined
            );
            let popHide: gsap.core.Tween | null = null;
            const popFrame = (i: number, hold: number) => {
              popEls.forEach((el) => el && gsap.set(el, { opacity: 0 }));
              if (popHide) popHide.kill();
              const el = popEls[i];
              if (!el) return;
              gsap.set(el, { opacity: 1 });
              popHide = gsap.delayedCall(hold, () => gsap.set(el, { opacity: 0 }));
            };
            tl.fromTo(q(".lv-about__title"), { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 0.4 }, 0)
              .to(q(".lv-about__title"), { opacity: 0, y: -40, scale: 0.96, duration: 0.3 }, 0.55)
              .fromTo(bhWrap, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.45 }, 0.7);
            if (bhRoot) {
              tl.fromTo(bhRoot, { attr: { "data-intensity": 0.2 } }, { attr: { "data-intensity": 1 }, duration: 1.7, ease: "none" }, 0.7);
            }
            tl.fromTo(q(".lv-about__love"), { opacity: 0 }, { opacity: 1, duration: 0.3 }, 1.2)
              /* build-up: two shakes, the second harder — then the hole blows */
              .to(bhWrap, { x: 3, y: -2, duration: 0.04, repeat: 5, yoyo: true, ease: "none" }, 1.95)
              .to(bhWrap, { x: -6, y: 4, duration: 0.033, repeat: 6, yoyo: true, ease: "none" }, 2.19)
              .set(bhWrap, { x: 0, y: 0 }, 2.42)
              .to(q(".lv-about__love"), { opacity: 0, duration: 0.06 }, 2.36)
              /* implosion: a ring collapses INTO the hole and the hole itself
                 flinches smaller — the breath held before the blast */
              .set(q(".lv-boom__implode"), { opacity: 1 }, 2.24)
              .fromTo(q(".lv-boom__implode"), { scale: 1.7 }, { scale: 0.12, duration: 0.15, ease: "power2.in" }, 2.24)
              .set(q(".lv-boom__implode"), { opacity: 0 }, 2.4)
              .to(bhWrap, { scale: 0.85, duration: 0.1, ease: "power2.in" }, 2.3)
              /* three acts, each separated by something HAPPENING in the
                 scene: flash -> speed lines / a far star goes supernova /
                 flash -> graffiti wall / two closer stars detonate /
                 flash -> About You in negative / flash -> DETONATION */
              .set(q(".lv-boom__flash"), { opacity: 1 }, 2.42)
              .to(bhWrap, { opacity: 0, scale: 1.22, duration: 0.08, ease: "none" }, 2.44)
              .set(q(".lv-boom__flash"), { opacity: 0 }, 2.48)
              .call(() => popFrame(0, 0.15), undefined, 2.48)
              .set(q(".lv-boom__star--a"), { opacity: 1 }, 2.56)
              .fromTo(q(".lv-boom__star--a"), { scale: 0.15 }, { scale: 1.5, duration: 0.24, ease: "power2.out" }, 2.56)
              .to(q(".lv-boom__star--a"), { opacity: 0, duration: 0.08 }, 2.82)
              .set(q(".lv-boom__flash"), { opacity: 1 }, 2.92)
              .set(q(".lv-boom__flash"), { opacity: 0 }, 2.96)
              .call(() => popFrame(1, 0.22), undefined, 2.96)
              .set(q(".lv-boom__star--b"), { opacity: 1 }, 3.06)
              .fromTo(q(".lv-boom__star--b"), { scale: 0.15 }, { scale: 1.9, duration: 0.26, ease: "power2.out" }, 3.06)
              .to(q(".lv-boom__star--b"), { opacity: 0, duration: 0.08 }, 3.34)
              .set(q(".lv-boom__star--c"), { opacity: 1 }, 3.18)
              .fromTo(q(".lv-boom__star--c"), { scale: 0.15 }, { scale: 1.6, duration: 0.24, ease: "power2.out" }, 3.18)
              .to(q(".lv-boom__star--c"), { opacity: 0, duration: 0.08 }, 3.44)
              .set(q(".lv-boom__flash"), { opacity: 1 }, 3.5)
              .set(q(".lv-boom__flash"), { opacity: 0 }, 3.54)
              .call(() => popFrame(2, 0.22), undefined, 3.54)
              .set(q(".lv-boom__flash"), { opacity: 1 }, 3.62)
              .set(q(".lv-boom__flash"), { opacity: 0 }, 3.66)
              /* SUPERNOVA — core burst, ray spokes, three shockwaves.
                 opacity flips on via set() AT detonation: a from-state of
                 opacity 1 would immediateRender at build time and preload
                 the prop over the title beat */
              .set(q(".lv-boom__nova"), { opacity: 1 }, 3.66)
              .fromTo(q(".lv-boom__nova"), { scale: 0.12 }, { scale: 3.2, duration: 0.5, ease: "power3.out" }, 3.66)
              .to(q(".lv-boom__nova"), { opacity: 0, duration: 0.28 }, 3.99)
              .set(q(".lv-boom__rays"), { opacity: 1 }, 3.68)
              .fromTo(q(".lv-boom__rays"), { scale: 0.55 }, { scale: 1.55, duration: 0.6, ease: "power2.out" }, 3.68)
              .fromTo(q(".lv-boom__rays .lv-boom__draw"), drawFrom(), { strokeDashoffset: 0, duration: 0.3, stagger: 0.008, ease: "none" }, 3.68)
              .to(q(".lv-boom__rays"), { opacity: 0, duration: 0.25 }, 4.19)
              .set(q(".lv-boom__ring--a"), { opacity: 1 }, 3.66)
              .fromTo(q(".lv-boom__ring--a"), { scale: 0.15 }, { scale: 1.9, duration: 0.5, ease: "power2.out" }, 3.66)
              .to(q(".lv-boom__ring--a"), { opacity: 0, duration: 0.25 }, 3.88)
              .set(q(".lv-boom__ring--b"), { opacity: 0.8 }, 3.72)
              .fromTo(q(".lv-boom__ring--b"), { scale: 0.1 }, { scale: 2.6, duration: 0.7, ease: "power2.out" }, 3.72)
              .to(q(".lv-boom__ring--b"), { opacity: 0, duration: 0.3 }, 4.06)
              .set(q(".lv-boom__ring--c"), { opacity: 0.9 }, 3.8)
              .fromTo(q(".lv-boom__ring--c"), { scale: 0.1 }, { scale: 3.4, duration: 0.85, ease: "power1.out" }, 3.8)
              .to(q(".lv-boom__ring--c"), { opacity: 0, duration: 0.3 }, 4.49)
              /* hanabi bursts: every ray draws stroke-by-stroke, then dies out */
              .set(q(".lv-boom__fw--a"), { opacity: 1 }, 3.66)
              .fromTo(q(".lv-boom__fw--a"), { scale: 0.6 }, { scale: 1, duration: 0.5, ease: "power1.out" }, 3.66)
              .fromTo(q(".lv-boom__fw--a .lv-boom__draw"), drawFrom(), { strokeDashoffset: 0, duration: 0.42, stagger: 0.012, ease: "none" }, 3.66)
              .set(q(".lv-boom__fw--b"), { opacity: 1 }, 3.82)
              .fromTo(q(".lv-boom__fw--b"), { scale: 0.6 }, { scale: 1, duration: 0.5, ease: "power1.out" }, 3.82)
              .fromTo(q(".lv-boom__fw--b .lv-boom__draw"), drawFrom(), { strokeDashoffset: 0, duration: 0.4, stagger: 0.012, ease: "none" }, 3.82)
              .set(q(".lv-boom__fw--c"), { opacity: 1 }, 3.92)
              .fromTo(q(".lv-boom__fw--c"), { scale: 0.6 }, { scale: 1, duration: 0.5, ease: "power1.out" }, 3.92)
              .fromTo(q(".lv-boom__fw--c .lv-boom__draw"), drawFrom(), { strokeDashoffset: 0, duration: 0.4, stagger: 0.012, ease: "none" }, 3.92)
              .set(q(".lv-boom__fw--d"), { opacity: 1 }, 4.04)
              .fromTo(q(".lv-boom__fw--d"), { scale: 0.6 }, { scale: 1, duration: 0.5, ease: "power1.out" }, 4.04)
              .fromTo(q(".lv-boom__fw--d .lv-boom__draw"), drawFrom(), { strokeDashoffset: 0, duration: 0.4, stagger: 0.012, ease: "none" }, 4.04)
              /* the wreckage cools into a little nebula before the sky clears */
              .fromTo(q(".lv-boom__remnant"), { opacity: 0, scale: 0.55 }, { opacity: 0.75, scale: 1.2, duration: 0.5, ease: "power1.out" }, 3.94)
              .to(q(".lv-boom__remnant"), { opacity: 0, scale: 1.45, duration: 0.5 }, 4.74)
              /* stray sparks thrown from the blast */
              .fromTo(
                q(".lv-boom__spark"),
                {
                  opacity: 0,
                  x: (i: number) => [-230, 280, -150, 230, 40][i],
                  y: (i: number) => [40, -70, -170, 190, 270][i],
                  rotation: (i: number) => [12, 196, 38, 214, 285][i]
                },
                {
                  opacity: 1,
                  x: 0,
                  y: 0,
                  rotation: (i: number) => [12, 196, 38, 214, 285][i],
                  duration: 0.4,
                  stagger: 0.05,
                  ease: "power2.out"
                },
                3.68
              )
              .fromTo(q(".lv-boom__spark .lv-boom__draw"), drawFrom(), { strokeDashoffset: 0, duration: 0.3, stagger: 0.02, ease: "none" }, 3.72)
              /* the embers die and the sky clears onto sketchbook paper */
              .to(q(".lv-boom__fw, .lv-boom__spark"), { opacity: 0, duration: 0.3, stagger: 0.04 }, 4.56)
              .fromTo(q(".lv-about__paper"), { opacity: 0 }, { opacity: 1, duration: 0.4 }, 4.86)
              .fromTo(q(".lv-about__sketch"), { opacity: 0 }, { opacity: 1, duration: 0.25 }, 5.09)
              .fromTo(
                q(".lv-about__sketch .sk-draw"),
                drawFrom(),
                { strokeDashoffset: 0, stagger: 0.011, duration: 0.9, ease: "none" },
                5.14
              )
              .from(q(".lv-about__list li"), { y: 30, opacity: 0, stagger: 0.12, duration: 0.35 }, 5.89);
            /* the asteroid act: fly in (stepped, storyboard) -> impact -> the
               funny sketch scatters as pencil strokes -> the real one draws */
            tl.fromTo(
                q(".lv-ast"),
                { x: 0, y: 0, rotation: 8, scaleX: 1, scaleY: 1, opacity: 1 },
                {
                  x: () => (q(".lv-about__sketch")[0] as HTMLElement).clientWidth * 0.25 + 87,
                  y: () => (q(".lv-about__sketch")[0] as HTMLElement).clientHeight * 0.1,
                  rotation: 8,
                  ease: "steps(11)",
                  duration: 0.6
                },
                6.29
              )
              .to(q(".lv-ast"), { scaleX: 0.68, scaleY: 1.14, transformOrigin: "88% 50%", duration: 0.05, ease: "none" }, 6.85)
              .to(q(".lv-ast"), { opacity: 0, duration: 0.04 }, 6.9)
              .fromTo(q(".lv-impact"), { scale: 0.2, opacity: 0 }, { scale: 1, opacity: 1, ease: "back.out(2)", duration: 0.12 }, 6.87)
              .to(q(".lv-impact"), { opacity: 0, scale: 1.3, duration: 0.25 }, 7.14)
              .to(q(".lv-about__sketch"), { x: 5, y: -4, duration: 0.03, repeat: 9, yoyo: true, ease: "none" }, 6.89)
              .set(q(".lv-about__sketch"), { x: 0, y: 0 }, 7.24)
              .to(
                q(".lv-about__me .sk-draw"),
                {
                  x: (i: number) => 300 * Math.cos(i * 2.399),
                  y: (i: number) => -80 - 200 * Math.abs(Math.sin(i * 2.399)),
                  rotation: (i: number) => (i % 2 ? 95 : -75),
                  opacity: 0,
                  duration: 0.5,
                  stagger: 0.0015,
                  ease: "power2.out"
                },
                6.91
              )
              .fromTo(q(".lv-debris span"), { x: 0, y: 0, opacity: 0, rotation: 0 }, { opacity: 1, duration: 0.04, stagger: 0.008 }, 6.89)
              .to(
                q(".lv-debris span"),
                {
                  x: (i: number) => 230 * Math.cos(i * 0.897 + 0.4),
                  y: (i: number) => -170 * Math.abs(Math.sin(i * 0.897)) + 70,
                  rotation: (i: number) => (i % 2 ? 170 : -150),
                  opacity: 0,
                  duration: 0.6,
                  ease: "power1.out"
                },
                6.95
              )
              .to(
                q(".lv-about__list"),
                {
                  x: () => {
                    const sk = (q(".lv-about__sketch")[0] as HTMLElement).getBoundingClientRect();
                    const li = (q(".lv-about__list")[0] as HTMLElement).getBoundingClientRect();
                    return sk.left + sk.width / 2 - (li.left + li.width / 2);
                  },
                  scale: 1.06,
                  duration: 0.45,
                  ease: "power2.inOut"
                },
                7.29
              );
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
              drawFrom(),
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

        });
        sceneBuilders.push(() => {
        /* ---------- Contact ---------- */
        gsap.from(q(".lv-contact__inner > *"), {
          y: 44,
          opacity: 0,
          stagger: 0.1,
          scrollTrigger: { trigger: q(".lv-contact")[0], start: "top 80%", end: "top 45%", scrub: 0.8 }
        });

        });

        const runBuilders = () => {
          const next = sceneBuilders.shift();
          if (!next) {
            refreshState.introDone = true;
            refreshState.queued = false; // built post-fonts; measurements are fresh
            return;
          }
          ctx.add(next);
          // breathing room between slices so input and paint stay responsive
          window.setTimeout(runBuilders, 60);
        };
        intro.eventCallback("onComplete", () => {
          window.requestAnimationFrame(runBuilders);
        });

        return () => {
          intro.kill();
          (q(".lv-about")[0] as HTMLElement)?.classList.remove("lv-about--live");
        };
      }
    );

    // never refresh mid-intro: that recalcs every pin and reads as a jitter
    const safeRefresh = () => {
      if (refreshState.introDone) ScrollTrigger.refresh();
      else refreshState.queued = true;
    };
    const onLoad = () => safeRefresh();
    window.addEventListener("load", onLoad);
    if (document.fonts?.ready) {
      document.fonts.ready.then(safeRefresh).catch(() => {});
    }

    return () => {
      window.removeEventListener("load", onLoad);
      liveIO.disconnect();
      if (lenisRaf) gsap.ticker.remove(lenisRaf);
      if (lenis) lenis.destroy();
      mm.revert();
    };
  }, []);

  return (
    <main id="main" className="lv" ref={root}>
      {/* ================= Hero ================= */}
      <section className="lv-hero" aria-label="Intro">
        <span className="lv-orb lv-orb--ink lv-orb--sm" style={{ right: "8%", top: "30%" }} aria-hidden="true"><OrbitMark /></span>
        <span className="lv-orb lv-orb--ink lv-orb--sm" style={{ right: "22%", top: "58%", opacity: 0.3 }} aria-hidden="true"><PlanetMark /></span>
        <div className="lv-hero__top">
          <div className="lv-topbar lv-mono">
            <TypedBrand />
            <a className="lv-topbar__link" href="/work/">
              Work <ArrowUpRight />
            </a>
          </div>
          <div className="lv-hero__status lv-mono">
            <span>Software engineer &amp; founder</span>
            <span>Pakistan</span>
          </div>
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
              I like building things<b>.</b>
            </p>
            <p className="lv-hero__sub">
              I enjoy solving business problems. I overthink every little detail and dive into every gap to find
              anywhere I can add value.
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
        <span className="lv-orb lv-orb--violet lv-orb--sm" style={{ left: "42%", bottom: "5%" }} aria-hidden="true"><OrbitMark /></span>
        <span className="lv-shoot" style={{ right: "18%", top: "8%", animationDelay: "0.6s" }} aria-hidden="true" />
        <span className="lv-shoot" style={{ left: "30%", bottom: "20%", animationDelay: "3.1s" }} aria-hidden="true" />
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
              ArchPHI is building the operating system for architectural drawings. The first piece reads what a
              drawing declares — geometry, layers, counts — and writes the bill of quantities. Where a drawing
              carries no answer, it says so instead of guessing.
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
                <path d="M2 12 H46 M38 4 L48 12 L38 20" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
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
        <span className="lv-orb lv-orb--ink lv-orb--lg" style={{ left: "4%", bottom: "12%" }} aria-hidden="true"><GalaxyMark /></span>
        <span className="lv-orb lv-orb--ink lv-orb--sm" style={{ right: "6%", bottom: "16%" }} aria-hidden="true"><PlanetMark /></span>
        <span className="lv-orb lv-orb--ink" style={{ left: "48%", bottom: "6%" }} aria-hidden="true"><OrbitMark /></span>
        <span className="lv-shoot lv-shoot--ink" style={{ right: "8%", top: "58%", animationDelay: "1.2s" }} aria-hidden="true" />
        <span className="lv-shoot lv-shoot--ink" style={{ left: "56%", top: "66%", animationDelay: "4.6s" }} aria-hidden="true" />
        <span className="lv-shoot lv-shoot--ink" style={{ left: "30%", top: "76%", animationDelay: "2.8s" }} aria-hidden="true" />
        <div className="lv-fleet__head">
          <div>
            <p className="lv-eyebrow">02 — Simplabots</p>
            <h2 className="lv-h2 lv-display">Agents in production.</h2>
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
        <span className="lv-orb lv-orb--bone lv-orb--sm" style={{ left: "44%", bottom: "6%" }} aria-hidden="true"><PlanetMark /></span>
        <span className="lv-shoot" style={{ right: "30%", top: "10%", animationDelay: "1.4s" }} aria-hidden="true" />
        <span className="lv-shoot" style={{ left: "20%", top: "26%", animationDelay: "4.2s" }} aria-hidden="true" />
        <span className="lv-orb lv-orb--violet lv-orb--sm" style={{ right: "4%", top: "6%" }} aria-hidden="true"><GalaxyMark /></span>
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
              Pilone manufactures electrical cable in Pakistan. I build and run their site — product pages, guides,
              and sizing calculators generated from factory data.
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
            <div className="lv-fig lv-fig--impr">
              <div className="lv-fig__mid">
                <span className="lv-fig__imprv">46,200</span> <b>impressions</b>
              </div>
              <p className="lv-fig__label lv-mono">Impressions, six months — up from 9,920</p>
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
        <span className="lv-orb lv-orb--ink lv-orb--sm" style={{ right: "5%", bottom: "6%" }} aria-hidden="true"><OrbitMark /></span>
        <span className="lv-orb lv-orb--ink lv-orb--sm" style={{ left: "5%", bottom: "6%", opacity: 0.3 }} aria-hidden="true"><GalaxyMark /></span>
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
            <div className="lv-about__stack">
              <div className="lv-about__me">
                <SketchPortrait />
              </div>
            </div>
            <div className="lv-ast" aria-hidden="true">
              <AsteroidDoodle />
            </div>
            <div className="lv-impact" aria-hidden="true">
              <ImpactBurst />
            </div>
            <div className="lv-debris" aria-hidden="true">
              <span><DebrisBit variant={0} /></span>
              <span><DebrisBit variant={1} /></span>
              <span><DebrisBit variant={2} /></span>
              <span><DebrisBit variant={1} /></span>
              <span><DebrisBit variant={0} /></span>
              <span><DebrisBit variant={2} /></span>
              <span><DebrisBit variant={1} /></span>
            </div>
            <ul className="lv-about__list">
              <li>
                <i>01</i>
                <p>I like building things.</p>
              </li>
              <li>
                <i>02</i>
                <p>I want to make a difference.</p>
              </li>
              <li>
                <i>03</i>
                <p>I don&apos;t have a third thing.</p>
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
            <span className="lv-doodle lv-doodle--d" aria-hidden="true">
              <SparkleDoodle />
            </span>
            <span className="lv-doodle lv-doodle--e" aria-hidden="true">
              <SparkleDoodle />
            </span>
            <span className="lv-doodle lv-doodle--f" aria-hidden="true">
              <GalaxyDoodleA />
            </span>
            <span className="lv-doodle lv-doodle--g" aria-hidden="true">
              <SparkleDoodle />
            </span>
          </div>
        </div>
        {/* the explosion layer: impact frames, shockwaves, hanabi — live-act
            props, every one authored hidden until the timeline fires them */}
        <div className="lv-boom" aria-hidden="true">
          <span className="lv-boom__flash"></span>
          <span className="lv-boom__frame">
            <ImpactLines />
          </span>
          {/* impact-frame easter eggs: real-time pops (popFrame), never
              scroll-frozen — only the plain flash is scrubbed */}
          <span className="lv-boom__tag">
            <GraffitiWall />
          </span>
          <span className="lv-boom__cover">
            <span className="lv-boom__cover-art">
              <img src="/images/about-you-negative.webp" alt="" width={600} height={600} loading="lazy" decoding="async" />
            </span>
          </span>
          {/* distant stars that go supernova between the frames */}
          <span className="lv-boom__star lv-boom__star--a">
            <NovaStar />
          </span>
          <span className="lv-boom__star lv-boom__star--b">
            <NovaStar />
          </span>
          <span className="lv-boom__star lv-boom__star--c">
            <NovaStar />
          </span>
          {/* supernova props */}
          <span className="lv-boom__implode">
            <svg viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="100" cy="100" r="90" />
            </svg>
          </span>
          <span className="lv-boom__nova"></span>
          <span className="lv-boom__rays">
            <NovaRays />
          </span>
          <span className="lv-boom__remnant"></span>
          <span className="lv-boom__ring lv-boom__ring--c">
            <svg viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="0.9" aria-hidden="true">
              <circle cx="100" cy="100" r="88" />
            </svg>
          </span>
          <span className="lv-boom__ring lv-boom__ring--a">
            <svg viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
              <circle cx="100" cy="100" r="88" />
            </svg>
          </span>
          <span className="lv-boom__ring lv-boom__ring--b">
            <svg viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <circle cx="100" cy="100" r="88" />
            </svg>
          </span>
          <span className="lv-boom__fw lv-boom__fw--a"><HanabiBurst /></span>
          <span className="lv-boom__fw lv-boom__fw--b"><HanabiBurst /></span>
          <span className="lv-boom__fw lv-boom__fw--c"><HanabiBurst /></span>
          <span className="lv-boom__fw lv-boom__fw--d"><HanabiBurst /></span>
          <span className="lv-boom__spark lv-boom__spark--a"><SparkStreak /></span>
          <span className="lv-boom__spark lv-boom__spark--b"><SparkStreak /></span>
          <span className="lv-boom__spark lv-boom__spark--c"><SparkStreak /></span>
          <span className="lv-boom__spark lv-boom__spark--d"><SparkStreak /></span>
          <span className="lv-boom__spark lv-boom__spark--e"><SparkStreak /></span>
        </div>
      </section>

      {/* ================= Contact ================= */}
      <section className="lv-contact lv-space" aria-label="Contact">
        <span className="lv-orb lv-orb--bone lv-orb--lg" style={{ right: "7%", top: "14%" }} aria-hidden="true"><GalaxyMark /></span>
        <span className="lv-orb lv-orb--violet" style={{ right: "30%", top: "42%" }} aria-hidden="true"><OrbitMark /></span>
        <span className="lv-orb lv-orb--bone lv-orb--sm" style={{ right: "12%", top: "64%" }} aria-hidden="true"><PlanetMark /></span>
        <span className="lv-shoot" style={{ right: "24%", top: "8%", animationDelay: "0.8s" }} aria-hidden="true" />
        <span className="lv-shoot" style={{ left: "48%", top: "16%", animationDelay: "3.4s" }} aria-hidden="true" />
        <span className="lv-shoot" style={{ right: "4%", top: "26%", animationDelay: "6.1s" }} aria-hidden="true" />
        <span className="lv-shoot" style={{ right: "36%", top: "30%", animationDelay: "2.2s" }} aria-hidden="true" />
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
            <a href="/work/">All work</a>
          </div>
          <a className="lv-link" href="/resume/Mustafa_Iqbal_CV.pdf" download>
            Download CV <ArrowDown />
          </a>
          <div className="lv-contact__bottom lv-mono">
            <span>© 2026 · Mustafa Iqbal</span>
            <span>Pakistan</span>
          </div>
        </div>
      </section>
    </main>
  );
}
