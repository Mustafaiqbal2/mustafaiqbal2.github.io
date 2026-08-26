"use client";

/**
 * SCENE 1 — "the skit". The origin: a paper world, two stickmen, the bad
 * answer, the crash-out, and the detonation that tears the paper into space.
 * Final state is authored in markup (paper skit fully composed); the only
 * exception is the decorative shards, authored opacity 0 by design.
 */

import "./scene1.css";
import gsap from "gsap";
import {
  StickMan,
  RageScribble,
  SpeechBubble,
  NameTag,
  MuCaption,
  type SceneCtx
} from "../sceneKit";

type Shard = {
  left: string;
  top: string;
  w: number;
  h: number;
  clip: string;
  fx: number;
  fy: number;
  fr: number;
};

/* 12 paper shards around the frame edges; fx/fy/fr are detonation fly-outs */
const SHARDS: Shard[] = [
  { left: "4%", top: "6%", w: 120, h: 96, clip: "polygon(0% 18%, 62% 0%, 100% 64%, 34% 100%)", fx: -760, fy: -520, fr: -160 },
  { left: "20%", top: "3%", w: 72, h: 60, clip: "polygon(8% 0%, 100% 22%, 70% 100%, 0% 70%)", fx: -420, fy: -640, fr: 120 },
  { left: "46%", top: "4%", w: 150, h: 110, clip: "polygon(0% 30%, 48% 0%, 100% 40%, 66% 100%, 12% 88%)", fx: 60, fy: -720, fr: -90 },
  { left: "72%", top: "5%", w: 90, h: 74, clip: "polygon(0% 0%, 100% 28%, 78% 100%, 14% 82%)", fx: 520, fy: -600, fr: 140 },
  { left: "90%", top: "10%", w: 110, h: 90, clip: "polygon(22% 0%, 100% 30%, 84% 100%, 0% 66%)", fx: 780, fy: -420, fr: -110 },
  { left: "93%", top: "42%", w: 140, h: 120, clip: "polygon(0% 24%, 70% 0%, 100% 70%, 30% 100%)", fx: 860, fy: 60, fr: 90 },
  { left: "88%", top: "76%", w: 84, h: 70, clip: "polygon(14% 0%, 100% 40%, 60% 100%, 0% 72%)", fx: 720, fy: 520, fr: 150 },
  { left: "64%", top: "88%", w: 130, h: 92, clip: "polygon(0% 40%, 52% 0%, 100% 52%, 58% 100%, 8% 92%)", fx: 380, fy: 680, fr: -120 },
  { left: "36%", top: "90%", w: 66, h: 56, clip: "polygon(10% 0%, 100% 26%, 74% 100%, 0% 78%)", fx: -80, fy: 700, fr: 100 },
  { left: "12%", top: "84%", w: 118, h: 96, clip: "polygon(0% 30%, 58% 0%, 100% 58%, 40% 100%)", fx: -560, fy: 560, fr: -140 },
  { left: "2%", top: "52%", w: 96, h: 84, clip: "polygon(18% 0%, 100% 24%, 82% 100%, 0% 70%)", fx: -820, fy: 120, fr: 110 },
  { left: "3%", top: "28%", w: 56, h: 48, clip: "polygon(0% 22%, 66% 0%, 100% 74%, 28% 100%)", fx: -700, fy: -220, fr: -95 }
];

export function Scene1() {
  return (
    <section
      className="mu-scene mu-s1"
      data-scene="1"
      aria-label="the skit: hassaan asks for good songs, the answer is no, and the paper world tears open"
    >
      <div className="mu-s1-stage">
        <div className="mu-s1-paper" />

        <div className="mu-s1-art">
          <svg
            className="mu-s1-ground"
            viewBox="0 0 860 40"
            preserveAspectRatio="none"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path
              className="mu-draw"
              d="M6 24 Q60 16 120 22 Q190 30 260 21 Q330 14 410 23 Q490 31 560 20 Q630 13 700 24 Q770 31 854 19"
            />
          </svg>

          <div className="mu-s1-left">
            <SpeechBubble tail="right" className="mu-s1-bubbleA">
              got any good songs?
            </SpeechBubble>
            <StickMan pose="ask" className="mu-s1-man" />
            <NameTag className="mu-s1-tag">hassaan</NameTag>
          </div>

          <div className="mu-s1-right">
            <RageScribble className="mu-s1-scribble" />
            <SpeechBubble tail="left" className="mu-s1-bubbleB">
              no.
            </SpeechBubble>
            <div className="mu-s1-swap">
              <StickMan pose="idle" className="mu-s1-man mu-s1-idle" />
              <StickMan pose="rage" className="mu-s1-man mu-s1-rage" />
            </div>
            <NameTag className="mu-s1-tag">me</NameTag>
          </div>

          <svg
            className="mu-s1-cracks"
            viewBox="0 0 480 440"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path className="mu-draw" d="M240 214 L268 186 L258 156 L292 126 L284 92 L318 56" />
            <path className="mu-draw" d="M238 218 L204 198 L210 166 L174 148 L166 108" />
            <path className="mu-draw" d="M242 226 L274 244 L266 278 L302 300 L296 342" />
            <path className="mu-draw" d="M238 226 L208 252 L218 286 L186 314 L194 358" />
          </svg>
        </div>

        <div className="mu-s1-shards" aria-hidden="true">
          {SHARDS.map((s, i) => (
            <span
              key={i}
              className="mu-s1-shard"
              data-fx={s.fx}
              data-fy={s.fy}
              data-fr={s.fr}
              style={{ left: s.left, top: s.top, width: s.w, height: s.h, clipPath: s.clip }}
            />
          ))}
        </div>

        <div className="mu-s1-flash" aria-hidden="true" />
      </div>

      <MuCaption className="mu-s1-caption">so. that happened.</MuCaption>
    </section>
  );
}

export function buildScene1(ctx: SceneCtx): void {
  const { q } = ctx;

  /* ---------- mobile: no pin, a few simple scrubbed entrances ---------- */
  if (!ctx.desktop) {
    const entrances: Array<{ sel: string; y: number }> = [
      { sel: ".mu-s1-left", y: 36 },
      { sel: ".mu-s1-right", y: 36 },
      { sel: ".mu-s1-bubbleA", y: 24 },
      { sel: ".mu-s1-caption", y: 20 }
    ];
    entrances.forEach(({ sel, y }) => {
      const el = q(sel)[0];
      if (!el) return;
      gsap.from(el, {
        y,
        opacity: 0,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top 78%", end: "top 35%", scrub: 0.8 }
      });
    });
    return;
  }

  /* ---------- desktop: one pinned scrubbed timeline, ~5 units ---------- */
  const num = (t: Element, key: string): number =>
    Number((t as HTMLElement).dataset[key] || 0);

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: ctx.root,
      start: "top top",
      end: "+=500%",
      pin: true,
      scrub: 1,
      anticipatePin: 1,
      fastScrollEnd: true
    }
  });

  /* 0 – 0.7 : the paper skit draws itself */
  tl.fromTo(
    q(".mu-s1-ground .mu-draw"),
    ctx.drawFrom(),
    { strokeDashoffset: 0, duration: 0.3, ease: "none" },
    0
  )
    .fromTo(
      q(".mu-s1-left .mu-draw, .mu-s1-idle .mu-draw"),
      ctx.drawFrom(),
      { strokeDashoffset: 0, duration: 0.45, stagger: 0.02, ease: "none" },
      0.18
    )
    .from(q(".mu-s1-tag"), { opacity: 0, duration: 0.12, stagger: 0.05 }, 0.55);

  /* 0.8 – 1.3 : bubble a — the question */
  tl.fromTo(
    q(".mu-s1-bubbleA .mu-draw"),
    ctx.drawFrom(),
    { strokeDashoffset: 0, duration: 0.32, ease: "none" },
    0.8
  ).from(q(".mu-s1-bubbleA .mu-bubble__txt"), { opacity: 0, duration: 0.22 }, 1.06);

  /* 1.7 – 2.0 : bubble b pops — the bad answer */
  tl.from(
    q(".mu-s1-bubbleB"),
    { scale: 0.6, opacity: 0, duration: 0.3, ease: "back.out(2.2)" },
    1.7
  );

  /* 2.0 – 2.6 : the "no." hangs; the jitter starts */
  tl.to(q(".mu-s1-bubbleA"), { opacity: 0.6, duration: 0.3 }, 2.0)
    .to(q(".mu-s1-swap"), { x: 3, duration: 0.05, repeat: 11, yoyo: true, ease: "none" }, 2.0)
    .set(q(".mu-s1-swap"), { x: 0 }, 2.62);

  /* 2.6 – 3.1 : crash-out — crossfade to rage, scribble, stage shake */
  tl.to(q(".mu-s1-idle"), { opacity: 0, duration: 0.12 }, 2.6)
    .from(q(".mu-s1-rage"), { opacity: 0, duration: 0.12 }, 2.6)
    .fromTo(
      q(".mu-s1-scribble .mu-draw"),
      ctx.drawFrom(),
      { strokeDashoffset: 0, duration: 0.24, stagger: 0.03, ease: "none" },
      2.66
    )
    .to(q(".mu-s1-stage"), { x: 4, y: -3, duration: 0.04, repeat: 11, yoyo: true, ease: "none" }, 2.62)
    .set(q(".mu-s1-stage"), { x: 0, y: 0 }, 3.12);

  /* 3.1 – 3.5 : cracks race outward from the right stickman */
  tl.fromTo(
    q(".mu-s1-cracks .mu-draw"),
    ctx.drawFrom(),
    { strokeDashoffset: 0, duration: 0.34, stagger: 0.02, ease: "none" },
    3.1
  );

  /* 3.5 – 4.2 : detonation — flash, paper gone, everything scatters */
  tl.to(q(".mu-s1-flash"), { opacity: 1, duration: 0.06, ease: "power1.in" }, 3.5)
    .to(q(".mu-s1-flash"), { opacity: 0, duration: 0.12, ease: "power1.out" }, 3.56)
    .to(q(".mu-s1-paper"), { opacity: 0, duration: 0.35, ease: "none" }, 3.52);

  tl.fromTo(
    q(".mu-s1-shard"),
    { opacity: 1 },
    {
      x: (_i: number, t: Element) => num(t, "fx"),
      y: (_i: number, t: Element) => num(t, "fy"),
      rotation: (_i: number, t: Element) => num(t, "fr"),
      opacity: 0,
      duration: 0.6,
      ease: "power2.out",
      stagger: 0.02,
      immediateRender: false
    },
    3.52
  );

  const scatter: Array<{ sel: string; x: number; y: number; r: number }> = [
    { sel: ".mu-s1-left", x: -520, y: -340, r: -38 },
    { sel: ".mu-s1-right", x: 560, y: -300, r: 42 },
    { sel: ".mu-s1-bubbleA", x: -640, y: -460, r: -24 },
    { sel: ".mu-s1-bubbleB", x: 620, y: -420, r: 30 },
    { sel: ".mu-s1-ground", x: 0, y: 520, r: 6 },
    { sel: ".mu-s1-cracks", x: 320, y: 420, r: 18 }
  ];
  scatter.forEach(({ sel, x, y, r }) => {
    tl.to(q(sel), { x, y, rotation: r, opacity: 0, duration: 0.6, ease: "power2.out" }, 3.56);
  });

  /* 4.4 – 5.0 : quiet space; the caption lands, then settles */
  tl.from(q(".mu-s1-caption"), { opacity: 0, y: 14, duration: 0.3 }, 4.4)
    .to(q(".mu-s1-caption"), { opacity: 0.7, duration: 0.25 }, 4.75);
}
