"use client";

import "./scene4.css";
import gsap from "gsap";
import { MuCaption, MuHeading, VinylDoodle, type SceneCtx } from "../sceneKit";

const BANDS = [38, 64, 92, 55, 78, 43, 104, 72, 51, 88, 63, 97, 45, 75, 58, 84];
const VECTOR = [28, 66, 45, 81, 37, 72, 53, 91, 61, 42, 76, 57];

export function Scene4() {
  return (
    <section className="mu-scene mu-scene--night mu-s4" data-scene="4" aria-label="The audio embedding model turns a song into numbers">
      <div className="mu-stage mu-s4-stage">
        <MuHeading className="mu-s4-h">The audio needed its own coordinates.</MuHeading>
        <MuCaption className="mu-s4-cap">
          CLAP is a pretrained audio embedding model. It reads patterns in a song and turns the audio into a list of numbers. That list gives the song a position of its own.
        </MuCaption>

        <div className="mu-s4-console" aria-hidden="true">
          <div className="mu-s4-source">
            <VinylDoodle className="mu-s4-vinyl" />
            <span className="lv-mono">audio preview</span>
          </div>

          <svg className="mu-s4-cable mu-s4-cable--one" viewBox="0 0 150 80" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path className="mu-draw mu-s4-shaft" d="M8 42 Q74 21 136 42" />
            <path className="mu-draw mu-s4-head" d="M136 42 L121 33 M136 42 L122 53" />
          </svg>

          <div className="mu-s4-analyser">
            <div className="mu-s4-analyser__head lv-mono"><span>CLAP</span><span>audio embedding model</span></div>
            <svg className="mu-s4-waveform" viewBox="0 0 420 96" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path className="mu-draw" d="M8 51 C28 50 29 20 49 48 S72 80 91 49 S115 12 134 49 S159 76 178 50 S202 29 221 49 S245 87 264 49 S287 18 307 50 S333 72 350 48 S382 26 412 50" />
            </svg>
            <div className="mu-s4-bands">{BANDS.map((height, index) => <i key={index} style={{ height }} />)}</div>
            <div className="mu-s4-scale lv-mono"><span>low frequency</span><span>time</span><span>high frequency</span></div>
          </div>

          <svg className="mu-s4-cable mu-s4-cable--two" viewBox="0 0 150 80" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path className="mu-draw mu-s4-shaft" d="M8 42 Q74 63 136 42" />
            <path className="mu-draw mu-s4-head" d="M136 42 L121 33 M136 42 L122 53" />
          </svg>

          <div className="mu-s4-vector">
            <div className="mu-s4-vector__bars">{VECTOR.map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div>
            <span className="lv-mono">song coordinates</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function buildScene4(ctx: SceneCtx): void {
  if (!ctx.desktop) {
    [".mu-s4-h", ".mu-s4-console", ".mu-s4-cap"].forEach((selector) => {
      const element = ctx.q(selector)[0];
      if (element) gsap.from(element, { opacity: 0, y: 24, duration: 0.5, scrollTrigger: { trigger: element, start: "top 84%" } });
    });
    return;
  }
  const tl = gsap.timeline({ scrollTrigger: { trigger: ctx.root, start: "top top", end: "+=340%", pin: true, scrub: 0.9, anticipatePin: 1 } });
  tl.from(ctx.q(".mu-s4-h"), { opacity: 0, y: 34, duration: 0.35 }, 0)
    .from(ctx.q(".mu-s4-cap"), { opacity: 0, x: 24, duration: 0.3 }, 0.3)
    .fromTo(ctx.q(".mu-s4-vinyl .mu-draw"), ctx.drawFrom(), { strokeDashoffset: 0, duration: 0.38, stagger: 0.04, ease: "none" }, 0.48)
    .from(ctx.q(".mu-s4-source span"), { opacity: 0, y: 8, duration: 0.2 }, 0.78)
    .fromTo(ctx.q(".mu-s4-cable--one .mu-s4-shaft"), ctx.drawFrom(), { strokeDashoffset: 0, duration: 0.34, ease: "none" }, 0.8)
    .fromTo(ctx.q(".mu-s4-cable--one .mu-s4-head"), ctx.drawFrom(), { strokeDashoffset: 0, duration: 0.1, ease: "none" }, 1.12)
    .from(ctx.q(".mu-s4-analyser"), { opacity: 0, scale: 0.96, duration: 0.28 }, 1.12)
    .fromTo(ctx.q(".mu-s4-waveform .mu-draw"), ctx.drawFrom(), { strokeDashoffset: 0, duration: 0.44, ease: "none" }, 1.34)
    .from(ctx.q(".mu-s4-bands i"), { scaleY: 0, transformOrigin: "50% 100%", duration: 0.28, stagger: 0.025, ease: "none" }, 1.54)
    .fromTo(ctx.q(".mu-s4-cable--two .mu-s4-shaft"), ctx.drawFrom(), { strokeDashoffset: 0, duration: 0.34, ease: "none" }, 2.04)
    .fromTo(ctx.q(".mu-s4-cable--two .mu-s4-head"), ctx.drawFrom(), { strokeDashoffset: 0, duration: 0.1, ease: "none" }, 2.36)
    .from(ctx.q(".mu-s4-vector__bars i"), { scaleY: 0, transformOrigin: "50% 100%", duration: 0.22, stagger: 0.03, ease: "none" }, 2.44)
    .from(ctx.q(".mu-s4-vector > span"), { opacity: 0, y: 8, duration: 0.2 }, 2.75);
}
