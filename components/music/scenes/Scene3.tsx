"use client";

import "./scene3.css";
import gsap from "gsap";
import { MuCaption, MuHeading, type SceneCtx } from "../sceneKit";

const POINTS = [
  { key: "heartbreak", label: "after a breakup", x: 66, y: 39, tone: "pink" },
  { key: "leaving", label: "leaving home", x: 58, y: 51, tone: "pink" },
  { key: "night", label: "night drive", x: 48, y: 61, tone: "violet" },
  { key: "rain", label: "rain outside", x: 42, y: 46, tone: "violet" },
  { key: "birthday", label: "birthday party", x: 24, y: 35, tone: "cyan" },
  { key: "gym", label: "at the gym", x: 28, y: 73, tone: "cyan" }
] as const;

export function Scene3() {
  return (
    <section className="mu-scene mu-scene--paper mu-s3" data-scene="3" aria-label="A sentence becomes a position in a map of meaning">
      <div className="mu-stage mu-s3-stage">
        <MuHeading className="mu-s3-h">A sentence becomes a position.</MuHeading>
        <div className="mu-s3-query">
          <span className="lv-mono">request</span>
          <strong>“a song for leaving home at night”</strong>
          <svg viewBox="0 0 180 70" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <path className="mu-draw mu-s3-route" d="M8 34 Q84 14 166 34" />
            <path className="mu-draw mu-s3-route-head" d="M166 34 L151 25 M166 34 L152 46" />
          </svg>
        </div>
        <MuCaption className="mu-s3-cap">
          Nomic, the text embedding model, turns the whole request into numbers. Together, those numbers place the request on a map. Sentences with similar meanings land near each other.
        </MuCaption>
        <div className="mu-s3-map" aria-hidden="true">
          <div className="mu-s3-map__head lv-mono"><span>map of meaning</span><span>one point per sentence</span></div>
          <svg className="mu-s3-map__grid" viewBox="0 0 800 520" fill="none" stroke="currentColor" strokeLinecap="round">
            <path className="mu-draw mu-s3-frame" d="M20 25 Q394 12 778 24 Q792 256 780 495 Q396 510 20 496 Q8 259 20 25" />
            <path className="mu-draw mu-s3-cluster" d="M318 184 Q462 102 600 168 Q700 236 614 340 Q478 410 338 326 Q264 248 318 184" />
          </svg>
          {POINTS.map((point) => (
            <span key={point.key} className="mu-s3-point" style={{ left: `${point.x}%`, top: `${point.y}%` }}>
              <i className={`mu-s3-point__dot mu-s3-point__dot--${point.tone}`} />
              <b className="lv-mono">{point.label}</b>
            </span>
          ))}
          <span className="mu-s3-request-point" />
          <span className="mu-s3-request-label lv-mono">this request</span>
        </div>
      </div>
    </section>
  );
}

export function buildScene3(ctx: SceneCtx): void {
  if (!ctx.desktop) {
    [".mu-s3-h", ".mu-s3-query", ".mu-s3-map", ".mu-s3-cap"].forEach((selector) => {
      const element = ctx.q(selector)[0];
      if (element) gsap.from(element, { opacity: 0, y: 24, duration: 0.5, scrollTrigger: { trigger: element, start: "top 84%" } });
    });
    return;
  }
  const tl = gsap.timeline({ scrollTrigger: { trigger: ctx.root, start: "top top", end: "+=330%", pin: true, scrub: 0.9, anticipatePin: 1 } });
  tl.from(ctx.q(".mu-s3-h"), { opacity: 0, y: 34, duration: 0.35 }, 0)
    .from(ctx.q(".mu-s3-query"), { opacity: 0, x: -36, duration: 0.35 }, 0.28)
    .fromTo(ctx.q(".mu-s3-route"), ctx.drawFrom(), { strokeDashoffset: 0, duration: 0.35, ease: "none" }, 0.6)
    .fromTo(ctx.q(".mu-s3-route-head"), ctx.drawFrom(), { strokeDashoffset: 0, duration: 0.1, ease: "none" }, 0.93)
    .fromTo(ctx.q(".mu-s3-frame, .mu-s3-cluster"), ctx.drawFrom(), { strokeDashoffset: 0, duration: 0.44, stagger: 0.08, ease: "none" }, 0.92)
    .from(ctx.q(".mu-s3-map__head"), { opacity: 0, y: -10, duration: 0.2 }, 1.1)
    .from(ctx.q(".mu-s3-point"), { opacity: 0, scale: 0, duration: 0.2, stagger: 0.08, ease: "back.out(1.4)" }, 1.28)
    .from(ctx.q(".mu-s3-request-point, .mu-s3-request-label"), { opacity: 0, scale: 0.5, duration: 0.24 }, 1.86)
    .from(ctx.q(".mu-s3-cap"), { opacity: 0, x: -28, duration: 0.34 }, 2.02);
}
