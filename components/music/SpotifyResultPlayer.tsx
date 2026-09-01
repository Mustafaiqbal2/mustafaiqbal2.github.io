"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from "react";
import { ExternalLink } from "lucide-react";

export type PlayerSong = {
  track_id: string;
  spotify_id?: string | null;
  spotify_url?: string | null;
  title: string;
  artist: string;
  album?: string | null;
  artwork?: string | null;
};

export type PlaybackSignal = {
  action: "start" | "meaningful" | "engaged" | "majority" | "replay" | "quick_skip";
  song: PlayerSong;
  position_ms: number;
  duration_ms: number;
};

export type SpotifyResultPlayerHandle = {
  play(song: PlayerSong): void;
};

type PlaybackData = {
  playingURI?: string;
  isPaused?: boolean;
  isBuffering?: boolean;
  duration?: number;
  position?: number;
};

type EmbedController = {
  addListener(name: "ready" | "playback_started" | "playback_update", listener: (event: { data: PlaybackData }) => void): void;
  loadEntity(uri: string, preferVideo?: boolean, startAt?: number): void;
  play(): void;
  destroy(): void;
};

type SpotifyIframeApi = {
  createController(
    element: HTMLElement,
    options: { uri: string; width: string | number; height: number },
    callback: (controller: EmbedController) => void
  ): void;
};

declare global {
  interface Window {
    SpotifyIframeApi?: SpotifyIframeApi;
    onSpotifyIframeApiReady?: (api: SpotifyIframeApi) => void;
  }
}

let spotifyApiPromise: Promise<SpotifyIframeApi> | null = null;

function loadSpotifyApi(): Promise<SpotifyIframeApi> {
  if (window.SpotifyIframeApi) return Promise.resolve(window.SpotifyIframeApi);
  if (spotifyApiPromise) return spotifyApiPromise;

  spotifyApiPromise = new Promise<SpotifyIframeApi>((resolve, reject) => {
    const previous = window.onSpotifyIframeApiReady;
    window.onSpotifyIframeApiReady = (api) => {
      window.SpotifyIframeApi = api;
      previous?.(api);
      resolve(api);
    };

    const existing = document.querySelector<HTMLScriptElement>("script[data-spotify-iframe-api]");
    if (existing) {
      existing.addEventListener("error", () => reject(new Error("Spotify player failed to load")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://open.spotify.com/embed/iframe-api/v1";
    script.async = true;
    script.dataset.spotifyIframeApi = "true";
    script.addEventListener("error", () => reject(new Error("Spotify player failed to load")), { once: true });
    document.body.appendChild(script);
  }).catch((error) => {
    spotifyApiPromise = null;
    throw error;
  });
  return spotifyApiPromise;
}

function uri(song: PlayerSong): string {
  if (song.spotify_id) return `spotify:track:${song.spotify_id}`;
  const trackId = song.spotify_url?.match(/open\.spotify\.com\/track\/([^?/#]+)/)?.[1];
  return trackId ? `spotify:track:${trackId}` : "";
}

function externalUrl(song: PlayerSong): string {
  return song.spotify_url || `https://open.spotify.com/track/${song.spotify_id}`;
}

type PlaybackSession = {
  song: PlayerSong;
  started: boolean;
  lastPosition: number;
  replayCount: number;
  maxPosition: number;
  duration: number;
  milestones: Set<string>;
};

function session(song: PlayerSong): PlaybackSession {
  return {
    song,
    started: false,
    lastPosition: 0,
    replayCount: 0,
    maxPosition: 0,
    duration: 0,
    milestones: new Set<string>()
  };
}

export const SpotifyResultPlayer = forwardRef<SpotifyResultPlayerHandle, {
  initialSong: PlayerSong;
  onSignal(signal: PlaybackSignal): void;
}>(function SpotifyResultPlayer({ initialSong, onSignal }, forwardedRef) {
  const mountRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<EmbedController | null>(null);
  const activeSongRef = useRef<PlayerSong>(initialSong);
  const playbackRef = useRef<PlaybackSession>(session(initialSong));
  const signalRef = useRef(onSignal);
  const pendingRef = useRef<PlayerSong | null>(null);
  const [activeSong, setActiveSong] = useState(initialSong);
  const [playerError, setPlayerError] = useState(false);

  signalRef.current = onSignal;

  const emit = (action: PlaybackSignal["action"], state = playbackRef.current) => {
    signalRef.current({
      action,
      song: state.song,
      position_ms: Math.round(state.maxPosition),
      duration_ms: Math.round(state.duration)
    });
  };

  const finishPrevious = (next: PlayerSong) => {
    const current = playbackRef.current;
    if (
      current.song.track_id !== next.track_id
      && current.started
      && current.maxPosition > 0
      && current.maxPosition < 8_000
      && !current.milestones.has("quick_skip")
    ) {
      current.milestones.add("quick_skip");
      emit("quick_skip", current);
    }
  };

  const loadAndPlay = (song: PlayerSong) => {
    if (!song.spotify_id) return;
    finishPrevious(song);
    activeSongRef.current = song;
    playbackRef.current = session(song);
    setActiveSong(song);
    const controller = controllerRef.current;
    if (!controller) {
      pendingRef.current = song;
      return;
    }
    controller.loadEntity(uri(song));
    controller.play();
  };

  useImperativeHandle(forwardedRef, () => ({ play: loadAndPlay }));

  useEffect(() => {
    if (initialSong.track_id === activeSongRef.current.track_id) return;
    finishPrevious(initialSong);
    activeSongRef.current = initialSong;
    playbackRef.current = session(initialSong);
    setActiveSong(initialSong);
    controllerRef.current?.loadEntity(uri(initialSong));
  }, [initialSong]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !initialSong.spotify_id) return;
    let disposed = false;

    void loadSpotifyApi().then((api) => {
      if (disposed) return;
      api.createController(
        mount,
        { uri: uri(initialSong), width: "100%", height: 80 },
        (controller) => {
          if (disposed) {
            controller.destroy();
            return;
          }
          controllerRef.current = controller;
          setPlayerError(false);

          controller.addListener("playback_started", () => {
            const current = playbackRef.current;
            if (!current.started) {
              current.started = true;
              emit("start", current);
            }
          });

          controller.addListener("playback_update", (event) => {
            const current = playbackRef.current;
            const position = Math.max(0, Number(event.data.position || 0));
            const duration = Math.max(0, Number(event.data.duration || 0));
            if (
              current.started
              && current.lastPosition >= 15_000
              && position <= 3_000
              && current.lastPosition - position >= 10_000
            ) {
              current.replayCount += 1;
              emit("replay", current);
            }
            current.lastPosition = position;
            current.maxPosition = Math.max(current.maxPosition, position);
            current.duration = Math.max(current.duration, duration);

            const ratio = current.duration > 0 ? current.maxPosition / current.duration : 0;
            if (current.maxPosition >= 15_000 && !current.milestones.has("meaningful")) {
              current.milestones.add("meaningful");
              emit("meaningful", current);
            }
            if (
              (current.maxPosition >= 30_000 || ratio >= 0.35)
              && !current.milestones.has("engaged")
            ) {
              current.milestones.add("engaged");
              emit("engaged", current);
            }
            if (ratio >= 0.7 && !current.milestones.has("majority")) {
              current.milestones.add("majority");
              emit("majority", current);
            }
          });

          const pending = pendingRef.current;
          if (pending) {
            pendingRef.current = null;
            controller.loadEntity(uri(pending));
            controller.play();
          }
        }
      );
    }).catch(() => setPlayerError(true));

    return () => {
      disposed = true;
      controllerRef.current?.destroy();
      controllerRef.current = null;
    };
  }, []);

  return (
    <section className="mm-player" aria-label="MelodyMind player">
      <div className="mm-player__identity">
        <span className="mm-player__art" aria-hidden="true">
          {activeSong.artwork ? <img src={activeSong.artwork} alt="" /> : <i />}
        </span>
        <span className="mm-player__copy">
          <small className="lv-mono">NOW IN THE PLAYER</small>
          <strong>{activeSong.title}</strong>
          <span>{activeSong.artist}</span>
        </span>
        <a
          className="mm-player__external"
          data-track-id={activeSong.track_id}
          data-spotify-id={activeSong.spotify_id || undefined}
          data-track-title={activeSong.title}
          data-track-artist={activeSong.artist}
          href={externalUrl(activeSong)}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open ${activeSong.title} on Spotify`}
          title="Open on Spotify"
        >
          <ExternalLink aria-hidden="true" />
        </a>
      </div>
      <div className="mm-player__embed" ref={mountRef}>
        {playerError && <span>Spotify playback is unavailable in this browser.</span>}
      </div>
    </section>
  );
});
