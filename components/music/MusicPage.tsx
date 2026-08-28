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
import { ListeningTransitionVines } from "./listening/ListeningTransitionVines";
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

  /* boot gate release: the story tab calls this once its pins exist */
  const releaseBoot = useCallback(() => {
    document.documentElement.classList.remove("lv-boot");
    if (!transitionBusyRef.current) lenisRef.current?.start();
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

  useEffect(() => {
    return () => {
      transitionTimelineRef.current?.kill();
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

    /* Wait for React to mount the destination and for its pin spacers to
       settle before the curtain starts revealing it. */
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

    /* The control responds on the click itself. The heavy page content only
       changes later, underneath a fully-covered viewport. */
    setSelected(id);

    const transition = transitionRef.current;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!transition || reduceMotion) {
      commitTab(id);
      return;
    }

    const cover = transition.querySelector<HTMLElement>(".mu-tab-transition__cover");
    const reveal = transition.querySelector<HTMLElement>(".mu-tab-transition__reveal");
    const label = transition.querySelector<HTMLElement>(".mu-tab-transition__label");
    if (!cover || !reveal || !label) {
      commitTab(id);
      return;
    }

    const isListening = id === "listening";
    const vines = transition.querySelector<SVGSVGElement>(".mu-listening-vines");
    const vineStems = vines ? gsap.utils.toArray<SVGPathElement>(vines.querySelectorAll(".mu-vine-stem")) : [];
    const vineBranches = vines ? gsap.utils.toArray<SVGPathElement>(vines.querySelectorAll(".mu-vine-branch")) : [];
    const vineLeaves = vines ? gsap.utils.toArray<SVGPathElement>(vines.querySelectorAll(".mu-vine-leaf")) : [];
    const vineBlooms = vines ? gsap.utils.toArray<SVGGElement>(vines.querySelectorAll(".mu-vine-bloom")) : [];

    const tab = TABS.find((item) => item.id === id);
    label.textContent = tab?.label ?? "Music";
    transitionBusyRef.current = true;
    lenisRef.current?.stop();

    transitionTimelineRef.current?.kill();
    gsap.killTweensOf([cover, reveal, label]);
    if (vines) gsap.killTweensOf([vines, ...vineStems, ...vineBranches, ...vineLeaves, ...vineBlooms]);
    gsap.set(transition, { visibility: "visible", pointerEvents: "auto" });
    gsap.set(cover, { scaleY: 0, transformOrigin: "50% 100%", force3D: true });
    gsap.set(reveal, { scaleY: 0, transformOrigin: "50% 0%", force3D: true });
    gsap.set(label, { opacity: 0, y: 18, scale: 0.965 });

    if (vines) {
      gsap.set(vines, { opacity: 0, y: 0, scale: 1 });
      gsap.set(vineStems, { strokeDashoffset: 1 });
      gsap.set(vineBranches, { strokeDashoffset: 1 });
      gsap.set(vineLeaves, { autoAlpha: 0, scale: 0.2, rotate: -10 });
      gsap.set(vineBlooms, { autoAlpha: 0, scale: 0.5, rotate: -12 });
    }

    const timeline = gsap.timeline({
      onComplete: () => {
        gsap.set(transition, { visibility: "hidden", pointerEvents: "none" });
        gsap.set([cover, reveal], { scaleY: 0 });
        gsap.set(label, { opacity: 0, y: 18, scale: 0.965 });
        if (vines) gsap.set(vines, { opacity: 0, y: 0 });
        transitionBusyRef.current = false;
        transitionTimelineRef.current = null;
        if (id !== "melodymind" && !document.documentElement.classList.contains("lv-boot")) {
          lenisRef.current?.start();
        }
      }
    });

    transitionTimelineRef.current = timeline;

    /* The white curtain remains the dominant motion. Listening Room gets a
       second, quieter botanical layer that grows only once there is enough
       white surface for the linework to read clearly. */
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
      }, 0.82);

    if (isListening && vines) {
      timeline
        .to(vines, { opacity: 1, duration: 0.18, ease: "sine.out" }, 0.28)
        .to(vineStems, {
          strokeDashoffset: 0,
          duration: 0.9,
          stagger: 0.045,
          ease: "power2.out"
        }, 0.3)
        .to(vineBranches, {
          strokeDashoffset: 0,
          duration: 0.68,
          stagger: 0.045,
          ease: "power2.out"
        }, 0.5)
        .to(vineLeaves, {
          autoAlpha: 0.9,
          scale: 1,
          rotate: 0,
          duration: 0.4,
          stagger: { each: 0.026, from: "random" },
          ease: "back.out(1.55)"
        }, 0.68)
        .to(vineBlooms, {
          autoAlpha: 0.92,
          scale: 1,
          rotate: 0,
          duration: 0.52,
          stagger: 0.075,
          ease: "back.out(1.7)"
        }, 0.86);
    }

    timeline
      /* Both white sheets are fully covering before React swaps the panel. */
      .add(() => {
        gsap.set(reveal, { scaleY: 1.018 });
        timeline.pause();
        commitTab(id, false, () => {
          window.requestAnimationFrame(() => timeline.resume());
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
      .add(() => {
        if (isListening) setListeningRevealSignal((value) => value + 1);
      }, 1.28)
      /* The lower edge travels upward, revealing the new page. The botanical
         layer lingers for the first half of that reveal, then drifts away. */
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

    if (isListening && vines) {
      timeline.to(vines, {
        opacity: 0,
        y: -24,
        scale: 1.01,
        duration: 0.62,
        ease: "power2.in"
      }, 1.5);
    }
  };

  /* Only the unfinished search tab owns the viewport. Listening Room is a page. */
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
        <ListeningTransitionVines />
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

      {/* ---------- act I: the story ---------- */}
      {panelReady && active === "story" && <StoryTab onBuilt={releaseBoot} />}
      {panelReady && active === "listening" && (
        <>
          <ListeningRoom active />
          <ListeningRoomChoreography signal={listeningRevealSignal} />
        </>
      )}

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
