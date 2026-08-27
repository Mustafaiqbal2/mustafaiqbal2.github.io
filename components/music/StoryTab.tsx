"use client";

/**
 * Act I: the scroll-driven MelodyMind story. Eight scenes, each a
 * self-contained component + builder pair under ./scenes. Builders run
 * chunked (one per ~40ms) top-to-bottom so each pin measures a document that
 * already contains the spacers above it; onBuilt releases the boot gate.
 */

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { drawFrom } from "./sceneKit";
import { Scene1, buildScene1 } from "./scenes/Scene1";
import { Scene2, buildScene2 } from "./scenes/Scene2";
import { Scene3, buildScene3 } from "./scenes/Scene3";
import { Scene4, buildScene4 } from "./scenes/Scene4";
import { Scene5, buildScene5 } from "./scenes/Scene5";
import { Scene6, buildScene6 } from "./scenes/Scene6";
import { Scene7, buildScene7 } from "./scenes/Scene7";
import { Scene8, buildScene8 } from "./scenes/Scene8";

gsap.registerPlugin(ScrollTrigger);

const BUILDERS = [
  buildScene1,
  buildScene2,
  buildScene3,
  buildScene4,
  buildScene5,
  buildScene6,
  buildScene7,
  buildScene8
];

export function StoryTab({ onBuilt }: { onBuilt: () => void }) {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) {
      onBuilt();
      return;
    }
    const mm = gsap.matchMedia(el);
    mm.add(
      {
        desktop: "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
        mobile: "(max-width: 1023px) and (prefers-reduced-motion: no-preference)",
        reduced: "(prefers-reduced-motion: reduce)"
      },
      (mmCtx) => {
        if (mmCtx.conditions?.reduced) {
          // authored-final-state markup IS the reduced-motion experience
          onBuilt();
          return;
        }
        const desktop = Boolean(mmCtx.conditions?.desktop);
        let cancelled = false;
        let frame = 0;
        let timer = 0;
        const queue = BUILDERS.map((build, i) => () => {
          const sec = el.querySelector<HTMLElement>(`[data-scene="${i + 1}"]`);
          if (!sec) return;
          const q = (sel: string) => Array.from(sec.querySelectorAll<HTMLElement>(sel));
          build({ root: sec, q, drawFrom, desktop });
        });
        const run = () => {
          if (cancelled) return;
          const next = queue.shift();
          if (!next) {
            ScrollTrigger.refresh();
            onBuilt();
            return;
          }
          try {
            next();
          } catch {
            /* one broken scene must not hold the boot gate */
          }
          timer = window.setTimeout(run, 40);
        };
        frame = window.requestAnimationFrame(run);
        return () => {
          cancelled = true;
          window.cancelAnimationFrame(frame);
          window.clearTimeout(timer);
        };
      }
    );
    return () => mm.revert();
  }, [onBuilt]);

  return (
    <div className="mu-story" ref={root}>
      <Scene1 />
      <Scene2 />
      <Scene3 />
      <Scene4 />
      <Scene5 />
      <Scene6 />
      <Scene7 />
      <Scene8 />
    </div>
  );
}
