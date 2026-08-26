"use client";

/**
 * Scene 5 — "teach the machine to listen". The one technical diagram scene:
 * a left-to-right drawn pipeline (wave -> frozen ear -> numbers -> adapter)
 * ending in a curved arrow that delivers a bright new dot into a small
 * word-space blob. Landing grammar: wobbly boxes, true-length arrows drawn
 * shaft-then-head, mono labels.
 */

import "./scene5.css";
import gsap from "gsap";
import { WaveDoodle, MuCaption, MuHeading, NameTag, type SceneCtx } from "../sceneKit";

const NUMS: string[] = [
  "0.12", "-0.87", "0.44", "0.03", "-0.29", "0.91", "-0.55", "0.18",
  "0.67", "-0.12", "0.35", "-0.74", "0.08", "0.52", "-0.31", "0.26"
];

/* small hand-drawn arrow: shaft path + separate arrowhead path (the landing's
   arrow rule: shaft draws first, head flicks in after) */
function PipeArrow({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 44 40"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path className="mu-draw mu-s5-shaft" d="M3 22 Q22 16 39 20" />
      <path className="mu-draw mu-s5-head" d="M39 20 L30 14 M39 20 L31 27" />
    </svg>
  );
}

export function Scene5() {
  return (
    <section className="mu-scene mu-s5" data-scene="5" aria-label="teach the machine to listen">
      <div className="mu-s5-inner">
        <MuHeading className="mu-s5-h">So we taught a machine to listen.</MuHeading>

        <div className="mu-s5-mid">
          <div className="mu-s5-pipe">
            <WaveDoodle className="mu-s5-wave" />

            <PipeArrow className="mu-s5-arrow mu-s5-a1" />

            <div className="mu-s5-box mu-s5-clap">
              <svg
                viewBox="0 0 170 90"
                preserveAspectRatio="none"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.6}
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path className="mu-draw mu-s5-frame" d="M9 11 Q85 5 161 10 Q166 45 162 80 Q85 86 8 81 Q4 45 9 11" />
              </svg>
              <div className="mu-s5-box__txt">
                <b className="lv-mono">clap</b>
                <small className="lv-mono">a frozen ear</small>
              </div>
            </div>

            <PipeArrow className="mu-s5-arrow mu-s5-a2" />

            <div className="mu-s5-nums lv-mono" aria-label="a row of numbers, the song as the machine sees it">
              {NUMS.map((n) => (
                <span key={n}>{n}</span>
              ))}
            </div>

            <PipeArrow className="mu-s5-arrow mu-s5-a3" />

            <div className="mu-s5-adwrap">
              <div className="mu-s5-box mu-s5-ad">
                <svg
                  viewBox="0 0 190 100"
                  preserveAspectRatio="none"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.6}
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path className="mu-draw mu-s5-frame" d="M10 12 Q95 5 180 11 Q186 50 181 89 Q95 96 9 90 Q4 50 10 12" />
                </svg>
                <div className="mu-s5-box__txt">
                  <b className="lv-mono">the adapter</b>
                  <small className="lv-mono">the part we trained</small>
                  <svg
                    className="mu-s5-under"
                    viewBox="0 0 120 8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path className="mu-draw mu-s5-underline" d="M4 5 Q30 2 60 5 Q90 8 116 4" />
                  </svg>
                </div>
              </div>

              {/* curved delivery arrow, bending up and to the right into the blob */}
              <svg
                className="mu-s5-arc"
                viewBox="0 0 200 190"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path className="mu-draw mu-s5-shaft" d="M20 185 Q10 100 60 60 Q110 25 148 30" />
                <path className="mu-draw mu-s5-head" d="M148 30 L136 24 M148 30 L138 40" />
              </svg>

              {/* the word-space blob (scene 4's, smaller) with 4 word dots */}
              <div className="mu-s5-blob">
                <svg
                  viewBox="0 0 170 130"
                  preserveAspectRatio="none"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.4}
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path
                    className="mu-draw mu-s5-blobline"
                    d="M85 8 Q140 4 158 40 Q170 75 140 105 Q100 128 55 118 Q12 106 8 68 Q6 30 40 14 Q62 6 85 8"
                  />
                </svg>
                <span className="mu-s5-word lv-mono" style={{ left: "16%", top: "26%" }}>slow</span>
                <span className="mu-s5-word lv-mono" style={{ left: "58%", top: "20%" }}>warm</span>
                <span className="mu-s5-word lv-mono" style={{ left: "13%", top: "60%" }}>night</span>
                <span className="mu-s5-word lv-mono" style={{ left: "62%", top: "66%" }}>sad</span>
                <svg className="mu-s5-ring" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <circle cx="18" cy="18" r="15" />
                </svg>
                <i className="mu-s5-dot" aria-hidden="true" />
                <NameTag className="mu-s5-tag">word space</NameTag>
              </div>
            </div>
          </div>
        </div>

        <MuCaption className="mu-s5-cap">
          A frozen ear hears the song. A small adapter we trained on ten thousand songs aims it into the word space.
        </MuCaption>
      </div>
    </section>
  );
}

export function buildScene5(ctx: SceneCtx): void {
  const { q, root, drawFrom, desktop } = ctx;

  /* ---------- mobile: static stack, gentle scrubbed entrances ---------- */
  if (!desktop) {
    const picks: string[] = [".mu-s5-h", ".mu-s5-pipe", ".mu-s5-cap"];
    picks.forEach((sel) => {
      const el = q(sel)[0];
      if (!el) return;
      gsap.from(el, {
        y: 36,
        opacity: 0,
        scrollTrigger: { trigger: el, start: "top 78%", end: "top 35%", scrub: 0.8 }
      });
    });
    return;
  }

  /* ---------- desktop: one pinned scrubbed timeline ---------- */

  /* the bright dot starts hidden back at the arc's mouth (build-time set so
     there is no flash; offsets are world-space deltas from its final resting
     spot inside the blob) */
  gsap.set(q(".mu-s5-dot"), { x: -125, y: 160, opacity: 0 });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: root,
      start: "top top",
      end: "+=400%",
      pin: true,
      scrub: 1,
      anticipatePin: 1,
      fastScrollEnd: true
    }
  });

  /* 0 – 0.4 heading */
  tl.from(q(".mu-s5-h"), { y: 44, opacity: 0, duration: 0.32 }, 0.04);

  /* 0.4 – 0.9 wave draws; first arrow shaft then head */
  tl.fromTo(q(".mu-s5-wave .mu-draw"), drawFrom(), { strokeDashoffset: 0, duration: 0.35, ease: "none" }, 0.4)
    .fromTo(q(".mu-s5-a1 .mu-s5-shaft"), drawFrom(), { strokeDashoffset: 0, duration: 0.3, ease: "none" }, 0.52)
    .fromTo(q(".mu-s5-a1 .mu-s5-head"), drawFrom(), { strokeDashoffset: 0, duration: 0.06, ease: "none" }, 0.83);

  /* 0.9 – 1.4 clap box draws, labels fade */
  tl.fromTo(q(".mu-s5-clap .mu-s5-frame"), drawFrom(), { strokeDashoffset: 0, duration: 0.34, ease: "none" }, 0.92)
    .from(q(".mu-s5-clap .mu-s5-box__txt"), { opacity: 0, duration: 0.22 }, 1.16);

  /* 1.4 – 1.9 second arrow; the numbers reveal left to right */
  tl.fromTo(q(".mu-s5-a2 .mu-s5-shaft"), drawFrom(), { strokeDashoffset: 0, duration: 0.3, ease: "none" }, 1.42)
    .fromTo(q(".mu-s5-a2 .mu-s5-head"), drawFrom(), { strokeDashoffset: 0, duration: 0.06, ease: "none" }, 1.73)
    .from(q(".mu-s5-nums span"), { opacity: 0, duration: 0.16, stagger: 0.018, ease: "none" }, 1.5);

  /* 1.9 – 2.5 third arrow; adapter box; accent underline under its sub-label */
  tl.fromTo(q(".mu-s5-a3 .mu-s5-shaft"), drawFrom(), { strokeDashoffset: 0, duration: 0.3, ease: "none" }, 1.92)
    .fromTo(q(".mu-s5-a3 .mu-s5-head"), drawFrom(), { strokeDashoffset: 0, duration: 0.06, ease: "none" }, 2.23)
    .fromTo(q(".mu-s5-ad .mu-s5-frame"), drawFrom(), { strokeDashoffset: 0, duration: 0.34, ease: "none" }, 2.0)
    .from(q(".mu-s5-ad .mu-s5-box__txt"), { opacity: 0, duration: 0.2 }, 2.24)
    .fromTo(q(".mu-s5-underline"), drawFrom(), { strokeDashoffset: 0, duration: 0.12, ease: "none" }, 2.38);

  /* 2.5 – 3.2 blob draws; curved arrow shaft then head; the bright dot
     travels the curve (world-space keyframes) and lands with a ring pulse */
  tl.fromTo(q(".mu-s5-blobline"), drawFrom(), { strokeDashoffset: 0, duration: 0.3, ease: "none" }, 2.46)
    .from(q(".mu-s5-word, .mu-s5-tag"), { opacity: 0, duration: 0.2, stagger: 0.03 }, 2.62)
    .fromTo(q(".mu-s5-arc .mu-s5-shaft"), drawFrom(), { strokeDashoffset: 0, duration: 0.4, ease: "none" }, 2.52)
    .fromTo(q(".mu-s5-arc .mu-s5-head"), drawFrom(), { strokeDashoffset: 0, duration: 0.06, ease: "none" }, 2.94)
    .to(q(".mu-s5-dot"), { opacity: 1, duration: 0.05, ease: "none" }, 2.6)
    .to(
      q(".mu-s5-dot"),
      {
        keyframes: { x: [-130, -110, -40, 3, 0], y: [115, 65, 15, 5, 0], easeEach: "none" },
        duration: 0.5,
        ease: "none"
      },
      2.6
    )
    .fromTo(
      q(".mu-s5-ring"),
      { scale: 0.4, opacity: 0.85 },
      { scale: 1.4, opacity: 0, duration: 0.22, ease: "none", immediateRender: false },
      3.08
    );

  /* 3.3 – 4.0 caption; the bright dot pulses gently twice */
  tl.from(q(".mu-s5-cap"), { y: 26, opacity: 0, duration: 0.3 }, 3.32)
    .to(q(".mu-s5-dot"), { scale: 1.3, duration: 0.1, ease: "none" }, 3.5)
    .to(q(".mu-s5-dot"), { scale: 1, duration: 0.12, ease: "none" }, 3.6)
    .to(q(".mu-s5-dot"), { scale: 1.3, duration: 0.1, ease: "none" }, 3.78)
    .to(q(".mu-s5-dot"), { scale: 1, duration: 0.12, ease: "none" }, 3.88);
}
