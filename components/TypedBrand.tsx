"use client";

import { useEffect, useRef } from "react";

// Topbar brand as a live prompt: types a title, holds, backspaces, types the
// next. Server-renders ">Mustafa" so hydration sees the same text; the loop
// only starts after mount. Words[0] must stay "Mustafa" (it gets the long hold).
const WORDS = [
  "Mustafa",
  "Software Engineer",
  "Founder",
  "Unsuccessful Entrepreneur",
  "Agent Babysitter",
  "Professional Googler"
];

export function TypedBrand() {
  const link = useRef<HTMLAnchorElement>(null);
  const word = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const a = link.current;
    const el = word.current;
    if (!a || !el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let wi = 0;
    let mode: "hold" | "del" | "gap" | "type" = "hold";
    let timer = 0;
    let paused = false;

    const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
    const arm = (fn: () => void, ms: number) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(fn, ms);
    };
    // cursor blinks while a word holds, stays solid while keys are "moving"
    const typing = (on: boolean) => a.classList.toggle("is-typing", on);

    const hold = () => {
      mode = "hold";
      typing(false);
      arm(del, wi === 0 ? 4200 : 2600);
    };
    const del = () => {
      mode = "del";
      typing(true);
      const t = el.textContent ?? "";
      if (t.length > 0) {
        el.textContent = t.slice(0, -1);
        arm(del, rand(34, 58));
      } else {
        mode = "gap";
        wi = (wi + 1) % WORDS.length;
        arm(type, 420);
      }
    };
    const type = () => {
      mode = "type";
      typing(true);
      const target = WORDS[wi];
      const t = el.textContent ?? "";
      if (t.length < target.length) {
        el.textContent = target.slice(0, t.length + 1);
        arm(type, rand(58, 116));
      } else {
        hold();
      }
    };
    const resume = () => {
      if (mode === "hold") arm(del, 1200);
      else if (mode === "del") arm(del, 220);
      else arm(type, 220);
    };

    // offscreen (scrolled past, other tab restored mid-page) => stop the loop
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        if (paused) {
          paused = false;
          resume();
        }
      } else {
        paused = true;
        window.clearTimeout(timer);
        typing(false);
      }
    });
    io.observe(a);

    arm(del, 2800);

    return () => {
      window.clearTimeout(timer);
      io.disconnect();
      typing(false);
    };
  }, []);

  return (
    <a className="lv-topbar__brand" href="/" aria-label="Mustafa" ref={link}>
      <span className="lv-typed" aria-hidden="true">
        &gt;
        <span ref={word}>Mustafa</span>
      </span>
      <i aria-hidden="true" />
    </a>
  );
}
