"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties
} from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowDown, ArrowUpRight, Headphones, RefreshCw } from "lucide-react";
import { useListeningRoom } from "./useListeningRoom";
import type { Art, Playback, TimeRange, Track } from "./types";
import "./listening-room.css";

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

const PERIODS: { id: TimeRange; label: string }[] = [
  { id: "short", label: "4 weeks" },
  { id: "medium", label: "6 months" },
  { id: "long", label: "Long term" }
];

function image(images: Art[]): string | undefined {
  return images[0]?.url;
}

function artistNames(track: Track): string {
  return track.artists.map((artist) => artist.name).join(", ");
}

function clockHour(hours: number[]): string {
  const max = Math.max(...hours);
  if (max <= 0) return "--";
  const hour = hours.indexOf(max);
  return `${hour % 12 || 12} ${hour >= 12 ? "PM" : "AM"}`;
}

function Cover({ src, alt = "" }: { src?: string; alt?: string }) {
  return src ? (
    <img src={src} alt={alt} loading="eager" decoding="async" />
  ) : (
    <span className="lr-cover-fallback" aria-hidden="true">M</span>
  );
}

function NowPlaying({ playback, visible }: { playback: Playback | null; visible: boolean }) {
  const root = useRef<HTMLAnchorElement>(null);
  const track = playback?.track;

  useEffect(() => {
    const element = root.current;
    if (!element || !track) return;
    gsap.fromTo(
      element.querySelectorAll(".lr-now__art, .lr-now__copy > *"),
      { opacity: 0, y: 12, clipPath: "inset(0 0 100% 0)" },
      {
        opacity: 1,
        y: 0,
        clipPath: "inset(0 0 0% 0)",
        duration: 0.46,
        stagger: 0.035,
        ease: "expo.out",
        overwrite: true
      }
    );
  }, [track?.id]);

  useEffect(() => {
    const element = root.current;
    if (!element || !track || playback?.progressMs === null) return;
    let frame = 0;
    const observed = new Date(playback.observedAt).getTime();
    const start = playback.progressMs;
    const duration = Math.max(track.durationMs, 1);
    const update = () => {
      const elapsed = playback.isPlaying ? Math.max(0, Date.now() - observed) : 0;
      element.style.setProperty(
        "--lr-now-progress",
        `${Math.min(1, (start + elapsed) / duration) * 100}%`
      );
      frame = window.requestAnimationFrame(update);
    };
    update();
    return () => window.cancelAnimationFrame(frame);
  }, [playback?.isPlaying, playback?.observedAt, playback?.progressMs, track]);

  if (!track) return null;
  return (
    <a ref={root} className={`lr-now ${visible ? "is-visible" : ""}`} href={track.url} target="_blank" rel="noreferrer">
      <span className="lr-now__art"><Cover src={image(track.album.images)} /></span>
      <span className="lr-now__copy">
        <span className="lr-now__state lv-mono">
          {playback.isPlaying ? "Playing now" : "Played recently"}
        </span>
        <strong>{track.name}</strong>
        <span>{artistNames(track)}</span>
      </span>
      <span className={`lr-now__light ${playback.isPlaying ? "is-live" : ""}`} aria-hidden="true" />
      <span className="lr-now__bar" aria-hidden="true"><i /></span>
    </a>
  );
}

export function ListeningRoom({ active }: { active: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const [period, setPeriod] = useState<TimeRange>("short");
  const [showNow, setShowNow] = useState(false);
  const { room, playback, refresh } = useListeningRoom(active);
  const data = room.data;
  const artists = data?.topArtists[period].slice(0, 7) ?? [];
  const tracks = data?.topTracks[period].slice(0, 8) ?? [];
  const recent = useMemo(() => data?.recent.slice(0, 12) ?? [], [data]);
  const heroTrack = playback.data?.track ?? data?.topTracks.short[0] ?? null;

  useEffect(() => {
    const entry = root.current?.querySelector(".lr-entry");
    if (!entry) return;
    const observer = new IntersectionObserver(
      ([item]) => setShowNow(!item.isIntersecting),
      { threshold: 0.08 }
    );
    observer.observe(entry);
    return () => observer.disconnect();
  }, [data?.generatedAt]);

  useLayoutEffect(() => {
    const element = root.current;
    if (!active || !data || !element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const context = gsap.context(() => {
      const entry = element.querySelector<HTMLElement>(".lr-entry");
      const playlists = element.querySelector<HTMLElement>(".lr-playlists");
      const playlistViewport = element.querySelector<HTMLElement>(".lr-playlist-viewport");
      const playlistTrack = element.querySelector<HTMLElement>(".lr-playlist-track");
      const taste = element.querySelector<HTMLElement>(".lr-taste");
      const snapshot = element.querySelector<HTMLElement>(".lr-snapshot");
      const recentSection = element.querySelector<HTMLElement>(".lr-recent");
      const recentViewport = element.querySelector<HTMLElement>(".lr-recent__viewport");
      const recentTrack = element.querySelector<HTMLElement>(".lr-recent__track");

      if (entry) {
        gsap.timeline({
          scrollTrigger: { trigger: entry, start: "top top", end: "+=145%", pin: true, scrub: 0.8 }
        })
          .fromTo(".lr-entry__copy > *", { y: 48 }, {
            y: 0, duration: 0.55, stagger: 0.06, ease: "expo.out"
          }, 0)
          .fromTo(".lr-entry__art", {
            x: 150, rotate: 5, clipPath: "inset(12% 0 12% 24%)"
          }, {
            x: 0, rotate: 0, clipPath: "inset(0% 0 0% 0%)", duration: 0.8, ease: "expo.out"
          }, 0.08)
          .fromTo(".lr-entry__wash", { opacity: 0, scale: 1.18 }, {
            opacity: 0.2, scale: 1, duration: 0.9, ease: "power3.out"
          }, 0.06)
          .to(".lr-entry__art", { scale: 0.92, y: -24, duration: 0.75, ease: "none" }, 0.8)
          .to(".lr-entry__copy", { opacity: 0.2, y: -36, duration: 0.5 }, 0.95);
      }

      if (playlists && playlistViewport && playlistTrack) {
        const travel = () => Math.max(0, playlistTrack.scrollWidth - playlistViewport.clientWidth);
        gsap.timeline({
          scrollTrigger: {
            trigger: playlists,
            start: "top top",
            end: "+=330%",
            pin: true,
            scrub: 0.85,
            invalidateOnRefresh: true
          }
        })
          .fromTo(".lr-playlists .lr-section-head > *", { y: 38 }, {
            y: 0, duration: 0.34, stagger: 0.05, ease: "expo.out"
          }, 0)
          .fromTo(".lr-playlist", { y: 100, rotate: 3 }, {
            y: 0, rotate: 0, duration: 0.48, stagger: 0.045, ease: "expo.out"
          }, 0.16)
          .to(playlistTrack, { x: () => -travel(), duration: 2.5, ease: "none" }, 0.55);
      }

      if (taste) {
        gsap.timeline({
          scrollTrigger: { trigger: taste, start: "top top", end: "+=230%", pin: true, scrub: 0.85 }
        })
          .fromTo(".lr-taste .lr-section-head > *", { y: 36 }, {
            y: 0, duration: 0.32, stagger: 0.05, ease: "expo.out"
          }, 0)
          .fromTo(".lr-artist", { y: 80 }, {
            y: 0, duration: 0.42, stagger: 0.07, ease: "expo.out"
          }, 0.18)
          .fromTo(".lr-track-row", { x: 70 }, {
            x: 0, duration: 0.36, stagger: 0.055, ease: "expo.out"
          }, 0.42);
      }

      if (snapshot) {
        gsap.timeline({
          scrollTrigger: { trigger: snapshot, start: "top top", end: "+=190%", pin: true, scrub: 0.85 }
        })
          .fromTo(".lr-snapshot .lr-section-head > *", { y: 34 }, {
            y: 0, duration: 0.32, stagger: 0.05, ease: "expo.out"
          }, 0)
          .fromTo(".lr-hour-bar i", { scaleY: 0 }, {
            scaleY: 1, duration: 0.65, stagger: 0.018, transformOrigin: "center bottom", ease: "expo.out"
          }, 0.2)
          .fromTo(".lr-hour-bar span", { opacity: 0, y: 12 }, {
            opacity: 1, y: 0, duration: 0.25, stagger: 0.018
          }, 0.42)
          .fromTo(".lr-insight", { y: 40 }, {
            y: 0, duration: 0.34, stagger: 0.07, ease: "expo.out"
          }, 0.48);
      }

      if (recentSection && recentViewport && recentTrack) {
        const travel = () => Math.max(0, recentTrack.scrollWidth - recentViewport.clientWidth);
        gsap.timeline({
          scrollTrigger: {
            trigger: recentSection,
            start: "top top",
            end: "+=300%",
            pin: true,
            scrub: 0.85,
            invalidateOnRefresh: true
          }
        })
          .fromTo(".lr-recent .lr-section-head > *", { y: 34 }, {
            y: 0, duration: 0.32, stagger: 0.05, ease: "expo.out"
          }, 0)
          .fromTo(".lr-recent-card", { y: 100 }, {
            y: 0, duration: 0.42, stagger: 0.05, ease: "expo.out"
          }, 0.18)
          .to(recentTrack, { x: () => -travel(), duration: 2.35, ease: "none" }, 0.55);
      }

      requestAnimationFrame(() => ScrollTrigger.refresh());
    }, element);

    return () => context.revert();
  }, [active, data?.generatedAt]);

  useLayoutEffect(() => {
    const element = root.current;
    if (!element || !data || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.fromTo(
      element.querySelectorAll(".lr-artist, .lr-track-row"),
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 0.38, stagger: 0.025, ease: "expo.out", overwrite: true }
    );
  }, [period, data]);

  if (room.status === "idle" || (room.status === "loading" && !data)) {
    return (
      <section className="lr lr--loading" aria-live="polite">
        <div className="lr-loader"><i /><i /><i /><i /></div>
        <p className="lv-mono">Opening the listening room</p>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="lr lr--empty">
        <Headphones aria-hidden="true" />
        <p className="lv-mono">Listening room is offline.</p>
        <button type="button" onClick={refresh}><RefreshCw aria-hidden="true" /> Try again</button>
      </section>
    );
  }

  const maxHour = Math.max(...data.snapshot.listeningHours, 1);
  const heroArt = heroTrack ? image(heroTrack.album.images) : undefined;

  return (
    <div className="lr" ref={root}>
      <section className="lr-entry">
        <div className="lr-entry__wash" aria-hidden="true"><Cover src={heroArt} /></div>
        <div className="lr-entry__copy">
          <h2>Listening<br />room<b>.</b></h2>
          <p>My playlists, the artists I return to, and whatever is playing right now.</p>
          <span className="lr-entry__scroll lv-mono">Scroll to enter <ArrowDown /></span>
        </div>
        <a className="lr-entry__art" href={heroTrack?.url ?? data.profile.url} target="_blank" rel="noreferrer">
          <span className="lr-entry__cover"><Cover src={heroArt} alt={heroTrack?.album.name ?? ""} /></span>
          <span className="lr-entry__track">
            <small className="lv-mono">{playback.data?.isPlaying ? "Playing now" : "On repeat"}</small>
            <strong>{heroTrack?.name ?? "Open Spotify"}</strong>
            <span>{heroTrack ? artistNames(heroTrack) : data.profile.name}</span>
          </span>
          <ArrowUpRight aria-hidden="true" />
        </a>
      </section>

      <section className="lr-section lr-playlists">
        <div className="lr-section-head">
          <h3>Playlists</h3>
          <p>Everything currently published on my Spotify profile.</p>
        </div>
        <div className="lr-playlist-viewport">
          <div className="lr-playlist-track">
            {data.playlists.map((playlist, index) => (
              <a className="lr-playlist" href={playlist.url} target="_blank" rel="noreferrer" key={playlist.id}>
                <span className="lr-playlist__number lv-mono">{String(index + 1).padStart(2, "0")}</span>
                <span className="lr-playlist__cover"><Cover src={image(playlist.images)} alt={playlist.name} /></span>
                <span className="lr-playlist__meta"><strong>{playlist.name}</strong><small>{playlist.itemCount} tracks</small></span>
                <ArrowUpRight aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>
        <p className="lr-scroll-note lv-mono">Scroll to move through the playlists</p>
      </section>

      <section className="lr-section lr-taste">
        <div className="lr-section-head lr-section-head--row">
          <div><h3>Artists and tracks</h3><p>The music I have returned to most.</p></div>
          <div className="lr-period" aria-label="Ranking period">
            {PERIODS.map((item) => (
              <button key={item.id} type="button" className={period === item.id ? "is-active" : ""} onClick={() => setPeriod(item.id)}>{item.label}</button>
            ))}
          </div>
        </div>
        <div className="lr-taste__layout">
          <div className="lr-artist-grid">
            {artists.map((artist, index) => (
              <a className="lr-artist" href={artist.url} target="_blank" rel="noreferrer" key={artist.id}>
                <span className="lr-artist__art"><Cover src={image(artist.images)} alt={artist.name} /></span>
                <span className="lr-artist__meta"><i className="lv-mono">{String(index + 1).padStart(2, "0")}</i><strong>{artist.name}</strong></span>
              </a>
            ))}
          </div>
          <ol className="lr-track-list">
            {tracks.map((track, index) => (
              <li className="lr-track-row" key={`${track.id}-${index}`}>
                <a href={track.url} target="_blank" rel="noreferrer">
                  <span className="lr-track-row__rank lv-mono">{String(index + 1).padStart(2, "0")}</span>
                  <span className="lr-track-row__cover"><Cover src={image(track.album.images)} /></span>
                  <span className="lr-track-row__copy"><strong>{track.name}</strong><small>{artistNames(track)}</small></span>
                  <ArrowUpRight aria-hidden="true" />
                </a>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="lr-section lr-snapshot">
        <div className="lr-section-head"><h3>The last 50 plays</h3><p>When I listened and what repeated.</p></div>
        <div className="lr-snapshot__layout">
          <div className="lr-hours" aria-label={`Most active listening hour: ${clockHour(data.snapshot.listeningHours)}`}>
            <div className="lr-hours__plot">
              {data.snapshot.listeningHours.map((count, hour) => (
                <span className="lr-hour-bar" key={hour}>
                  <i style={{ "--lr-level": Math.max(0.04, count / maxHour) } as CSSProperties} />
                  <span className="lv-mono">{hour % 3 === 0 ? String(hour).padStart(2, "0") : ""}</span>
                </span>
              ))}
            </div>
            <div className="lr-hours__axis lv-mono"><span>Midnight</span><span>Noon</span><span>Midnight</span></div>
          </div>
          <div className="lr-insights">
            <article className="lr-insight lr-insight--lead"><span>Prime listening hour</span><strong>{clockHour(data.snapshot.listeningHours)}</strong></article>
            <article className="lr-insight"><span>Top artist</span><strong>{data.snapshot.topArtist?.name ?? "--"}</strong></article>
            <article className="lr-insight"><span>Most repeated</span><strong>{data.snapshot.repeatedTracks[0]?.track.name ?? data.snapshot.topTrack?.name ?? "--"}</strong></article>
            <article className="lr-insight"><span>Different artists</span><strong>{data.snapshot.uniqueArtists}</strong></article>
            <article className="lr-insight"><span>Different albums</span><strong>{data.snapshot.uniqueAlbums}</strong></article>
          </div>
        </div>
      </section>

      <section className="lr-section lr-recent">
        <div className="lr-section-head"><h3>Recently played</h3></div>
        <div className="lr-recent__viewport">
          <div className="lr-recent__track">
            {recent.map((track, index) => (
              <a className="lr-recent-card" href={track.url} target="_blank" rel="noreferrer" key={`${track.id}-${track.playedAt}`}>
                <span className="lr-recent-card__cover"><Cover src={image(track.album.images)} alt={track.album.name} /></span>
                <span className="lr-recent-card__copy"><i className="lv-mono">{String(index + 1).padStart(2, "0")}</i><strong>{track.name}</strong><small>{artistNames(track)}</small></span>
                <ArrowUpRight aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>
      </section>

      <footer className="lr-footer">
        <p>More music on Spotify.</p>
        <a href={data.profile.url} target="_blank" rel="noreferrer">Open my profile <ArrowUpRight aria-hidden="true" /></a>
      </footer>

      <NowPlaying playback={playback.data} visible={showNow} />
    </div>
  );
}
