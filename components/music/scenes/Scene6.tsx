"use client";

import "./scene6.css";
import gsap from "gsap";
import { MuCaption, MuHeading, type SceneCtx } from "../sceneKit";

const TEXT_POINTS = [[27, 68], [45, 38], [57, 54], [74, 28], [63, 76]] as const;
const AUDIO_POINTS = [[24, 30], [44, 70], [61, 42], [76, 72], [66, 18]] as const;

function Map({ type, points }: { type: "text" | "audio"; points: readonly (readonly [number, number])[] }) {
  return <div className={`mu-s6-map mu-s6-map--${type}`}><span className="mu-s6-map-title lv-mono">{type === "text" ? "sentence map" : "song map"}</span><svg viewBox="0 0 420 330" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path className="mu-draw" d="M35 288 Q150 283 255 288 Q340 292 385 286" /><path className="mu-draw" d="M35 288 Q30 178 35 44" /></svg>{points.map(([left, top], i) => <i key={i} className="mu-s6-point" style={{ left: `${left}%`, top: `${top}%` }} />)}{type === "text" ? <><b className="mu-s6-note mu-s6-note--a lv-mono">breakup</b><b className="mu-s6-note mu-s6-note--b lv-mono">heartbreak</b></> : <><b className="mu-s6-note mu-s6-note--a lv-mono">song A</b><b className="mu-s6-note mu-s6-note--b lv-mono">song B</b></>}</div>;
}

export function Scene6() {
  return <section className="mu-scene mu-s6" data-scene="6" aria-label="Text and audio positions start in different coordinate systems"><div className="mu-stage mu-s6-stage"><MuHeading className="mu-s6-h">The two maps still disagreed.</MuHeading><div className="mu-s6-maps" aria-hidden="true"><Map type="text" points={TEXT_POINTS} /><svg className="mu-s6-between" viewBox="0 0 160 110" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path className="mu-draw mu-s6-shaft" d="M8 58 Q80 26 152 58" /><path className="mu-draw mu-s6-head" d="M152 58 L139 50 M152 58 L139 68" /></svg><Map type="audio" points={AUDIO_POINTS} /></div><MuCaption className="mu-s6-cap">The text model and audio model both made positions, but they used different coordinate systems. A request could be close to the right idea on the sentence map and still point to the wrong place on the song map.</MuCaption></div></section>;
}

export function buildScene6(ctx: SceneCtx): void {
  if (!ctx.desktop) { [".mu-s6-h", ".mu-s6-maps", ".mu-s6-cap"].forEach((selector) => { const el = ctx.q(selector)[0]; if (el) gsap.from(el, { opacity: 0, y: 28, ease: "none", scrollTrigger: { trigger: el, start: "top 80%", end: "top 38%", scrub: .8 } }); }); return; }
  const tl = gsap.timeline({ scrollTrigger: { trigger: ctx.root, start: "top top", end: "+=340%", pin: true, scrub: 1, anticipatePin: 1, fastScrollEnd: true } });
  tl.from(ctx.q(".mu-s6-h"), { opacity: 0, y: 34, duration: .3 }, 0).fromTo(ctx.q(".mu-s6-map .mu-draw"), ctx.drawFrom(), { strokeDashoffset: 0, duration: .3, stagger: .025, ease: "none" }, .35).from(ctx.q(".mu-s6-point"), { opacity: 0, scale: 0, duration: .16, stagger: .05, ease: "none" }, .75).from(ctx.q(".mu-s6-note"), { opacity: 0, duration: .14, stagger: .04 }, 1.12).from(ctx.q(".mu-s6-cap"), { opacity: 0, y: 20, duration: .3 }, 1.26).fromTo(ctx.q(".mu-s6-shaft"), ctx.drawFrom(), { strokeDashoffset: 0, duration: .3, ease: "none" }, 1.42).fromTo(ctx.q(".mu-s6-head"), ctx.drawFrom(), { strokeDashoffset: 0, duration: .1, ease: "none" }, 1.7);
}
