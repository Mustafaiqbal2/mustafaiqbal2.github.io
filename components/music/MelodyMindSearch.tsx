"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import gsap from "gsap";
import { ArrowRight, RotateCcw, Search, X } from "lucide-react";
import "./melodymind-search.css";
import "./melodymind-results.css";

type SongResult = {
  track_id: string;
  title: string;
  artist: string;
  spotify_id?: string | null;
  album?: string | null;
  artwork?: string | null;
  spotify_url?: string | null;
  score: number;
};

type SearchResponse = {
  query: string;
  results: SongResult[];
  total: number;
};

type SearchState = "idle" | "loading" | "success" | "error";

const EXAMPLES = [
  "A close friendship ended quietly. Neither of us said goodbye.",
  "I got the job. I am walking home alone at midnight and it finally feels real.",
  "I am leaving home for the first time. I am excited, but I do not want to look back."
];

const API_BASE = process.env.NEXT_PUBLIC_MUSIC_API_URL?.replace(/\/$/, "");

function searchUrl(): string | null {
  if (!API_BASE) return null;
  return API_BASE.endsWith("/api") ? `${API_BASE}/search` : `${API_BASE}/api/search`;
}

function spotifyUrl(song: SongResult): string {
  return song.spotify_url || `https://open.spotify.com/track/${song.spotify_id}`;
}

function ResultArtwork({ song }: { song: SongResult }) {
  return (
    <span className="mm-result__art" aria-hidden="true">
      {song.artwork ? (
        <img src={song.artwork} alt="" loading="eager" decoding="async" />
      ) : (
        <span className="mm-result__art-fallback">M</span>
      )}
    </span>
  );
}

function SpotifyMark() {
  return (
    <span className="mm-result__spotify" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="11" fill="currentColor" />
        <path d="M6.7 9.1c3.6-1.05 7.7-.72 10.75.86" stroke="#0b0b0b" strokeWidth="1.45" strokeLinecap="round" />
        <path d="M7.35 12.15c3.05-.82 6.45-.55 9.1.74" stroke="#0b0b0b" strokeWidth="1.35" strokeLinecap="round" />
        <path d="M7.95 15.05c2.5-.6 5.2-.38 7.45.68" stroke="#0b0b0b" strokeWidth="1.25" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function MelodyMindSearch() {
  const rootRef = useRef<HTMLElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [state, setState] = useState<SearchState>("idle");
  const [results, setResults] = useState<SongResult[]>([]);
  const [error, setError] = useState("");

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const context = gsap.context(() => {
      const intro = gsap.timeline({ defaults: { ease: "power3.out" } });
      intro
        .fromTo(".mm-console", { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.7 })
        .fromTo(".mm-console__topbar > *", { opacity: 0, y: 8 }, {
          opacity: 1,
          y: 0,
          duration: 0.38,
          stagger: 0.06
        }, 0.18)
        .fromTo(".mm-intro > *", { opacity: 0, y: 16 }, {
          opacity: 1,
          y: 0,
          duration: 0.48,
          stagger: 0.07
        }, 0.26)
        .fromTo(".mm-query-card", { opacity: 0, x: 24 }, {
          opacity: 1,
          x: 0,
          duration: 0.62
        }, 0.34);
    }, root);

    return () => context.revert();
  }, []);

  useEffect(() => {
    if (state !== "success" || !rootRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const context = gsap.context(() => {
      const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
      timeline
        .fromTo(".mm-results-query > *", { opacity: 0, y: 14 }, {
          opacity: 1,
          y: 0,
          duration: 0.34,
          stagger: 0.035
        }, 0)
        .fromTo(".mm-results-panel > header", { opacity: 0, y: 10 }, {
          opacity: 1,
          y: 0,
          duration: 0.32
        }, 0.05)
        .fromTo(".mm-result", { opacity: 0, y: 10 }, {
          opacity: 1,
          y: 0,
          duration: 0.3,
          stagger: 0.024
        }, 0.1);
    }, rootRef);

    return () => context.revert();
  }, [state, results]);

  useEffect(() => () => requestRef.current?.abort(), []);

  const resizeTextarea = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(260, Math.max(190, textarea.scrollHeight))}px`;
  };

  const beginAgain = () => {
    requestRef.current?.abort();
    setQuery("");
    setSubmittedQuery("");
    setResults([]);
    setError("");
    setState("idle");
    window.requestAnimationFrame(() => {
      resizeTextarea();
      textareaRef.current?.focus();
    });
  };

  const submit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const cleanQuery = query.trim();
    if (cleanQuery.length < 4 || state === "loading") return;

    const endpoint = searchUrl();
    if (!endpoint) {
      setSubmittedQuery(cleanQuery);
      setResults([]);
      setError("The search server is not connected to this build.");
      setState("error");
      return;
    }

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setSubmittedQuery(cleanQuery);
    setResults([]);
    setError("");
    setState("loading");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ query: cleanQuery, limit: 10 }),
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`Search failed with status ${response.status}`);
      const payload = await response.json() as SearchResponse;
      setResults(Array.isArray(payload.results) ? payload.results : []);
      setState("success");
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setError("The search could not be completed. Try again.");
      setState("error");
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
    }
  };

  const handleComposerKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <section ref={rootRef} className="mm-product" aria-label="MelodyMind search">
      <div className="mm-console" data-state={state}>
        <header className="mm-console__topbar">
          <div className="mm-wordmark" aria-label="MelodyMind">
            <span className="mm-wordmark__note" aria-hidden="true">♪</span>
            <strong>MELODYMIND</strong>
          </div>
          <div className="mm-console__mode">
            <i aria-hidden="true" />
            <span>SEARCH BY SITUATION</span>
          </div>
          {state !== "idle" && (
            <button className="mm-top-reset" type="button" onClick={beginAgain}>
              <RotateCcw aria-hidden="true" />
              New search
            </button>
          )}
        </header>

        {state === "idle" && (
          <div className="mm-search-screen">
            <div className="mm-intro">
              <span className="mm-intro__index lv-mono">TEXT SEARCH</span>
              <h2>Find music for what actually happened.</h2>
              <p>
                Write the event, the people, and the feeling in one sentence. MelodyMind searches for songs that fit the complete situation.
              </p>
              <div className="mm-intro__rule" aria-hidden="true"><i /></div>
            </div>

            <form className="mm-query-card" onSubmit={submit}>
              <div className="mm-query-card__head">
                <label htmlFor="melodymind-query">Describe the situation</label>
                <span className="lv-mono">{query.length} / 500</span>
              </div>
              <textarea
                ref={textareaRef}
                id="melodymind-query"
                value={query}
                maxLength={500}
                rows={6}
                placeholder="A sad song about losing a friend feels different from a sad song about a breakup. Tell MelodyMind what actually happened."
                onChange={(event) => {
                  setQuery(event.target.value);
                  resizeTextarea();
                }}
                onKeyDown={handleComposerKey}
                autoFocus
              />
              <div className="mm-query-card__action">
                <span className="lv-mono">CTRL + ENTER</span>
                <button type="submit" disabled={query.trim().length < 4}>
                  Find songs
                  <ArrowRight aria-hidden="true" />
                </button>
              </div>

              <div className="mm-examples">
                <span className="lv-mono">OR START HERE</span>
                <div>
                  {EXAMPLES.map((example, index) => (
                    <button
                      type="button"
                      key={example}
                      onClick={() => {
                        setQuery(example);
                        window.requestAnimationFrame(() => {
                          resizeTextarea();
                          textareaRef.current?.focus();
                        });
                      }}
                    >
                      <span className="lv-mono">{String(index + 1).padStart(2, "0")}</span>
                      <span>{example}</span>
                    </button>
                  ))}
                </div>
              </div>
            </form>
          </div>
        )}

        {state === "loading" && (
          <div className="mm-status-screen" role="status" aria-live="polite">
            <div className="mm-search-mark" aria-hidden="true">
              <Search />
              <i />
              <i />
            </div>
            <span className="lv-mono">FINDING SONGS</span>
            <h2>{submittedQuery}</h2>
            <button className="mm-cancel" type="button" onClick={beginAgain}>
              <X aria-hidden="true" /> Cancel
            </button>
          </div>
        )}

        {state === "error" && (
          <div className="mm-status-screen mm-status-screen--error" role="alert">
            <span className="lv-mono">SEARCH UNAVAILABLE</span>
            <h2>{submittedQuery}</h2>
            <p>{error}</p>
            <button type="button" onClick={() => setState("idle")}>Return to the search</button>
          </div>
        )}

        {state === "success" && (
          <div className="mm-results-screen">
            <aside className="mm-results-query">
              <span className="lv-mono">YOU SEARCHED FOR</span>
              <h2>{submittedQuery}</h2>
              <button type="button" onClick={beginAgain}>
                <RotateCcw aria-hidden="true" /> Change the situation
              </button>
            </aside>

            <section className="mm-results-panel" aria-label="Song results">
              <header>
                <div>
                  <span className="lv-mono">MATCHING TRACKS</span>
                  <strong>{results.length}</strong>
                </div>
                <span className="mm-results-panel__hint lv-mono">SCROLL RESULTS ↓</span>
              </header>

              {results.length > 0 ? (
                <ol
                  className="mm-result-list"
                  tabIndex={0}
                  data-lenis-prevent
                  data-lenis-prevent-wheel
                  aria-label="Matching tracks. Scroll to see all results."
                >
                  {results.map((song, index) => {
                    const canOpen = Boolean(song.spotify_url || song.spotify_id);
                    const content = (
                      <>
                        <span className="mm-result__number lv-mono">{String(index + 1).padStart(2, "0")}</span>
                        <ResultArtwork song={song} />
                        <span className="mm-result__track">
                          <strong>{song.title}</strong>
                          <span className="mm-result__meta">
                            <small>{song.artist}</small>
                            {song.album && <><i aria-hidden="true">·</i><small>{song.album}</small></>}
                          </span>
                        </span>
                        {canOpen ? <SpotifyMark /> : <span className="mm-result__spotify mm-result__spotify--disabled" aria-hidden="true" />}
                      </>
                    );

                    return (
                      <li className="mm-result" key={song.track_id}>
                        {canOpen ? (
                          <a
                            className="mm-result__link"
                            href={spotifyUrl(song)}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Open ${song.title} by ${song.artist} in Spotify`}
                          >
                            {content}
                          </a>
                        ) : (
                          <div className="mm-result__link mm-result__link--disabled">{content}</div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <div className="mm-no-results">
                  <p>No songs came back for this wording.</p>
                  <button type="button" onClick={() => setState("idle")}>Change the situation</button>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </section>
  );
}
