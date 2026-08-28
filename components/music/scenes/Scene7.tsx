"use client";

import "./scene7.css";
import gsap from "gsap";
import { MuCaption, MuHeading, type SceneCtx } from "../sceneKit";

const ANCHORS = new Set([2, 5, 8, 11]);

function Sleeve({ index, small = false }: { index: number; small?: boolean }) {
  return (
    <i className={`mu-s7-sleeve mu-s7-sleeve--${(index % 5) + 1}${ANCHORS.has(index) ? " mu-s7-anchor" : ""}${small ? " mu-s7-sleeve--small" : ""}`}>
      <b /><span />
    </i>
  );
}

export function Scene7() {
  return (
    <section className="mu-scene mu-scene--paper mu-s7" data-scene="7" aria-label="Two searches turn a request into a playlist">
      <div className="mu-stage mu-s7-stage">
        <MuHeading className="mu-s7-h">Search once for anchors. Search again for the playlist.</MuHeading>
        <MuCaption className="mu-s7-cap">
          The first search finds a small group of songs near the request. We average that group into a new position inside the song map, then search from there to build the final playlist.
        </MuCaption>

        <div className="mu-s7-search" aria-hidden="true">
          <div className="mu-s7-request">
            <span className="lv-mono">request</span>
            <strong>songs for leaving home at night</strong>
          </div>
          <svg className="mu-s7-path" viewBox="0 0 160 100" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path className="mu-draw mu-s7-path-one" d="M8 50 Q78 18 146 50" />
            <path className="mu-draw mu-s7-head-one" d="M146 50 L132 40 M146 50 L132 62" />
          </svg>
          <div className="mu-s7-library">
            <div className="mu-s7-library__head lv-mono"><span>song map</span><span>first search</span></div>
            <div className="mu-s7-shelves">{Array.from({ length: 15 }, (_, index) => <Sleeve key={index} index={index} />)}</div>
          </div>
          <div className="mu-s7-center">
            <span className="mu-s7-center__dot" />
            <span className="lv-mono">center of the anchor songs</span>
          </div>
          <svg className="mu-s7-path mu-s7-path--two" viewBox="0 0 160 100" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path className="mu-draw mu-s7-path-two" d="M8 50 Q78 82 146 50" />
            <path className="mu-draw mu-s7-head-two" d="M146 50 L132 40 M146 50 L132 62" />
          </svg>
          <div className="mu-s7-playlist">
            <div className="mu-s7-playlist__head lv-mono"><span>playlist</span><span>second search</span></div>
            <div className="mu-s7-playlist__row">{[2, 5, 8, 11, 4].map((index) => <Sleeve key={index} index={index} small />)}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function buildScene7(ctx: SceneCtx): void {
  if (!ctx.desktop) {
    [".mu-s7-h", ".mu-s7-search", ".mu-s7-cap"].forEach((selector) => {
      const element = ctx.q(selector)[0];
      if (element) gsap.from(element, { opacity: 0, y: 24, duration: 0.5, scrollTrigger: { trigger: element, start: "top 84%" } });
    });
    return;
  }
  const tl = gsap.timeline({ scrollTrigger: { trigger: ctx.root, start: "top top", end: "+=380%", pin: true, scrub: 0.95, anticipatePin: 1 } });
  tl.from(ctx.q(".mu-s7-h"), { opacity: 0, y: 34, duration: 0.35 }, 0)
    .from(ctx.q(".mu-s7-cap"), { opacity: 0, x: 24, duration: 0.32 }, 0.28)
    .from(ctx.q(".mu-s7-request"), { opacity: 0, x: -32, duration: 0.3 }, 0.5)
    .fromTo(ctx.q(".mu-s7-path-one"), ctx.drawFrom(), { strokeDashoffset: 0, duration: 0.36, ease: "none" }, 0.75)
    .fromTo(ctx.q(".mu-s7-head-one"), ctx.drawFrom(), { strokeDashoffset: 0, duration: 0.1, ease: "none" }, 1.09)
    .from(ctx.q(".mu-s7-library"), { opacity: 0, scale: 0.97, duration: 0.28 }, 1.08)
    .from(ctx.q(".mu-s7-library .mu-s7-sleeve"), { opacity: 0, y: 20, duration: 0.18, stagger: { each: 0.025, from: "random" } }, 1.28)
    .to(ctx.q(".mu-s7-library .mu-s7-sleeve:not(.mu-s7-anchor)"), { opacity: 0.24, duration: 0.3 }, 1.72)
    .to(ctx.q(".mu-s7-library .mu-s7-anchor"), { scale: 1.12, duration: 0.24, stagger: 0.06 }, 1.72)
    .from(ctx.q(".mu-s7-center"), { opacity: 0, scale: 0.7, duration: 0.28 }, 2.05)
    .fromTo(ctx.q(".mu-s7-path-two"), ctx.drawFrom(), { strokeDashoffset: 0, duration: 0.36, ease: "none" }, 2.26)
    .fromTo(ctx.q(".mu-s7-head-two"), ctx.drawFrom(), { strokeDashoffset: 0, duration: 0.1, ease: "none" }, 2.6)
    .from(ctx.q(".mu-s7-playlist"), { opacity: 0, x: 30, duration: 0.3 }, 2.42)
    .from(ctx.q(".mu-s7-playlist .mu-s7-sleeve"), { opacity: 0, y: 30, rotation: 4, duration: 0.24, stagger: 0.08, ease: "back.out(1.4)" }, 2.56);
}
