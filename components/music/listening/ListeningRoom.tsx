"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowDown, ArrowUpRight, Headphones, RefreshCw } from "lucide-react";
import { useListeningRoom } from "./useListeningRoom";
import type { Art, Artist, Playback, TimeRange, Track } from "./types";
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
  if (max <= 0) return "—";
  const hour = hours.indexOf(max);
  return `${hour % 12 || 12} ${hour >= 12 ? "PM" : "AM"}`;
}

function Cover({ src, alt = "" }: { src?: string; alt?: string }) {
  return src ? <img src={src} alt={alt} loading="lazy" decoding="async" /> : <span aria-hidden="true">♪</span>;
}

function Groove({ className = "" }: { className?: string }) {
  return (
    <span className={`lr-groove ${className}`} aria-hidden="true">
      <i /><i /><i /><i /><i /><i /><b />
    </span>
  );
}

function SignalLines({ className = "" }: { className?: string }) {
  return (
    <svg className={`lr-signal ${className}`} viewBox="0 0 900 240" fill="none" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((index) => (
        <path
          key={index}
          className="lr-signal__line"
          pathLength={1}
          d={`M0 ${42 + index * 39} C120 ${8 + index * 29}, 190 ${92 + index * 23}, 300 ${46 + index * 36} S480 ${10 + index * 42}, 590 ${48 + index * 35} S770 ${88 + index * 22}, 900 ${42 + index * 39}`}
        />
      ))}
    </svg>
  );
}

function NowPlaying({ playback }: { playback: Playback | null }) {
  const root = useRef<HTMLAnchorElement>(null);
  const track = playback?.track;

  useEffect(() => {
    if (!root.current || !track) return;
    const swap = root.current.querySelectorAll(".lr-now__art, .lr-now__copy > *");
    gsap.fromTo(
      swap,
      { opacity: 0, y: 10, rotateX: -18 },
      { opacity: 1, y: 0, rotateX: 0, duration: 0.48, stagger: 0.045, ease: "power3.out" }
    );
    gsap.fromTo(root.current, { scale: 0.96 }, { scale: 1, duration: 0.62, ease: "elastic.out(1, .65)" });
  }, [track?.id]);

  useEffect(() => {
    const element = root.current;
    if (!element || !track || playback?.progressMs === null) return;
    let frame = 0;
    const observed = new Date(playback.observedAt).getTime();
    const start = playback.progressMs;
    const duration = Math.max(track.durationMs, 1);
    const update = () => {
      if (document.hidden) {
        frame = window.requestAnimationFrame(update);
        return;
      }
      const elapsed = playback.isPlaying ? Math.max(0, Date.now() - observed) : 0;
      const progress = Math.min(1, (start + elapsed) / duration);
      element.style.setProperty("--lr-now-progress", `${progress * 360}deg`);
      frame = window.requestAnimationFrame(update);
    };
    update();
    return () => window.cancelAnimationFrame(frame);
  }, [playback?.isPlaying, playback?.observedAt, playback?.progressMs, track]);

  if (!track) return null;
  return (
    <a ref={root} className="lr-now" href={track.url} target="_blank" rel="noreferrer">
      <span className="lr-now__progress" aria-hidden="true">
        <span className="lr-now__art" key={track.id}>
          <Cover src={image(track.album.images)} />
        </span>
      </span>
      <span className="lr-now__copy">
        <span className="lr-now__state lv-mono">{playback.isPlaying ? "playing now" : "played recently"}</span>
        <strong>{track.name}</strong>
        <span>{artistNames(track)}</span>
      </span>
      <span className={`lr-eq ${playback.isPlaying ? "lr-eq--live" : ""}`} aria-hidden="true">
        <i /><i /><i /><i />
      </span>
    </a>
  );
}

function RadioNode({ artist, rank, index }: { artist: Artist; rank: number; index: number }) {
  const style = { "--lr-node-angle": `${index * 45 - 90}deg` } as CSSProperties;
  return (
    <a className="lr-radio__node" style={style} href={artist.url} target="_blank" rel="noreferrer">
      <span className="lr-radio__portrait"><Cover src={image(artist.images)} /></span>
      <span className="lr-radio__rank lv-mono">{String(rank).padStart(2, "0")}</span>
      <strong>{artist.name}</strong>
    </a>
  );
}

export function ListeningRoom({ active }: { active: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const [period, setPeriod] = useState<TimeRange>("short");
  const { room, playback, refresh } = useListeningRoom(active);
  const data = room.data;
  const artists = data?.topArtists[period].slice(0, 8) ?? [];
  const tracks = data?.topTracks[period].slice(0, 8) ?? [];
  const recent = useMemo(() => data?.recent.slice(0, 12) ?? [], [data]);

  useLayoutEffect(() => {
    const element = root.current;
    if (!active || !data || !element) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const navigatorInfo = navigator as Navigator & { deviceMemory?: number };
    const weak = (navigatorInfo.hardwareConcurrency || 8) <= 4 || (navigatorInfo.deviceMemory ?? 8) <= 4;
    const mm = gsap.matchMedia(element);

    mm.add("(min-width: 1024px)", () => {
      if (reduced || weak) return;
      const entry = element.querySelector<HTMLElement>(".lr-entry");
      const playlistSection = element.querySelector<HTMLElement>(".lr-playlists");
      const shelf = element.querySelector<HTMLElement>(".lr-shelf");
      const shelfTrack = element.querySelector<HTMLElement>(".lr-shelf__track");
      const radio = element.querySelector<HTMLElement>(".lr-radio");
      const snapshot = element.querySelector<HTMLElement>(".lr-snapshot");
      const recentSection = element.querySelector<HTMLElement>(".lr-recent");
      const recentTrack = element.querySelector<HTMLElement>(".lr-recent__trackline");

      if (entry) {
        gsap.timeline({ scrollTrigger: { trigger: entry, start: "top top", end: "+=150%", pin: true, scrub: 1 } })
          .fromTo(".lr-entry__copy > *", { opacity: 0, y: 42 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.08 }, 0)
          .fromTo(".lr-turntable", { opacity: 0, x: 130, rotate: 8 }, { opacity: 1, x: 0, rotate: 0, duration: 0.7 }, 0.08)
          .fromTo(".lr-turntable__arm", { rotate: -28 }, { rotate: 0, duration: 0.55, transformOrigin: "88% 12%" }, 0.58)
          .to(".lr-turntable__record", { rotate: 220, duration: 1.2, ease: "none" }, 0.25)
          .fromTo(".lr-entry__signal", { opacity: 0, scaleX: 0 }, { opacity: 1, scaleX: 1, duration: 0.5, transformOrigin: "left" }, 0.72)
          .to(".lr-entry__copy", { opacity: 0.22, y: -35, duration: 0.38 }, 1.15);
      }

      if (playlistSection && shelf && shelfTrack) {
        const travel = () => Math.max(0, shelfTrack.scrollWidth - shelf.clientWidth);
        gsap.timeline({ scrollTrigger: { trigger: playlistSection, start: "top top", end: "+=360%", pin: true, scrub: 1, invalidateOnRefresh: true } })
          .fromTo(".lr-playlists .lr-chapter", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.24 }, 0)
          .fromTo(".lr-playlist", { opacity: 0, x: 80, rotateY: -14 }, { opacity: 1, x: 0, rotateY: 0, duration: 0.38, stagger: 0.035 }, 0.12)
          .to(shelfTrack, { x: () => -travel(), duration: 2.9, ease: "none" }, 0.55)
          .to(".lr-shelf__groove", { rotate: 300, duration: 2.9, ease: "none" }, 0.55)
          .to(".lr-playlist", { opacity: 0.35, scale: 0.94, duration: 0.34, stagger: 0.015 }, 3.25);
      }

      if (radio) {
        gsap.timeline({ scrollTrigger: { trigger: radio, start: "top top", end: "+=320%", pin: true, scrub: 1 } })
          .fromTo(".lr-radio .lr-chapter", { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.24 }, 0)
          .fromTo(".lr-radio__machine", { opacity: 0, scale: 0.72, rotate: -24 }, { opacity: 1, scale: 1, rotate: 0, duration: 0.55 }, 0.12)
          .fromTo(".lr-radio__node", { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.24, stagger: 0.08 }, 0.42)
          .to(".lr-radio__needle", { rotate: 282, duration: 1.65, transformOrigin: "50% 100%", ease: "none" }, 0.55)
          .fromTo(".lr-track-card", { opacity: 0, x: 80 }, { opacity: 1, x: 0, duration: 0.28, stagger: 0.08 }, 0.9)
          .to(".lr-radio__rings", { rotate: 120, duration: 1.8, ease: "none" }, 0.55);
      }

      if (snapshot) {
        gsap.timeline({ scrollTrigger: { trigger: snapshot, start: "top top", end: "+=280%", pin: true, scrub: 1 } })
          .fromTo(".lr-snapshot .lr-chapter", { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.24 }, 0)
          .fromTo(".lr-clock", { opacity: 0, scale: 0.7, rotate: -28 }, { opacity: 1, scale: 1, rotate: 0, duration: 0.55 }, 0.16)
          .fromTo(".lr-clock__bar", { scaleY: 0 }, { scaleY: 1, duration: 0.2, stagger: 0.025, transformOrigin: "center bottom" }, 0.5)
          .fromTo(".lr-snapshot .lr-signal__line", { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.8, stagger: 0.08, ease: "none" }, 0.72)
          .fromTo(".lr-stat", { opacity: 0, y: 42 }, { opacity: 1, y: 0, duration: 0.28, stagger: 0.09 }, 0.92)
          .to(".lr-clock__orbit", { rotate: 360, duration: 1.5, ease: "none" }, 0.8);
      }

      if (recentSection && recentTrack) {
        const travel = () => Math.max(0, recentTrack.scrollWidth - window.innerWidth + 120);
        gsap.timeline({ scrollTrigger: { trigger: recentSection, start: "top top", end: "+=340%", pin: true, scrub: 1, invalidateOnRefresh: true } })
          .fromTo(".lr-recent .lr-chapter", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.24 }, 0)
          .fromTo(".lr-recent__beam", { scaleX: 0 }, { scaleX: 1, duration: 0.55, transformOrigin: "left" }, 0.2)
          .fromTo(".lr-recent-card", { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.24, stagger: 0.055 }, 0.42)
          .to(recentTrack, { x: () => -travel(), duration: 2.35, ease: "none" }, 0.62)
          .to(".lr-recent__star", { x: () => window.innerWidth * 0.8, opacity: 1, duration: 2.35, ease: "none" }, 0.62);
      }
    });

    mm.add("(max-width: 1023px)", () => {
      if (reduced) return;
      gsap.utils.toArray<HTMLElement>(".lr-chapter, .lr-playlist, .lr-radio__machine, .lr-track-card, .lr-clock, .lr-stat, .lr-recent-card", element)
        .forEach((item) => gsap.from(item, { opacity: 0, y: 28, duration: 0.65, ease: "power3.out", scrollTrigger: { trigger: item, start: "top 88%", once: true } }));
    });

    return () => mm.revert();
  }, [active, data?.generatedAt]);

  useLayoutEffect(() => {
    if (!root.current || !data || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const targets = root.current.querySelectorAll(
      ".lr-radio__portrait, .lr-radio__node strong, .lr-track-card a > *"
    );
    gsap.fromTo(
      targets,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.38, stagger: 0.025, ease: "power3.out", overwrite: "auto" }
    );
  }, [period, data]);

  if (room.status === "idle" || (room.status === "loading" && !data)) {
    return <section className="lr lr--loading" aria-live="polite"><div className="lr-loader"><i /><i /><i /><i /><i /></div><p className="lv-mono">opening the listening room</p></section>;
  }

  if (!data) {
    return <section className="lr lr--empty"><Headphones aria-hidden="true" /><p className="lv-mono">Listening room is offline.</p><button type="button" onClick={refresh}><RefreshCw aria-hidden="true" /> Try again</button></section>;
  }

  const maxHour = Math.max(...data.snapshot.listeningHours, 1);

  return (
    <div className="lr" ref={root}>
      <section className="lr-entry">
        <div className="lr-entry__stars" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></div>
        <div className="lr-entry__copy">
          <p className="lr-kicker lv-mono">live from spotify</p>
          <h2>Listening<br />room<b>.</b></h2>
          <p>My playlists, the artists I return to, and whatever is playing right now.</p>
          <span className="lr-entry__scroll lv-mono">enter the room <ArrowDown /></span>
        </div>
        <div className="lr-turntable" aria-hidden="true">
          <div className="lr-turntable__deck">
            <Groove className="lr-turntable__record" />
            <span className="lr-turntable__arm"><i /></span>
            <span className="lr-turntable__light" />
          </div>
          <SignalLines className="lr-entry__signal" />
        </div>
      </section>

      <section className="lr-playlists">
        <div className="lr-stage">
          <div className="lr-chapter">
            <p className="lr-index lv-mono">01 / playlists</p>
            <h3>My playlists.</h3>
            <p>Every playlist currently published on my Spotify profile.</p>
          </div>
          <div className="lr-shelf">
            <Groove className="lr-shelf__groove" />
            <div className="lr-shelf__track">
              {data.playlists.map((playlist, index) => (
                <a className="lr-playlist" href={playlist.url} target="_blank" rel="noreferrer" key={playlist.id}>
                  <span className="lr-playlist__number lv-mono">{String(index + 1).padStart(2, "0")}</span>
                  <span className="lr-playlist__cover"><Cover src={image(playlist.images)} /><i aria-hidden="true" /></span>
                  <span className="lr-playlist__meta"><strong>{playlist.name}</strong><small className="lv-mono">{playlist.itemCount} tracks</small></span>
                  <ArrowUpRight aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>
          <p className="lr-draghint lv-mono" aria-hidden="true">scroll to move through the shelf</p>
        </div>
      </section>

      <section className="lr-radio">
        <div className="lr-stage lr-radio__stage">
          <div className="lr-chapter">
            <p className="lr-index lv-mono">02 / artists and tracks</p>
            <h3>What I keep coming back to.</h3>
            <div className="lr-period" aria-label="Ranking period">
              {PERIODS.map((item) => <button key={item.id} type="button" className={period === item.id ? "is-active" : ""} onClick={() => setPeriod(item.id)}>{item.label}</button>)}
            </div>
          </div>
          <div className="lr-radio__layout">
            <div className="lr-radio__machine">
              <div className="lr-radio__rings" aria-hidden="true"><i /><i /><i /></div>
              <span className="lr-radio__needle" aria-hidden="true"><i /></span>
              <div className="lr-radio__nodes">
                {artists.map((artist, index) => <RadioNode key={index} artist={artist} rank={index + 1} index={index} />)}
              </div>
              <div className="lr-radio__center"><span className="lv-mono">artists</span><strong>{PERIODS.find((item) => item.id === period)?.label}</strong></div>
            </div>
            <ol className="lr-track-stack">
              {tracks.map((track, index) => (
                <li className="lr-track-card" key={index}>
                  <a href={track.url} target="_blank" rel="noreferrer">
                    <span className="lr-track-card__rank lv-mono">{String(index + 1).padStart(2, "0")}</span>
                    <span className="lr-track-card__cover"><Cover src={image(track.album.images)} /></span>
                    <span><strong>{track.name}</strong><small>{artistNames(track)}</small></span>
                    <ArrowUpRight aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="lr-snapshot">
        <div className="lr-stage lr-snapshot__stage">
          <div className="lr-chapter">
            <p className="lr-index lv-mono">03 / listening lately</p>
            <h3>The last 50 plays.</h3>
          </div>
          <div className="lr-snapshot__layout">
            <div className="lr-clock" aria-label={`Most active listening hour: ${clockHour(data.snapshot.listeningHours)}`}>
              <div className="lr-clock__bars" aria-hidden="true">
                {data.snapshot.listeningHours.map((count, hour) => (
                  <i key={hour} className="lr-clock__bar" style={{ "--lr-hour": hour, "--lr-level": Math.max(0.15, count / maxHour) } as CSSProperties} />
                ))}
              </div>
              <div className="lr-clock__orbit" aria-hidden="true"><i /></div>
              <div className="lr-clock__center">
                <span className="lv-mono">prime hour</span>
                <strong>{clockHour(data.snapshot.listeningHours)}</strong>
                <small>Karachi</small>
              </div>
              <SignalLines />
            </div>
            <div className="lr-stats">
              <article className="lr-stat lr-stat--wide"><span className="lv-mono">top artist</span><strong>{data.snapshot.topArtist?.name ?? "—"}</strong></article>
              <article className="lr-stat"><span className="lv-mono">different artists</span><strong>{data.snapshot.uniqueArtists}</strong></article>
              <article className="lr-stat"><span className="lv-mono">different albums</span><strong>{data.snapshot.uniqueAlbums}</strong></article>
              <article className="lr-stat lr-stat--wide"><span className="lv-mono">most repeated</span><strong>{data.snapshot.repeatedTracks[0]?.track.name ?? data.snapshot.topTrack?.name ?? "—"}</strong></article>
              <article className="lr-stat"><span className="lv-mono">moving up</span><strong>{data.snapshot.movers[0]?.artist.name ?? "—"}</strong></article>
            </div>
          </div>
        </div>
      </section>

      <section className="lr-recent">
        <div className="lr-stage">
          <div className="lr-chapter">
            <p className="lr-index lv-mono">04 / recently played</p>
            <h3>Recently played.</h3>
          </div>
          <div className="lr-recent__space">
            <SignalLines className="lr-recent__beam" />
            <span className="lr-recent__star" aria-hidden="true" />
            <div className="lr-recent__trackline">
              {recent.map((track, index) => (
                <a className="lr-recent-card" href={track.url} target="_blank" rel="noreferrer" key={`${track.id}-${track.playedAt}`}>
                  <span className="lr-recent-card__cover"><Cover src={image(track.album.images)} /></span>
                  <span className="lr-recent-card__copy"><span className="lv-mono">{String(index + 1).padStart(2, "0")}</span><strong>{track.name}</strong><small>{artistNames(track)}</small></span>
                  <ArrowUpRight aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="lr-footer">
        <div className="lr-footer__orb" aria-hidden="true"><Groove /><i /></div>
        <p className="lr-index lv-mono">spotify profile</p>
        <a href={data.profile.url} target="_blank" rel="noreferrer">Open my Spotify <ArrowUpRight aria-hidden="true" /></a>
      </footer>

      <NowPlaying playback={playback.data} />
    </div>
  );
}
