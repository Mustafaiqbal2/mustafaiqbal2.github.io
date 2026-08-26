"use client";

/**
 * Scene 4 — "songs can't read" + the saad cameo. The gag: audio refuses to
 * embed itself into the word space, even after saad splits it into stems.
 * Markup authors the FINAL state (blob + words, me + vinyl, saad + stems,
 * caption); the desktop builder animates entrances/throws from hidden
 * from-values on one pinned scrubbed timeline.
 */

import "./scene4.css";
import gsap from "gsap";
import { StickMan, NameTag, VinylDoodle, MuCaption, type SceneCtx } from "../sceneKit";

/* word-space vocabulary carried over from scene 3 */
const WORDS: Array<{ label: string; left: string; top: string }> = [
  { label: "heartbreak", left: "20%", top: "26%" },
  { label: "3am", left: "62%", top: "18%" },
  { label: "rain", left: "68%", top: "52%" },
  { label: "lonely", left: "30%", top: "62%" },
  { label: "slow", left: "46%", top: "42%" }
];

/* hand-placed dash segments along the throw arc, vinyl side first */
const ARC_DASHES: string[] = [
  "M300 112 L286 100",
  "M265 81 L251 72",
  "M230 59 L216 54",
  "M195 46 L181 44",
  "M160 43 L146 45",
  "M124 48 L110 54",
  "M89 62 L75 71",
  "M54 86 L40 99"
];

export function Scene4() {
  return (
    <section className="mu-scene mu-s4" data-scene="4" aria-label="Songs can't read: the audio refuses to enter the word space">
      <div className="mu-s4-stage">
        {/* LEFT — the word space: wobbly boundary blob + five dots + labels */}
        <div className="mu-s4-wordspace">
          <svg className="mu-s4-blob" viewBox="0 0 340 380" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true">
            <path
              className="mu-draw mu-s4-blob-line"
              d="M168 20 Q236 10 282 58 Q322 100 314 168 Q330 244 262 314 Q192 374 112 344 Q34 312 26 216 Q18 128 62 70 Q104 26 168 20"
            />
            <circle className="mu-draw" cx="110" cy="122" r="4" />
            <circle className="mu-draw" cx="222" cy="92" r="4" />
            <circle className="mu-draw" cx="248" cy="212" r="4" />
            <circle className="mu-draw" cx="126" cy="252" r="4" />
            <circle className="mu-draw" cx="176" cy="176" r="4" />
          </svg>
          {WORDS.map((w) => (
            <span key={w.label} className="mu-s4-word lv-mono" style={{ left: w.left, top: w.top }}>
              {w.label}
            </span>
          ))}
        </div>

        {/* the dashed throw arc, vinyl side to blob boundary */}
        <svg className="mu-s4-arc" viewBox="0 0 320 190" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true">
          {ARC_DASHES.map((d) => (
            <path key={d} className="mu-draw" d={d} />
          ))}
        </svg>

        {/* comic boing ticks where the vinyl hits the boundary */}
        <svg className="mu-s4-ticks" viewBox="0 0 60 60" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" aria-hidden="true">
          <path className="mu-draw" d="M12 16 L24 23" />
          <path className="mu-draw" d="M9 31 L23 31" />
          <path className="mu-draw" d="M12 46 L24 39" />
        </svg>

        {/* CENTER — me, mid-throw, vinyl nearby */}
        <div className="mu-s4-cluster">
          <div className="mu-s4-vinyl">
            <VinylDoodle className="mu-s4-vinyl-svg" />
          </div>
          <div className="mu-s4-me">
            <StickMan pose="throw" className="mu-s4-me-throw" />
            <StickMan pose="rage" className="mu-s4-me-rage" />
            <NameTag className="mu-s4-tag">me</NameTag>
          </div>
        </div>

        {/* RIGHT — saad shrugging, three stems floating around him */}
        <div className="mu-s4-saadside">
          <div className="mu-s4-stem mu-s4-stem--drums">
            <svg viewBox="0 0 38 30" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true">
              <circle className="mu-draw" cx="11" cy="16" r="8" />
              <circle className="mu-draw" cx="28" cy="16" r="8" />
            </svg>
            <span className="mu-s4-stem-tag lv-mono">drums</span>
          </div>
          <div className="mu-s4-stem mu-s4-stem--vocals">
            <svg viewBox="0 0 28 38" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path className="mu-draw" d="M14 4 Q22 4 22 12 L22 17 Q22 25 14 25 Q6 25 6 17 L6 12 Q6 4 14 4" />
              <path className="mu-draw" d="M14 25 L14 33 M8 33 L20 33" />
            </svg>
            <span className="mu-s4-stem-tag lv-mono">vocals</span>
          </div>
          <div className="mu-s4-saad">
            <StickMan pose="shrug" className="mu-s4-saad-man" />
            <NameTag className="mu-s4-tag">saad</NameTag>
          </div>
          <div className="mu-s4-stem mu-s4-stem--bass">
            <svg viewBox="0 0 44 16" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true">
              <path className="mu-draw" d="M2 9 Q8 2 13 9 Q18 15 24 9 Q30 2 36 9 Q40 13 42 9" />
            </svg>
            <span className="mu-s4-stem-tag lv-mono">bass</span>
          </div>
        </div>

        <MuCaption className="mu-s4-cap">
          The text model can only place text, and a song file means nothing to it. Saad&apos;s stem separation can
          split a track into drums, vocals and bass, and every piece is still audio. We needed another way in.
        </MuCaption>
      </div>
    </section>
  );
}

export function buildScene4(ctx: SceneCtx): void {
  /* ---------- mobile: static tableau, simple scrubbed entrances ---------- */
  if (!ctx.desktop) {
    const entries: string[] = [".mu-s4-wordspace", ".mu-s4-cluster", ".mu-s4-saadside", ".mu-s4-cap"];
    for (const sel of entries) {
      const el = ctx.q(sel)[0];
      if (!el) continue;
      gsap.from(el, {
        opacity: 0,
        y: 42,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top 78%", end: "top 35%", scrub: 0.8 }
      });
    }
    return;
  }

  /* ---------- desktop: one pinned scrubbed timeline, 400% ---------- */
  const vinyl = ctx.q(".mu-s4-vinyl")[0];
  const throwMan = ctx.q(".mu-s4-me-throw")[0];
  const rageMan = ctx.q(".mu-s4-me-rage")[0];
  const saadMan = ctx.q(".mu-s4-saad-man")[0];
  const ticks = ctx.q(".mu-s4-ticks")[0];
  const drums = ctx.q(".mu-s4-stem--drums")[0];
  const vocals = ctx.q(".mu-s4-stem--vocals")[0];
  const bass = ctx.q(".mu-s4-stem--bass")[0];
  if (!vinyl || !throwMan || !rageMan || !saadMan || !ticks || !drums || !vocals || !bass) return;

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

  /* 0 – 0.5 : the word space draws in */
  tl.fromTo(
    ctx.q(".mu-s4-blob .mu-draw"),
    ctx.drawFrom(),
    { strokeDashoffset: 0, duration: 0.42, stagger: 0.02, ease: "none" },
    0.02
  )
    .from(ctx.q(".mu-s4-word"), { opacity: 0, y: 10, duration: 0.18, stagger: 0.04 }, 0.24)

    /* 0.5 – 1.2 : me + vinyl draw in, first throw, boundary bounce */
    .fromTo(
      ctx.q(".mu-s4-me-throw .mu-draw"),
      ctx.drawFrom(),
      { strokeDashoffset: 0, duration: 0.26, stagger: 0.02, ease: "none" },
      0.5
    )
    .from(ctx.q(".mu-s4-me .mu-nametag"), { opacity: 0, duration: 0.12 }, 0.68)
    .fromTo(
      ctx.q(".mu-s4-vinyl .mu-draw"),
      ctx.drawFrom(),
      { strokeDashoffset: 0, duration: 0.18, stagger: 0.02, ease: "none" },
      0.58
    )
    .fromTo(
      ctx.q(".mu-s4-arc .mu-draw"),
      ctx.drawFrom(),
      { strokeDashoffset: 0, duration: 0.22, stagger: 0.02, ease: "none" },
      0.8
    )
    .to(
      vinyl,
      {
        ease: "none",
        keyframes: [
          { x: -90, y: -80, duration: 0.09 },
          { x: -170, y: -100, duration: 0.08 },
          { x: -235, y: -40, duration: 0.08 },
          { x: -185, y: -4, duration: 0.07 },
          { x: -175, y: 42, rotation: -300, duration: 0.1, ease: "power1.in" }
        ]
      },
      0.82
    )
    .fromTo(
      ctx.q(".mu-s4-ticks .mu-draw"),
      ctx.drawFrom(),
      { strokeDashoffset: 0, duration: 0.08, stagger: 0.02, ease: "none" },
      1.02
    )

    /* 1.4 – 1.9 : second throw, faster, same bounce */
    .set(vinyl, { x: 0, y: 0, rotation: 0 }, 1.38)
    .to(
      vinyl,
      {
        ease: "none",
        keyframes: [
          { x: -110, y: -90, duration: 0.07 },
          { x: -235, y: -45, duration: 0.08 },
          { x: -180, y: 0, duration: 0.06 },
          { x: -175, y: 42, rotation: -420, duration: 0.09, ease: "power1.in" }
        ]
      },
      1.45
    )
    .fromTo(ticks, { scale: 0.55 }, { scale: 1, duration: 0.09, ease: "power2.out", immediateRender: false }, 1.6)

    /* 2.0 – 2.7 : saad enters, the vinyl splits into three stems */
    .fromTo(
      ctx.q(".mu-s4-saad-man .mu-draw"),
      ctx.drawFrom(),
      { strokeDashoffset: 0, duration: 0.28, stagger: 0.02, ease: "none" },
      2.0
    )
    .from(ctx.q(".mu-s4-saad .mu-nametag"), { opacity: 0, duration: 0.12 }, 2.22)
    .to(vinyl, { opacity: 0, scale: 0.5, duration: 0.12 }, 2.32)
    .fromTo(
      drums,
      { x: -545, y: 110, opacity: 0, scale: 0.5 },
      { x: 0, y: 0, opacity: 1, scale: 1, duration: 0.3, ease: "power2.out" },
      2.36
    )
    .fromTo(
      vocals,
      { x: -775, y: 75, opacity: 0, scale: 0.5 },
      { x: 0, y: 0, opacity: 1, scale: 1, duration: 0.3, ease: "power2.out" },
      2.44
    )
    .fromTo(
      bass,
      { x: -560, y: -230, opacity: 0, scale: 0.5 },
      { x: 0, y: 0, opacity: 1, scale: 1, duration: 0.3, ease: "power2.out" },
      2.52
    )
    .fromTo(
      ctx.q(".mu-s4-stem .mu-draw"),
      ctx.drawFrom(),
      { strokeDashoffset: 0, duration: 0.16, stagger: 0.02, ease: "none" },
      2.4
    )
    .from(ctx.q(".mu-s4-stem-tag"), { opacity: 0, duration: 0.12, stagger: 0.05 }, 2.6)

    /* 2.7 – 3.3 : all three stems fly at the blob and all bounce off */
    .to(
      drums,
      {
        keyframes: [
          { x: -440, y: 10, duration: 0.14, ease: "power1.in" },
          { x: -590, y: 55, duration: 0.08, ease: "power1.out" },
          { x: 0, y: 0, duration: 0.2, ease: "power2.out" }
        ]
      },
      2.74
    )
    .to(
      vocals,
      {
        keyframes: [
          { x: -600, y: -30, duration: 0.14, ease: "power1.in" },
          { x: -820, y: 15, duration: 0.08, ease: "power1.out" },
          { x: 0, y: 0, duration: 0.2, ease: "power2.out" }
        ]
      },
      2.82
    )
    .to(
      bass,
      {
        keyframes: [
          { x: -440, y: -190, duration: 0.14, ease: "power1.in" },
          { x: -600, y: -255, duration: 0.08, ease: "power1.out" },
          { x: 0, y: 0, duration: 0.2, ease: "power2.out" }
        ]
      },
      2.9
    )
    .to(
      ticks,
      {
        keyframes: [
          { scale: 1.3, duration: 0.04 },
          { scale: 1, duration: 0.04 },
          { scale: 1.28, duration: 0.04 },
          { scale: 1, duration: 0.04 },
          { scale: 1.24, duration: 0.04 },
          { scale: 1, duration: 0.05 }
        ]
      },
      2.92
    )
    .to(saadMan, { y: 7, duration: 0.09, yoyo: true, repeat: 1, ease: "power1.inOut" }, 3.0)
    .to(rageMan, { opacity: 1, duration: 0.1 }, 2.9)
    .to(throwMan, { opacity: 0.12, duration: 0.1 }, 2.9)
    .to(rageMan, { opacity: 0, duration: 0.12 }, 3.24)
    .to(throwMan, { opacity: 1, duration: 0.12 }, 3.24)

    /* 3.4 – 4.0 : the verdict */
    .from(ctx.q(".mu-s4-cap"), { opacity: 0, y: 26, duration: 0.4 }, tl.duration() * 0.68);
}
