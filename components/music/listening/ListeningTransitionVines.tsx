"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";

type LeafProps = {
  x: number;
  y: number;
  rotate: number;
  scale?: number;
};

type RoseProps = {
  x: number;
  y: number;
  scale?: number;
};

function Leaf({ x, y, rotate, scale = 1 }: LeafProps) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}>
      <g className="mu-botanical-leaf">
        <path className="mu-botanical-leaf__shape" d="M0 0 C10-16 27-21 42-11 C36 6 18 14 0 0Z" />
        <path className="mu-botanical-leaf__vein" d="M3 -1 C15 -2 27 -5 38 -9" />
      </g>
    </g>
  );
}

function Rose({ x, y, scale = 1 }: RoseProps) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <g className="mu-botanical-rose">
        <ellipse className="mu-botanical-rose__wash" cx="0" cy="0" rx="30" ry="28" />
        <path
          className="mu-botanical-rose__outline"
          d="M-29 5 C-31-8-24-22-12-27 C-3-35 11-34 20-26 C31-22 38-10 34 2 C36 15 26 26 14 29 C3 36-12 32-19 23 C-26 19-30 12-29 5Z"
        />
        <path
          className="mu-botanical-rose__petal"
          d="M-18-7 C-12-19 2-24 14-18 C24-12 27 1 20 10 C13 20-2 22-12 14 C-20 8-22-1-18-7Z"
        />
        <path
          className="mu-botanical-rose__petal"
          d="M-7-10 C0-17 12-15 16-6 C20 3 13 12 4 12 C-5 13-11 6-10-2 C-9-6-7-8-4-10"
        />
        <path
          className="mu-botanical-rose__petal"
          d="M-2-5 C3-9 9-7 10-2 C11 3 7 6 3 5 C-1 5-3 2-2-1 C-1-3 1-4 4-3"
        />
        <path className="mu-botanical-rose__petal" d="M-25 7 C-14 5-6 10-2 19" />
        <path className="mu-botanical-rose__petal" d="M22-18 C17-8 18 1 27 8" />
      </g>
    </g>
  );
}

export function ListeningTransitionVines() {
  const root = useRef<SVGSVGElement>(null);

  useLayoutEffect(() => {
    const svg = root.current;
    if (!svg || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const stems = Array.from(svg.querySelectorAll<SVGPathElement>(".mu-botanical-stem"));
    const leftBranches = Array.from(svg.querySelectorAll<SVGPathElement>(".mu-botanical-side--left .mu-botanical-branch"));
    const rightBranches = Array.from(svg.querySelectorAll<SVGPathElement>(".mu-botanical-side--right .mu-botanical-branch"));
    const leftLeaves = Array.from(svg.querySelectorAll<SVGGElement>(".mu-botanical-side--left .mu-botanical-leaf"));
    const rightLeaves = Array.from(svg.querySelectorAll<SVGGElement>(".mu-botanical-side--right .mu-botanical-leaf"));
    const roses = Array.from(svg.querySelectorAll<SVGGElement>(".mu-botanical-rose"));
    let running = false;
    let timeline: gsap.core.Timeline | null = null;

    const resetArtwork = () => {
      gsap.set(svg, { clipPath: "inset(100% 0 0 0)" });
      gsap.set(stems, { strokeDashoffset: 1, opacity: 1 });
      gsap.set([...leftBranches, ...rightBranches], { strokeDashoffset: 1, opacity: 1 });
      gsap.set([...leftLeaves, ...rightLeaves], { autoAlpha: 0, scale: 0.35, rotate: -4 });
      gsap.set(roses, { autoAlpha: 0, scale: 0.76, rotate: -3 });
    };

    const play = () => {
      if (running) return;
      running = true;
      timeline?.kill();
      resetArtwork();

      timeline = gsap.timeline({
        defaults: { overwrite: "auto" },
        onComplete: () => {
          running = false;
        }
      });

      timeline
        .to(svg, {
          clipPath: "inset(0% 0 0 0)",
          duration: 0.72,
          ease: "power2.out"
        }, 0.08)
        .to(stems, {
          strokeDashoffset: 0,
          duration: 0.78,
          ease: "power2.out"
        }, 0.1)
        .to(leftBranches, {
          strokeDashoffset: 0,
          duration: 0.46,
          stagger: 0.09,
          ease: "power2.out"
        }, 0.31)
        .to(rightBranches, {
          strokeDashoffset: 0,
          duration: 0.46,
          stagger: 0.09,
          ease: "power2.out"
        }, 0.31)
        .to(leftLeaves, {
          autoAlpha: 0.96,
          scale: 1,
          rotate: 0,
          duration: 0.3,
          stagger: 0.045,
          ease: "back.out(1.25)"
        }, 0.39)
        .to(rightLeaves, {
          autoAlpha: 0.96,
          scale: 1,
          rotate: 0,
          duration: 0.3,
          stagger: 0.045,
          ease: "back.out(1.25)"
        }, 0.39)
        .to(roses, {
          autoAlpha: 0.96,
          scale: 1,
          rotate: 0,
          duration: 0.36,
          stagger: 0.08,
          ease: "back.out(1.2)"
        }, 0.58)
        /* Exit with the title instead of lingering into the page reveal. */
        .to([...leftLeaves, ...rightLeaves, ...roses], {
          autoAlpha: 0,
          scale: 0.92,
          duration: 0.2,
          ease: "power2.in"
        }, 0.88)
        .to([...stems, ...leftBranches, ...rightBranches], {
          opacity: 0,
          duration: 0.24,
          ease: "power2.in"
        }, 0.9)
        .to(svg, {
          opacity: 0,
          duration: 0.24,
          ease: "power2.in"
        }, 0.9);
    };

    resetArtwork();

    const observer = new MutationObserver(() => {
      const opacity = Number.parseFloat(window.getComputedStyle(svg).opacity || "0");
      if (opacity > 0.04 && !running) play();
    });

    observer.observe(svg, { attributes: true, attributeFilter: ["style"] });

    return () => {
      observer.disconnect();
      timeline?.kill();
    };
  }, []);

  return (
    <svg
      ref={root}
      className="mu-listening-vines"
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <g className="mu-botanical-side mu-botanical-side--left">
        <path
          className="mu-botanical-stem"
          pathLength="1"
          d="M-70 950 C10 870 42 800 90 730 C145 650 212 593 292 542 C375 489 445 437 510 382 C568 333 618 285 672 232"
        />
        <path
          className="mu-botanical-branch"
          pathLength="1"
          d="M90 730 C64 692 56 653 66 616 C72 591 85 570 104 550"
        />
        <path
          className="mu-botanical-branch"
          pathLength="1"
          d="M292 542 C260 508 250 471 258 438 C264 412 278 392 299 374"
        />
        <path
          className="mu-botanical-branch"
          pathLength="1"
          d="M510 382 C480 352 470 319 478 290 C485 266 498 247 519 231"
        />

        <Leaf x={90} y={730} rotate={-28} />
        <Leaf x={66} y={616} rotate={192} scale={0.9} />
        <Leaf x={292} y={542} rotate={24} />
        <Leaf x={258} y={438} rotate={202} scale={0.92} />
        <Leaf x={510} y={382} rotate={-22} />
        <Leaf x={478} y={290} rotate={200} scale={0.88} />
        <Leaf x={635} y={269} rotate={12} scale={0.92} />

        <g transform="translate(299 374)">
          <path className="mu-botanical-branch" pathLength="1" d="M0 0 C4-9 9-16 15-22" />
          <Rose x={15} y={-22} />
        </g>
        <g transform="translate(519 231)">
          <path className="mu-botanical-branch" pathLength="1" d="M0 0 C3-7 7-12 11-17" />
          <Rose x={11} y={-17} scale={0.72} />
        </g>
      </g>

      <g className="mu-botanical-side mu-botanical-side--right">
        <path
          className="mu-botanical-stem"
          pathLength="1"
          d="M1675 948 C1595 874 1558 804 1511 735 C1456 655 1389 600 1308 550 C1225 499 1155 449 1089 396 C1030 348 980 302 928 252"
        />
        <path
          className="mu-botanical-branch"
          pathLength="1"
          d="M1511 735 C1538 696 1547 657 1537 621 C1530 596 1517 575 1498 555"
        />
        <path
          className="mu-botanical-branch"
          pathLength="1"
          d="M1308 550 C1340 516 1350 479 1342 446 C1336 420 1322 400 1301 382"
        />
        <path
          className="mu-botanical-branch"
          pathLength="1"
          d="M1089 396 C1119 366 1129 333 1121 304 C1114 280 1101 261 1080 245"
        />

        <Leaf x={1511} y={735} rotate={208} />
        <Leaf x={1537} y={621} rotate={-12} scale={0.9} />
        <Leaf x={1308} y={550} rotate={156} />
        <Leaf x={1342} y={446} rotate={-20} scale={0.92} />
        <Leaf x={1089} y={396} rotate={202} />
        <Leaf x={1121} y={304} rotate={-18} scale={0.88} />
        <Leaf x={965} y={289} rotate={170} scale={0.92} />

        <g transform="translate(1301 382)">
          <path className="mu-botanical-branch" pathLength="1" d="M0 0 C-4-9-9-16-15-22" />
          <Rose x={-15} y={-22} />
        </g>
        <g transform="translate(1080 245)">
          <path className="mu-botanical-branch" pathLength="1" d="M0 0 C-3-7-7-12-11-17" />
          <Rose x={-11} y={-17} scale={0.72} />
        </g>
      </g>
    </svg>
  );
}
