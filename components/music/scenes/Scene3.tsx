"use client";

/**
 * Scene 3 — "meaning becomes geometry". Words become points in space and
 * distance becomes similarity. Faint hand-drawn axes cross low-left, nine
 * mono word labels settle onto dots in three loose clusters, and two drawn
 * distance lines (0.9 near, 0.1 far) make the metaphor literal.
 */

import "./scene3.css";
import gsap from "gsap";
import { MuCaption, MuHeading, type SceneCtx } from "../sceneKit";

type WordSpec = {
  key: string;
  label: string;
  /* percent coordinates inside the map (match the 1440x900 svg viewBox) */
  x: number;
  y: number;
  /* dot tint: warm = the heartbreak cluster, cool = birthday/gym, mid = the rest */
  tint: "warm" | "cool" | "mid";
};

/* DOM order here is the drift-in order in the builder — keep them in sync. */
const WORDS: readonly WordSpec[] = [
  { key: "rain", label: "rain", x: 37.8, y: 34.4, tint: "mid" },
  { key: "3am", label: "3am", x: 45.8, y: 52.2, tint: "mid" },
  { key: "leaving-home", label: "leaving home", x: 58.3, y: 60.6, tint: "warm" },
  { key: "heartbreak", label: "heartbreak", x: 62.5, y: 45.6, tint: "warm" },
  { key: "breakup", label: "breakup", x: 70.1, y: 55.6, tint: "warm" },
  { key: "birthday", label: "birthday", x: 11.8, y: 62.2, tint: "cool" },
  { key: "gym", label: "gym", x: 17.4, y: 73.9, tint: "cool" },
  { key: "night-drive", label: "night drive", x: 34.0, y: 57.8, tint: "mid" },
  { key: "first-snow", label: "first snow", x: 44.1, y: 26.1, tint: "mid" }
];

export function Scene3() {
  return (
    <section className="mu-scene mu-s3" data-scene="3" aria-label="Words plotted as points in space, where distance means similarity">
      <MuHeading className="mu-s3-h">First we turned sentences into points.</MuHeading>

      <div className="mu-s3-map" aria-hidden="true">
        <svg className="mu-s3-svg" viewBox="0 0 1440 900" preserveAspectRatio="none" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {/* faint wobbly axes crossing low-left */}
          <g stroke="rgba(242, 242, 238, 0.25)" strokeWidth={2}>
            <path className="mu-draw mu-s3-axis" d="M115 762 Q420 756 720 760 Q1030 764 1320 758" />
            <path className="mu-draw mu-s3-axis" d="M1320 758 L1302 750" />
            <path className="mu-draw mu-s3-axis" d="M1320 758 L1303 766" />
            <path className="mu-draw mu-s3-axis" d="M113 758 Q107 560 112 380 Q115 250 110 168" />
            <path className="mu-draw mu-s3-axis" d="M110 168 L102 186" />
            <path className="mu-draw mu-s3-axis" d="M110 168 L119 185" />
          </g>
          {/* short line: heartbreak to breakup, near */}
          <path className="mu-draw mu-s3-link mu-s3-link--short" d="M905 416 Q958 452 1004 494" stroke="var(--lv-accent-bright)" strokeWidth={2.2} />
          {/* long line: breakup all the way to birthday, far */}
          <path className="mu-draw mu-s3-link mu-s3-link--long" d="M996 505 Q590 560 184 558" stroke="rgba(242, 242, 238, 0.45)" strokeWidth={1.8} />
        </svg>

        {WORDS.map((w) => (
          <div key={w.key} className={`mu-s3-word mu-s3-w-${w.key}`} style={{ left: `${w.x}%`, top: `${w.y}%` }}>
            <span className={`mu-s3-dot mu-s3-dot--${w.tint}`} />
            <span className="mu-s3-label lv-mono">{w.label}</span>
          </div>
        ))}

        <span className="mu-s3-dist mu-s3-dist--short lv-mono" style={{ left: "67.4%", top: "47.6%" }}>
          0.9
        </span>
        <span className="mu-s3-dist mu-s3-dist--long lv-mono" style={{ left: "40.8%", top: "64.7%" }}>
          0.1
        </span>
      </div>

      <MuCaption className="mu-s3-cap">
        An embedding model reads text and returns coordinates: a position in a space with hundreds of dimensions.
        Sentences with similar meaning land close together. Once text is a point, finding similar text is just
        measuring distance.
      </MuCaption>
    </section>
  );
}

export function buildScene3(ctx: SceneCtx): void {
  const { q, desktop } = ctx;

  if (!desktop) {
    /* mobile: no pin — heading, the pre-settled word-map, caption ease in */
    const entries: Array<[string, number]> = [
      [".mu-s3-h", 26],
      [".mu-s3-map", 34],
      [".mu-s3-cap", 24]
    ];
    entries.forEach(([sel, dy]) => {
      const els = q(sel);
      if (!els.length) return;
      gsap.from(els, {
        y: dy,
        opacity: 0,
        scrollTrigger: { trigger: els[0], start: "top 78%", end: "top 35%", scrub: 0.8 }
      });
    });
    return;
  }

  /* per-word drift start offsets, same order as WORDS / the DOM */
  const DRIFT: number[][] = [
    [-320, -180], // rain — from the top-left edge
    [60, 260], // 3am — from below
    [340, 80], // leaving home — from the right
    [-40, -260], // heartbreak — from above
    [380, -60], // breakup — from the right
    [-300, 120], // birthday — from the left
    [-260, 200], // gym — from the bottom-left
    [120, 240], // night drive — from below
    [200, -220] // first snow — from above
  ];

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: ctx.root,
      start: "top top",
      end: "+=400%",
      pin: true,
      scrub: 1,
      anticipatePin: 1,
      fastScrollEnd: true
    }
  });

  tl.from(q(".mu-s3-h"), { y: 40, opacity: 0, duration: 0.35, ease: "power2.out" }, 0)
    .fromTo(q(".mu-s3-axis"), ctx.drawFrom(), { strokeDashoffset: 0, duration: 0.45, stagger: 0.02, ease: "none" }, 0.05)
    .from(
      q(".mu-s3-word"),
      {
        x: (i: number): number => DRIFT[i]?.[0] ?? 0,
        y: (i: number): number => DRIFT[i]?.[1] ?? 0,
        opacity: 0,
        duration: 0.4,
        stagger: 0.11,
        ease: "power2.out"
      },
      0.5
    )
    .from(q(".mu-s3-dot"), { scale: 0, duration: 0.2, stagger: 0.11, ease: "power2.out" }, 0.72)
    .fromTo(q(".mu-s3-link--short"), ctx.drawFrom(), { strokeDashoffset: 0, duration: 0.35, ease: "none" }, 2.0)
    .from(q(".mu-s3-dist--short"), { opacity: 0, duration: 0.2 }, 2.3)
    .to(
      q(".mu-s3-w-heartbreak, .mu-s3-w-breakup"),
      { scale: 1.15, transformOrigin: "0px 0px", duration: 0.12, repeat: 1, yoyo: true, ease: "power1.inOut" },
      2.35
    )
    .fromTo(q(".mu-s3-link--long"), ctx.drawFrom(), { strokeDashoffset: 0, duration: 0.45, ease: "none" }, 2.6)
    .from(q(".mu-s3-dist--long"), { opacity: 0, duration: 0.2 }, 2.95)
    .to(q(".mu-s3-w-birthday"), { x: -10, duration: 0.08, repeat: 3, yoyo: true, ease: "power1.inOut" }, 2.95)
    .to(q(".mu-s3-h"), { opacity: 0.6, duration: 0.35 }, 3.3)
    .from(q(".mu-s3-cap"), { y: 26, opacity: 0, duration: 0.45, ease: "power2.out" }, tl.duration() * 0.68);
}
