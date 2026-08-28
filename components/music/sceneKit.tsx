"use client";

/**
 * Shared kit for the /music story scenes. Every scene composes from here so
 * eight separately-built scenes read as one hand. All drawn paths carry
 * className "mu-draw" — scenes animate them with TRUE getTotalLength()
 * dashes via drawFrom() (never pathLength normalization: it snaps 0->100 on
 * GPU-rasterized Chrome).
 */

import type { CSSProperties, ReactNode } from "react";

/* true-length dash draw helper — identical contract to the landing's */
const pathLength = (target: Element) => {
  try {
    return Math.max(1, (target as SVGGeometryElement).getTotalLength());
  } catch {
    return 1;
  }
};

export const drawFrom = () => ({
  strokeDasharray: (_i: number, t: Element) => {
    const len = pathLength(t);
    return `${len} ${len + 2}`;
  },
  strokeDashoffset: (_i: number, t: Element) => pathLength(t) + 1
});

/* ---------------- the stickman ---------------- */

export type StickPose =
  | "idle"
  | "ask"
  | "no"
  | "rage"
  | "throw"
  | "shrug"
  | "point"
  | "float"
  | "happy";

/* one hand-wobbled head, shared by every pose */
const HEAD = "M60 15 Q79 13 82 33 Q84 52 62 54 Q41 55 39 35 Q38 17 60 15";

/* body + arms + legs per pose, drawn with slight bends so nothing is ruler-straight */
const POSES: Record<StickPose, string[]> = {
  idle: [
    HEAD,
    "M60 54 Q61 88 60 120",
    "M60 76 Q49 92 38 108",
    "M60 76 Q71 92 82 108",
    "M60 120 Q51 146 42 172",
    "M60 120 Q69 146 78 172"
  ],
  ask: [
    HEAD,
    "M60 54 Q61 88 60 120",
    "M60 76 Q52 96 46 112",
    "M60 76 Q80 70 98 64 M98 64 L104 60 M98 64 L105 67",
    "M60 120 Q51 146 42 172",
    "M60 120 Q69 146 78 172"
  ],
  no: [
    "M58 20 Q77 18 80 38 Q82 57 60 59 Q39 60 37 40 Q36 22 58 20",
    "M59 59 Q59 90 58 122",
    "M59 80 Q52 100 50 116",
    "M59 80 Q66 100 68 116",
    "M58 122 Q52 148 46 172",
    "M58 122 Q66 148 72 172"
  ],
  rage: [
    HEAD,
    "M60 54 Q59 88 60 120",
    "M60 76 L44 64 L34 50",
    "M60 76 L78 64 L88 50",
    "M60 120 Q48 146 40 170",
    "M60 120 Q72 146 82 170"
  ],
  throw: [
    HEAD,
    "M60 54 Q63 88 62 120",
    "M60 76 Q42 70 28 60",
    "M60 76 Q82 82 102 88",
    "M62 120 Q50 146 44 172",
    "M62 120 Q74 144 84 168"
  ],
  shrug: [
    HEAD,
    "M60 54 Q61 88 60 120",
    "M60 78 Q46 84 38 72 M38 72 L34 66",
    "M60 78 Q74 84 82 72 M82 72 L86 66",
    "M60 120 Q52 146 46 172",
    "M60 120 Q68 146 74 172"
  ],
  point: [
    HEAD,
    "M60 54 Q61 88 60 120",
    "M60 76 Q52 96 48 112",
    "M60 76 Q82 70 104 62 M104 62 L112 60",
    "M60 120 Q51 146 42 172",
    "M60 120 Q69 146 78 172"
  ],
  float: [
    HEAD,
    "M60 54 Q62 86 60 116",
    "M60 74 Q42 80 32 88",
    "M60 74 Q78 68 90 74",
    "M60 116 Q48 134 52 154 Q54 162 60 164",
    "M60 116 Q74 132 72 152"
  ],
  happy: [
    HEAD,
    "M60 54 Q61 88 60 120",
    "M60 76 Q44 60 32 44",
    "M60 76 Q76 60 88 44",
    "M60 120 Q51 146 42 172",
    "M60 120 Q69 146 78 172"
  ]
};

export function StickMan({
  pose = "idle",
  className,
  style
}: {
  pose?: StickPose;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 120 190"
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {POSES[pose].map((d) => (
        <path key={d} className="mu-draw" d={d} />
      ))}
    </svg>
  );
}

/* the crash-out scribble that grows over an angry head */
export const RageScribble = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 90 60" className={className} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true">
    <path className="mu-draw" d="M8 46 Q20 12 30 40 Q38 8 48 38 Q56 10 66 40 Q74 16 84 44" />
    <path className="mu-draw" d="M18 52 Q30 30 40 50 Q52 26 62 50" strokeWidth={1.8} />
  </svg>
);

/* hand-drawn speech bubble: wobbly outline (drawable) + HTML text overlay */
export function SpeechBubble({
  children,
  tail = "left",
  className,
  style
}: {
  children: ReactNode;
  tail?: "left" | "right";
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span className={`mu-bubble ${tail === "right" ? "mu-bubble--r" : ""} ${className || ""}`} style={style}>
      <svg viewBox="0 0 220 74" preserveAspectRatio="none" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true">
        <path
          className="mu-draw"
          d="M18 6 Q110 2 202 6 Q216 8 214 32 Q216 56 200 58 Q120 62 60 59 L40 72 L44 58 Q20 58 8 54 Q4 44 6 30 Q4 10 18 6"
        />
      </svg>
      <span className="mu-bubble__txt lv-mono">{children}</span>
    </span>
  );
}

export const NameTag = ({ children, className }: { children: ReactNode; className?: string }) => (
  <i className={`mu-nametag lv-mono ${className || ""}`}>{children}</i>
);

/* small doodles scenes share */
export const VinylDoodle = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 80 80" className={className} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true">
    <path className="mu-draw" d="M40 6 Q72 8 74 40 Q72 72 40 74 Q8 72 6 40 Q8 8 40 6" />
    <path className="mu-draw" d="M40 20 Q59 22 60 40 Q59 58 40 60 Q21 58 20 40 Q21 22 40 20" strokeWidth={1.6} />
    <circle className="mu-draw" cx="40" cy="40" r="5" />
  </svg>
);

export const NoteDoodle = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 40 56" className={className} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true">
    <path className="mu-draw" d="M14 44 Q14 36 20 36 Q26 36 26 42 Q26 48 20 48 Q14 48 14 44 M26 42 L26 10 Q30 14 36 14" />
  </svg>
);

export const WaveDoodle = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 120 40" className={className} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true">
    <path className="mu-draw" d="M4 20 Q10 4 16 20 Q22 36 28 20 Q34 8 40 20 Q46 32 52 20 Q58 2 64 20 Q70 38 76 20 Q82 10 88 20 Q94 30 100 20 Q106 6 112 20" />
  </svg>
);

/* mono caption + display heading, so scene typography stays uniform */
export const MuCaption = ({ children, className }: { children: ReactNode; className?: string }) => (
  <p className={`mu-caption lv-mono ${className || ""}`}>{children}</p>
);

export const MuHeading = ({ children, className }: { children: ReactNode; className?: string }) => (
  <h2 className={`mu-h ${className || ""}`}>{children}</h2>
);

/* the context every scene builder receives from StoryTab */
export type SceneCtx = {
  root: HTMLElement;
  q: (sel: string) => HTMLElement[];
  drawFrom: typeof drawFrom;
  desktop: boolean;
};
