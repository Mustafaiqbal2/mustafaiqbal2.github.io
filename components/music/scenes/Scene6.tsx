"use client";

import "./scene6.css";
import gsap from "gsap";
import { MuCaption, MuHeading, type SceneCtx } from "../sceneKit";

const PAIRS = [
  { text: "rainy drive after midnight", wave: "M4 28 Q18 5 32 28 T60 28 T88 28 T116 28", x: 68, y: 34, dx: -120, dy: 90 },
  { text: "the hour after a breakup", wave: "M4 28 Q14 12 24 28 T44 28 Q54 44 64 28 T84 28 T104 28 T124 28", x: 48, y: 65, dx: 130, dy: -70 },
  { text: "walking into a packed room", wave: "M4 28 L14 15 L24 39 L34 10 L44 43 L54 18 L64 34 L74 12 L84 41 L94 20 L104 34 L116 16", x: 72, y: 72, dx: -140, dy: -130 }
] as const;

export function Scene6() {
  return (
    <section className="mu-scene mu-scene--night mu-s6" data-scene="6" aria-label="A small adapter aligns audio with matching descriptions">
      <div className="mu-stage mu-s6-stage">
        <MuHeading className="mu-s6-h">A small adapter aligned the maps.</MuHeading>
        <MuCaption className="mu-s6-cap">
          We kept CLAP fixed and trained a small adapter on about 10,000 description and audio pairs. It learned to move each song toward its matching sentence and away from unrelated ones.
        </MuCaption>

        <div className="mu-s6-lab" aria-hidden="true">
          <div className="mu-s6-pairs">
            <div className="mu-s6-pairs__head lv-mono"><span>matching description</span><span>audio preview</span></div>
            {PAIRS.map((pair, index) => (
              <div className="mu-s6-pair" key={pair.text}>
                <span className="mu-s6-pair__number lv-mono">0{index + 1}</span>
                <strong>{pair.text}</strong>
                <svg viewBox="0 0 128 56" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <path className="mu-draw" d={pair.wave} />
                </svg>
              </div>
            ))}
          </div>

          <div className="mu-s6-adapter">
            <div className="mu-s6-adapter__title lv-mono"><strong>adapter</strong><span>the part we trained</span></div>
            <div className="mu-s6-faders">
              {[28, 62, 44, 76, 35].map((top, index) => <i key={index}><b style={{ top: `${top}%` }} /></i>)}
            </div>
            <svg className="mu-s6-arrow" viewBox="0 0 130 54" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path className="mu-draw mu-s6-shaft" d="M8 27 Q62 12 116 27" />
              <path className="mu-draw mu-s6-head" d="M116 27 L102 18 M116 27 L103 38" />
            </svg>
          </div>

          <div className="mu-s6-output">
            <div className="mu-s6-output__head lv-mono"><strong>shared map</strong><span>text + audio</span></div>
            <svg viewBox="0 0 390 330" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path className="mu-draw mu-s6-frame" d="M18 18 Q196 8 372 18 Q382 166 372 312 Q195 322 18 312 Q8 164 18 18" />
              <path className="mu-draw mu-s6-axis" d="M48 280 Q190 276 344 280 M48 280 Q43 170 48 48" />
            </svg>
            {PAIRS.map((pair, index) => (
              <span className="mu-s6-match" style={{ left: `${pair.x}%`, top: `${pair.y}%` }} key={pair.text}>
                <i className="mu-s6-text-point" />
                <i className="mu-s6-audio-point" data-dx={pair.dx} data-dy={pair.dy} />
                <b className="lv-mono">0{index + 1}</b>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function buildScene6(ctx: SceneCtx): void {
  if (!ctx.desktop) {
    [".mu-s6-h", ".mu-s6-pairs", ".mu-s6-adapter", ".mu-s6-output", ".mu-s6-cap"].forEach((selector) => {
      const element = ctx.q(selector)[0];
      if (element) gsap.from(element, { opacity: 0, y: 24, duration: 0.5, scrollTrigger: { trigger: element, start: "top 84%" } });
    });
    return;
  }
  const tl = gsap.timeline({ scrollTrigger: { trigger: ctx.root, start: "top top", end: "+=380%", pin: true, scrub: 0.95, anticipatePin: 1 } });
  tl.from(ctx.q(".mu-s6-h"), { opacity: 0, y: 34, duration: 0.34 }, 0)
    .from(ctx.q(".mu-s6-cap"), { opacity: 0, x: 24, duration: 0.32 }, 0.28)
    .from(ctx.q(".mu-s6-pairs"), { opacity: 0, x: -32, duration: 0.3 }, 0.48)
    .fromTo(ctx.q(".mu-s6-pair .mu-draw"), ctx.drawFrom(), { strokeDashoffset: 0, duration: 0.34, stagger: 0.12, ease: "none" }, 0.74)
    .from(ctx.q(".mu-s6-adapter"), { opacity: 0, scale: 0.94, duration: 0.28 }, 1.12)
    .from(ctx.q(".mu-s6-faders b"), { y: 70, opacity: 0, duration: 0.24, stagger: 0.06 }, 1.3)
    .fromTo(ctx.q(".mu-s6-frame, .mu-s6-axis"), ctx.drawFrom(), { strokeDashoffset: 0, duration: 0.42, stagger: 0.05, ease: "none" }, 1.55)
    .from(ctx.q(".mu-s6-output__head, .mu-s6-text-point, .mu-s6-match b"), { opacity: 0, scale: 0.6, duration: 0.2, stagger: 0.07 }, 1.9)
    .from(ctx.q(".mu-s6-audio-point"), {
      opacity: 0.35,
      x: (_index, element) => Number((element as HTMLElement).dataset.dx || 0),
      y: (_index, element) => Number((element as HTMLElement).dataset.dy || 0),
      duration: 0.65,
      stagger: 0.12,
      ease: "power2.inOut"
    }, 2.16)
    .fromTo(ctx.q(".mu-s6-shaft"), ctx.drawFrom(), { strokeDashoffset: 0, duration: 0.35, ease: "none" }, 2.18)
    .fromTo(ctx.q(".mu-s6-head"), ctx.drawFrom(), { strokeDashoffset: 0, duration: 0.1, ease: "none" }, 2.51)
    .to(ctx.q(".mu-s6-match"), { scale: 1.12, duration: 0.16, stagger: 0.08, yoyo: true, repeat: 1 }, 2.82);
}
