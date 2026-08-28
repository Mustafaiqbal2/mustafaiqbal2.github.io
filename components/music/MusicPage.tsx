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
import { ListeningRoomChoreography } from "./listening/ListeningRoomChoreography";
import "./music-transition.css";

gsap.registerPlugin(ScrollTrigger);

type TabId = "story" | "melodymind" | "listening";

const TABS: { id: TabId; label: string; desc: string }[] = [
  { id: "story", label: "The story", desc: "How MelodyMind started, scene by scene." },
  { id: "melodymind", label: "MelodyMind", desc: "Type a situation, get songs that fit it." },
  { id: "listening", label: "Listening room", desc: "Playlists, favourites, and whatever is playing now." }
];

export function MusicPage() {
  const [active, setActive] = useState<TabId>("story");
  const [selected, setSelected] = useState<TabId>("story");
  const [panelReady, setPanelReady] = useState(false);
  const [listeningRevealSignal, setListeningRevealSignal] = useState(0);
  const lenisRef = useRef<Lenis | null>(null);
  const transitionRef = useRef<HTMLDivElement>(null);
  const transitionBusyRef = useRef(false);
  const transitionTimelineRef = useRef<gsap.core.Timeline | null>(null);

  const releaseBoot = useCallback(() => {
    document.documentElement.classList.remove("lv-boot");
    if (!transitionBusyRef.current) lenisRef.current?.start();
  }, []);

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

  useEffect(() => {
    return () => {
      transitionTimelineRef.current?.kill();
    };
  }, []);

  useLayoutEffect(() => {
    const fromHash = () => {
      const hash = window.location.hash.replace("#", "");
      const next: TabId = hash === "rotation" || hash === "listening"
        ? "listening"
        : hash === "melodymind"
          ? "melodymind"
          : "story";
      setActive(next);
      setSelected(next);
      setPanelReady(true);
      if (next !== "story") document.documentElement.classList.remove("lv-boot");
    };

    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  const commitTab = useCallback((
    id: TabId,
    resumeScroll = true,
    onCommitted?: () => void
  ) => {
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
    setSelected(id);
    history.replaceState(null, "", id === "story" ? "#story" : `#${id}`);

    window.requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      resetToTop();
      if (resumeScroll && id !== "melodymind" && !document.documentElement.classList.contains("lv-boot")) {
        lenisRef.current?.start();
      }
      onCommitted?.();
    });
  }, []);

  const pick = (id: TabId) => {
    if (id === selected || transitionBusyRef.current) return;

    setSelected(id);

    const transition = transitionRef.current;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!transition || reduceMotion) {
      commitTab(id);
      if (id === "listening") {
        window.requestAnimationFrame(() => setListeningRevealSignal((value) => value + 1));
      }
      return;
    }

    const cover = transition.querySelector<HTMLElement>(".mu-tab-transition__cover");
    const reveal = transition.querySelector<HTMLElement>(".mu-tab-transition__reveal");
    const label = transition.querySelector<HTMLElement>(".mu-tab-transition__label");
    if (!cover || !reveal || !label) {
      commitTab(id);
      if (id === "listening") {
        window.requestAnimationFrame(() => setListeningRevealSignal((value) => value + 1));
      }
      return;
    }

    const tab = TABS.find((item) => item.id === id);
    label.textContent = tab?.label ?? "Music";
    transitionBusyRef.current = true;
    lenisRef.current?.stop();

    transitionTimelineRef.current?.kill();
    gsap.killTweensOf([cover, reveal, label]);
    gsap.set(transition, { visibility: "visible", pointerEvents: "auto" });
    gsap.set(cover, { scaleY: 0, transformOrigin: "50% 100%", force3D: true });
    gsap.set(reveal, { scaleY: 0, transformOrigin: "50% 0%", force3D: true });
    gsap.set(label, { opacity: 0, y: 18, scale: 0.965 });

    const finishTransition = () => {
      gsap.set(transition, { visibility: "hidden", pointerEvents: "none" });
      gsap.set([cover, reveal], { scaleY: 0 });
      gsap.set(label, { opacity: 0, y: 18, scale: 0.965 });
      transitionBusyRef.current = false;
      transitionTimelineRef.current = null;

      if (id !== "melodymind" && !document.documentElement.classList.contains("lv-boot")) {
        lenisRef.current?.start();
      }

      if (id === "listening") {
        window.requestAnimationFrame(() => setListeningRevealSignal((value) => value + 1));
      }
    };

    const runListeningReveal = () => {
      /* Listening Room hydrates Spotify data and builds ScrollTriggers while
         this sheet is leaving. Keep the moving edge on the browser compositor
         so a busy JS frame cannot jump the curtain straight to its end. */
      transitionTimelineRef.current = null;
      gsap.set(cover, { scaleY: 0 });

      label.animate(
        [
          { opacity: 1, transform: "translateY(0px) scale(1)" },
          { opacity: 0, transform: "translateY(-12px) scale(0.985)" }
        ],
        {
          duration: 220,
          easing: "cubic-bezier(0.55, 0, 1, 0.45)",
          fill: "forwards"
        }
      );

      const revealAnimation = reveal.animate(
        [
          {
            transform: "translateZ(0) scaleY(1.018)",
            offset: 0,
            easing: "cubic-bezier(0.65, 0, 0.35, 1)"
          },
          {
            transform: "translateZ(0) scaleY(0.018)",
            offset: 0.879,
            easing: "cubic-bezier(0.39, 0.575, 0.565, 1)"
          },
          { transform: "translateZ(0) scaleY(0)", offset: 1 }
        ],
        {
          duration: 1160,
          fill: "forwards"
        }
      );

      revealAnimation.onfinish = finishTransition;
      revealAnimation.oncancel = finishTransition;
    };

    const timeline = gsap.timeline({
      onComplete: finishTransition
    });

    transitionTimelineRef.current = timeline;

    timeline
      .to(cover, {
        scaleY: 1.018,
        duration: 0.96,
        ease: "power3.inOut",
        force3D: true
      }, 0)
      .to(cover, {
        scaleY: 1,
        duration: 0.15,
        ease: "sine.out",
        force3D: true
      }, 0.96)
      .to(label, {
        opacity: 1,
        y: 0,
        scale: 1.012,
        duration: 0.36,
        ease: "power3.out"
      }, 0.5)
      .to(label, {
        scale: 1,
        duration: 0.18,
        ease: "back.out(1.35)"
      }, 0.82)
      .add(() => {
        gsap.set(reveal, { scaleY: 1.018 });
        timeline.pause();
        commitTab(id, false, () => {
          window.requestAnimationFrame(() => {
            if (id === "listening") {
              timeline.kill();
              runListeningReveal();
            } else {
              timeline.resume();
            }
          });
        });
      }, 1.11)
      .to(label, {
        opacity: 0,
        y: -12,
        scale: 0.985,
        duration: 0.22,
        ease: "power2.in"
      }, 1.18)
      .set(cover, { scaleY: 0 }, 1.26)
      .to(reveal, {
        scaleY: 0.018,
        duration: 1.02,
        ease: "power3.inOut",
        force3D: true
      }, 1.3)
      .to(reveal, {
        scaleY: 0,
        duration: 0.14,
        ease: "sine.out",
        force3D: true
      }, 2.32);
  };

  useEffect(() => {
    document.documentElement.classList.toggle("mu-overlay-open", active === "melodymind");
    if (active === "melodymind") lenisRef.current?.stop();
    else if (!transitionBusyRef.current && !document.documentElement.classList.contains("lv-boot")) {
      lenisRef.current?.start();
    }
    return () => document.documentElement.classList.remove("mu-overlay-open");
  }, [active]);

  return (
    <main id="main" className="mu lv-space">
      <div ref={transitionRef} className="mu-tab-transition" aria-hidden="true">
        <div className="mu-tab-transition__cover" />
        <div className="mu-tab-transition__reveal" />
        <strong className="mu-tab-transition__label">The story</strong>
      </div>

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

      <nav className="mu-tabs" aria-label="Music sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`mu-tab ${selected === t.id ? "mu-tab--active" : ""}`}
            onClick={() => pick(t.id)}
            aria-pressed={selected === t.id}
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

      {panelReady && active === "story" && <StoryTab onBuilt={releaseBoot} />}
      {panelReady && active === "listening" && (
        <>
          <ListeningRoom active />
          <ListeningRoomChoreography signal={listeningRevealSignal} />
        </>
      )}

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
