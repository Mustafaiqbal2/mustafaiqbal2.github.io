"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowUpRight, Headphones, RefreshCw } from "lucide-react";
import { useListeningRoom } from "./useListeningRoom";
import type { Art, Artist, Playback, TimeRange, Track } from "./types";
import "./listening-room.css";

gsap.registerPlugin(ScrollTrigger);

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
  const suffix = hour >= 12 ? "PM" : "AM";
  const value = hour % 12 || 12;
  return `${value} ${suffix}`;
}

function Cover({ src, alt }: { src?: string; alt: string }) {
  return src ? <img src={src} alt={alt} loading="lazy" /> : <span aria-hidden="true">♪</span>;
}

function NowPlaying({ playback }: { playback: Playback | null }) {
  const track = playback?.track;
  if (!track) return null;

  return (
    <a className="lr-now" href={track.url} target="_blank" rel="noreferrer">
      <span className="lr-now__cover">
        <Cover src={image(track.album.images)} alt="" />
      </span>
      <span className="lr-now__copy">
        <span className="lr-now__state lv-mono">
          {playback?.isPlaying ? "playing now" : "played recently"}
        </span>
        <strong>{track.name}</strong>
        <span>{artistNames(track)}</span>
      </span>
      <span className={`lr-eq ${playback?.isPlaying ? "lr-eq--live" : ""}`} aria-hidden="true">
        <i /><i /><i /><i />
      </span>
    </a>
  );
}

function ArtistCard({ artist, rank }: { artist: Artist; rank: number }) {
  return (
    <a className="lr-artist" href={artist.url} target="_blank" rel="noreferrer">
      <span className="lr-artist__rank lv-mono">{String(rank).padStart(2, "0")}</span>
      <span className="lr-artist__portrait">
        <Cover src={image(artist.images)} alt="" />
      </span>
      <strong>{artist.name}</strong>
      <ArrowUpRight aria-hidden="true" />
    </a>
  );
}

export function ListeningRoom({ active }: { active: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const [period, setPeriod] = useState<TimeRange>("short");
  const { room, playback, refresh } = useListeningRoom(active);
  const data = room.data;

  useLayoutEffect(() => {
    if (!active || !data || !root.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      const sections = gsap.utils.toArray<HTMLElement>(".lr-section", root.current);
      sections.forEach((section) => {
        gsap.from(section.querySelectorAll(".lr-reveal"), {
          opacity: 0,
          y: 32,
          duration: 0.75,
          stagger: 0.055,
          ease: "power3.out",
          scrollTrigger: { trigger: section, start: "top 82%", once: true }
        });
      });
    }, root);
    return () => ctx.revert();
  }, [active, data?.generatedAt]);

  const recent = useMemo(() => data?.recent.slice(0, 12) ?? [], [data]);
  const artists = data?.topArtists[period].slice(0, 8) ?? [];
  const tracks = data?.topTracks[period].slice(0, 8) ?? [];

  if (room.status === "idle" || (room.status === "loading" && !data)) {
    return (
      <section className="lr lr--loading" aria-live="polite">
        <div className="lr-loader"><i /><i /><i /><i /><i /></div>
        <p className="lv-mono">opening the listening room</p>
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

  return (
    <div className="lr" ref={root}>
      <header className="lr-intro">
        <p className="lr-kicker lv-mono">live from spotify</p>
        <h2>Listening room<b>.</b></h2>
        <p>My playlists, the artists I keep returning to, and whatever is playing right now.</p>
        <div className="lr-intro__disc" aria-hidden="true"><i /></div>
      </header>

      <section className="lr-section lr-playlists" aria-labelledby="lr-playlists-title">
        <div className="lr-heading lr-reveal">
          <p className="lr-index lv-mono">01 / playlists</p>
          <h3 id="lr-playlists-title">My playlists.</h3>
        </div>
        <div className="lr-shelf">
          {data.playlists.slice(0, 10).map((playlist, index) => (
            <a className="lr-playlist lr-reveal" href={playlist.url} target="_blank" rel="noreferrer" key={playlist.id}>
              <span className="lr-playlist__cover">
                <Cover src={image(playlist.images)} alt="" />
                <span className="lr-playlist__shine" aria-hidden="true" />
              </span>
              <strong>{playlist.name}</strong>
              <span className="lv-mono">{playlist.itemCount} tracks</span>
            </a>
          ))}
        </div>
      </section>

      <section className="lr-section lr-rankings" aria-labelledby="lr-artists-title">
        <div className="lr-heading lr-reveal">
          <p className="lr-index lv-mono">02 / artists and tracks</p>
          <h3 id="lr-artists-title">Artists and songs.</h3>
          <div className="lr-period" aria-label="Ranking period">
            {PERIODS.map((item) => (
              <button key={item.id} type="button" className={period === item.id ? "is-active" : ""} onClick={() => setPeriod(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="lr-rankings__grid">
          <div className="lr-artists">
            {artists.map((artist, index) => <ArtistCard artist={artist} rank={index + 1} key={artist.id} />)}
          </div>
          <ol className="lr-tracks">
            {tracks.map((track, index) => (
              <li className="lr-reveal" key={track.id}>
                <a href={track.url} target="_blank" rel="noreferrer">
                  <span className="lr-track__rank lv-mono">{String(index + 1).padStart(2, "0")}</span>
                  <span className="lr-track__cover"><Cover src={image(track.album.images)} alt="" /></span>
                  <span><strong>{track.name}</strong><small>{artistNames(track)}</small></span>
                  <ArrowUpRight aria-hidden="true" />
                </a>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="lr-section lr-snapshot" aria-labelledby="lr-snapshot-title">
        <div className="lr-heading lr-reveal">
          <p className="lr-index lv-mono">03 / snapshot</p>
          <h3 id="lr-snapshot-title">Listening lately.</h3>
        </div>
        <div className="lr-stats">
          <article className="lr-stat lr-stat--wide lr-reveal">
            <span className="lv-mono">top artist</span>
            <strong>{data.snapshot.topArtist?.name ?? "—"}</strong>
          </article>
          <article className="lr-stat lr-reveal">
            <span className="lv-mono">different artists</span>
            <strong>{data.snapshot.uniqueArtists}</strong>
          </article>
          <article className="lr-stat lr-reveal">
            <span className="lv-mono">different albums</span>
            <strong>{data.snapshot.uniqueAlbums}</strong>
          </article>
          <article className="lr-stat lr-reveal">
            <span className="lv-mono">prime hour</span>
            <strong>{clockHour(data.snapshot.listeningHours)}</strong>
          </article>
          <article className="lr-stat lr-stat--wide lr-reveal">
            <span className="lv-mono">most repeated</span>
            <strong>{data.snapshot.repeatedTracks[0]?.track.name ?? data.snapshot.topTrack?.name ?? "—"}</strong>
          </article>
          <article className="lr-stat lr-reveal">
            <span className="lv-mono">moving up</span>
            <strong>{data.snapshot.movers[0]?.artist.name ?? "—"}</strong>
          </article>
        </div>
      </section>

      <section className="lr-section lr-recent" aria-labelledby="lr-recent-title">
        <div className="lr-heading lr-reveal">
          <p className="lr-index lv-mono">04 / recently played</p>
          <h3 id="lr-recent-title">Recently played.</h3>
        </div>
        <div className="lr-recent__list">
          {recent.map((track, index) => (
            <a className="lr-recent__track lr-reveal" href={track.url} target="_blank" rel="noreferrer" key={`${track.id}-${track.playedAt}`}>
              <span className="lv-mono">{String(index + 1).padStart(2, "0")}</span>
              <span className="lr-recent__cover"><Cover src={image(track.album.images)} alt="" /></span>
              <span><strong>{track.name}</strong><small>{artistNames(track)}</small></span>
              <ArrowUpRight aria-hidden="true" />
            </a>
          ))}
        </div>
      </section>

      <footer className="lr-footer lr-section">
        <p className="lv-mono lr-reveal">spotify profile</p>
        <a className="lr-footer__cta lr-reveal" href={data.profile.url} target="_blank" rel="noreferrer">
          Open my Spotify <ArrowUpRight aria-hidden="true" />
        </a>
      </footer>

      <NowPlaying playback={playback.data} />
    </div>
  );
}
