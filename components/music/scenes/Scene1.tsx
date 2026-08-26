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
  SpeechBubble,
  NameTag,
  MuCaption,
  type SceneCtx
} from "../sceneKit";

/* anime anger, the proper grammar: the face flushes red, the eyebrows
   slam into a V, and the crossed vein pops and throbs at the temple */
const AngerFace = () => (
  <svg className="mu-s1-anger" viewBox="0 0 120 190" fill="none" strokeLinecap="round" aria-hidden="true">
    <circle className="mu-s1-flush" cx="60" cy="34" r="20" />
    <path className="mu-s1-brow" d="M44 26 L57 34" />
    <path className="mu-s1-brow" d="M76 26 L63 34" />
    <g className="mu-s1-vein">
      <path d="M84 6 Q90 0 96 6" />
      <path d="M84 20 Q90 26 96 20" />
      <path d="M80 8 Q74 13 80 18" />
      <path d="M100 8 Q106 13 100 18" />
    </g>
  </svg>
);

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

/**
 * FAST NUCES Islamabad (H-11), drawn from the ground the way you actually
 * stand in front of it: twin corner towers with vertical window slots, the
 * stepped centre parapet over two big curtain-glass panels, the projecting
 * mid cornice, a long window row, the balcony rail, trees hiding the base.
 * Three groups so the detonation can throw the towers and the centre block
 * on different arcs.
 */
const CampusBackdrop = () => (
  <svg
    className="mu-s1-campus"
    viewBox="0 0 1200 430"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.3}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <g className="mu-s1-campus-l">
      <path className="mu-draw" d="M64 418 L61 78 Q62 70 70 71 L226 68 Q233 68 232 76 L235 418" />
      <path className="mu-draw" d="M52 80 Q145 72 244 78" />
      <path className="mu-draw" d="M92 96 L91 204 L107 205 L106 96 Z" />
      <path className="mu-draw" d="M139 95 L138 205 L154 205 L153 95 Z" />
      <path className="mu-draw" d="M186 96 L185 204 L201 205 L200 95 Z" />
      <path className="mu-draw" d="M92 240 L91 368 L107 368 L106 240 Z" />
      <path className="mu-draw" d="M139 240 L138 368 L154 369 L153 240 Z" />
      <path className="mu-draw" d="M186 240 L185 368 L201 368 L200 239 Z" />
      <path className="mu-draw" d="M118 424 Q104 394 128 382 Q136 356 166 362 Q196 352 206 380 Q228 392 214 412 Q210 426 190 425 Z" />
    </g>
    <g className="mu-s1-campus-c">
      <path
        className="mu-draw"
        d="M235 130 Q267 127 298 128 L300 114 Q375 110 448 113 L450 128 Q545 126 638 127 L640 113 Q715 109 788 112 L790 127 Q878 126 965 129"
      />
      <path className="mu-draw" d="M302 140 L300 258 L448 260 L450 142 Z" />
      <path className="mu-draw mu-s1-thin" d="M337 141 L336 259 M373 142 L372 258 M410 141 L409 259" />
      <path className="mu-draw mu-s1-thin" d="M301 170 L449 171 M300 199 L448 200 M301 228 L449 229" />
      <path className="mu-draw mu-s1-thin" d="M322 244 L428 154" />
      <path className="mu-draw" d="M642 140 L640 258 L788 260 L790 142 Z" />
      <path className="mu-draw mu-s1-thin" d="M677 141 L676 259 M713 142 L712 258 M750 141 L749 259" />
      <path className="mu-draw mu-s1-thin" d="M641 170 L789 171 M640 199 L788 200 M641 228 L789 229" />
      <path className="mu-draw mu-s1-thin" d="M662 244 L768 154" />
      <path className="mu-draw" d="M255 152 h26 v26 h-26 Z M492 151 h26 v26 h-26 Z M562 152 h26 v26 h-26 Z M817 151 h26 v26 h-26 Z M887 152 h26 v26 h-26 Z" />
      <path className="mu-draw" d="M255 194 h26 v26 h-26 Z M492 193 h26 v26 h-26 Z M562 194 h26 v26 h-26 Z M817 193 h26 v26 h-26 Z M887 194 h26 v26 h-26 Z" />
      <path className="mu-draw" d="M255 236 h26 v26 h-26 Z M492 235 h26 v26 h-26 Z M562 236 h26 v26 h-26 Z M817 235 h26 v26 h-26 Z M887 236 h26 v26 h-26 Z" />
      <path className="mu-draw mu-s1-thin" d="M478 140 L477 258 M535 141 L534 259 M606 140 L605 258 M804 141 L803 259" />
      <path className="mu-draw" d="M228 272 Q600 266 972 273" />
      <path className="mu-draw mu-s1-thin" d="M232 281 Q600 276 968 282" />
      <path
        className="mu-draw"
        d="M252 292 h24 v26 h-24 Z M316 293 h24 v26 h-24 Z M380 292 h24 v26 h-24 Z M444 293 h24 v26 h-24 Z M508 292 h24 v26 h-24 Z M572 293 h24 v26 h-24 Z M636 292 h24 v26 h-24 Z M700 293 h24 v26 h-24 Z M764 292 h24 v26 h-24 Z M828 293 h24 v26 h-24 Z M892 292 h24 v26 h-24 Z"
      />
      <path className="mu-draw" d="M240 338 Q600 333 960 339" />
      <path
        className="mu-draw mu-s1-thin"
        d="M256 339 v10 m30 -10 v10 m30 -10 v10 m30 -10 v10 m30 -10 v10 m30 -10 v10 m30 -10 v10 m30 -10 v10 m30 -10 v10 m30 -10 v10 m30 -10 v10 m30 -10 v10 m30 -10 v10 m30 -10 v10 m30 -10 v10 m30 -10 v10 m30 -10 v10 m30 -10 v10 m30 -10 v10 m30 -10 v10 m30 -10 v10 m30 -10 v10 m30 -10 v10"
      />
      <path className="mu-draw mu-s1-thin" d="M262 420 L263 302 M255 301 L279 300" />
      <path className="mu-draw mu-s1-thin" d="M934 420 L935 302 M927 301 L951 300" />
      <path className="mu-draw" d="M330 427 Q315 396 342 385 Q352 358 384 365 Q414 356 424 384 Q447 396 433 415 Q428 428 408 427 Z" />
      <path className="mu-draw" d="M540 426 Q522 398 550 384 Q558 354 592 362 Q626 352 636 382 Q660 394 646 414 Q640 428 618 427 Z" />
      <path className="mu-draw" d="M742 427 Q727 398 753 386 Q763 360 793 366 Q823 358 833 384 Q855 396 841 414 Q836 427 816 426 Z" />
      <text className="mu-s1-campus-label lv-mono" x="600" y="100" textAnchor="middle">
        fast nuces · h-11
      </text>
    </g>
    <g className="mu-s1-campus-r">
      <path className="mu-draw" d="M965 418 L963 76 Q963 68 971 69 L1128 71 Q1136 70 1135 78 L1138 418" />
      <path className="mu-draw" d="M954 78 Q1046 71 1147 80" />
      <path className="mu-draw" d="M994 96 L993 204 L1009 205 L1008 96 Z" />
      <path className="mu-draw" d="M1041 95 L1040 205 L1056 205 L1055 95 Z" />
      <path className="mu-draw" d="M1088 96 L1087 204 L1103 205 L1102 95 Z" />
      <path className="mu-draw" d="M994 240 L993 368 L1009 368 L1008 240 Z" />
      <path className="mu-draw" d="M1041 240 L1040 368 L1056 369 L1055 240 Z" />
      <path className="mu-draw" d="M1088 240 L1087 368 L1103 368 L1102 239 Z" />
      <path className="mu-draw" d="M984 425 Q970 396 994 384 Q1002 358 1032 364 Q1062 355 1072 382 Q1094 394 1080 413 Q1076 426 1056 425 Z" />
    </g>
  </svg>
);

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
          <CampusBackdrop />
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
            <SpeechBubble tail="left" className="mu-s1-bubbleB">
              no.
            </SpeechBubble>
            <div className="mu-s1-swap">
              <StickMan pose="idle" className="mu-s1-man mu-s1-idle" />
              <StickMan pose="rage" className="mu-s1-man mu-s1-rage" />
              <AngerFace />
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

    </section>
  );
}

export function buildScene1(ctx: SceneCtx): void {
  const { q } = ctx;

  /* ---------- mobile: no pin, a few simple scrubbed entrances ---------- */
  if (!ctx.desktop) {
    const entrances: Array<{ sel: string; y: number }> = [
      { sel: ".mu-s1-campus", y: 30 },
      { sel: ".mu-s1-left", y: 36 },
      { sel: ".mu-s1-right", y: 36 },
      { sel: ".mu-s1-bubbleA", y: 24 },
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

  /* 0 – 0.7 : the paper skit draws itself — campus first, then the cast */
  tl.fromTo(
    q(".mu-s1-ground .mu-draw"),
    ctx.drawFrom(),
    { strokeDashoffset: 0, duration: 0.3, ease: "none" },
    0
  )
    .fromTo(
      q(".mu-s1-campus .mu-draw"),
      ctx.drawFrom(),
      { strokeDashoffset: 0, duration: 0.52, stagger: 0.006, ease: "none" },
      0.04
    )
    .from(q(".mu-s1-campus-label"), { opacity: 0, duration: 0.14 }, 0.56)
    .fromTo(
      q(".mu-s1-left .mu-draw, .mu-s1-idle .mu-draw"),
      ctx.drawFrom(),
      { strokeDashoffset: 0, duration: 0.42, stagger: 0.02, ease: "none" },
      0.3
    )
    .from(q(".mu-s1-tag"), { opacity: 0, duration: 0.12, stagger: 0.05 }, 0.62);

  /* 0.62 – 0.78 : the heads get colored in */
  tl.fromTo(
    q(".mu-s1-left .mu-s1-man path:first-of-type, .mu-s1-right .mu-s1-man path:first-of-type"),
    { fillOpacity: 0 },
    { fillOpacity: 1, duration: 0.14, stagger: 0.05 },
    0.62
  );

  /* 0.8 – 1.3 : bubble a — the question (ink-filled, so the wrapper fades
     in while the bone outline draws around it) */
  tl.from(q(".mu-s1-bubbleA"), { opacity: 0, duration: 0.14 }, 0.8)
    .fromTo(
      q(".mu-s1-bubbleA .mu-draw"),
      ctx.drawFrom(),
      { strokeDashoffset: 0, duration: 0.32, ease: "none" },
      0.82
    )
    .from(q(".mu-s1-bubbleA .mu-bubble__txt"), { opacity: 0, duration: 0.22 }, 1.06);

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

  /* 2.6 – 3.1 : crash-out — rage pose, red flush, V brows, popped vein */
  tl.to(q(".mu-s1-idle"), { opacity: 0, duration: 0.12 }, 2.6)
    .from(q(".mu-s1-rage"), { opacity: 0, duration: 0.12 }, 2.6)
    .from(q(".mu-s1-anger"), { opacity: 0, duration: 0.08 }, 2.62)
    .fromTo(
      q(".mu-s1-flush"),
      { scale: 0.35, transformOrigin: "50% 50%" },
      { scale: 1, duration: 0.16, ease: "back.out(2.4)" },
      2.62
    )
    .from(q(".mu-s1-brow"), { opacity: 0, y: -5, duration: 0.1, stagger: 0.04 }, 2.7)
    .fromTo(
      q(".mu-s1-vein"),
      { scale: 0.3, transformOrigin: "50% 50%", opacity: 0 },
      { scale: 1.15, opacity: 1, duration: 0.12, ease: "back.out(3)" },
      2.76
    )
    .to(q(".mu-s1-vein"), { scale: 0.95, duration: 0.07, repeat: 4, yoyo: true, ease: "none" }, 2.88)
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
    { sel: ".mu-s1-campus-l", x: -680, y: -440, r: -64 },
    { sel: ".mu-s1-campus-c", x: 40, y: -620, r: 26 },
    { sel: ".mu-s1-campus-r", x: 700, y: -400, r: 72 },
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

  /* 4.4 – 5.0 : quiet space — the silence after is the punchline */
  tl.to({}, { duration: 0.6 }, 4.4);
}
