"use client";

import "./scene5.css";
import gsap from "gsap";
import { MuCaption, MuHeading, type SceneCtx } from "../sceneKit";

const TEXT_POINTS = [
  { name: "rainy drive", x: 67, y: 31 },
  { name: "leaving home", x: 46, y: 59 },
  { name: "breakup", x: 72, y: 72 }
];
const AUDIO_POINTS = [
  { name: "clip A", x: 30, y: 68 },
  { name: "clip B", x: 70, y: 45 },
  { name: "clip C", x: 48, y: 26 }
];

function CoordinateMap({ type }: { type: "text" | "audio" }) {
  const points = type === "text" ? TEXT_POINTS : AUDIO_POINTS;
  return (
    <div className={`mu-s5-map mu-s5-map--${type}`}>
      <div className="mu-s5-map__head lv-mono"><strong>{type === "text" ? "sentence map" : "song map"}</strong><span>{type === "text" ? "from Nomic" : "from CLAP"}</span></div>
      <svg viewBox="0 0 470 360" fill="none" stroke="currentColor" strokeLinecap="round" aria-hidden="true">
        <path className="mu-draw mu-s5-frame" d="M18 20 Q237 10 452 20 Q462 180 452 340 Q234 351 18 340 Q8 180 18 20" />
        <path className="mu-draw mu-s5-axis" d="M55 310 Q240 306 420 310 M55 310 Q50 180 55 54" />
      </svg>
      {points.map((point, index) => (
        <span key={point.name} className="mu-s5-point" style={{ left: `${point.x}%`, top: `${point.y}%` }}>
          <i data-pair={index + 1} /><b className="lv-mono">{point.name}</b>
        </span>
      ))}
    </div>
  );
}

export function Scene5() {
  return (
    <section className="mu-scene mu-scene--paper mu-s5" data-scene="5" aria-label="The sentence map and song map use different coordinates">
      <div className="mu-stage mu-s5-stage">
        <MuHeading className="mu-s5-h">The two maps used different coordinates.</MuHeading>
        <div className="mu-s5-maps" aria-hidden="true">
          <CoordinateMap type="text" />
          <div className="mu-s5-divider">
            <svg viewBox="0 0 130 330" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path className="mu-draw mu-s5-mismatch" d="M16 82 Q64 38 114 82 M16 165 Q64 121 114 165 M16 248 Q64 204 114 248" />
            </svg>
            <span className="lv-mono">same pairs<br/>different positions</span>
          </div>
          <CoordinateMap type="audio" />
        </div>
        <MuCaption className="mu-s5-cap">
          Both models produced numbers, but their maps had different scales and directions. A sentence and its matching audio clip could describe the same situation and still land far apart.
        </MuCaption>
      </div>
    </section>
  );
}

export function buildScene5(ctx: SceneCtx): void {
  if (!ctx.desktop) {
    [".mu-s5-h", ".mu-s5-maps", ".mu-s5-cap"].forEach((selector) => {
      const element = ctx.q(selector)[0];
      if (element) gsap.from(element, { opacity: 0, y: 24, duration: 0.5, scrollTrigger: { trigger: element, start: "top 84%" } });
    });
    return;
  }
  const tl = gsap.timeline({ scrollTrigger: { trigger: ctx.root, start: "top top", end: "+=320%", pin: true, scrub: 0.9, anticipatePin: 1 } });
  tl.from(ctx.q(".mu-s5-h"), { opacity: 0, y: 34, duration: 0.34 }, 0)
    .fromTo(ctx.q(".mu-s5-map--text .mu-draw"), ctx.drawFrom(), { strokeDashoffset: 0, duration: 0.42, stagger: 0.04, ease: "none" }, 0.3)
    .from(ctx.q(".mu-s5-map--text .mu-s5-map__head, .mu-s5-map--text .mu-s5-point"), { opacity: 0, scale: 0.85, duration: 0.22, stagger: 0.08 }, 0.68)
    .fromTo(ctx.q(".mu-s5-map--audio .mu-draw"), ctx.drawFrom(), { strokeDashoffset: 0, duration: 0.42, stagger: 0.04, ease: "none" }, 1.02)
    .from(ctx.q(".mu-s5-map--audio .mu-s5-map__head, .mu-s5-map--audio .mu-s5-point"), { opacity: 0, scale: 0.85, duration: 0.22, stagger: 0.08 }, 1.4)
    .fromTo(ctx.q(".mu-s5-mismatch"), ctx.drawFrom(), { strokeDashoffset: 0, duration: 0.55, ease: "none" }, 1.78)
    .from(ctx.q(".mu-s5-divider span"), { opacity: 0, y: 8, duration: 0.22 }, 2.16)
    .from(ctx.q(".mu-s5-cap"), { opacity: 0, y: 20, duration: 0.34 }, 2.32);
}
