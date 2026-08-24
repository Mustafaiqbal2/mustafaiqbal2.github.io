"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const ArrowUpRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 17L17 7" />
    <path d="M8 7h9v9" />
  </svg>
);

const ArrowDown = () => (
  <svg viewBox="0 0 14 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 1v14" />
    <path d="M1.5 9.5L7 15l5.5-5.5" />
  </svg>
);

const agents = [
  {
    name: "Emmy",
    role: "Email",
    desc: "Sorts a business inbox, labels every email, and keeps a log of why.",
    href: "https://github.com/Mustafaiqbal2/Emmy",
    linkLabel: "GitHub"
  },
  {
    name: "Revvy",
    role: "Reviews",
    desc: "Watches Google reviews and drafts the owner's replies for approval.",
    href: "https://github.com/Mustafaiqbal2/Revvy",
    linkLabel: "GitHub"
  },
  {
    name: "Adsy",
    role: "Ads",
    desc: "Turns a brand brief into finished ad creatives.",
    href: "https://simplabots.com/agents/adsy/",
    linkLabel: "Simplabots"
  },
  {
    name: "Dominic",
    role: "Domains",
    desc: "Hunts available domain names and ranks the candidates.",
    href: "https://simplabots.com/agents/dominic/",
    linkLabel: "Simplabots"
  },
  {
    name: "Quill",
    role: "Content",
    desc: "Writes long-form content from a brief.",
    href: "https://simplabots.com/agents/quill/",
    linkLabel: "Simplabots"
  }
];

const billRows = [
  { n: "01", item: "Excavation to formation level", unit: "m³" },
  { n: "02", item: "Concrete 1:2:4, strip foundation", unit: "m³" },
  { n: "03", item: "Blockwork, 200 mm", unit: "m²" },
  { n: "04", item: "Plaster, internal", unit: "m²" },
  { n: "05", item: "Single-leaf doors", unit: "no." }
];

const tickerText =
  "Now — building ArchPHI  //  running pilonecables.com  //  agents for Simplabots  // ";

/* Production-style ground-floor plan. Walls/windows/doors carry .lv-draw
   (stroke-drawn on scroll); fixtures, labels, dimensions and grid bubbles
   sit in the .lv-plan__text group and fade in once the walls are up. */
function FloorPlan() {
  const wall = { stroke: "#F2F2EE", fill: "none" };
  const thin = { stroke: "#F2F2EE", fill: "none", strokeWidth: 1 };
  const door = { stroke: "#F2F2EE", fill: "none", strokeWidth: 1.4 };
  const swing = { stroke: "#B79CFF", fill: "none", strokeWidth: 1.1 };
  const aux = { stroke: "#6B7080", fill: "none", strokeWidth: 1 };
  return (
    <svg className="lv-plan" viewBox="0 0 520 400" fill="none" aria-hidden="true">
      {/* ---- outer wall, double line, with openings ---- */}
      {["M40 48 H96", "M160 48 H320", "M384 48 H480", "M480 48 V120", "M480 176 V336", "M480 336 H276", "M236 336 H40", "M40 336 V48"].map((d) => (
        <path key={d} className="lv-draw" pathLength={1} d={d} {...wall} strokeWidth={2.2} />
      ))}
      {["M48 56 H96", "M160 56 H320", "M384 56 H472", "M472 56 V120", "M472 176 V328", "M472 328 H276", "M236 328 H48", "M48 328 V56"].map((d) => (
        <path key={d} className="lv-draw" pathLength={1} d={d} {...wall} strokeWidth={1.1} />
      ))}
      {/* windows: triple lines */}
      {["M96 48 H160", "M96 52 H160", "M96 56 H160", "M320 48 H384", "M320 52 H384", "M320 56 H384", "M472 120 V176", "M476 120 V176", "M480 120 V176"].map((d) => (
        <path key={d} className="lv-draw" pathLength={1} d={d} {...thin} />
      ))}
      {/* ---- interior walls with door gaps ---- */}
      {["M200 56 V96", "M200 132 V232", "M200 268 V328", "M200 192 H348", "M384 192 H472", "M48 192 H104", "M140 192 H200", "M372 56 V132", "M372 164 V192"].map((d) => (
        <path key={d} className="lv-draw" pathLength={1} d={d} {...wall} strokeWidth={2} />
      ))}
      {/* ---- doors: leaf + swing, hinged at the jamb ---- */}
      <path className="lv-draw" pathLength={1} d="M236 328 L236 288" {...door} />
      <path className="lv-draw" pathLength={1} d="M276 328 A40 40 0 0 0 236 288" {...swing} />
      <path className="lv-draw" pathLength={1} d="M200 96 L164 96" {...door} />
      <path className="lv-draw" pathLength={1} d="M200 132 A36 36 0 0 1 164 96" {...swing} />
      <path className="lv-draw" pathLength={1} d="M200 268 L164 268" {...door} />
      <path className="lv-draw" pathLength={1} d="M200 232 A36 36 0 0 0 164 268" {...swing} />
      <path className="lv-draw" pathLength={1} d="M348 192 L348 228" {...door} />
      <path className="lv-draw" pathLength={1} d="M384 192 A36 36 0 0 1 348 228" {...swing} />
      <path className="lv-draw" pathLength={1} d="M372 164 L404 164" {...door} />
      <path className="lv-draw" pathLength={1} d="M372 132 A32 32 0 0 1 404 164" {...swing} />
      <path className="lv-draw" pathLength={1} d="M104 192 L104 228" {...door} />
      <path className="lv-draw" pathLength={1} d="M140 192 A36 36 0 0 1 104 228" {...swing} />

      {/* ---- fixtures, labels, dimensions, grid — fade group ---- */}
      <g className="lv-plan__text">
        {/* beds */}
        <rect x="60" y="84" width="72" height="96" {...aux} />
        <path d="M60 108 H132" {...aux} />
        <rect x="60" y="222" width="72" height="96" {...aux} />
        <path d="M60 246 H132" {...aux} />
        {/* kitchen counter + sink + hob */}
        <path d="M208 64 H332 V90 H208 Z" {...aux} />
        <rect x="240" y="70" width="30" height="14" {...aux} />
        <circle cx="304" cy="77" r="5" {...aux} />
        <circle cx="318" cy="77" r="5" {...aux} />
        {/* bath: basin, wc, shower */}
        <circle cx="398" cy="78" r="9" {...aux} />
        <rect x="444" y="94" width="18" height="12" {...aux} />
        <ellipse cx="453" cy="120" rx="9" ry="12" {...aux} />
        <rect x="380" y="148" width="42" height="34" {...aux} />
        <path d="M380 148 L422 182" {...aux} />
        {/* lounge: sofa + table */}
        <rect x="256" y="270" width="112" height="28" {...aux} />
        <path d="M256 278 H368" {...aux} />
        <circle cx="312" cy="238" r="13" {...aux} />

        {/* room labels */}
        <text x="124" y="168" textAnchor="middle" fill="#9094A3" fontSize="10" fontFamily="var(--font-mono), monospace" letterSpacing="1">BED 01</text>
        <text x="124" y="304" textAnchor="middle" fill="#9094A3" fontSize="10" fontFamily="var(--font-mono), monospace" letterSpacing="1">BED 02</text>
        <text x="286" y="132" textAnchor="middle" fill="#9094A3" fontSize="10" fontFamily="var(--font-mono), monospace" letterSpacing="1">KITCHEN</text>
        <text x="422" y="134" textAnchor="middle" fill="#9094A3" fontSize="10" fontFamily="var(--font-mono), monospace" letterSpacing="1">BATH</text>
        <text x="336" y="316" textAnchor="middle" fill="#9094A3" fontSize="10" fontFamily="var(--font-mono), monospace" letterSpacing="1">LOUNGE</text>

        {/* dimension chains — bottom */}
        <path d="M40 336 V356 M200 336 V356 M480 336 V356" {...aux} strokeWidth={0.8} />
        <path d="M40 352 H480" {...aux} strokeWidth={0.8} />
        <path d="M36 356 L44 348 M196 356 L204 348 M476 356 L484 348" {...aux} strokeWidth={0.8} />
        <text x="120" y="366" textAnchor="middle" fill="#9094A3" fontSize="9" fontFamily="var(--font-mono), monospace">4 000</text>
        <text x="340" y="366" textAnchor="middle" fill="#9094A3" fontSize="9" fontFamily="var(--font-mono), monospace">7 000</text>
        <path d="M40 362 V378 M480 362 V378" {...aux} strokeWidth={0.8} />
        <path d="M40 374 H480" {...aux} strokeWidth={0.8} />
        <path d="M36 378 L44 370 M476 378 L484 370" {...aux} strokeWidth={0.8} />
        <text x="260" y="390" textAnchor="middle" fill="#9094A3" fontSize="9" fontFamily="var(--font-mono), monospace">11 000</text>
        {/* dimension chain — right */}
        <path d="M480 48 H500 M480 192 H500 M480 336 H500" {...aux} strokeWidth={0.8} />
        <path d="M496 48 V336" {...aux} strokeWidth={0.8} />
        <path d="M492 52 L500 44 M492 196 L500 188 M492 340 L500 332" {...aux} strokeWidth={0.8} />
        <text x="504" y="124" fill="#9094A3" fontSize="9" fontFamily="var(--font-mono), monospace">3 600</text>
        <text x="504" y="268" fill="#9094A3" fontSize="9" fontFamily="var(--font-mono), monospace">3 400</text>

        {/* grid bubbles */}
        {[
          { x: 40, l: "A" },
          { x: 200, l: "B" },
          { x: 372, l: "C" },
          { x: 480, l: "D" }
        ].map((g) => (
          <g key={g.l}>
            <circle cx={g.x} cy="22" r="10" {...aux} />
            <text x={g.x} y="26" textAnchor="middle" fill="#9094A3" fontSize="10" fontFamily="var(--font-mono), monospace">{g.l}</text>
            <path d={`M${g.x} 32 V48`} {...aux} strokeWidth={0.8} strokeDasharray="3 4" />
          </g>
        ))}
        {[
          { y: 48, l: "1" },
          { y: 192, l: "2" },
          { y: 336, l: "3" }
        ].map((g) => (
          <g key={g.l}>
            <circle cx="14" cy={g.y} r="10" {...aux} />
            <text x="14" y={g.y + 4} textAnchor="middle" fill="#9094A3" fontSize="10" fontFamily="var(--font-mono), monospace">{g.l}</text>
            <path d={`M24 ${g.y} H40`} {...aux} strokeWidth={0.8} strokeDasharray="3 4" />
          </g>
        ))}

        {/* title strip */}
        <text x="40" y="399" fill="#6B7080" fontSize="9" fontFamily="var(--font-mono), monospace" letterSpacing="1">GROUND FLOOR PLAN · 1:100</text>
        <text x="480" y="399" textAnchor="end" fill="#6B7080" fontSize="9" fontFamily="var(--font-mono), monospace" letterSpacing="1">A-101</text>
      </g>
    </svg>
  );
}

/* TalentFlow architecture: five sources feed one pipeline. Connectors carry
   .lv-draw; boxes are .lv-flow__node (popped in on scroll). */
function TalentFlowDiagram() {
  const box = { stroke: "#0B0C12", fill: "#F2F2EE", strokeWidth: 2 };
  const line = { stroke: "#0B0C12", fill: "none", strokeWidth: 1.6 };
  const label = { fill: "#0B0C12", fontSize: "10", fontFamily: "var(--font-mono), monospace", letterSpacing: "1" };
  const sources = [12, 78, 144, 210, 276];
  return (
    <svg className="lv-flow" viewBox="0 0 560 340" fill="none" aria-hidden="true">
      {sources.map((y, i) => (
        <g className="lv-flow__node" key={y}>
          <rect x="8" y={y} width="104" height="36" {...box} />
          <text x="60" y={y + 22} textAnchor="middle" {...label}>{`SOURCE 0${i + 1}`}</text>
        </g>
      ))}
      {sources.map((y) => (
        <path key={y} className="lv-draw" pathLength={1} d={`M112 ${y + 18} H150 V162 H190`} {...line} />
      ))}
      <g className="lv-flow__node">
        <rect x="192" y="138" width="118" height="48" {...box} />
        <text x="251" y="166" textAnchor="middle" {...label}>INGEST + CLEAN</text>
      </g>
      <path className="lv-draw" pathLength={1} d="M310 162 H350" {...line} />
      <path className="lv-draw" pathLength={1} d="M344 156 L352 162 L344 168" {...line} />
      <g className="lv-flow__node">
        <rect x="354" y="138" width="150" height="48" {...box} />
        <text x="429" y="158" textAnchor="middle" {...label}>SEMANTIC MATCH</text>
        <text x="429" y="174" textAnchor="middle" fill="#6E6E68" fontSize="9" fontFamily="var(--font-mono), monospace" letterSpacing="1">EMBEDDINGS</text>
      </g>
      <path className="lv-draw" pathLength={1} d="M429 138 V88" {...line} />
      <path className="lv-draw" pathLength={1} d="M423 94 L429 86 L435 94" {...line} />
      <g className="lv-flow__node">
        <rect x="354" y="32" width="150" height="48" {...box} />
        <text x="429" y="60" textAnchor="middle" {...label}>RANKED SHORTLIST</text>
      </g>
      <path className="lv-draw" pathLength={1} d="M429 186 V240" {...line} />
      <path className="lv-draw" pathLength={1} d="M423 234 L429 242 L435 234" {...line} />
      <g className="lv-flow__node">
        <rect x="354" y="244" width="150" height="48" {...box} />
        <text x="429" y="272" textAnchor="middle" {...label}>INTERVIEW AGENT</text>
      </g>
    </svg>
  );
}

export function Landing() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;

    const mm = gsap.matchMedia(el);

    mm.add(
      {
        desktop: "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
        mobile: "(max-width: 767px) and (prefers-reduced-motion: no-preference)"
      },
      (ctx) => {
        const desktop = Boolean(ctx.conditions?.desktop);
        const q = gsap.utils.selector(el);

        /* ---------- intro (time-based, plays once) ---------- */
        const intro = gsap.timeline({ defaults: { ease: "power4.out" } });
        intro
          .from(q(".lv-hero__name-1 > span"), { xPercent: -60, opacity: 0, duration: 1.1 }, 0.1)
          .from(q(".lv-hero__name-2 > span"), { xPercent: 60, opacity: 0, duration: 1.1 }, 0.18)
          .from(q(".lv-hero__status, .lv-hero__foot"), { y: 28, opacity: 0, duration: 0.8, stagger: 0.1 }, 0.55);
        // from-states are applied; release the pre-paint gate
        document.documentElement.classList.remove("lv-intro");

        /* ---------- hero parallax out ---------- */
        gsap.to(q(".lv-hero__name"), {
          yPercent: -14,
          ease: "none",
          scrollTrigger: { trigger: q(".lv-hero")[0], start: "top top", end: "bottom top", scrub: 0.6 }
        });
        gsap.to(q(".lv-hero__foot"), {
          yPercent: -40,
          opacity: 0,
          ease: "none",
          scrollTrigger: { trigger: q(".lv-hero")[0], start: "top top", end: "70% top", scrub: 0.6 }
        });

        /* ---------- ArchPHI: pin + draw the plan into a bill ---------- */
        {
          const section = q(".lv-arch")[0];
          const tl = gsap.timeline({
            scrollTrigger: desktop
              ? { trigger: section, start: "top top", end: "+=200%", pin: true, scrub: 0.8, anticipatePin: 1 }
              : { trigger: section, start: "top 70%", end: "bottom 60%", scrub: 0.8 }
          });
          tl.from(q(".lv-arch .lv-h2 .lv-line > span"), { yPercent: 110, stagger: 0.08, duration: 0.5 }, 0)
            .from(q(".lv-arch__copy .lv-body, .lv-arch__copy .lv-link"), { y: 32, opacity: 0, stagger: 0.08, duration: 0.4 }, 0.12)
            .from(q(".lv-bill"), { opacity: 0, duration: 0.25 }, 0.1)
            .fromTo(
              q(".lv-plan .lv-draw"),
              { strokeDashoffset: 1 },
              { strokeDashoffset: 0, stagger: 0.022, duration: 1.1, ease: "none" },
              0.15
            )
            .from(q(".lv-plan__text"), { opacity: 0, duration: 0.35 }, 1.35)
            .fromTo(q(".lv-arch__arrow path"), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.3, ease: "none" }, 1.45)
            .from(q(".lv-bill__row"), { x: 40, opacity: 0, stagger: 0.1, duration: 0.4 }, 1.6)
            .from(q(".lv-arch .lv-caption"), { opacity: 0, duration: 0.35 }, 2.1);
        }

        /* ---------- Fleet: pinned horizontal pan ---------- */
        {
          const section = q(".lv-fleet")[0];
          const track = q(".lv-fleet__track")[0] as HTMLElement;
          gsap.from(q(".lv-fleet__head > *"), {
            y: 36,
            opacity: 0,
            stagger: 0.08,
            scrollTrigger: { trigger: section, start: "top 75%", end: "top 40%", scrub: 0.8 }
          });
          if (desktop && track) {
            gsap.to(track, {
              x: () => -(track.scrollWidth - el.clientWidth),
              ease: "none",
              scrollTrigger: {
                trigger: section,
                start: "top top",
                end: "+=260%",
                pin: true,
                scrub: 0.8,
                anticipatePin: 1,
                invalidateOnRefresh: true
              }
            });
          } else {
            gsap.utils.toArray<HTMLElement>(q(".lv-card")).forEach((card) => {
              gsap.from(card, {
                y: 48,
                opacity: 0,
                scrollTrigger: { trigger: card, start: "top 88%", end: "top 60%", scrub: 0.8 }
              });
            });
          }
        }

        /* ---------- Pilone: pin + counters ---------- */
        {
          const section = q(".lv-pilone")[0];
          const clicksEl = q(".lv-fig__clicks")[0] as HTMLElement;
          const counter = { v: 1070 };
          const tl = gsap.timeline({
            scrollTrigger: desktop
              ? { trigger: section, start: "top top", end: "+=200%", pin: true, scrub: 0.8, anticipatePin: 1 }
              : { trigger: section, start: "top 70%", end: "bottom 60%", scrub: 0.8 }
          });
          tl.from(q(".lv-pilone .lv-h2 .lv-line > span"), { yPercent: 110, stagger: 0.08, duration: 0.5 }, 0)
            .from(q(".lv-pilone__copy .lv-body, .lv-pilone__copy .lv-link"), { y: 32, opacity: 0, stagger: 0.08, duration: 0.4 }, 0.12)
            .from(q(".lv-fig--clicks"), { y: 40, opacity: 0, duration: 0.4 }, 0.35)
            .fromTo(
              counter,
              { v: 204 },
              {
                v: 1070,
                duration: 1.2,
                ease: "none",
                onUpdate: () => {
                  if (clicksEl) clicksEl.textContent = Math.round(counter.v).toLocaleString("en-US");
                }
              },
              0.4
            )
            .from(q(".lv-fig--position"), { y: 40, opacity: 0, duration: 0.5 }, 1.2)
            .from(q(".lv-fig--ai"), { y: 40, opacity: 0, duration: 0.5 }, 1.6)
            .from(q(".lv-pilone .lv-caption"), { opacity: 0, duration: 0.4 }, 2.0);
        }

        /* ---------- TalentFlow: pin + pipeline draw ---------- */
        {
          const section = q(".lv-talent")[0];
          const tl = gsap.timeline({
            scrollTrigger: desktop
              ? { trigger: section, start: "top top", end: "+=200%", pin: true, scrub: 0.8, anticipatePin: 1 }
              : { trigger: section, start: "top 72%", end: "bottom 60%", scrub: 0.8 }
          });
          tl.from(q(".lv-talent .lv-h2 .lv-line > span"), { yPercent: 110, stagger: 0.08, duration: 0.5 }, 0)
            .from(q(".lv-talent__copy .lv-body"), { y: 32, opacity: 0, stagger: 0.08, duration: 0.4 }, 0.12)
            .from(q(".lv-flow__node"), { opacity: 0, scale: 0.92, transformOrigin: "center", stagger: 0.09, duration: 0.35 }, 0.3)
            .fromTo(
              q(".lv-flow .lv-draw"),
              { strokeDashoffset: 1 },
              { strokeDashoffset: 0, stagger: 0.06, duration: 0.9, ease: "none" },
              0.5
            );
        }

        /* ---------- How I work: Gargantua ---------- */
        {
          const section = q(".lv-how")[0] as HTMLElement;
          if (desktop) {
            section.classList.add("lv-how--live");
            const items = gsap.utils.toArray<HTMLElement>(q(".lv-how__item"));
            const tl = gsap.timeline({
              scrollTrigger: { trigger: section, start: "top top", end: "+=280%", pin: true, scrub: 0.8, anticipatePin: 1 }
            });
            tl.fromTo(q(".lv-bh"), { scale: 0.82 }, { scale: 1.06, duration: 3, ease: "none" }, 0)
              .fromTo(q(".lv-bh__disk"), { rotate: -4 }, { rotate: 5, duration: 3, ease: "none" }, 0)
              .fromTo(q(".lv-bh__glow"), { opacity: 0.55 }, { opacity: 1, duration: 3, ease: "none" }, 0);
            const beats = [
              { at: 0.15, out: 0.95 },
              { at: 1.15, out: 1.95 },
              { at: 2.15, out: -1 }
            ];
            items.forEach((item, i) => {
              const b = beats[i];
              tl.fromTo(item, { opacity: 0, y: 34 }, { opacity: 1, y: 0, duration: 0.35 }, b.at);
              if (b.out > 0) tl.to(item, { opacity: 0, y: -26, duration: 0.3 }, b.out);
            });
          } else {
            gsap.from(q(".lv-bh"), {
              scale: 0.86,
              opacity: 0,
              scrollTrigger: { trigger: section, start: "top 80%", end: "top 40%", scrub: 0.8 }
            });
            gsap.utils.toArray<HTMLElement>(q(".lv-how__item")).forEach((item) => {
              gsap.from(item, {
                y: 30,
                opacity: 0,
                scrollTrigger: { trigger: item, start: "top 88%", end: "top 62%", scrub: 0.8 }
              });
            });
          }
        }

        /* ---------- Contact ---------- */
        gsap.from(q(".lv-contact__inner > *"), {
          y: 44,
          opacity: 0,
          stagger: 0.1,
          scrollTrigger: { trigger: q(".lv-contact")[0], start: "top 80%", end: "top 45%", scrub: 0.8 }
        });

        return () => {
          intro.kill();
          (q(".lv-how")[0] as HTMLElement)?.classList.remove("lv-how--live");
        };
      }
    );

    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener("load", onLoad);
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => ScrollTrigger.refresh()).catch(() => {});
    }

    return () => {
      window.removeEventListener("load", onLoad);
      mm.revert();
    };
  }, []);

  return (
    <main id="main" className="lv" ref={root}>
      {/* ================= Hero ================= */}
      <section className="lv-hero" aria-label="Intro">
        <div className="lv-hero__status lv-mono">
          <span>Software engineer &amp; founder</span>
          <span>Pakistan</span>
        </div>

        <h1 className="lv-hero__name">
          <span className="lv-line lv-hero__name-1">
            <span>Mustafa</span>
          </span>
          <span className="lv-line lv-hero__name-2">
            <span>Iqbal</span>
          </span>
        </h1>

        <div className="lv-hero__foot">
          <div>
            <p className="lv-hero__statement">
              I build software that has to be right<b>.</b>
            </p>
            <p className="lv-hero__sub">
              AI agents in production, a search platform for a factory, and a company that reads architects&apos; drawings.
            </p>
          </div>
          <div className="lv-hero__cue lv-mono">
            <span>Scroll</span>
            <ArrowDown />
          </div>
        </div>
      </section>

      {/* ================= Ticker ================= */}
      <div className="lv-ticker" aria-hidden="true">
        <div className="lv-ticker__track">
          <span className="lv-ticker__chunk lv-mono">{tickerText}</span>
          <span className="lv-ticker__chunk lv-mono">{tickerText}</span>
        </div>
      </div>

      {/* ================= ArchPHI ================= */}
      <section className="lv-section--ink lv-arch lv-pin" aria-label="ArchPHI">
        <div className="lv-arch__grid">
          <div className="lv-arch__copy">
            <p className="lv-eyebrow">01 — ArchPHI · Founder &amp; CTO</p>
            <h2 className="lv-h2 lv-display">
              <span className="lv-line">
                <span>Reads the drawing.</span>
              </span>
              <span className="lv-line">
                <span>Writes the bill.</span>
              </span>
            </h2>
            <p className="lv-body">
              ArchPHI turns architectural CAD packages into bills of quantities. It reads what the drawings declare —
              geometry, layers, counts — and where a drawing carries no answer, it says so instead of guessing.
              <b> Coming soon.</b>
            </p>
            <a className="lv-link" href="https://archphi.com" target="_blank" rel="noreferrer">
              archphi.com <ArrowUpRight />
            </a>
          </div>

          <div>
            <div className="lv-arch__visual">
              <FloorPlan />
              <svg className="lv-arch__arrow" viewBox="0 0 56 24" fill="none" aria-hidden="true">
                <path pathLength={1} style={{ strokeDasharray: 1 }} d="M2 12 H46 M38 4 L48 12 L38 20" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="lv-bill" role="presentation">
                {billRows.map((row) => (
                  <div className="lv-bill__row" key={row.n}>
                    <i>{row.n}</i>
                    <span>{row.item}</span>
                    <u />
                    <em>{row.unit}</em>
                  </div>
                ))}
              </div>
            </div>
            <p className="lv-caption lv-mono">Tested on real projects</p>
          </div>
        </div>
      </section>

      {/* ================= Simplabots fleet ================= */}
      <section className="lv-section--bone lv-fleet" aria-label="Simplabots agents">
        <div className="lv-fleet__head">
          <div>
            <p className="lv-eyebrow">02 — Simplabots</p>
            <h2 className="lv-h2 lv-display">Five working agents.</h2>
          </div>
          <p className="lv-body">
            Simplabots sells AI agents to small businesses. I built five of them.
          </p>
        </div>

        <div className="lv-fleet__viewport">
          <div className="lv-fleet__track">
            {agents.map((agent) => (
              <article className="lv-card" key={agent.name}>
                <p className="lv-card__role lv-mono">{agent.role}</p>
                <h3 className="lv-card__name">{agent.name}</h3>
                <p className="lv-card__desc">{agent.desc}</p>
                <a className="lv-card__link" href={agent.href} target="_blank" rel="noreferrer">
                  {agent.linkLabel} <ArrowUpRight />
                </a>
              </article>
            ))}
            <article className="lv-card" aria-label="All agents">
              <p className="lv-card__role lv-mono">Platform</p>
              <h3 className="lv-card__name">All agents</h3>
              <p className="lv-card__desc">The full lineup, live on the platform.</p>
              <a className="lv-card__link" href="https://simplabots.com" target="_blank" rel="noreferrer">
                simplabots.com <ArrowUpRight />
              </a>
            </article>
          </div>
        </div>
      </section>

      {/* ================= Pilone ================= */}
      <section className="lv-section--ink lv-pilone lv-pin" aria-label="PiloneCables">
        <div className="lv-pilone__grid">
          <div className="lv-pilone__copy">
            <p className="lv-eyebrow">03 — pilonecables.com</p>
            <h2 className="lv-h2 lv-display">
              <span className="lv-line">
                <span>A factory site</span>
              </span>
              <span className="lv-line">
                <span>on page one.</span>
              </span>
            </h2>
            <p className="lv-body">
              Pilone manufactures electrical cable in Pakistan. I build and run their site — product pages, guides, and
              sizing calculators generated from factory data, with build checks that fail on broken links or bad schema.
            </p>
            <a className="lv-link" href="https://www.pilonecables.com" target="_blank" rel="noreferrer">
              pilonecables.com <ArrowUpRight />
            </a>
          </div>

          <div className="lv-pilone__figures">
            <div className="lv-fig lv-fig--clicks">
              <div className="lv-fig__big">
                <span className="lv-fig__clicks">1,070</span> <small>clicks</small>
              </div>
              <p className="lv-fig__label lv-mono">Organic clicks, six months — up from 204</p>
            </div>
            <div className="lv-fig lv-fig--position">
              <div className="lv-fig__mid">
                17.8 <b>→</b> 8.4
              </div>
              <p className="lv-fig__label lv-mono">Average position in Google Search</p>
            </div>
            <div className="lv-fig lv-fig--ai">
              <div className="lv-fig__mid">
                0 <b>→</b> 3.9k
              </div>
              <p className="lv-fig__label lv-mono">Impressions in AI search, three months</p>
            </div>
            <p className="lv-caption lv-mono">Google Search Console · Feb–Aug 2026</p>
          </div>
        </div>
      </section>

      {/* ================= TalentFlow ================= */}
      <section className="lv-section--bone lv-talent lv-pin" aria-label="TalentFlow">
        <div className="lv-talent__grid">
          <div className="lv-talent__copy">
            <p className="lv-eyebrow">04 — TalentFlow · Genesys Research Lab</p>
            <h2 className="lv-h2 lv-display">
              <span className="lv-line">
                <span>Recruitment,</span>
              </span>
              <span className="lv-line">
                <span>end to end.</span>
              </span>
            </h2>
            <p className="lv-body">
              An internal recruitment platform. Five candidate sources feed one pipeline: profiles are cleaned,
              embedded, and matched to roles by meaning rather than keywords.
            </p>
            <p className="lv-body">
              A conversational agent then runs the first-round interview. Built by a team of four engineers I led.
            </p>
          </div>
          <TalentFlowDiagram />
        </div>
      </section>

      {/* ================= How I work — Gargantua ================= */}
      <section className="lv-section--ink lv-how lv-pin" aria-label="How I work">
        <p className="lv-eyebrow lv-how__eyebrow">How I work</p>
        <div className="lv-bh" aria-hidden="true">
          <div className="lv-bh__glow"></div>
          <div className="lv-bh__disk"></div>
          <div className="lv-bh__horizon"></div>
          <div className="lv-bh__ring"></div>
          <div className="lv-bh__arc"></div>
          <div className="lv-bh__arc lv-bh__arc--under"></div>
          <div className="lv-bh__front"></div>
        </div>
        <div className="lv-how__stage">
          <div className="lv-how__item">
            <span className="lv-how__index lv-mono">01</span>
            <p className="lv-how__line lv-display">Only progress is progress.</p>
          </div>
          <div className="lv-how__item">
            <span className="lv-how__index lv-mono">02</span>
            <p className="lv-how__line lv-display">A named assumption is a legitimate answer. A silent one is not.</p>
          </div>
          <div className="lv-how__item">
            <span className="lv-how__index lv-mono">03</span>
            <p className="lv-how__line lv-display">Break it before you believe it.</p>
          </div>
        </div>
      </section>

      {/* ================= Contact ================= */}
      <section className="lv-contact" aria-label="Contact">
        <div className="lv-contact__inner">
          <h2 className="lv-contact__title lv-display">Talk to me.</h2>
          <a className="lv-contact__email" href="mailto:therealmustafaiqbal@gmail.com">
            therealmustafaiqbal@gmail.com
          </a>
          <div className="lv-contact__row">
            <a href="https://github.com/Mustafaiqbal2" target="_blank" rel="noreferrer">
              GitHub <ArrowUpRight />
            </a>
            <a href="https://www.linkedin.com/in/mustafa-iqbal-ba42b424b/" target="_blank" rel="noreferrer">
              LinkedIn <ArrowUpRight />
            </a>
            <a href="/resume/Mustafa_Iqbal_Resume.pdf" download>
              Résumé
            </a>
            <a href="/work/">All work</a>
          </div>
          <div className="lv-contact__bottom lv-mono">
            <span>© 2026 · Mustafa Iqbal</span>
            <span>Pakistan</span>
          </div>
        </div>
      </section>
    </main>
  );
}
