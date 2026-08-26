"use client";

import "./scene3.css";
import gsap from "gsap";
import { MuCaption, MuHeading, type SceneCtx } from "../sceneKit";

const WORDS = [
  { key: "heartbreak", label: "heartbreak", x: 48, y: 34, tone: "warm" },
  { key: "breakup", label: "breakup", x: 57, y: 45, tone: "warm" },
  { key: "leaving", label: "leaving home", x: 45, y: 56, tone: "warm" },
  { key: "birthday", label: "birthday", x: 16, y: 62, tone: "cool" },
  { key: "gym", label: "gym", x: 24, y: 78, tone: "cool" },
  { key: "rain", label: "rain", x: 36, y: 24, tone: "mid" },
  { key: "night", label: "night drive", x: 32, y: 52, tone: "mid" }
] as const;

export function Scene3() {
  return (
    <section className="mu-scene mu-s3" data-scene="3" aria-label="Sentences are represented as positions in a map of meaning">
      <div className="mu-stage mu-s3-stage">
        <MuHeading className="mu-s3-h">First we turned sentences into points.</MuHeading>
        <div className="mu-s3-map" aria-hidden="true">
          <svg className="mu-s3-svg" viewBox="0 0 1440 900" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path className="mu-draw mu-s3-axis" d="M116 758 Q500 752 820 759 Q1070 764 1320 758" />
            <path className="mu-draw mu-s3-axis" d="M1320 758 L1302 750 M1320 758 L1303 766" />
            <path className="mu-draw mu-s3-axis" d="M112 758 Q106 510 112 168" />
            <path className="mu-draw mu-s3-axis" d="M112 168 L102 186 M112 168 L119 185" />
            <path className="mu-draw mu-s3-link mu-s3-link--near" d="M692 306 Q760 351 821 405" />
            <path className="mu-draw mu-s3-link mu-s3-link--far" d="M821 405 Q486 503 230 558" />
          </svg>
          {WORDS.map((word) => <span key={word.key} className={`mu-s3-word mu-s3-${word.key}`} style={{ left: `${word.x}%`, top: `${word.y}%` }}><i className={`mu-s3-dot mu-s3-dot--${word.tone}`} /><b className="mu-s3-label lv-mono">{word.label}</b></span>)}
          <span className="mu-s3-distance mu-s3-distance--near lv-mono">close</span>
          <span className="mu-s3-distance mu-s3-distance--far lv-mono">far apart</span>
        </div>
        <MuCaption className="mu-s3-cap">An embedding model turns a sentence into a list of numbers. The numbers act like a position on a map. Similar situations land close together: “heartbreak” and “breakup” are close, while a birthday lands elsewhere.</MuCaption>
        <div className="mu-s3-mobile-explain">
          <span className="lv-mono">the idea</span>
          <h3>Each request becomes a position.</h3>
          <p>Similar situations land near each other. A breakup and heartbreak are close. A birthday is somewhere else, even if both could be called sad.</p>
        </div>
      </div>
    </section>
  );
}

export function buildScene3(ctx: SceneCtx): void {
  if (!ctx.desktop) {
    [".mu-s3-h", ".mu-s3-mobile-explain"].forEach((selector) => {
      const el = ctx.q(selector)[0];
      if (el) gsap.from(el, { opacity: 0, y: 30, ease: "none", scrollTrigger: { trigger: el, start: "top 80%", end: "top 38%", scrub: 0.8 } });
    });
    return;
  }
  const tl = gsap.timeline({ scrollTrigger: { trigger: ctx.root, start: "top top", end: "+=360%", pin: true, scrub: 1, anticipatePin: 1, fastScrollEnd: true } });
  tl.from(ctx.q(".mu-s3-h"), { y: 36, opacity: 0, duration: 0.32 }, 0)
    .fromTo(ctx.q(".mu-s3-axis"), ctx.drawFrom(), { strokeDashoffset: 0, duration: 0.42, stagger: 0.02, ease: "none" }, 0.14)
    .from(ctx.q(".mu-s3-word"), { opacity: 0, scale: 0, duration: 0.18, stagger: 0.08, ease: "none" }, 0.58)
    .fromTo(ctx.q(".mu-s3-link--near"), ctx.drawFrom(), { strokeDashoffset: 0, duration: 0.32, ease: "none" }, 1.35)
    .from(ctx.q(".mu-s3-distance--near"), { opacity: 0, duration: 0.12 }, 1.66)
    .fromTo(ctx.q(".mu-s3-link--far"), ctx.drawFrom(), { strokeDashoffset: 0, duration: 0.36, ease: "none" }, 1.92)
    .from(ctx.q(".mu-s3-distance--far"), { opacity: 0, duration: 0.12 }, 2.25)
    .from(ctx.q(".mu-s3-cap"), { opacity: 0, x: 26, duration: 0.3 }, 1.72);
}
