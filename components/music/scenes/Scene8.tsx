"use client";

/**
 * Scene 8 — "full circle".
 * The space fills into a galaxy of songs, the two stickmen drift back in,
 * the opening question gets its new answer, and the story hands over the
 * machine: a real link into the melodymind tab.
 */

import "./scene8.css";
import gsap from "gsap";
import { StickMan, SpeechBubble, NameTag, type SceneCtx } from "../sceneKit";

/* ------------------------------------------------------------------ */
/* deterministic star field — seeded PRNG so the server render and the
   client render agree exactly (no Math.random, ever)                  */
/* ------------------------------------------------------------------ */

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type DotTone = "bone" | "accent" | "pink" | "cyan";

type Dot = {
  left: number;
  top: number;
  size: number;
  opacity: number;
  tone: DotTone;
  near: boolean;
};

const DOT_COUNT = 220;

const DOTS: Dot[] = (() => {
  const rnd = mulberry32(1988);
  const clusters: Array<{ x: number; y: number; r: number }> = [
    { x: 15, y: 18, r: 15 },
    { x: 79, y: 14, r: 13 },
    { x: 7, y: 62, r: 12 },
    { x: 91, y: 56, r: 12 },
    { x: 48, y: 11, r: 18 },
    { x: 70, y: 86, r: 14 }
  ];
  const out: Dot[] = [];
  for (let i = 0; i < DOT_COUNT; i++) {
    let x: number;
    let y: number;
    if (i < 132) {
      /* loose clusters: two averaged rolls give a soft center-weighted blob */
      const c = clusters[i % clusters.length];
      x = c.x + (rnd() + rnd() - 1) * c.r;
      y = c.y + (rnd() + rnd() - 1) * c.r;
    } else {
      /* the rest scatter across the whole frame */
      x = rnd() * 100;
      y = rnd() * 100;
    }
    x = Math.min(98.6, Math.max(0.8, x));
    y = Math.min(97.4, Math.max(1.6, y));
    const roll = rnd();
    const tone: DotTone = roll > 0.95 ? "accent" : roll > 0.91 ? "pink" : roll > 0.87 ? "cyan" : "bone";
    out.push({
      left: Math.round(x * 10) / 10,
      top: Math.round(y * 10) / 10,
      size: 2 + Math.floor(rnd() * 3),
      opacity: Math.round((0.2 + rnd() * 0.6) * 100) / 100,
      tone,
      /* the handful that brighten around the cta pill at the end */
      near: x > 34 && x < 66 && y > 76
    });
  }
  return out;
})();

/* ------------------------------------------------------------------ */
/* markup — the final composed state; reads complete with JS off       */
/* ------------------------------------------------------------------ */

export function Scene8() {
  return (
    <section
      className="mu-scene mu-s8"
      data-scene="8"
      aria-label="full circle: the space fills with songs and the old question finally has an answer"
    >
      <div className="mu-stage">
      <div className="mu-s8-dots" aria-hidden="true">
        {DOTS.map((d, i) => (
          <span
            key={i}
            className={`mu-s8-dot${d.tone !== "bone" ? ` mu-s8-dot--${d.tone}` : ""}${d.near ? " mu-s8-dot--near" : ""}`}
            style={{ left: `${d.left}%`, top: `${d.top}%`, width: d.size, height: d.size, opacity: d.opacity }}
          />
        ))}
      </div>

      <div className="mu-s8-man mu-s8-man--hassaan">
        <StickMan pose="float" />
        <NameTag className="mu-s8-tag">hassaan</NameTag>
      </div>
      <div className="mu-s8-man mu-s8-man--saad">
        <StickMan pose="float" />
        <NameTag className="mu-s8-tag">saad</NameTag>
      </div>
      <div className="mu-s8-man mu-s8-man--me">
        <StickMan pose="float" />
        <NameTag className="mu-s8-tag">me</NameTag>
      </div>

      <SpeechBubble tail="right" className="mu-s8-bubbleA">got any good songs?</SpeechBubble>
      <SpeechBubble tail="left" className="mu-s8-bubbleB">yeah. one sec.</SpeechBubble>

      <a className="mu-s8-cta lv-mono" href="#melodymind">
        open melodymind
      </a>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* builder                                                             */
/* ------------------------------------------------------------------ */

export function buildScene8(ctx: SceneCtx): void {
  if (!ctx.desktop) {
    /* Mobile has one explicit ending timeline. Individual absolute children
       cannot be independent triggers: they all sit in the first viewport. */
    const cast = ctx.q(".mu-s8-man");
    const bubbleA = ctx.q(".mu-s8-bubbleA");
    const bubbleB = ctx.q(".mu-s8-bubbleB");
    const cta = ctx.q(".mu-s8-cta");
    gsap.set([...cast, ...bubbleA, ...bubbleB, ...cta], { opacity: 0 });
    gsap.set(cast, { y: 28 });
    gsap.set([...bubbleA, ...bubbleB], { y: 20 });
    gsap.set(cta, { y: 16 });
    gsap.timeline({
      scrollTrigger: {
        trigger: ctx.root,
        start: "top top",
        end: "+=170%",
        pin: true,
        scrub: 0.75,
        anticipatePin: 1,
        fastScrollEnd: true
      }
    })
      .to(cast, { opacity: 1, y: 0, duration: 0.24, stagger: 0.06, ease: "none" }, 0.1)
      .to(bubbleA, { opacity: 1, y: 0, duration: 0.18, ease: "none" }, 0.52)
      .to(bubbleB, { opacity: 1, y: 0, duration: 0.18, ease: "none" }, 0.7)
      .to(cta, { opacity: 1, y: 0, duration: 0.18, ease: "none" }, 0.9);
    return;
  }

  /* desktop: one pinned scrubbed timeline, beats at absolute positions */
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

  /* 0 → 1.2 : the space fills into a galaxy of songs
     (220 dots — this scene's approved element-count exception;
     transform + opacity only) */
  tl.from(
    ctx.q(".mu-s8-dot"),
    { opacity: 0, scale: 0, duration: 0.3, ease: "none", stagger: { each: 0.004, from: "random" } },
    0
  );

  /* 1.3 → 1.9 : the two of us drift back in; name tags fade up */
  tl.fromTo(
    ctx.q(".mu-s8-man .mu-draw"),
    ctx.drawFrom(),
    { strokeDashoffset: 0, duration: 0.45, stagger: 0.02, ease: "none" },
    1.3
  )
    .from(ctx.q(".mu-s8-tag"), { opacity: 0, y: 8, duration: 0.15, stagger: 0.05 }, 1.72)
    /* gentle scrubbed drift instead of an infinite loop */
    .to(ctx.q(".mu-s8-man--hassaan"), { y: -14, duration: 2.7, ease: "sine.inOut" }, 1.3)
    .to(ctx.q(".mu-s8-man--saad"), { y: 8, duration: 2.7, ease: "sine.inOut" }, 1.3)
    .to(ctx.q(".mu-s8-man--me"), { y: 12, duration: 2.7, ease: "sine.inOut" }, 1.3);

  /* 2.0 → 2.5 : the old question, asked again */
  tl.fromTo(
    ctx.q(".mu-s8-bubbleA .mu-draw"),
    ctx.drawFrom(),
    { strokeDashoffset: 0, duration: 0.32, ease: "none" },
    2.0
  ).from(ctx.q(".mu-s8-bubbleA .mu-bubble__txt"), { opacity: 0, duration: 0.16 }, 2.32);

  /* 2.6 → 3.1 : the new answer pops — the payoff beat, given air */
  tl.from(
    ctx.q(".mu-s8-bubbleB"),
    { scale: 0, opacity: 0, transformOrigin: "18% 100%", duration: 0.4, ease: "back.out(1.8)" },
    2.65
  );

  /* 3.2 → 4.0 : the story hands you the machine */
  tl.from(ctx.q(".mu-s8-cta"), { opacity: 0, y: 18, duration: 0.3 }, 3.2)
    .to(ctx.q(".mu-s8-dot--near"), { opacity: 1, scale: 1.7, duration: 0.35, stagger: 0.015 }, 3.3)
    .to(ctx.q(".mu-s8-cta"), { scale: 1.05, duration: 0.12 }, 3.5)
    .to(ctx.q(".mu-s8-cta"), { scale: 1, duration: 0.12 }, 3.64)
    .to(ctx.q(".mu-s8-cta"), { scale: 1.05, duration: 0.12 }, 3.78)
    .to(ctx.q(".mu-s8-cta"), { scale: 1, duration: 0.12 }, 3.9);
}
