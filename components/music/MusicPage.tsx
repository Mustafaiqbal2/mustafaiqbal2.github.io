"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { ArrowUpRight } from "lucide-react";
import { TypedBrand } from "@/components/TypedBrand";
import { StickMan } from "./sceneKit";
import { StoryTab } from "./StoryTab";

gsap.registerPlugin(ScrollTrigger);

type TabId = "story" | "melodymind" | "rotation";

const TABS: { id: TabId; label: string; desc: string }[] = [
  { id: "story", label: "The story", desc: "How one bad answer became a thesis. Scroll it." },
  { id: "melodymind", label: "MelodyMind", desc: "Type the situation, get the songs that live there." },
  { id: "rotation", label: "On rotation", desc: "What I actually listen to, straight from Spotify." }
];

export function MusicPage() {
  const [active, setActive] = useState<TabId>("story");
  const lenisRef = useRef<Lenis | null>(null);

  /* boot gate release: the story tab calls this once its pins exist */
  const releaseBoot = useCallback(() => {
    document.documentElement.classList.remove("lv-boot");
    lenisRef.current?.start();
  }, []);

  /* adaptive smooth scroll, same gate as the landing (weak machines skip it) */
  useLayoutEffect(() => {
    const navi = navigator as Navigator & { deviceMemory?: number };
    const weak =
      (navi.hardwareConcurrency || 8) <= 4 || (navi.deviceMemory !== undefined && navi.deviceMemory <= 4);
    let lenis: Lenis | null = null;
    let raf: ((t: number) => void) | null = null;
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches && !weak) {
      lenis = new Lenis({ duration: 1.05, smoothWheel: true });
      lenis.on("scroll", ScrollTrigger.update);
      raf = (time: number) => lenis && lenis.raf(time * 1000);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);
      if (document.documentElement.classList.contains("lv-boot")) lenis.stop();
      lenisRef.current = lenis;
    }
    return () => {
      if (raf) gsap.ticker.remove(raf);
      if (lenis) lenis.destroy();
      lenisRef.current = null;
      document.documentElement.classList.remove("lv-boot");
    };
  }, []);

  /* hash <-> tab sync (static export friendly: one page, hash addressing) */
  useEffect(() => {
    const fromHash = () => {
      const h = window.location.hash.replace("#", "") as TabId;
      if (h === "melodymind" || h === "rotation") setActive(h);
      else if (h === "story" || h === "") setActive("story");
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  const pick = (id: TabId) => {
    setActive(id);
    history.replaceState(null, "", id === "story" ? "#story" : `#${id}`);
    /* the story is scroll-driven: choosing it answers with motion — the
       page glides to the first scene so the mechanic explains itself */
    if (id === "story") {
      const el = document.querySelector<HTMLElement>("[data-scene='1']");
      if (el) {
        const y = (el.closest(".pin-spacer") || el).getBoundingClientRect().top + window.scrollY + 4;
        if (lenisRef.current) lenisRef.current.scrollTo(y, { duration: 1.2 });
        else window.scrollTo({ top: y, behavior: "smooth" });
      }
    }
  };

  /* the stub overlays own the viewport while open */
  useEffect(() => {
    document.documentElement.classList.toggle("mu-overlay-open", active !== "story");
    if (active !== "story") lenisRef.current?.stop();
    else if (!document.documentElement.classList.contains("lv-boot")) lenisRef.current?.start();
    return () => document.documentElement.classList.remove("mu-overlay-open");
  }, [active]);

  return (
    <main id="main" className="mu lv-space">
      <div className="mu-top">
        <div className="lv-topbar lv-mono">
          <TypedBrand />
          <a className="lv-topbar__link" href="/work/">
            Work <ArrowUpRight />
          </a>
        </div>
      </div>

      {/* ---------- opening title (S0) ---------- */}
      <header className="mu-hero">
        <p className="mu-hero__eyebrow lv-mono">/music</p>
        <h1 className="mu-hero__title">
          Got any good songs<b>?</b>
        </h1>
        <p className="mu-hero__sub lv-mono">a story about one bad answer</p>
        <p className="mu-scrollcue lv-mono" aria-hidden="true">
          scroll <span className="mu-scrollcue__arrow">↓</span>
        </p>
      </header>

      {/* ---------- the three doors ---------- */}
      <nav className="mu-tabs" aria-label="Music sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`mu-tab ${active === t.id ? "mu-tab--active" : ""}`}
            onClick={() => pick(t.id)}
            aria-pressed={active === t.id}
          >
            <span className="mu-tab__label lv-mono">{t.label}</span>
            <span className="mu-tab__more" aria-hidden="true">
              <span className="mu-tab__motif">
                {t.id === "story" && <StickMan pose="happy" className="mu-motif-stick" />}
                {t.id === "melodymind" && (
                  <svg viewBox="0 0 48 48" className="mu-motif-probe" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="24" cy="24" r="3.5" fill="currentColor" stroke="none" />
                    <circle className="mu-motif-probe__ring" cx="24" cy="24" r="10" />
                    <circle cx="10" cy="12" r="2" fill="currentColor" stroke="none" opacity="0.7" />
                    <circle cx="38" cy="15" r="2" fill="currentColor" stroke="none" opacity="0.7" />
                    <circle cx="36" cy="36" r="2" fill="currentColor" stroke="none" opacity="0.7" />
                  </svg>
                )}
                {t.id === "rotation" && (
                  <svg viewBox="0 0 48 48" className="mu-motif-eq" aria-hidden="true" fill="currentColor">
                    <rect className="mu-eqbar" x="8" y="16" width="6" height="24" rx="2" />
                    <rect className="mu-eqbar" x="18" y="10" width="6" height="30" rx="2" />
                    <rect className="mu-eqbar" x="28" y="20" width="6" height="20" rx="2" />
                    <rect className="mu-eqbar" x="38" y="14" width="6" height="26" rx="2" />
                  </svg>
                )}
              </span>
              <span className="mu-tab__desc">{t.desc}</span>
            </span>
          </button>
        ))}
      </nav>

      {/* ---------- act I: the story ---------- */}
      <StoryTab onBuilt={releaseBoot} />

      {/* ---------- stub overlays for the other two acts ---------- */}
      {active === "melodymind" && (
        <div className="mu-stub" role="dialog" aria-label="MelodyMind">
          <div className="mu-stub__card">
            <p className="lv-mono mu-stub__eyebrow">MelodyMind</p>
            <h2>The machine goes here.</h2>
            <p>Type a situation, get the songs that live there. It&apos;s being wired in now.</p>
            <button type="button" className="mu-stub__back lv-mono" onClick={() => pick("story")}>
              back to the story
            </button>
          </div>
        </div>
      )}
      {active === "rotation" && (
        <div className="mu-stub" role="dialog" aria-label="On rotation">
          <div className="mu-stub__card">
            <p className="lv-mono mu-stub__eyebrow">On rotation</p>
            <h2>Live from Spotify.</h2>
            <p>Top artists, playlists, what&apos;s on repeat — wired straight to the account, updating itself. Soon.</p>
            <button type="button" className="mu-stub__back lv-mono" onClick={() => pick("story")}>
              back to the story
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
