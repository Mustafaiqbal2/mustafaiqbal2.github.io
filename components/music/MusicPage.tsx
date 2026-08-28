"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { ArrowUpRight } from "lucide-react";
import { TypedBrand } from "@/components/TypedBrand";
import { StickMan } from "./sceneKit";
import { StoryTab } from "./StoryTab";
import { ListeningRoom } from "./listening/ListeningRoom";

gsap.registerPlugin(ScrollTrigger);

type TabId = "story" | "melodymind" | "listening";

const TABS: { id: TabId; label: string; desc: string }[] = [
  { id: "story", label: "The story", desc: "How MelodyMind started, scene by scene." },
  { id: "melodymind", label: "MelodyMind", desc: "Type a situation, get songs that fit it." },
  { id: "listening", label: "Listening room", desc: "Playlists, favourites, and whatever is playing now." }
];

export function MusicPage() {
  const [active, setActive] = useState<TabId>("story");
  const [panelReady, setPanelReady] = useState(false);
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
  useLayoutEffect(() => {
    const fromHash = () => {
      const hash = window.location.hash.replace("#", "");
      const next: TabId = hash === "rotation" || hash === "listening"
        ? "listening"
        : hash === "melodymind"
          ? "melodymind"
          : "story";
      setActive(next);
      setPanelReady(true);
      if (next !== "story") document.documentElement.classList.remove("lv-boot");
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  const pick = (id: TabId) => {
    const resetToTop = () => {
      lenisRef.current?.scrollTo(0, { immediate: true, force: true });
      window.scrollTo({ top: 0, behavior: "auto" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    lenisRef.current?.stop();
    resetToTop();
    if (id === "story" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.documentElement.classList.add("lv-boot");
    } else {
      document.documentElement.classList.remove("lv-boot");
    }
    setActive(id);
    history.replaceState(null, "", id === "story" ? "#story" : `#${id}`);
    /* Remounting a pinned panel changes document height. Reset again after
       React removes the old pin spacers so every tab starts at the top. */
    window.requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      resetToTop();
      if (id !== "story") lenisRef.current?.start();
    });
  };

  /* Only the unfinished search tab owns the viewport. Listening Room is a page. */
  useEffect(() => {
    document.documentElement.classList.toggle("mu-overlay-open", active === "melodymind");
    if (active === "melodymind") lenisRef.current?.stop();
    else if (!document.documentElement.classList.contains("lv-boot")) lenisRef.current?.start();
    return () => document.documentElement.classList.remove("mu-overlay-open");
  }, [active]);

  return (
    <main id="main" className="mu lv-space">
      <aside className="mu-mobile-gate" aria-label="Desktop experience">
        <span className="mu-mobile-gate__mark" aria-hidden="true">M</span>
        <h1>Give this one a bigger screen.</h1>
        <p>The music page is a wide, scroll-driven experience. It looks much better on a laptop or desktop.</p>
        <a href="/">Back home</a>
      </aside>

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
        <p className="mu-hero__sub lv-mono">
          {active === "story"
            ? "how melodymind happened"
            : active === "melodymind"
              ? "find a song for the exact situation"
              : "inside my spotify"}
        </p>
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
              <span className="mu-tab__inner">
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
                {t.id === "listening" && (
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
            </span>
          </button>
        ))}
      </nav>

      {/* ---------- act I: the story ---------- */}
      {panelReady && active === "story" && <StoryTab onBuilt={releaseBoot} />}
      {panelReady && active === "listening" && <ListeningRoom active />}

      {/* ---------- stub overlays for the other two acts ---------- */}
      {active === "melodymind" && (
        <div className="mu-stub" role="dialog" aria-label="MelodyMind">
          <div className="mu-stub__card">
            <p className="lv-mono mu-stub__eyebrow">MelodyMind</p>
            <h2>MelodyMind search</h2>
            <p>You&apos;ll type a situation and get songs that fit it. This tab is being built now.</p>
            <button type="button" className="mu-stub__back lv-mono" onClick={() => pick("story")}>
              back to the story
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
