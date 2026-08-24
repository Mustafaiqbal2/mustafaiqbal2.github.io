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
  "Now — building ArchPHI  //  running pilonecables.com  //  agents for Simplabots  // ";

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
          .from(
            q(".lv-hero__status, .lv-hero__statement, .lv-hero__sub, .lv-hero__cue"),
            { y: 28, opacity: 0, duration: 0.8, stagger: 0.08 },
            0.55
          );

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
              { strokeDashoffset: 0, stagger: 0.06, duration: 1.2, ease: "none" },
              0.15
            )
            .from(q(".lv-plan__text"), { opacity: 0, duration: 0.3 }, 1.25)
            .fromTo(q(".lv-arch__arrow path"), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.3, ease: "none" }, 1.35)
            .from(q(".lv-bill__row"), { x: 40, opacity: 0, stagger: 0.1, duration: 0.4 }, 1.5)
            .from(q(".lv-arch .lv-caption"), { opacity: 0, duration: 0.35 }, 2.05);
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

        /* ---------- TalentFlow ---------- */
        gsap.from(q(".lv-talent__inner > *"), {
          y: 48,
          opacity: 0,
          stagger: 0.12,
          scrollTrigger: { trigger: q(".lv-talent")[0], start: "top 78%", end: "top 45%", scrub: 0.8 }
        });

        /* ---------- How I work ---------- */
        gsap.utils.toArray<HTMLElement>(q(".lv-how__item")).forEach((item) => {
          gsap.from(item, {
            yPercent: 30,
            opacity: 0,
            scrollTrigger: { trigger: item, start: "top 85%", end: "top 55%", scrub: 0.8 }
          });
        });

        /* ---------- Contact ---------- */
        gsap.from(q(".lv-contact__inner > *"), {
          y: 44,
          opacity: 0,
          stagger: 0.1,
          scrollTrigger: { trigger: q(".lv-contact")[0], start: "top 80%", end: "top 45%", scrub: 0.8 }
        });

        return () => {
          intro.kill();
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
          <span>Islamabad · remote or relocation</span>
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
      <section className="lv-section lv-section--ink lv-arch" aria-label="ArchPHI">
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
              <b> First firms start in September.</b>
            </p>
            <a className="lv-link" href="https://archphi.com" target="_blank" rel="noreferrer">
              archphi.com <ArrowUpRight />
            </a>
          </div>

          <div>
            <div className="lv-arch__visual">
              <svg className="lv-plan" viewBox="0 0 440 360" fill="none" aria-hidden="true">
                {/* outer walls */}
                <path className="lv-draw" pathLength={1} d="M24 24 H416 V296 H24 Z" stroke="#F2F2EE" strokeWidth="2.5" />
                <path className="lv-draw" pathLength={1} d="M36 36 H404 V284 H36 Z" stroke="#F2F2EE" strokeWidth="1.2" />
                {/* interior walls */}
                <path className="lv-draw" pathLength={1} d="M188 36 V150" stroke="#F2F2EE" strokeWidth="2" />
                <path className="lv-draw" pathLength={1} d="M188 196 V284" stroke="#F2F2EE" strokeWidth="2" />
                <path className="lv-draw" pathLength={1} d="M188 150 H296" stroke="#F2F2EE" strokeWidth="2" />
                <path className="lv-draw" pathLength={1} d="M296 36 V150" stroke="#F2F2EE" strokeWidth="2" />
                <path className="lv-draw" pathLength={1} d="M296 216 V284" stroke="#F2F2EE" strokeWidth="2" />
                {/* door swings */}
                <path className="lv-draw" pathLength={1} d="M188 150 A 46 46 0 0 1 234 196" stroke="#FF4A1C" strokeWidth="1.5" />
                <path className="lv-draw" pathLength={1} d="M296 216 A 42 42 0 0 0 254 174" stroke="#FF4A1C" strokeWidth="1.5" />
                {/* window ticks */}
                <path className="lv-draw" pathLength={1} d="M90 24 V36 M132 24 V36 M330 284 V296 M372 284 V296" stroke="#F2F2EE" strokeWidth="1.2" />
                {/* dimension line */}
                <path className="lv-draw" pathLength={1} d="M24 330 H416 M24 322 V338 M416 322 V338" stroke="#8C8C86" strokeWidth="1" />
                <text className="lv-plan__text" x="220" y="352" textAnchor="middle" fill="#8C8C86" fontSize="11" fontFamily="var(--font-mono), monospace">
                  12 400
                </text>
              </svg>

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
            <p className="lv-caption lv-mono">Tested against 2,668,953 drawing records · 8 project packages</p>
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
      <section className="lv-section lv-section--ink lv-pilone" aria-label="PiloneCables">
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
      <section className="lv-section lv-section--bone lv-talent" aria-label="TalentFlow">
        <div className="lv-talent__inner">
          <div>
            <p className="lv-eyebrow">04 — TalentFlow · Genesys Research Lab</p>
            <h2 className="lv-h2 lv-display">Recruitment, end to end.</h2>
          </div>
          <p className="lv-body">
            An internal platform that pulls candidates from five sources, matches them to roles by meaning rather than
            keywords, and runs a first-round interview agent. Built by a team of four engineers I led.
          </p>
        </div>
      </section>

      {/* ================= How I work ================= */}
      <section className="lv-section--ink lv-how" aria-label="How I work">
        <div className="lv-how__inner">
          <p className="lv-eyebrow">How I work</p>
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
            <span>Islamabad, Pakistan</span>
          </div>
        </div>
      </section>
    </main>
  );
}
