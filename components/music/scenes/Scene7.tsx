"use client";

/**
 * Scene 7 — "ask the songs themselves": the two-hop search.
 * Same canyon world as scene 6: word dots on the left cliff with the
 * stickman, ~14 song markers on the right shore. Hop one lands a probe at
 * the edge of the crowd; the five nearest songs vote; their centroid fires
 * a second, confident probe and the whole neighborhood answers at 0.8.
 *
 * Song markers are listed in DOM order by distance from the hop-two landing
 * point so a plain stagger reads as a radial cascade.
 */

import "./scene7.css";
import gsap from "gsap";
import { StickMan, MuCaption, MuHeading, type SceneCtx } from "../sceneKit";

/* ---------------- world geometry (viewBox 0 0 1440 900) ---------------- */

const TERRAIN: string[] = [
  /* left cliff: plateau top, then the face */
  "M0 560 Q140 550 278 558 Q392 564 438 556",
  "M438 556 Q448 640 434 738 Q446 826 436 900",
  /* right cliff: face, then the shore stretching right */
  "M646 900 Q634 806 648 706 Q636 606 646 524",
  "M646 524 Q820 514 1010 522 Q1230 528 1440 518"
];

const HATCHES: string[] = [
  "M438 616 Q412 634 396 654",
  "M436 706 Q414 720 402 736",
  "M646 586 Q668 604 682 622",
  "M648 690 Q672 706 684 724",
  "M470 872 Q520 860 574 870 Q604 876 622 868"
];

/* word dots on the left plateau, keeping the stickman company */
const WORDS: ReadonlyArray<readonly [number, number]> = [
  [232, 500],
  [268, 462],
  [305, 512],
  [340, 470],
  [376, 505],
  [398, 444],
  [300, 436],
  [258, 530]
];

/* the hop-two probe lands here; SONGS is ordered by distance from it */
type Marker = { x: number; y: number; a?: boolean };

const SONGS: Marker[] = [
  { x: 1010, y: 420 },
  { x: 1080, y: 470 },
  { x: 1050, y: 360 },
  { x: 1120, y: 410 },
  { x: 968, y: 470 },
  { x: 940, y: 380 },
  { x: 1180, y: 450 },
  { x: 872, y: 436, a: true },
  { x: 1240, y: 390 },
  { x: 838, y: 500, a: true },
  { x: 806, y: 458, a: true },
  { x: 1300, y: 460 },
  { x: 788, y: 402, a: true },
  { x: 742, y: 470, a: true }
];

/* seven wobbly lines pairing the five anchors into a huddle */
const HUDDLE: string[] = [
  "M742 470 Q763 434 788 402",
  "M788 402 Q831 417 872 436",
  "M872 436 Q857 469 838 500",
  "M838 500 Q789 487 742 470",
  "M742 470 Q773 466 806 458",
  "M788 402 Q796 430 806 458",
  "M872 436 Q840 448 806 458"
];

/* anchors' centroid, wearing a small drawn crown-ring */
const CENTROID = { x: 809, y: 453 } as const;

const CROWN: string[] = [
  "M809 436 Q826 438 826 453 Q826 470 809 470 Q792 470 792 453 Q792 436 809 436",
  "M801 431 L798 424",
  "M809 429 L809 421",
  "M817 431 L820 424"
];

/* probe resting spots (authored final), and their launch offsets */
const HOP1 = { x: 716, y: 466 } as const; /* edge of the crowd */
const HOP1_FROM = { x: -531, y: 4 } as const; /* from the stickman's hand */
const HOP2 = { x: 1050, y: 430 } as const; /* deep in the shore */
const HOP2_FROM = { x: CENTROID.x - HOP2.x, y: CENTROID.y - HOP2.y } as const;

/* ---------------- markup: the FINAL lit tableau ---------------- */

export function Scene7() {
  return (
    <section className="mu-scene mu-s7" data-scene="7" aria-label="The two-hop search: ask the songs themselves">
      <div className="mu-s7-stage mu-stage" aria-hidden="true">
        <svg
          className="mu-s7-canvas"
          viewBox="0 0 1440 900"
          preserveAspectRatio="none"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <g className="mu-s7-world">
            <g className="mu-s7-terrain" strokeWidth={3}>
              {TERRAIN.map((d) => (
                <path key={d} className="mu-draw" d={d} />
              ))}
              {HATCHES.map((d) => (
                <path key={d} className="mu-draw mu-s7-hatch" d={d} strokeWidth={2} />
              ))}
            </g>
            <g className="mu-s7-worddots" strokeWidth={2.4}>
              {WORDS.map(([x, y]) => (
                <circle key={`w${x}-${y}`} className="mu-draw" cx={x} cy={y} r={4} />
              ))}
            </g>
            <g strokeWidth={2.6}>
              {SONGS.map((s) => (
                <circle
                  key={`s${s.x}-${s.y}`}
                  className={`mu-draw mu-s7-song${s.a ? " mu-s7-song--a" : ""}`}
                  cx={s.x}
                  cy={s.y}
                  r={7}
                />
              ))}
            </g>
          </g>

          <g className="mu-s7-lines" strokeWidth={1.8}>
            {HUDDLE.map((d) => (
              <path key={d} className="mu-draw" d={d} />
            ))}
          </g>

          <g strokeWidth={2}>
            {SONGS.filter((s) => s.a).map((s) => (
              <circle key={`r1-${s.x}-${s.y}`} className="mu-s7-ring1" cx={s.x} cy={s.y} r={13} />
            ))}
          </g>

          <g strokeWidth={1.8}>
            {SONGS.map((s) => (
              <circle key={`r2-${s.x}-${s.y}`} className="mu-s7-ring2" cx={s.x} cy={s.y} r={16} />
            ))}
          </g>

          <circle className="mu-s7-centroid" cx={CENTROID.x} cy={CENTROID.y} r={6} />
          <g className="mu-s7-crown" strokeWidth={2}>
            {CROWN.map((d) => (
              <path key={d} className="mu-draw" d={d} />
            ))}
          </g>

          <circle className="mu-s7-probe mu-s7-probe1" cx={HOP1.x} cy={HOP1.y} r={7} />
          <circle className="mu-s7-probe mu-s7-probe2" cx={HOP2.x} cy={HOP2.y} r={8} />
        </svg>

        <div className="mu-s7-man">
          <StickMan pose="point" />
        </div>

        <span className="mu-s7-score lv-mono">0.8</span>
      </div>

      <div className="mu-s7-copy">
        <MuHeading className="mu-s7-h">The fix went in two hops.</MuHeading>
        <MuCaption className="mu-s7-cap">
          The first search only picks anchors: a handful of songs near the query. We keep the ones that agree with
          each other, average them into one point, and search again from that point. Song-to-song similarity is
          strong, so the second hop comes back at 0.8. This is the main trick in the thesis.
        </MuCaption>
      </div>
    </section>
  );
}

/* ---------------- builder ---------------- */

export function buildScene7(ctx: SceneCtx): void {
  const q = ctx.q;

  if (!ctx.desktop) {
    /* mobile: no pin, a static lit tableau that simply arrives */
    const rise = (el: HTMLElement | undefined, y: number): void => {
      if (!el) return;
      gsap.from(el, {
        y,
        opacity: 0,
        scrollTrigger: { trigger: el, start: "top 78%", end: "top 35%", scrub: 0.8 }
      });
    };
    rise(q(".mu-s7-h")[0], 30);
    rise(q(".mu-s7-cap")[0], 24);
    rise(q(".mu-s7-stage")[0], 40);
    return;
  }

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: ctx.root,
      start: "top top",
      end: "+=450%",
      pin: true,
      scrub: 1,
      anticipatePin: 1,
      fastScrollEnd: true
    }
  });

  /* 0 - 0.5: the stage recaps fast — terrain and both populations draw */
  tl.fromTo(
    q(".mu-s7-world .mu-draw, .mu-s7-man .mu-draw"),
    ctx.drawFrom(),
    { strokeDashoffset: 0, duration: 0.22, stagger: 0.005, ease: "none" },
    0
  );

  /* 0.5 - 1.1: HOP ONE — a bright probe arcs the gap, lands at the edge */
  tl.fromTo(q(".mu-s7-probe1"), { opacity: 0 }, { opacity: 1, duration: 0.05, ease: "none" }, 0.5)
    .fromTo(
      q(".mu-s7-probe1"),
      { x: HOP1_FROM.x, y: HOP1_FROM.y },
      { x: -300, y: -132, duration: 0.28, ease: "power2.out" },
      0.52
    )
    .to(q(".mu-s7-probe1"), { x: 0, y: 0, duration: 0.26, ease: "power2.in" }, 0.8)
    .fromTo(
      q(".mu-s7-song--a"),
      { scale: 1 },
      { scale: 1.3, duration: 0.16, stagger: 0.02, ease: "power1.out" },
      1.0
    )
    .fromTo(
      q(".mu-s7-ring1"),
      { opacity: 0, scale: 0.5 },
      { opacity: 0.95, scale: 1, duration: 0.18, stagger: 0.02, ease: "power1.out" },
      1.02
    );

  /* 1.1 - 1.9: THE VOTE — the five anchors huddle, pulse once, elect a center */
  tl.fromTo(
    q(".mu-s7-lines .mu-draw"),
    ctx.drawFrom(),
    { strokeDashoffset: 0, duration: 0.3, stagger: 0.03, ease: "none" },
    1.15
  )
    .to(q(".mu-s7-lines"), { scale: 1.06, duration: 0.1, ease: "sine.inOut" }, 1.62)
    .to(q(".mu-s7-ring1"), { scale: 1.15, duration: 0.1, ease: "sine.inOut" }, 1.62)
    .to(q(".mu-s7-lines"), { scale: 1, duration: 0.12, ease: "sine.inOut" }, 1.73)
    .to(q(".mu-s7-ring1"), { scale: 1, duration: 0.12, ease: "sine.inOut" }, 1.73)
    .fromTo(
      q(".mu-s7-centroid"),
      { opacity: 0, scale: 0.4 },
      { opacity: 1, scale: 1, duration: 0.12, ease: "power1.out" },
      1.68
    )
    .fromTo(
      q(".mu-s7-crown .mu-draw"),
      ctx.drawFrom(),
      { strokeDashoffset: 0, duration: 0.16, stagger: 0.015, ease: "none" },
      1.74
    );

  /* 1.9 - 2.7: HOP TWO — the centroid fires a confident probe deeper;
     the neighborhood lights up in a radial cascade (DOM order = distance) */
  tl.fromTo(q(".mu-s7-probe2"), { opacity: 0 }, { opacity: 1, duration: 0.04, ease: "none" }, 1.95)
    .fromTo(
      q(".mu-s7-probe2"),
      { x: HOP2_FROM.x, y: HOP2_FROM.y },
      { x: -118, y: -64, duration: 0.14, ease: "power2.out" },
      1.97
    )
    .to(q(".mu-s7-probe2"), { x: 0, y: 0, duration: 0.13, ease: "power2.in" }, 2.11)
    .fromTo(
      q(".mu-s7-ring2"),
      { opacity: 0, scale: 0.5 },
      { opacity: 0.9, scale: 1, duration: 0.14, stagger: 0.028, ease: "power1.out" },
      2.2
    )
    .to(q(".mu-s7-song"), { scale: 1.3, duration: 0.14, stagger: 0.028, ease: "power1.out" }, 2.2)
    .fromTo(
      q(".mu-s7-score"),
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.15, ease: "power1.out" },
      2.55
    );

  /* 2.7 - 3.4: everything settles to a calm glow; the heading lands
     (the lines fromTo also pins their playback opacity at 1 from build time,
     so the huddle draws vivid and only dims here) */
  tl.fromTo(q(".mu-s7-lines"), { opacity: 1 }, { opacity: 0.5, duration: 0.3, ease: "none" }, 2.85)
    .to(q(".mu-s7-ring1"), { opacity: 0.6, duration: 0.3, ease: "none" }, 2.85)
    .to(q(".mu-s7-ring2"), { opacity: 0.6, duration: 0.3, ease: "none" }, 2.85)
    .to(q(".mu-s7-probe"), { opacity: 0.75, duration: 0.3, ease: "none" }, 2.85)
    .fromTo(
      q(".mu-s7-h"),
      { opacity: 0, y: 26 },
      { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" },
      3.0
    );

  /* 3.5 - 4.5: the closing caption */
  tl.fromTo(
    q(".mu-s7-cap"),
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" },
    tl.duration() * 0.68
  );
}
