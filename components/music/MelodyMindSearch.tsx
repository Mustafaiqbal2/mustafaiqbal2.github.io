"use client";

import type { CSSProperties, FormEvent } from "react";
import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, RotateCcw } from "lucide-react";
import "./melodymind-search.css";

gsap.registerPlugin(ScrollTrigger);

type Result = {
  title: string;
  artist: string;
  colors: [string, string];
};

type SearchExample = {
  query: string;
  results: Result[];
};

const EXAMPLES: SearchExample[] = [
  {
    query: "I am leaving home for the first time and trying not to look back.",
    results: [
      { title: "Ribs", artist: "Lorde", colors: ["#40505e", "#050608"] },
      { title: "Scott Street", artist: "Phoebe Bridgers", colors: ["#b88065", "#263b4c"] },
      { title: "Somewhere Only We Know", artist: "Keane", colors: ["#bdc7d0", "#394750"] },
      { title: "The Night We Met", artist: "Lord Huron", colors: ["#cab984", "#19383c"] },
      { title: "About You", artist: "The 1975", colors: ["#ece8dd", "#323132"] }
    ]
  },
  {
    query: "A close friendship ended quietly. Neither of us said goodbye.",
    results: [
      { title: "Cool About It", artist: "boygenius", colors: ["#d4b28c", "#756954"] },
      { title: "Bags", artist: "Clairo", colors: ["#d36a66", "#6a7c86"] },
      { title: "No Distance Left to Run", artist: "Blur", colors: ["#bc9465", "#1c2b37"] },
      { title: "Eventually", artist: "Tame Impala", colors: ["#d66591", "#334f8f"] },
      { title: "About You", artist: "The 1975", colors: ["#ece8dd", "#323132"] }
    ]
  },
  {
    query: "I got the job. I am walking home alone at midnight and it finally feels real.",
    results: [
      { title: "Midnight City", artist: "M83", colors: ["#e76d3c", "#492e71"] },
      { title: "Dog Days Are Over", artist: "Florence + The Machine", colors: ["#f0d8b1", "#3a5e6d"] },
      { title: "Walking on a Dream", artist: "Empire of the Sun", colors: ["#e5b355", "#1f6d88"] },
      { title: "Electric Feel", artist: "MGMT", colors: ["#cf795d", "#423f71"] },
      { title: "The Adults Are Talking", artist: "The Strokes", colors: ["#e7b62e", "#224e42"] }
    ]
  }
];

const NODE_POSITIONS = [
  { x: 23, y: 23 },
  { x: 76, y: 18 },
  { x: 84, y: 61 },
  { x: 62, y: 79 },
  { x: 22, y: 70 },
  { x: 10, y: 42 },
  { x: 40, y: 12 },
  { x: 92, y: 37 },
  { x: 43, y: 86 },
  { x: 68, y: 42 },
  { x: 34, y: 54 },
  { x: 57, y: 9 }
];

const CONNECTORS = [
  "M 500 270 C 415 250, 330 175, 230 125",
  "M 500 270 C 590 215, 665 145, 760 100",
  "M 500 270 C 615 280, 740 315, 840 340",
  "M 500 270 C 540 335, 580 395, 620 445",
  "M 500 270 C 420 315, 320 355, 220 395"
];

function coverStyle(result: Result): CSSProperties {
  return {
    "--mm-cover-a": result.colors[0],
    "--mm-cover-b": result.colors[1]
  } as CSSProperties;
}

function nodeStyle(x: number, y: number, result?: Result): CSSProperties {
  return {
    "--mm-node-x": `${x}%`,
    "--mm-node-y": `${y}%`,
    ...(result ? coverStyle(result) : {})
  } as CSSProperties;
}

function chooseExample(query: string): number {
  const exact = EXAMPLES.findIndex((example) => example.query === query.trim());
  if (exact >= 0) return exact;

  let hash = 0;
  for (const character of query) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return Math.abs(hash) % EXAMPLES.length;
}

export function MelodyMindSearch() {
  const rootRef = useRef<HTMLElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const [query, setQuery] = useState(EXAMPLES[0].query);
  const [activeExample, setActiveExample] = useState(0);
  const [hasResults, setHasResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const [status, setStatus] = useState("Waiting for a situation");

  const activeResults = EXAMPLES[activeExample].results;

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const context = gsap.context(() => {
      if (reduceMotion) return;

      gsap.set(".mm-intro__line", { scaleX: 0, transformOrigin: "0% 50%" });
      gsap.set(".mm-shell", { opacity: 0, y: 42 });
      gsap.set(".mm-intro > *:not(.mm-intro__line)", { opacity: 0, y: 22 });
      gsap.set(".mm-method__step", { opacity: 0, y: 24 });

      const intro = gsap.timeline({
        scrollTrigger: {
          trigger: root,
          start: "top 78%",
          once: true
        }
      });

      intro
        .to(".mm-intro > *:not(.mm-intro__line)", {
          opacity: 1,
          y: 0,
          duration: 0.62,
          stagger: 0.08,
          ease: "power3.out"
        })
        .to(".mm-intro__line", { scaleX: 1, duration: 0.85, ease: "power3.inOut" }, 0.16)
        .to(".mm-shell", { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }, 0.28);

      gsap.to(".mm-method__step", {
        opacity: 1,
        y: 0,
        duration: 0.65,
        stagger: 0.11,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".mm-method",
          start: "top 82%",
          once: true
        }
      });
    }, root);

    return () => {
      timelineRef.current?.kill();
      context.revert();
    };
  }, []);

  const animateSearch = (nextExample: number) => {
    const root = rootRef.current;
    if (!root) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const paths = Array.from(root.querySelectorAll<SVGPathElement>(".mm-field__connector"));
    const selectedNodes = Array.from(root.querySelectorAll<HTMLElement>(".mm-node--selected"));
    const resultRows = Array.from(root.querySelectorAll<HTMLElement>(".mm-result"));
    const queryPoint = root.querySelector<HTMLElement>(".mm-query-point");
    const rings = Array.from(root.querySelectorAll<SVGCircleElement>(".mm-field__ring"));

    timelineRef.current?.kill();
    setSearching(true);
    setHasResults(true);
    setStatus("Reading the situation");

    if (reduceMotion) {
      setActiveExample(nextExample);
      setSearching(false);
      setStatus("Playlist ready");
      return;
    }

    setActiveExample(nextExample);

    window.requestAnimationFrame(() => {
      paths.forEach((path) => {
        const length = path.getTotalLength();
        gsap.set(path, {
          strokeDasharray: `${length} ${length + 2}`,
          strokeDashoffset: length + 1
        });
      });
      gsap.set(selectedNodes, { opacity: 0, scale: 0.55 });
      gsap.set(resultRows, { opacity: 0, x: 28 });
      gsap.set(rings, { opacity: 0, scale: 0.55, transformOrigin: "50% 50%" });
      if (queryPoint) gsap.set(queryPoint, { opacity: 0, scale: 0.7, y: 18 });

      const timeline = gsap.timeline({
        defaults: { ease: "power3.out" },
        onComplete: () => {
          setSearching(false);
          setStatus("Playlist ready");
        }
      });

      timelineRef.current = timeline;
      timeline
        .to(".mm-field__idle", { opacity: 0, duration: 0.22 }, 0)
        .to(queryPoint, { opacity: 1, scale: 1, y: 0, duration: 0.52 }, 0.1)
        .call(() => setStatus("Finding the nearest songs"), undefined, 0.52)
        .to(rings, {
          opacity: (index) => 0.5 - index * 0.13,
          scale: 1,
          duration: 0.75,
          stagger: 0.08,
          ease: "power2.out"
        }, 0.45)
        .to(paths, {
          strokeDashoffset: 0,
          duration: 0.52,
          stagger: 0.08,
          ease: "power2.inOut"
        }, 0.68)
        .to(selectedNodes, {
          opacity: 1,
          scale: 1,
          duration: 0.42,
          stagger: 0.08,
          ease: "back.out(1.6)"
        }, 0.82)
        .call(() => setStatus("Building the playlist"), undefined, 1.22)
        .to(resultRows, {
          opacity: 1,
          x: 0,
          duration: 0.46,
          stagger: 0.07
        }, 1.2)
        .to(".mm-field__status-dot", {
          scale: 1.8,
          opacity: 0,
          duration: 0.55,
          ease: "power2.out"
        }, 1.52)
        .set(".mm-field__status-dot", { scale: 1, opacity: 1 });
    });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (query.trim().length < 8 || searching) return;
    animateSearch(chooseExample(query));
  };

  const reset = () => {
    timelineRef.current?.kill();
    setHasResults(false);
    setSearching(false);
    setStatus("Waiting for a situation");
    const root = rootRef.current;
    if (!root) return;
    gsap.set(root.querySelectorAll(".mm-field__connector"), { clearProps: "all" });
    gsap.set(root.querySelectorAll(".mm-node--selected,.mm-result,.mm-query-point,.mm-field__ring"), {
      clearProps: "all"
    });
    gsap.set(root.querySelector(".mm-field__idle"), { clearProps: "all" });
  };

  return (
    <section ref={rootRef} className={`mm ${hasResults ? "mm--results" : ""}`} aria-labelledby="mm-title">
      <div className="mm-intro">
        <p className="mm-kicker lv-mono">MELODYMIND / SEARCH BY SITUATION</p>
        <h2 id="mm-title">Find the song that fits what actually happened.</h2>
        <p className="mm-intro__copy">
          Describe the situation in full. MelodyMind uses the people, event, and feeling in the sentence to find songs that belong together.
        </p>
        <span className="mm-intro__line" aria-hidden="true" />
      </div>

      <div className="mm-shell">
        <form className="mm-composer" onSubmit={submit}>
          <div className="mm-composer__head">
            <span className="lv-mono">01 / THE SITUATION</span>
            {hasResults && (
              <button className="mm-reset lv-mono" type="button" onClick={reset}>
                <RotateCcw aria-hidden="true" /> reset
              </button>
            )}
          </div>

          <label htmlFor="mm-query">What is happening?</label>
          <textarea
            id="mm-query"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              if (hasResults) reset();
            }}
            rows={5}
            maxLength={240}
            spellCheck
          />

          <div className="mm-examples">
            <p className="lv-mono">TRY A SITUATION</p>
            {EXAMPLES.map((example, index) => (
              <button
                key={example.query}
                type="button"
                className={query === example.query ? "is-current" : ""}
                onClick={() => {
                  setQuery(example.query);
                  if (hasResults) reset();
                }}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                {example.query}
              </button>
            ))}
          </div>

          <button className="mm-submit" type="submit" disabled={query.trim().length < 8 || searching}>
            <span>{searching ? "Finding songs" : "Find songs"}</span>
            <ArrowRight aria-hidden="true" />
          </button>
        </form>

        <div className="mm-field" aria-live="polite">
          <div className="mm-field__head">
            <span className="lv-mono">02 / SONG SPACE</span>
            <span className="mm-field__status lv-mono">
              <i className="mm-field__status-dot" aria-hidden="true" />
              {status}
            </span>
          </div>

          <div className="mm-field__map">
            <div className="mm-field__grid" aria-hidden="true" />
            <p className="mm-field__idle">
              Every point is a song.
              <span>Your situation becomes the point they are measured from.</span>
            </p>

            <svg className="mm-field__lines" viewBox="0 0 1000 540" preserveAspectRatio="none" aria-hidden="true">
              <circle className="mm-field__ring" cx="500" cy="270" r="78" />
              <circle className="mm-field__ring" cx="500" cy="270" r="145" />
              <circle className="mm-field__ring" cx="500" cy="270" r="215" />
              {CONNECTORS.map((path) => (
                <path key={path} className="mm-field__connector" d={path} />
              ))}
            </svg>

            <div className="mm-query-point">
              <span className="lv-mono">YOUR SITUATION</span>
              <p>{query}</p>
            </div>

            {NODE_POSITIONS.map((position, index) => {
              const result = index < activeResults.length ? activeResults[index] : undefined;
              return (
                <span
                  key={`${position.x}-${position.y}`}
                  className={`mm-node ${result ? "mm-node--selected" : ""}`}
                  style={nodeStyle(position.x, position.y, result)}
                  aria-hidden="true"
                >
                  {result ? String(index + 1).padStart(2, "0") : ""}
                </span>
              );
            })}
          </div>

          <ol className="mm-results" aria-label="Song results">
            {activeResults.map((result, index) => (
              <li className="mm-result" key={`${result.title}-${result.artist}`}>
                <span className="mm-result__rank lv-mono">{String(index + 1).padStart(2, "0")}</span>
                <span className="mm-result__cover" style={coverStyle(result)} aria-hidden="true">
                  <i />
                </span>
                <span className="mm-result__text">
                  <strong>{result.title}</strong>
                  <small>{result.artist}</small>
                </span>
                <span className="mm-result__wave" aria-hidden="true">
                  {Array.from({ length: 9 }, (_, bar) => <i key={bar} />)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="mm-method">
        <div className="mm-method__title">
          <p className="lv-mono">WHAT THE SCREEN IS SHOWING</p>
          <h3>One map for sentences and songs.</h3>
        </div>
        <article className="mm-method__step">
          <span className="lv-mono">01</span>
          <h4>The sentence becomes coordinates.</h4>
          <p>A text model turns the sentence into numbers that preserve its meaning.</p>
        </article>
        <article className="mm-method__step">
          <span className="lv-mono">02</span>
          <h4>Songs enter the same map.</h4>
          <p>An audio embedding model turns each song into numbers. A small trained layer places them on the text map.</p>
        </article>
        <article className="mm-method__step">
          <span className="lv-mono">03</span>
          <h4>The nearest group becomes a playlist.</h4>
          <p>The first matches define a tighter search point. The second search builds the final list.</p>
        </article>
      </div>
    </section>
  );
}
