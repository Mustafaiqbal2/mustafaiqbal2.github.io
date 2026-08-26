"use client";

/**
 * Scene 2 — "mood is too coarse".
 * Every app files music under mood; mood is not the situation.
 * Final composed state is authored in markup; the desktop timeline only
 * reveals it (hidden from-states via .from/.fromTo, TRUE dash draws).
 */

import "./scene2.css";
import gsap from "gsap";
import { StickMan, WaveDoodle, MuCaption, MuHeading, type SceneCtx } from "../sceneKit";

/* hand-wobbled rounded rects (never ruler-straight) */
const TAG_RECT =
  "M14 5 Q85 2 156 5 Q166 7 165 32 Q166 56 154 59 Q85 62 16 59 Q5 56 5 33 Q4 8 14 5";
const BIG_RECT =
  "M18 6 Q120 2 222 6 Q235 9 234 75 Q235 141 220 144 Q120 148 20 144 Q6 141 6 75 Q5 9 18 6";
const SEARCH_RECT =
  "M12 4 Q130 2 248 4 Q257 6 256 22 Q257 39 246 40 Q130 43 14 40 Q4 38 4 22 Q3 6 12 4";
const SEARCH_LENS =
  "M226 14 Q232 10 237 15 Q241 20 236 25 Q231 29 226 24 Q222 19 226 14 M236 25 L245 33";

/* the search query, pre-authored and chunked for stepped-opacity typing */
const QUERY_CHUNKS: readonly string[] = [
  "songs ",
  "for ",
  "crying ",
  "in the ",
  "car ",
  "outside ",
  "the ",
  "airport"
];

/* gentler, slower wave than the kit's jagged WaveDoodle */
function CalmWave() {
  return (
    <svg
      viewBox="0 0 120 40"
      className="mu-s2-waveSvg"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path className="mu-draw" d="M4 22 Q19 15 34 21 Q49 27 64 21 Q79 16 94 22 Q106 26 116 21" />
    </svg>
  );
}

function TagCard({ label, mod, hi }: { label: string; mod: string; hi?: boolean }) {
  return (
    <div className={`mu-s2-tag mu-s2-tag--${mod}`}>
      <svg
        viewBox="0 0 170 64"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path className="mu-draw" d={TAG_RECT} />
        {hi ? <path className="mu-s2-hi" d={TAG_RECT} /> : null}
      </svg>
      <span className="mu-s2-taglabel lv-mono">{label}</span>
    </div>
  );
}

function BigCard({ mod, label, jagged }: { mod: string; label: string; jagged: boolean }) {
  return (
    <div className={`mu-s2-big mu-s2-big--${mod}`}>
      <svg
        className="mu-s2-bigframe"
        viewBox="0 0 240 150"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.6}
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path className="mu-draw mu-s2-frame" d={BIG_RECT} />
      </svg>
      <span className="mu-s2-biglabel lv-mono">{label}</span>
      <span className="mu-s2-wave">{jagged ? <WaveDoodle className="mu-s2-waveSvg" /> : <CalmWave />}</span>
    </div>
  );
}

export function Scene2() {
  return (
    <section className="mu-scene mu-s2" data-scene="2" aria-label="Scene 2: mood is too coarse">
      <div className="mu-s2-head">
        <MuHeading>
          Music apps file everything under a <b>mood</b> tag.
        </MuHeading>
      </div>

      <div className="mu-s2-tags">
        <TagCard label="sad" mod="sad" hi />
        <TagCard label="happy" mod="happy" />
        <TagCard label="chill" mod="chill" />
      </div>

      <BigCard mod="a" label="sad (breakup)" jagged />
      <BigCard mod="b" label="sad (funeral)" jagged={false} />

      <div className="mu-s2-gag">
        <div className="mu-s2-searchcol">
          <div className="mu-s2-search">
            {/* the box outline stretches with the container as it grows */}
            <svg
              className="mu-s2-box"
              viewBox="0 0 260 44"
              preserveAspectRatio="none"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path className="mu-draw" d={SEARCH_RECT} />
            </svg>
            <svg
              className="mu-s2-lens"
              viewBox="220 6 30 30"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path className="mu-draw" d={SEARCH_LENS} />
            </svg>
            <span className="mu-s2-query lv-mono" aria-label="songs for crying in the car outside the airport">
              {QUERY_CHUNKS.map((c, i) => (
                <span key={i} className="mu-s2-chunk" aria-hidden="true">
                  {c}
                </span>
              ))}
            </span>
          </div>
          <p className="mu-s2-result lv-mono">sad playlist #47</p>
          <p className="mu-s2-gagnote mu-caption lv-mono">it matched the word crying and ignored the rest of the sentence</p>
        </div>
        <div className="mu-s2-man" aria-hidden="true">
          <StickMan pose="idle" className="mu-s2-man-idle" />
          <StickMan pose="no" className="mu-s2-man-no" />
        </div>
      </div>

      <p className="mu-s2-cardsnote mu-caption lv-mono">
        both waveforms carry the same tag. a breakup and a funeral are different situations, and the tag cannot tell
        them apart
      </p>
      <MuCaption className="mu-s2-cap">That gap is where MelodyMind started: find songs that fit the whole situation.</MuCaption>
    </section>
  );
}

export function buildScene2(ctx: SceneCtx): void {
  const q = ctx.q;

  /* ---------- mobile: no pin, a few scrubbed entrances, done ---------- */
  if (!ctx.desktop) {
    const picks: readonly string[] = [".mu-s2-head", ".mu-s2-big--a", ".mu-s2-big--b", ".mu-s2-cap"];
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
  const sadTag = q(".mu-s2-tag--sad")[0];
  const bigA = q(".mu-s2-big--a")[0];
  const bigB = q(".mu-s2-big--b")[0];
  const idleMan = q(".mu-s2-man-idle")[0];

  /* center-to-center offset so the big cards genuinely split out of the sad tag */
  const delta = (from: HTMLElement | undefined, to: HTMLElement | undefined): { x: number; y: number } => {
    if (!from || !to) return { x: 0, y: 0 };
    const a = from.getBoundingClientRect();
    const b = to.getBoundingClientRect();
    return {
      x: a.left + a.width / 2 - (b.left + b.width / 2),
      y: a.top + a.height / 2 - (b.top + b.height / 2)
    };
  };
  const dA = delta(sadTag, bigA);
  const dB = delta(sadTag, bigB);

  /* markup's final state hides the idle pose (the "no" pose won); on desktop
     the idle pose carries the first half, so wake it before the timeline */
  if (idleMan) gsap.set(idleMan, { opacity: 1 });

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

  /* 0 – 0.5 : heading rises, three tag cards draw in */
  tl.from(q(".mu-s2-head"), { y: 44, opacity: 0, duration: 0.4 }, 0)
    .fromTo(
      q(".mu-s2-tag--sad .mu-draw"),
      ctx.drawFrom(),
      { strokeDashoffset: 0, duration: 0.28, stagger: 0.02, ease: "none" },
      0.12
    )
    .fromTo(
      q(".mu-s2-tag--happy .mu-draw"),
      ctx.drawFrom(),
      { strokeDashoffset: 0, duration: 0.28, stagger: 0.02, ease: "none" },
      0.24
    )
    .fromTo(
      q(".mu-s2-tag--chill .mu-draw"),
      ctx.drawFrom(),
      { strokeDashoffset: 0, duration: 0.28, stagger: 0.02, ease: "none" },
      0.36
    )
    .from(q(".mu-s2-taglabel"), { opacity: 0, y: 6, duration: 0.2, stagger: 0.08 }, 0.3);

  /* 0.7 – 1.3 : sad card highlights and splits into the two big cards */
  tl.from(q(".mu-s2-hi"), { opacity: 0, duration: 0.15 }, 0.7)
    .from(q(".mu-s2-big--a"), { x: dA.x, y: dA.y, scale: 0.6, duration: 0.55, ease: "power2.out" }, 0.78)
    .from(q(".mu-s2-big--a"), { opacity: 0, duration: 0.12 }, 0.78)
    .from(q(".mu-s2-big--b"), { x: dB.x, y: dB.y, scale: 0.6, duration: 0.55, ease: "power2.out" }, 0.88)
    .from(q(".mu-s2-big--b"), { opacity: 0, duration: 0.12 }, 0.88)
    .fromTo(
      q(".mu-s2-big--a .mu-s2-frame"),
      ctx.drawFrom(),
      { strokeDashoffset: 0, duration: 0.3, stagger: 0.02, ease: "none" },
      0.85
    )
    .fromTo(
      q(".mu-s2-big--b .mu-s2-frame"),
      ctx.drawFrom(),
      { strokeDashoffset: 0, duration: 0.3, stagger: 0.02, ease: "none" },
      0.95
    )
    .fromTo(
      q(".mu-s2-big--a .mu-s2-wave .mu-draw"),
      ctx.drawFrom(),
      { strokeDashoffset: 0, duration: 0.25, stagger: 0.02, ease: "none" },
      1.05
    )
    .fromTo(
      q(".mu-s2-big--b .mu-s2-wave .mu-draw"),
      ctx.drawFrom(),
      { strokeDashoffset: 0, duration: 0.25, stagger: 0.02, ease: "none" },
      1.15
    )
    .from(q(".mu-s2-biglabel"), { opacity: 0, duration: 0.2, stagger: 0.1 }, 1.15);

  /* 1.5 – 2.1 : the gag — stickman + search box draw, query types across */
  tl.fromTo(
    q(".mu-s2-search .mu-draw"),
    ctx.drawFrom(),
    { strokeDashoffset: 0, duration: 0.3, stagger: 0.02, ease: "none" },
    1.5
  )
    .fromTo(
      q(".mu-s2-man-idle .mu-draw"),
      ctx.drawFrom(),
      { strokeDashoffset: 0, duration: 0.35, stagger: 0.03, ease: "none" },
      1.55
    )
    .fromTo(q(".mu-s2-chunk"), { opacity: 0 }, { opacity: 1, duration: 0.02, stagger: 0.055, ease: "none" }, 1.8)
    /* the box grows a line at a time as the situation refuses to fit */
    .fromTo(
      q(".mu-s2-search"),
      { height: 44 },
      { height: 72, duration: 0.1, ease: "power1.inOut" },
      1.95
    )
    .to(q(".mu-s2-search"), { height: 100, duration: 0.1, ease: "power1.inOut" }, 2.12);
  tl.to(q(".mu-s2-search"), { scale: 1.06, duration: 0.05, ease: "none" }, 2.28)
    .to(q(".mu-s2-search"), { scale: 1, duration: 0.07, ease: "none" }, 2.33)
    .from(q(".mu-s2-result"), { opacity: 0, y: 8, duration: 0.15 }, 2.36)
    .from(q(".mu-s2-gagnote"), { opacity: 0, duration: 0.2 }, 2.52)
    .to(q(".mu-s2-man-idle"), { opacity: 0, duration: 0.12 }, 2.5)
    .fromTo(q(".mu-s2-man-no"), { opacity: 0 }, { opacity: 1, duration: 0.15 }, 2.5);

  /* 2.3 – 3.0 : the big cards drift further apart, caption lands */
  tl.to(q(".mu-s2-big--a"), { x: -36, y: 10, rotation: -2, duration: 0.5, ease: "none" }, 2.4)
    .to(q(".mu-s2-big--b"), { x: 36, y: -8, rotation: 2, duration: 0.5, ease: "none" }, 2.45)
    .from(q(".mu-s2-cardsnote"), { opacity: 0, y: 10, duration: 0.25 }, 2.2)
    .from(q(".mu-s2-cap"), { opacity: 0, y: 16, duration: 0.3 }, 2.8);

  /* 3.0 – 3.5 : hold the composed frame */
  tl.to({}, { duration: 0.45 }, 3.05);
}
