"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import gsap from "gsap";
import { ArrowRight, ArrowUp, ExternalLink, RotateCcw, X } from "lucide-react";
import "./melodymind-search.css";

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

type ProbeResponse = {
  type: "probe";
  query: string;
  message: string;
};

type SearchReadyResponse = {
  type: "search_ready";
  query: string;
  message?: string;
  plan_token: string;
};

type ResultsResponse = {
  type?: "results";
  query: string;
  message?: string;
  results: SongResult[];
  total: number;
};

type PlanResponse = ProbeResponse | SearchReadyResponse;
type LegacySearchResponse = ProbeResponse | ResultsResponse;
type SearchState = "idle" | "thinking" | "probe" | "searching" | "success" | "error";

const EXAMPLES = [
  "A close friendship ended quietly. Neither of us said goodbye.",
  "I got the job. I am walking home alone at midnight and it finally feels real.",
  "I am leaving home for the first time. I am excited, but I do not want to look back."
];

const API_BASE = process.env.NEXT_PUBLIC_MUSIC_API_URL?.replace(/\/$/, "");

function apiUrl(path: "plan" | "search"): string | null {
  if (!API_BASE) return null;
  const root = API_BASE.endsWith("/api") ? API_BASE : `${API_BASE}/api`;
  return `${root}/${path}`;
}

function spotifyUrl(song: SongResult): string {
  return song.spotify_url || `https://open.spotify.com/track/${song.spotify_id}`;
}

function ResultArtwork({ song }: { song: SongResult }) {
  return (
    <span className="mm-result__art" aria-hidden="true">
      {song.artwork ? (
        <img src={song.artwork} alt="" loading="lazy" decoding="async" />
      ) : (
        <span className="mm-result__art-fallback">—</span>
      )}
    </span>
  );
}

function ThinkingDots() {
  return (
    <span className="mm-agent-dots" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

export function MelodyMindSearch() {
  const rootRef = useRef<HTMLElement>(null);
  const initialTextareaRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLElement>(null);
  const requestRef = useRef<AbortController | null>(null);

  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [clarification, setClarification] = useState("");
  const [probeQuestion, setProbeQuestion] = useState("");
  const [agentMessage, setAgentMessage] = useState("");
  const [state, setState] = useState<SearchState>("idle");
  const [results, setResults] = useState<SongResult[]>([]);
  const [error, setError] = useState("");
  const [busySeconds, setBusySeconds] = useState(0);

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
      gsap.fromTo(".mm-result", { opacity: 0, y: 10 }, {
        opacity: 1,
        y: 0,
        duration: 0.32,
        stagger: 0.035,
        ease: "power3.out"
      });
    }, rootRef);

    return () => context.revert();
  }, [state, results]);

  useEffect(() => () => requestRef.current?.abort(), []);

  useEffect(() => {
    const busy = state === "thinking" || state === "searching";
    if (!busy) {
      setBusySeconds(0);
      return;
    }

    const startedAt = Date.now();
    setBusySeconds(0);
    const timer = window.setInterval(() => {
      setBusySeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [state]);

  useEffect(() => {
    if (state === "probe") {
      window.requestAnimationFrame(() => {
        composerRef.current?.focus();
        const thread = threadRef.current;
        if (thread) thread.scrollTo({ top: thread.scrollHeight, behavior: "smooth" });
      });
    }

    if (state === "searching") {
      window.requestAnimationFrame(() => {
        const thread = threadRef.current;
        if (thread) thread.scrollTo({ top: thread.scrollHeight, behavior: "smooth" });
      });
    }

    if (state === "success") {
      window.requestAnimationFrame(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [state]);

  const resizeInitialTextarea = () => {
    const textarea = initialTextareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(260, Math.max(190, textarea.scrollHeight))}px`;
  };

  const resizeComposer = () => {
    const textarea = composerRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(112, Math.max(28, textarea.scrollHeight))}px`;
  };

  const beginAgain = () => {
    requestRef.current?.abort();
    setQuery("");
    setSubmittedQuery("");
    setClarification("");
    setProbeQuestion("");
    setAgentMessage("");
    setResults([]);
    setError("");
    setState("idle");
    window.requestAnimationFrame(() => {
      resizeInitialTextarea();
      initialTextareaRef.current?.focus();
    });
  };

  const showProbe = (payload: ProbeResponse) => {
    setProbeQuestion(payload.message);
    setClarification("");
    setState("probe");
  };

  const showResults = (payload: ResultsResponse) => {
    setAgentMessage(
      payload.message?.trim() || "These are the closest matches I found for what you described."
    );
    setResults(Array.isArray(payload.results) ? payload.results : []);
    setState("success");
  };

  const runLegacyOneShot = async (
    searchEndpoint: string,
    cleanQuery: string,
    cleanClarification: string,
    controller: AbortController
  ) => {
    const response = await fetch(searchEndpoint, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        query: cleanQuery,
        limit: 10,
        ...(cleanClarification ? { clarification: cleanClarification } : {})
      }),
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`Search failed with status ${response.status}`);
    const payload = await response.json() as LegacySearchResponse;
    if (payload.type === "probe") {
      showProbe(payload);
      return;
    }
    showResults(payload);
  };

  const submit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const answeringProbe = state === "probe";
    if (state !== "idle" && !answeringProbe) return;

    const cleanQuery = answeringProbe ? submittedQuery.trim() : query.trim();
    const cleanClarification = answeringProbe ? clarification.trim() : "";
    if (cleanQuery.length < 4) return;
    if (answeringProbe && !cleanClarification) return;

    const planEndpoint = apiUrl("plan");
    const searchEndpoint = apiUrl("search");
    if (!planEndpoint || !searchEndpoint) {
      if (!answeringProbe) setSubmittedQuery(cleanQuery);
      setResults([]);
      setError("The search server is not connected to this build.");
      setState("error");
      return;
    }

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    if (!answeringProbe) {
      setSubmittedQuery(cleanQuery);
      setProbeQuestion("");
      setClarification("");
    }
    setAgentMessage("");
    setResults([]);
    setError("");

    // This state means exactly one thing: the agent decision/query planning call
    // is in flight. It never implies that catalogue retrieval has started.
    setState("thinking");

    try {
      const planResponse = await fetch(planEndpoint, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          query: cleanQuery,
          ...(answeringProbe ? { clarification: cleanClarification } : {})
        }),
        signal: controller.signal
      });

      // During rollout an older Worker may not have /api/plan yet. In that case
      // keep the UI in the neutral planning state and use the old one-shot route;
      // it still cannot falsely claim that a search has begun before a probe.
      if (planResponse.status === 404) {
        await runLegacyOneShot(
          searchEndpoint,
          cleanQuery,
          cleanClarification,
          controller
        );
        return;
      }
      if (!planResponse.ok) {
        throw new Error(`Planning failed with status ${planResponse.status}`);
      }

      const plan = await planResponse.json() as PlanResponse;
      if (plan.type === "probe") {
        showProbe(plan);
        return;
      }
      if (plan.type !== "search_ready" || !plan.plan_token) {
        throw new Error("Invalid MelodyMind plan response");
      }

      // Only a real search_ready response is allowed to move the UI into the
      // search state. From this point retrieval/rank fusion/reranking is real.
      setState("searching");
      const searchResponse = await fetch(searchEndpoint, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ plan_token: plan.plan_token, limit: 10 }),
        signal: controller.signal
      });
      if (!searchResponse.ok) {
        throw new Error(`Search failed with status ${searchResponse.status}`);
      }
      const resultsPayload = await searchResponse.json() as ResultsResponse;
      showResults(resultsPayload);
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setError("I couldn’t complete that search. Try again in a moment.");
      setState("error");
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
    }
  };

  const handleInitialKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      void submit();
    }
  };

  const handleComposerKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  };

  const isBusy = state === "thinking" || state === "searching";
  const busyLabel = state === "searching"
    ? "Searching and ranking matches…"
    : clarification
      ? "Preparing your search from that answer…"
      : "Understanding your request…";

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
            <span>{state === "idle" ? "SEARCH BY SITUATION" : "AGENT SESSION"}</span>
          </div>
          {state !== "idle" && (
            <button className="mm-top-reset" type="button" onClick={beginAgain}>
              <RotateCcw aria-hidden="true" />
              New search
            </button>
          )}
        </header>

        {state === "idle" ? (
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
                ref={initialTextareaRef}
                id="melodymind-query"
                value={query}
                maxLength={500}
                rows={6}
                placeholder="A sad song about losing a friend feels different from a sad song about a breakup. Tell MelodyMind what actually happened."
                onChange={(event) => {
                  setQuery(event.target.value);
                  resizeInitialTextarea();
                }}
                onKeyDown={handleInitialKey}
                autoFocus
              />
              <div className="mm-query-card__action">
                <span className="lv-mono">CTRL + ENTER</span>
                <button type="submit" disabled={query.trim().length < 4}>
                  Ask MelodyMind
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
                          resizeInitialTextarea();
                          initialTextareaRef.current?.focus();
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
        ) : (
          <div className="mm-agent-screen">
            <div
              ref={threadRef}
              className="mm-thread"
              data-lenis-prevent
              data-lenis-prevent-wheel
              aria-live="polite"
            >
              <div className="mm-thread__inner">
                <article className="mm-turn mm-turn--user">
                  <span className="mm-turn__role lv-mono">YOU</span>
                  <p>{submittedQuery}</p>
                </article>

                {probeQuestion && (
                  <article className="mm-turn mm-turn--assistant">
                    <span className="mm-turn__role lv-mono">MELODYMIND</span>
                    <p>{probeQuestion}</p>
                  </article>
                )}

                {clarification && state !== "probe" && (
                  <article className="mm-turn mm-turn--user mm-turn--followup">
                    <span className="mm-turn__role lv-mono">YOU</span>
                    <p>{clarification}</p>
                  </article>
                )}

                {isBusy && (
                  <article className="mm-turn mm-turn--assistant mm-turn--status" role="status">
                    <span className="mm-turn__role lv-mono">MELODYMIND</span>
                    <div className="mm-agent-status">
                      <ThinkingDots />
                      <span>{busyLabel} · {busySeconds}s</span>
                    </div>
                  </article>
                )}

                {state === "error" && (
                  <article className="mm-turn mm-turn--assistant mm-turn--error" role="alert">
                    <span className="mm-turn__role lv-mono">MELODYMIND</span>
                    <div>
                      <p>{error}</p>
                      <button type="button" onClick={beginAgain}>Start over</button>
                    </div>
                  </article>
                )}

                {state === "success" && (
                  <>
                    <article className="mm-turn mm-turn--assistant">
                      <span className="mm-turn__role lv-mono">MELODYMIND</span>
                      <p>{agentMessage}</p>
                    </article>

                    <section ref={resultsRef} className="mm-agent-results" aria-label="Song results">
                      <header>
                        <div>
                          <span className="lv-mono">MATCHING TRACKS</span>
                          <strong>{results.length}</strong>
                        </div>
                        <span className="lv-mono">TITLE / ARTIST / ALBUM</span>
                      </header>

                      {results.length > 0 ? (
                        <ol className="mm-result-list" aria-label="Matching tracks">
                          {results.map((song, index) => (
                            <li className="mm-result" key={song.track_id}>
                              <span className="mm-result__number lv-mono">{String(index + 1).padStart(2, "0")}</span>
                              <ResultArtwork song={song} />
                              <span className="mm-result__track">
                                <strong>{song.title}</strong>
                                <small>{song.artist}</small>
                              </span>
                              <span className="mm-result__album">{song.album || "—"}</span>
                              {song.spotify_id ? (
                                <a
                                  className="mm-result__open"
                                  href={spotifyUrl(song)}
                                  target="_blank"
                                  rel="noreferrer"
                                  aria-label={`Open ${song.title} on Spotify`}
                                  title="Open on Spotify"
                                >
                                  <ExternalLink aria-hidden="true" />
                                </a>
                              ) : <span />}
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <div className="mm-no-results">
                          <p>No songs came back for this wording.</p>
                          <button type="button" onClick={beginAgain}>Try another situation</button>
                        </div>
                      )}
                    </section>
                  </>
                )}
              </div>
            </div>

            <footer className="mm-agent-footer">
              <div className="mm-agent-footer__inner">
                {state === "probe" && (
                  <form className="mm-agent-composer" onSubmit={submit}>
                    <textarea
                      ref={composerRef}
                      value={clarification}
                      rows={1}
                      maxLength={500}
                      aria-label="Reply to MelodyMind"
                      placeholder="Reply to MelodyMind…"
                      onChange={(event) => {
                        setClarification(event.target.value);
                        resizeComposer();
                      }}
                      onKeyDown={handleComposerKey}
                    />
                    <button type="submit" disabled={!clarification.trim()} aria-label="Send reply">
                      <ArrowUp aria-hidden="true" />
                    </button>
                    <span className="mm-agent-composer__hint lv-mono">ENTER TO SEND · SHIFT + ENTER FOR NEW LINE</span>
                  </form>
                )}

                {isBusy && (
                  <div className="mm-agent-waiting">
                    <span>{busyLabel} · {busySeconds}s</span>
                    <button type="button" onClick={beginAgain} aria-label="Cancel search">
                      <X aria-hidden="true" />
                    </button>
                  </div>
                )}

                {(state === "success" || state === "error") && (
                  <div className="mm-agent-finish">
                    <span>Want to try a different situation?</span>
                    <button type="button" onClick={beginAgain}>
                      <RotateCcw aria-hidden="true" />
                      New search
                    </button>
                  </div>
                )}
              </div>
            </footer>
          </div>
        )}
      </div>
    </section>
  );
}
