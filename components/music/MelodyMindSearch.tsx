"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import gsap from "gsap";
import { ArrowRight, ArrowUp, ExternalLink, Play, RotateCcw, X } from "lucide-react";
import {
  SpotifyResultPlayer,
  type PlaybackSignal,
  type SpotifyResultPlayerHandle
} from "./SpotifyResultPlayer";
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
  conversation_token?: string;
};

type SearchReadyResponse = {
  type: "search_ready";
  query: string;
  message?: string;
  summary?: string;
  plan_token: string;
};

type ReplyResponse = {
  type: "reply";
  query: string;
  message: string;
  conversation_token: string;
};

type ResultsResponse = {
  type?: "results";
  query: string;
  message?: string;
  results: SongResult[];
  total: number;
  conversation_token?: string;
};

type PlanResponse = ProbeResponse | SearchReadyResponse | ReplyResponse;
type LegacySearchResponse = ProbeResponse | ResultsResponse;
type SearchState = "idle" | "thinking" | "probe" | "searching" | "success" | "error";
type Feedback = "hit" | "miss" | "";
type SessionTurn = { id: number; role: "user" | "assistant"; text: string };

const EXAMPLES = [
  "My friends moved away. I feel left behind. Let me feel it, then help me move forward. No slow piano songs.",
  "Political, soul-sampled rap. Catchy and upbeat. The politics need to be in the lyrics.",
  "I have a 5k in an hour. Give me something fast that makes me want to start running. No metal."
];

const API_BASE = process.env.NEXT_PUBLIC_MUSIC_API_URL?.replace(/\/$/, "");

function apiUrl(path: "plan" | "search" | "analytics/event"): string | null {
  if (!API_BASE) return null;
  const root = API_BASE.endsWith("/api") ? API_BASE : `${API_BASE}/api`;
  return `${root}/${path}`;
}

function newSearchId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `search_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
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
  const playerRef = useRef<SpotifyResultPlayerHandle>(null);
  const requestRef = useRef<AbortController | null>(null);
  const previousSearchIdRef = useRef("");
  const attemptRef = useRef(0);
  const startedAtRef = useRef(0);
  const probeShownAtRef = useRef(0);
  const stateRef = useRef<SearchState>("idle");
  const searchIdRef = useRef("");
  const querySourceRef = useRef("typed");

  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [clarification, setClarification] = useState("");
  const [conversationToken, setConversationToken] = useState("");
  const [agentMessage, setAgentMessage] = useState("");
  const [searchSummary, setSearchSummary] = useState("");
  const [turns, setTurns] = useState<SessionTurn[]>([]);
  const [state, setState] = useState<SearchState>("idle");
  const [results, setResults] = useState<SongResult[]>([]);
  const [error, setError] = useState("");
  const [busySeconds, setBusySeconds] = useState(0);
  const [searchId, setSearchId] = useState("");
  const [resultsShownAt, setResultsShownAt] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>("");
  const [activeTrackId, setActiveTrackId] = useState("");

  const trackClientEvent = (event: string, data: Record<string, unknown>) => {
    const endpoint = apiUrl("analytics/event");
    if (!endpoint) return;
    void fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, path: window.location.pathname, data }),
      keepalive: true
    }).catch(() => undefined);
  };

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
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    searchIdRef.current = searchId;
  }, [searchId]);

  useEffect(() => {
    const onPageHide = () => {
      const currentState = stateRef.current;
      const currentSearchId = searchIdRef.current;
      if (!currentSearchId || !["thinking", "probe", "searching"].includes(currentState)) return;
      trackClientEvent("melodymind_abandon", {
        search_id: currentSearchId,
        stage: currentState,
        elapsed_ms: startedAtRef.current ? Date.now() - startedAtRef.current : 0
      });
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, []);

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
    if (searchId) {
      trackClientEvent("melodymind_restart", {
        search_id: searchId,
        stage: state,
        elapsed_ms: startedAtRef.current ? Date.now() - startedAtRef.current : 0
      });
      previousSearchIdRef.current = searchId;
    }
    setQuery("");
    setSubmittedQuery("");
    setClarification("");
    setConversationToken("");
    setAgentMessage("");
    setSearchSummary("");
    setTurns([]);
    setResults([]);
    setError("");
    setSearchId("");
    setResultsShownAt(0);
    setFeedback("");
    setActiveTrackId("");
    probeShownAtRef.current = 0;
    startedAtRef.current = 0;
    querySourceRef.current = "typed";
    setState("idle");
    window.requestAnimationFrame(() => {
      resizeInitialTextarea();
      initialTextareaRef.current?.focus();
    });
  };

  const showProbe = (payload: ProbeResponse) => {
    probeShownAtRef.current = Date.now();
    setConversationToken(payload.conversation_token?.trim() || "");
    setTurns((current) => [
      ...current,
      { id: Date.now(), role: "assistant", text: payload.message }
    ]);
    setClarification("");
    setState("probe");
  };

  const showResults = (payload: ResultsResponse, currentSearchId: string) => {
    const shownAt = Date.now();
    setAgentMessage(
      payload.message?.trim() || "These are the closest matches I found for what you described."
    );
    setConversationToken(payload.conversation_token?.trim() || "");
    setSearchSummary("");
    const nextResults = Array.isArray(payload.results) ? payload.results : [];
    setResults(nextResults);
    setActiveTrackId(nextResults.find((song) => Boolean(song.spotify_id))?.track_id || "");
    setResultsShownAt(shownAt);
    setState("success");
    trackClientEvent("melodymind_results_rendered", {
      search_id: currentSearchId,
      total: Array.isArray(payload.results) ? payload.results.length : 0,
      time_to_results_ms: startedAtRef.current ? shownAt - startedAtRef.current : 0
    });
  };

  const runLegacyOneShot = async (
    searchEndpoint: string,
    cleanQuery: string,
    cleanClarification: string,
    controller: AbortController,
    analytics: Record<string, unknown>,
    currentSearchId: string
  ) => {
    const response = await fetch(searchEndpoint, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        query: cleanQuery,
        limit: 10,
        analytics,
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
    showResults(payload, currentSearchId);
  };

  const submit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const answeringProbe = state === "probe";
    const continuing = state === "success" && Boolean(conversationToken);
    if (state !== "idle" && !answeringProbe && !continuing) return;

    const cleanQuery = answeringProbe || continuing ? submittedQuery.trim() : query.trim();
    const cleanClarification = answeringProbe || continuing ? clarification.trim() : "";
    if (cleanQuery.length < 4) return;
    if ((answeringProbe || continuing) && !cleanClarification) return;

    const planEndpoint = apiUrl("plan");
    const searchEndpoint = apiUrl("search");
    if (!planEndpoint || !searchEndpoint) {
      if (!answeringProbe && !continuing) setSubmittedQuery(cleanQuery);
      setResults([]);
      setError("The search server is not connected to this build.");
      setState("error");
      return;
    }

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    let currentSearchId = searchId;
    if (!answeringProbe) {
      if (continuing && searchId) previousSearchIdRef.current = searchId;
      currentSearchId = newSearchId();
      attemptRef.current += 1;
      startedAtRef.current = Date.now();
      setSearchId(currentSearchId);
      searchIdRef.current = currentSearchId;
      if (!continuing) {
        setSubmittedQuery(cleanQuery);
        setTurns([]);
        setResults([]);
      }
      if (!continuing) setConversationToken("");
      setClarification("");
      setFeedback("");
      setResultsShownAt(0);
    }

    if (answeringProbe || continuing) {
      setTurns((current) => [
        ...current,
        { id: Date.now(), role: "user", text: cleanClarification }
      ]);
      setClarification("");
    }

    const analytics: Record<string, unknown> = {
      search_id: currentSearchId,
      previous_search_id: previousSearchIdRef.current,
      attempt_index: attemptRef.current,
      query_source: querySourceRef.current,
      client_started_at_ms: startedAtRef.current
    };
    if (answeringProbe && probeShownAtRef.current) {
      analytics.probe_response_ms = Date.now() - probeShownAtRef.current;
    }

    setAgentMessage("");
    setSearchSummary("");
    setError("");
    setState("thinking");

    try {
      const planBody = (answeringProbe || continuing) && conversationToken
        ? { conversation_token: conversationToken, message: cleanClarification, analytics }
        : {
            query: cleanQuery,
            analytics,
            ...(answeringProbe ? { clarification: cleanClarification } : {})
          };
      const planResponse = await fetch(planEndpoint, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(planBody),
        signal: controller.signal
      });

      if (planResponse.status === 404) {
        await runLegacyOneShot(
          searchEndpoint,
          cleanQuery,
          cleanClarification,
          controller,
          analytics,
          currentSearchId
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
      if (plan.type === "reply") {
        setConversationToken(plan.conversation_token);
        setTurns((current) => [
          ...current,
          { id: Date.now() + 1, role: "assistant", text: plan.message }
        ]);
        setAgentMessage("");
        setState("success");
        return;
      }
      if (plan.type !== "search_ready" || !plan.plan_token) {
        throw new Error("Invalid MelodyMind plan response");
      }

      setSearchSummary(plan.summary?.trim() || plan.message?.trim() || "I’m searching the catalogue using the details you gave me.");
      setState("searching");
      const searchResponse = await fetch(searchEndpoint, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ plan_token: plan.plan_token, limit: 10, analytics }),
        signal: controller.signal
      });
      if (!searchResponse.ok) {
        throw new Error(`Search failed with status ${searchResponse.status}`);
      }
      const resultsPayload = await searchResponse.json() as ResultsResponse;
      showResults(resultsPayload, currentSearchId);
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setError("I couldn’t complete that search. Try again in a moment.");
      setState("error");
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
    }
  };

  const sendFeedback = (value: Exclude<Feedback, "">) => {
    if (!searchId || feedback) return;
    setFeedback(value);
    trackClientEvent("melodymind_feedback", {
      search_id: searchId,
      value,
      since_results_ms: resultsShownAt ? Date.now() - resultsShownAt : 0
    });
  };

  const recordPlayback = (signal: PlaybackSignal) => {
    trackClientEvent("melodymind_playback", {
      action: signal.action,
      search_id: searchIdRef.current,
      track_id: signal.song.track_id,
      spotify_id: signal.song.spotify_id || "",
      title: signal.song.title,
      artist: signal.song.artist,
      position_ms: signal.position_ms,
      duration_ms: signal.duration_ms
    });
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
    : "Understanding your request…";

  return (
    <section
      ref={rootRef}
      className="mm-product"
      aria-label="MelodyMind search"
      data-search-id={searchId || undefined}
      data-results-shown-at={resultsShownAt || undefined}
    >
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
                Tell me what happened, how it feels, and where you want the music to take you. Add anything you do not want.
              </p>
              <div className="mm-intro__rule" aria-hidden="true"><i /></div>
            </div>

            <form className="mm-query-card" onSubmit={submit}>
              <div className="mm-query-card__head">
                <label htmlFor="melodymind-query">Tell MelodyMind what happened</label>
                <span className="lv-mono">{query.length} / 500</span>
              </div>
              <p className="mm-query-card__guide" id="melodymind-query-help">
                <span>WHAT HAPPENED</span>
                <i aria-hidden="true">→</i>
                <span>HOW IT FEELS</span>
                <i aria-hidden="true">→</i>
                <span>WHERE THE MUSIC SHOULD TAKE YOU</span>
              </p>
              <textarea
                ref={initialTextareaRef}
                id="melodymind-query"
                value={query}
                maxLength={500}
                rows={6}
                aria-describedby="melodymind-query-help"
                placeholder="My friends moved away. I feel left behind. Let me sit with that for a minute, then help me move forward. No slow piano songs."
                onChange={(event) => {
                  querySourceRef.current = "typed";
                  setQuery(event.target.value);
                  resizeInitialTextarea();
                }}
                onKeyDown={handleInitialKey}
                autoFocus
              />
              <div className="mm-query-card__action">
                <span className="lv-mono">WRITE NORMALLY · I MAY ASK ONE QUESTION</span>
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
                        querySourceRef.current = `example_${index + 1}`;
                        setQuery(example);
                        trackClientEvent("melodymind_example_selected", {
                          example_index: index + 1,
                          example
                        });
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

                {turns.map((turn) => (
                  <article
                    className={`mm-turn mm-turn--${turn.role}${turn.role === "user" ? " mm-turn--followup" : ""}`}
                    key={turn.id}
                  >
                    <span className="mm-turn__role lv-mono">
                      {turn.role === "user" ? "YOU" : "MELODYMIND"}
                    </span>
                    <p>{turn.text}</p>
                  </article>
                ))}

                {isBusy && (
                  <article className="mm-turn mm-turn--assistant mm-turn--status" role="status">
                    <span className="mm-turn__role lv-mono">MELODYMIND</span>
                    <div className="mm-agent-status">
                      <ThinkingDots />
                      <span>
                        {state === "searching" && searchSummary ? searchSummary : busyLabel}
                        {` · ${busySeconds}s`}
                      </span>
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

                {state === "success" && agentMessage && (
                    <article className="mm-turn mm-turn--assistant">
                      <span className="mm-turn__role lv-mono">MELODYMIND</span>
                      <p>{agentMessage}</p>
                    </article>
                )}

                {results.length > 0 && (
                    <section ref={resultsRef} className="mm-agent-results" aria-label="Song results">
                      <header>
                        <div>
                          <span className="lv-mono">MATCHING TRACKS</span>
                          <strong>{results.length}</strong>
                        </div>
                        <span className="lv-mono">TITLE / ARTIST / ALBUM</span>
                      </header>

                        <>
                          {results.some((song) => Boolean(song.spotify_id)) && (
                            <SpotifyResultPlayer
                              key={searchId}
                              ref={playerRef}
                              initialSong={results.find((song) => Boolean(song.spotify_id)) as SongResult}
                              onSignal={recordPlayback}
                            />
                          )}
                          <ol className="mm-result-list" aria-label="Matching tracks">
                            {results.map((song, index) => (
                              <li
                                className={`mm-result${activeTrackId === song.track_id ? " is-playing" : ""}`}
                                key={song.track_id}
                                data-track-id={song.track_id}
                                data-spotify-id={song.spotify_id || undefined}
                              >
                                <span className="mm-result__number lv-mono">{String(index + 1).padStart(2, "0")}</span>
                                <ResultArtwork song={song} />
                                <span className="mm-result__track">
                                  <strong>{song.title}</strong>
                                  <small>{song.artist}</small>
                                </span>
                                <span className="mm-result__album">{song.album || "—"}</span>
                                {song.spotify_id ? (
                                  <span className="mm-result__actions">
                                    <button
                                      className="mm-result__play"
                                      type="button"
                                      onClick={() => {
                                        setActiveTrackId(song.track_id);
                                        playerRef.current?.play(song);
                                      }}
                                      aria-label={`Play ${song.title}`}
                                      title="Play here"
                                    >
                                      <Play aria-hidden="true" />
                                    </button>
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
                                  </span>
                                ) : <span />}
                              </li>
                            ))}
                          </ol>
                          <div className="mm-feedback" aria-label="Recommendation feedback">
                            <span>{feedback ? "Thanks — that helps." : "Did this hit?"}</span>
                            {!feedback && (
                              <div>
                                <button type="button" onClick={() => sendFeedback("hit")}>Yeah</button>
                                <button type="button" onClick={() => sendFeedback("miss")}>Not really</button>
                              </div>
                            )}
                          </div>
                        </>
                    </section>
                )}

                {state === "success" && results.length === 0 && Boolean(agentMessage) && (
                  <div className="mm-no-results">
                    <p>Change one detail or tell me which part matters most.</p>
                  </div>
                )}
              </div>
            </div>

            <footer className="mm-agent-footer">
              <div className="mm-agent-footer__inner">
                {(state === "probe" || (state === "success" && Boolean(conversationToken))) && (
                  <form className="mm-agent-composer" onSubmit={submit}>
                    <textarea
                      ref={composerRef}
                      value={clarification}
                      rows={1}
                      maxLength={500}
                      aria-label="Reply to MelodyMind"
                      placeholder={state === "probe" ? "Answer the question above. One sentence is enough…" : "Tell me what missed: more upbeat, stronger lyrics, less obvious songs…"}
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

                {state === "error" && (
                  <div className="mm-agent-finish">
                    <span>That request did not complete.</span>
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
