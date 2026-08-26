"use client";

/**
 * Scene 6 — "the canyon". The modality gap as landscape: text lives on one
 * cliff, songs on the other, and shouting across barely carries. Final
 * visible state is authored in markup; the builder only reveals it.
 */

import "./scene6.css";
import gsap from "gsap";
import { StickMan, SpeechBubble, MuCaption, MuHeading, type SceneCtx } from "../sceneKit";

/* three echo arcs launching off the left cliff and dying mid-gap; each arc
   is a run of short dash-drawn segments so it reads dashed AND draws
   left-to-right with the house true-length technique */
const ECHOES: ReadonlyArray<readonly string[]> = [
  [
    "M566 8 Q592 0 618 0",
    "M638 2 Q664 8 688 20",
    "M704 32 Q724 50 738 72",
    "M750 88 Q762 110 770 134",
    "M774 150 Q778 166 780 182"
  ],
  [
    "M566 22 Q588 16 610 18",
    "M628 22 Q650 32 666 48",
    "M678 62 Q690 80 698 100",
    "M702 114 Q706 128 708 142"
  ],
  ["M566 36 Q584 32 600 36", "M612 42 Q626 54 634 68", "M638 80 Q641 90 642 100"]
];

const MARKS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8];
const DOTS: readonly number[] = [1, 2, 3, 4, 5];

export function Scene6() {
  return (
    <section className="mu-scene mu-s6" data-scene="6" aria-label="The canyon: text and audio land on far shores of the same space">
      <div className="mu-s6-head">
        <MuHeading>It almost worked.</MuHeading>
      </div>

      <MuCaption className="mu-s6-caption">
        Text and audio settled on two separate sides of the space. The gap has a name: the modality gap. Queries
        could reach the songs, but a perfect match scored around 0.3 when song-to-song matches score near 0.9.
      </MuCaption>

      <div className="mu-s6-land" aria-hidden="true">
        <svg
          className="mu-s6-terrain"
          viewBox="0 0 1440 380"
          preserveAspectRatio="xMidYMax meet"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {/* left cliff: one long wobbly stroke, plateau then down the face */}
          <path
            className="mu-draw mu-s6-cliff"
            d="M-8 122 Q60 112 150 116 Q260 104 360 114 Q450 106 512 114 Q542 116 548 128 Q538 152 550 178 Q540 206 552 232 Q542 262 554 292 Q546 330 552 384"
          />
          {/* right cliff: up the far wall then plateau to the edge */}
          <path
            className="mu-draw mu-s6-cliff"
            d="M886 384 Q880 336 890 300 Q878 268 892 236 Q882 204 894 172 Q884 144 896 126 Q930 112 1010 118 Q1120 106 1240 116 Q1340 108 1448 114"
          />
          {ECHOES.map((segs, i) => (
            <g key={i} className={`mu-s6-echo mu-s6-echo--${i + 1}`} strokeWidth={2}>
              {segs.map((d) => (
                <path key={d} className="mu-draw" d={d} />
              ))}
            </g>
          ))}
        </svg>

        {/* left shore: word dots + two tiny labels */}
        {DOTS.map((n) => (
          <span key={n} className={`mu-s6-dot mu-s6-dot--${n}`} />
        ))}
        <i className="mu-s6-lab mu-s6-lab--1 lv-mono">heartbreak</i>
        <i className="mu-s6-lab mu-s6-lab--2 lv-mono">3am</i>

        <StickMan pose="ask" className="mu-s6-man" />
        <SpeechBubble tail="left" className="mu-s6-bubble">
          hello??
        </SpeechBubble>

        {/* right shore: eight song markers, a wobbly note-head with a tail */}
        {MARKS.map((n) => (
          <svg
            key={n}
            className={`mu-s6-mark mu-s6-mark--${n}`}
            viewBox="0 0 26 32"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M8 24 Q8 20 13 20 Q18 20 18 23.5 Q18 27 13 27 Q8 27 8 24" />
            <path d="M18 23 L18 6 Q21 9 25 10" />
          </svg>
        ))}

        {/* carved into the gap's far wall */}
        <span className="mu-s6-carve lv-mono">cosine = 0.3</span>
      </div>
    </section>
  );
}

export function buildScene6(ctx: SceneCtx): void {
  const { q } = ctx;

  if (!ctx.desktop) {
    /* mobile: no pin — the composed landscape simply rises in */
    const entrances: ReadonlyArray<{ sel: string; y: number }> = [
      { sel: ".mu-s6-head", y: 30 },
      { sel: ".mu-s6-land", y: 40 },
      { sel: ".mu-s6-caption", y: 26 }
    ];
    entrances.forEach(({ sel, y }) => {
      const el = q(sel)[0];
      if (!el) return;
      gsap.from(el, {
        y,
        opacity: 0,
        scrollTrigger: { trigger: el, start: "top 78%", end: "top 35%", scrub: 0.8 }
      });
    });
    return;
  }

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: ctx.root,
      start: "top top",
      end: "+=350%",
      pin: true,
      scrub: 1,
      anticipatePin: 1,
      fastScrollEnd: true
    }
  });

  /* 0 – 0.6 : the terrain draws, both cliffs with a slight overlap */
  tl.from(q(".mu-s6-head"), { opacity: 0, y: 24, duration: 0.25 }, 0)
    .fromTo(
      q(".mu-s6-cliff"),
      ctx.drawFrom(),
      { strokeDashoffset: 0, duration: 0.45, stagger: 0.15, ease: "none" },
      0
    );

  /* 0.6 – 1.1 : left shore populates — word dots pop, stickman draws in */
  tl.from(q(".mu-s6-dot"), { scale: 0, duration: 0.18, stagger: 0.06, ease: "back.out(2.5)" }, 0.62)
    .fromTo(
      q(".mu-s6-man .mu-draw"),
      ctx.drawFrom(),
      { strokeDashoffset: 0, duration: 0.38, stagger: 0.02, ease: "none" },
      0.68
    )
    .from(q(".mu-s6-lab"), { opacity: 0, duration: 0.2, stagger: 0.08 }, 0.88);

  /* 1.1 – 1.5 : right shore populates — song markers pop staggered */
  tl.from(
    q(".mu-s6-mark"),
    { scale: 0, transformOrigin: "50% 80%", duration: 0.16, stagger: 0.045, ease: "back.out(2)" },
    1.12
  );

  /* 1.5 – 2.0 : the bubble draws, then "hello??" fades in */
  tl.fromTo(
    q(".mu-s6-bubble .mu-draw"),
    ctx.drawFrom(),
    { strokeDashoffset: 0, duration: 0.3, ease: "none" },
    1.55
  ).from(q(".mu-s6-bubble .mu-bubble__txt"), { opacity: 0, duration: 0.18 }, 1.82);

  /* 2.0 – 2.8 : three echoes launch and die mid-gap; the third fizzles */
  const echoes: ReadonlyArray<{ sel: string; at: number; dur: number }> = [
    { sel: ".mu-s6-echo--1", at: 2.0, dur: 0.2 },
    { sel: ".mu-s6-echo--2", at: 2.3, dur: 0.18 },
    { sel: ".mu-s6-echo--3", at: 2.56, dur: 0.14 }
  ];
  echoes.forEach(({ sel, at, dur }) => {
    tl.fromTo(
      q(`${sel} .mu-draw`),
      ctx.drawFrom(),
      { strokeDashoffset: 0, duration: dur, stagger: 0.03, ease: "none" },
      at
    );
    /* fades from full presence down to its authored resting opacity */
    tl.from(q(sel), { opacity: 1, duration: 0.22, ease: "none" }, at + dur);
  });

  /* the wall answers: the carved score appears, the stickman shudders */
  tl.from(q(".mu-s6-carve"), { opacity: 0, duration: 0.2 }, 2.62).to(
    q(".mu-s6-man"),
    { x: 2, duration: 0.035, repeat: 5, yoyo: true, ease: "none" },
    2.66
  );

  /* 2.9 – 3.5 : heading dims, caption lands */
  const dTotal = tl.duration();
  tl.to(q(".mu-s6-head"), { opacity: 0.25, duration: 0.3 }, dTotal * 0.66).from(
    q(".mu-s6-caption"),
    { opacity: 0, y: 26, duration: 0.4 },
    dTotal * 0.7
  );
}
