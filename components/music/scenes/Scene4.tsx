"use client";

import "./scene4.css";
import gsap from "gsap";
import { MuCaption, MuHeading, WaveDoodle, type SceneCtx } from "../sceneKit";

const BARS = [0.16, 0.42, 0.72, 0.32, 0.88, 0.56, 0.24, 0.68, 0.39, 0.94, 0.47, 0.2];
const DOTS = [[16, 68], [31, 34], [45, 54], [62, 23], [73, 69], [83, 43], [55, 80], [27, 83]] as const;

export function Scene4() {
  return (
    <section className="mu-scene mu-s4" data-scene="4" aria-label="A song is turned into a position by an audio embedding model">
      <div className="mu-stage mu-s4-stage">
        <MuHeading className="mu-s4-h">A song needed coordinates too.</MuHeading>
        <div className="mu-s4-flow" aria-hidden="true">
          <div className="mu-s4-sound"><WaveDoodle className="mu-s4-wave" /><span className="mu-s4-label lv-mono">a song</span></div>
          <Arrow className="mu-s4-arrow mu-s4-arrow--one" d="M8 30 Q74 16 150 30" />
          <div className="mu-s4-listener"><svg viewBox="0 0 190 180" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path className="mu-draw" d="M95 18 Q36 20 28 80 Q25 142 79 158 Q95 166 111 158 Q165 142 162 80 Q154 20 95 18" /><path className="mu-draw" d="M64 68 Q78 53 95 67 Q112 53 126 68" /><path className="mu-draw" d="M58 94 Q75 112 95 101 Q115 112 132 94" /><path className="mu-draw" d="M85 121 Q95 130 105 121" /><path className="mu-draw" d="M44 71 Q25 76 31 111 Q38 130 55 116" /><path className="mu-draw" d="M146 71 Q165 76 159 111 Q152 130 135 116" /></svg><span className="mu-s4-label lv-mono">audio embedding model</span></div>
          <Arrow className="mu-s4-arrow mu-s4-arrow--two" d="M8 30 Q74 45 150 30" />
          <div className="mu-s4-numbers lv-mono">{BARS.map((height, i) => <i key={i} style={{ height: `${height * 100}%` }} />)}<span>numbers</span></div>
          <Arrow className="mu-s4-arrow mu-s4-arrow--three" d="M8 30 Q74 15 150 30" />
          <div className="mu-s4-space"><svg viewBox="0 0 250 230" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"><path className="mu-draw" d="M127 12 Q205 8 232 73 Q249 139 207 194 Q152 232 85 210 Q20 189 18 121 Q14 53 72 24 Q97 13 127 12" /></svg>{DOTS.map(([left, top], i) => <i key={i} className="mu-s4-dot" style={{ left: `${left}%`, top: `${top}%` }} />)}<span className="mu-s4-label lv-mono">a position for the song</span></div>
        </div>
        <MuCaption className="mu-s4-cap">The text model could only turn sentences into positions. We used an audio embedding model to turn each song into numbers too. Those numbers give the song a position that can later be compared with a request.</MuCaption>
      </div>
    </section>
  );
}

function Arrow({ className, d }: { className: string; d: string }) {
  return <svg className={className} viewBox="0 0 170 60" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path className="mu-draw mu-s4-shaft" d={d} /><path className="mu-draw mu-s4-head" d="M150 30 L138 22 M150 30 L138 39" /></svg>;
}

export function buildScene4(ctx: SceneCtx): void {
  if (!ctx.desktop) {
    [".mu-s4-h", ".mu-s4-flow", ".mu-s4-cap"].forEach((selector) => {
      const el = ctx.q(selector)[0];
      if (el) gsap.from(el, { opacity: 0, y: 28, ease: "none", scrollTrigger: { trigger: el, start: "top 80%", end: "top 38%", scrub: 0.8 } });
    });
    return;
  }
  const tl = gsap.timeline({ scrollTrigger: { trigger: ctx.root, start: "top top", end: "+=360%", pin: true, scrub: 1, anticipatePin: 1, fastScrollEnd: true } });
  const draw = (selector: string, at: number, duration = 0.28) => tl.fromTo(ctx.q(selector), ctx.drawFrom(), { strokeDashoffset: 0, duration, stagger: 0.02, ease: "none" }, at);
  tl.from(ctx.q(".mu-s4-h"), { opacity: 0, y: 36, duration: 0.32 }, 0).fromTo(ctx.q(".mu-s4-wave .mu-draw"), ctx.drawFrom(), { strokeDashoffset: 0, duration: 0.3, stagger: 0.02, ease: "none" }, 0.32).from(ctx.q(".mu-s4-sound .mu-s4-label"), { opacity: 0, duration: 0.14 }, 0.55);
  draw(".mu-s4-arrow--one .mu-s4-shaft", 0.65).fromTo(ctx.q(".mu-s4-arrow--one .mu-s4-head"), ctx.drawFrom(), { strokeDashoffset: 0, duration: 0.1, ease: "none" }, 0.91);
  draw(".mu-s4-listener .mu-draw", 0.98, 0.34).from(ctx.q(".mu-s4-listener .mu-s4-label"), { opacity: 0, duration: 0.14 }, 1.28);
  draw(".mu-s4-arrow--two .mu-s4-shaft", 1.42).fromTo(ctx.q(".mu-s4-arrow--two .mu-s4-head"), ctx.drawFrom(), { strokeDashoffset: 0, duration: 0.1, ease: "none" }, 1.68);
  tl.from(ctx.q(".mu-s4-numbers i"), { scaleY: 0, transformOrigin: "50% 100%", duration: 0.18, stagger: 0.025, ease: "none" }, 1.76).from(ctx.q(".mu-s4-numbers span"), { opacity: 0, duration: 0.12 }, 2.03);
  draw(".mu-s4-arrow--three .mu-s4-shaft", 2.12).fromTo(ctx.q(".mu-s4-arrow--three .mu-s4-head"), ctx.drawFrom(), { strokeDashoffset: 0, duration: 0.1, ease: "none" }, 2.38);
  draw(".mu-s4-space .mu-draw", 2.48, 0.32).from(ctx.q(".mu-s4-dot"), { opacity: 0, scale: 0, duration: 0.16, stagger: 0.04, ease: "none" }, 2.7).from(ctx.q(".mu-s4-space .mu-s4-label"), { opacity: 0, duration: 0.14 }, 2.94).from(ctx.q(".mu-s4-cap"), { opacity: 0, y: 22, duration: 0.3 }, 3.14);
}
