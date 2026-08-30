import {
  parseClientAnalyticsEvent,
  readAnalyticsIdentity,
  recordAnalyticsEvent,
  renderAnalyticsDashboard,
  type AnalyticsEnv,
  type AnalyticsEvent
} from "./analytics";
import { createSpotifyClient, type SpotifyClient, type SpotifyEnv } from "./spotify";
import {
  executeCataloguePlan,
  planCatalogue,
  searchCatalogue,
  type CatalogueResultsResponse,
  type MelodyMindEnv
} from "./melodymind";

export type WorkerEnv = SpotifyEnv & MelodyMindEnv & AnalyticsEnv & { ALLOWED_ORIGIN: string };
export type WorkerContext = { waitUntil(promise: Promise<unknown>): void };
export type ResponseCache = {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
};
export type RouterDeps = {
  fetchImpl?: typeof fetch;
  cache?: ResponseCache;
  clientFactory?: (env: WorkerEnv, fetchImpl?: typeof fetch) => SpotifyClient;
};

type SearchAnalyticsMeta = {
  search_id?: string;
  previous_search_id?: string;
  attempt_index?: number;
  query_source?: string;
  client_started_at_ms?: number;
  probe_response_ms?: number;
};

const ROOM_SECONDS = 900;
const NOW_SECONDS = 5;
const SEARCH_ID_RE = /^[A-Za-z0-9_-]{8,96}$/;

function allowedOrigin(value: string | null, productionOrigin: string): string | null {
  if (!value) return null;
  if (value === productionOrigin) return value;

  try {
    const url = new URL(value);
    const localHost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    return url.protocol === "http:" && localHost ? value : null;
  } catch {
    return null;
  }
}

function securityHeaders(origin: string | null): Headers {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    Vary: "Origin"
  });
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, X-Analytics-Visitor, X-Analytics-Session, X-Analytics-Path"
    );
  }
  return headers;
}

function json(
  body: unknown,
  status: number,
  origin: string | null,
  cacheSeconds?: number
): Response {
  const headers = securityHeaders(origin);
  if (cacheSeconds !== undefined) {
    headers.set(
      "Cache-Control",
      "public, max-age=0, s-maxage=" + cacheSeconds + ", stale-while-revalidate=" + cacheSeconds
    );
  } else {
    headers.set("Cache-Control", "no-store");
  }
  return new Response(JSON.stringify(body), { status, headers });
}

async function requestBody(request: Request): Promise<Record<string, unknown>> {
  const raw = await request.text();
  if (raw.length > 12_000) throw new Error("request_too_large");
  const parsed = JSON.parse(raw) as unknown;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("invalid_json");
  }
  return parsed as Record<string, unknown>;
}

function readQuery(body: Record<string, unknown>): string {
  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (query.length < 4 || query.length > 500) throw new Error("invalid_query");
  return query;
}

function readClarification(body: Record<string, unknown>): string | undefined {
  if (body.clarification === undefined || body.clarification === null) return undefined;
  if (typeof body.clarification !== "string") throw new Error("invalid_clarification");
  const clarification = body.clarification.trim();
  if (!clarification || clarification.length > 500) throw new Error("invalid_clarification");
  return clarification;
}

function readConversationToken(body: Record<string, unknown>): string | undefined {
  if (body.conversation_token === undefined || body.conversation_token === null) return undefined;
  if (typeof body.conversation_token !== "string") throw new Error("invalid_conversation");
  const token = body.conversation_token.trim();
  if (token.length < 16 || token.length > 8192) throw new Error("invalid_conversation");
  return token;
}

function readMessage(body: Record<string, unknown>): string {
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message || message.length > 500) throw new Error("invalid_message");
  return message;
}

function readLimit(body: Record<string, unknown>): number {
  if (body.limit === undefined) return 10;
  if (!Number.isInteger(body.limit) || Number(body.limit) < 1 || Number(body.limit) > 20) {
    throw new Error("invalid_limit");
  }
  return Number(body.limit);
}

function readSearchAnalytics(body: Record<string, unknown>): SearchAnalyticsMeta {
  const raw = body.analytics;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const value = raw as Record<string, unknown>;
  const searchId = typeof value.search_id === "string" && SEARCH_ID_RE.test(value.search_id)
    ? value.search_id
    : undefined;
  const previousSearchId = typeof value.previous_search_id === "string" && SEARCH_ID_RE.test(value.previous_search_id)
    ? value.previous_search_id
    : undefined;
  const attemptIndex = Number.isInteger(value.attempt_index)
    ? Math.max(1, Math.min(1000, Number(value.attempt_index)))
    : undefined;
  const querySource = typeof value.query_source === "string"
    ? value.query_source.trim().slice(0, 40)
    : undefined;
  const clientStartedAt = typeof value.client_started_at_ms === "number" && Number.isFinite(value.client_started_at_ms)
    ? Math.round(value.client_started_at_ms)
    : undefined;
  const probeResponseMs = typeof value.probe_response_ms === "number" && Number.isFinite(value.probe_response_ms)
    ? Math.max(0, Math.min(3_600_000, Math.round(value.probe_response_ms)))
    : undefined;
  return {
    ...(searchId ? { search_id: searchId } : {}),
    ...(previousSearchId ? { previous_search_id: previousSearchId } : {}),
    ...(attemptIndex ? { attempt_index: attemptIndex } : {}),
    ...(querySource ? { query_source: querySource } : {}),
    ...(clientStartedAt ? { client_started_at_ms: clientStartedAt } : {}),
    ...(probeResponseMs !== undefined ? { probe_response_ms: probeResponseMs } : {})
  };
}

function withSearchMeta(meta: SearchAnalyticsMeta, data: Record<string, unknown>): Record<string, unknown> {
  return { ...meta, ...data };
}

function analyticsPath(request: Request): string {
  const value = request.headers.get("X-Analytics-Path")?.trim() || "";
  return value.startsWith("/") && value.length <= 400 ? value : "/work/melodymind";
}

async function enrichCatalogue(
  catalogue: CatalogueResultsResponse,
  env: WorkerEnv,
  spotify: SpotifyClient
) {
  const tracks = await spotify.getTracks(
    catalogue.results.map((result) => result.spotifyId)
  );
  const byId = new Map(
    tracks.flatMap((track) => track ? [[track.id, track] as const] : [])
  );
  const results = catalogue.results.map((result) => {
    const track = byId.get(result.spotifyId);
    return {
      track_id: result.trackId,
      spotify_id: result.spotifyId,
      title: track?.name ?? result.title,
      artist: track?.artists.map((artist) => artist.name).join(", ") ?? result.artist,
      album: track?.album.name ?? result.album,
      artwork: track?.album.images[0]?.url ?? null,
      spotify_url: track?.url ?? "https://open.spotify.com/track/" + result.spotifyId,
      duration_ms: track?.durationMs ?? null,
      explicit: track?.explicit ?? null,
      score: result.score
    };
  });
  return {
    type: "results" as const,
    query: catalogue.query,
    message: catalogue.message,
    results,
    total: results.length
  };
}

export function createRouter(deps: RouterDeps = {}) {
  let activeEnv: WorkerEnv | null = null;
  let activeClient: SpotifyClient | null = null;

  function client(env: WorkerEnv): SpotifyClient {
    if (activeClient && activeEnv === env) return activeClient;
    activeEnv = env;
    activeClient = (deps.clientFactory ?? createSpotifyClient)(env, deps.fetchImpl);
    return activeClient;
  }

  return async function handle(
    request: Request,
    env: WorkerEnv,
    ctx: WorkerContext
  ): Promise<Response> {
    const url = new URL(request.url);
    const originHeader = request.headers.get("Origin");
    const origin = allowedOrigin(originHeader, env.ALLOWED_ORIGIN);
    const isHealth = url.pathname === "/health";
    const isPlan = url.pathname === "/api/plan";
    const isSearch = url.pathname === "/api/search";
    const isAnalyticsEvent = url.pathname === "/api/analytics/event";
    const isAnalyticsDashboard = url.pathname === "/analytics" || url.pathname === "/analytics/";
    const identity = readAnalyticsIdentity(request);

    const track = (input: AnalyticsEvent) => {
      ctx.waitUntil(
        recordAnalyticsEvent(env, request, {
          ...input,
          path: input.path || analyticsPath(request),
          visitorId: input.visitorId || identity.visitorId,
          sessionId: input.sessionId || identity.sessionId
        }).catch(() => undefined)
      );
    };

    if (isAnalyticsDashboard) {
      if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405, null);
      try {
        return await renderAnalyticsDashboard(request, env);
      } catch {
        return new Response("Analytics dashboard unavailable", {
          status: 500,
          headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }
        });
      }
    }

    if (request.method === "OPTIONS") {
      if (!origin) return json({ error: "forbidden" }, 403, null);
      return new Response(null, { status: 204, headers: securityHeaders(origin) });
    }

    if (isHealth) {
      return json(
        {
          status: "ok",
          analytics_db: Boolean(env.ANALYTICS_DB),
          analytics_dashboard: Boolean(env.ANALYTICS_PASSWORD)
        },
        200,
        origin
      );
    }
    if (!origin) return json({ error: "forbidden" }, 403, null);

    if (isAnalyticsEvent) {
      if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);
      try {
        const event = await parseClientAnalyticsEvent(request);
        if (!event.event) return json({ error: "invalid_event" }, 400, origin);
        ctx.waitUntil(recordAnalyticsEvent(env, request, event).catch(() => undefined));
        return new Response(null, { status: 204, headers: securityHeaders(origin) });
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message === "analytics_too_large") return json({ error: message }, 413, origin);
        return json({ error: "invalid_analytics_event" }, 400, origin);
      }
    }

    if (isPlan) {
      if (request.method !== "POST") {
        return json({ error: "method_not_allowed" }, 405, origin);
      }
      const startedAt = Date.now();
      let analytics: SearchAnalyticsMeta = {};
      try {
        const body = await requestBody(request);
        analytics = readSearchAnalytics(body);
        const conversationToken = readConversationToken(body);
        let plan;

        if (conversationToken) {
          const answer = readMessage(body);
          track({
            event: "melodymind_probe_answer",
            data: withSearchMeta(analytics, { answer })
          });
          plan = await planCatalogue(
            { conversationToken, message: answer },
            env,
            deps.fetchImpl
          );
        } else {
          const query = readQuery(body);
          const clarification = readClarification(body);
          track({
            event: "melodymind_query",
            data: withSearchMeta(analytics, { query, ...(clarification ? { clarification } : {}) })
          });
          plan = await planCatalogue(
            { query, clarification },
            env,
            deps.fetchImpl
          );
        }

        const elapsedMs = Date.now() - startedAt;
        if (plan.type === "probe") {
          track({
            event: "melodymind_probe",
            data: withSearchMeta(analytics, { question: plan.message, elapsed_ms: elapsedMs })
          });
          return json(
            {
              type: "probe",
              query: plan.query,
              message: plan.message,
              ...(plan.conversationToken
                ? { conversation_token: plan.conversationToken }
                : {})
            },
            200,
            origin
          );
        }

        track({
          event: "melodymind_search_ready",
          data: withSearchMeta(analytics, { acknowledgement: plan.message, elapsed_ms: elapsedMs })
        });
        return json(
          {
            type: "search_ready",
            query: plan.query,
            message: plan.message,
            plan_token: plan.planToken
          },
          200,
          origin
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        track({
          event: "melodymind_error",
          data: withSearchMeta(analytics, {
            stage: "plan",
            error: message || "plan_unavailable",
            elapsed_ms: Date.now() - startedAt
          })
        });
        if (message === "request_too_large") return json({ error: message }, 413, origin);
        if (message.startsWith("invalid_")) return json({ error: message }, 400, origin);
        return json({ error: "plan_unavailable" }, 502, origin);
      }
    }

    if (isSearch) {
      if (request.method !== "POST") {
        return json({ error: "method_not_allowed" }, 405, origin);
      }
      const startedAt = Date.now();
      let analytics: SearchAnalyticsMeta = {};
      try {
        const body = await requestBody(request);
        analytics = readSearchAnalytics(body);
        const limit = readLimit(body);
        let catalogue: CatalogueResultsResponse;

        if (typeof body.plan_token === "string" && body.plan_token.trim()) {
          const planToken = body.plan_token.trim();
          if (planToken.length > 8192) return json({ error: "invalid_plan" }, 400, origin);
          catalogue = await executeCataloguePlan(
            planToken,
            limit,
            env,
            deps.fetchImpl,
            analytics.search_id || ""
          );
        } else {
          const query = readQuery(body);
          const clarification = readClarification(body);
          track({
            event: "melodymind_query",
            data: withSearchMeta(analytics, {
              query,
              ...(clarification ? { clarification } : {}),
              legacy: true
            })
          });
          const legacy = await searchCatalogue(
            query,
            limit,
            env,
            deps.fetchImpl,
            clarification
          );
          if (legacy.type === "probe") {
            track({
              event: "melodymind_probe",
              data: withSearchMeta(analytics, {
                question: legacy.message,
                elapsed_ms: Date.now() - startedAt,
                legacy: true
              })
            });
            return json(
              {
                type: "probe",
                query: legacy.query,
                message: legacy.message,
                ...(legacy.conversationToken
                  ? { conversation_token: legacy.conversationToken }
                  : {})
              },
              200,
              origin
            );
          }
          catalogue = legacy;
        }

        const enriched = await enrichCatalogue(catalogue, env, client(env));
        track({
          event: "melodymind_results",
          data: withSearchMeta(analytics, {
            total: enriched.total,
            elapsed_ms: Date.now() - startedAt,
            ...(catalogue.telemetry ? { telemetry: catalogue.telemetry } : {}),
            results: enriched.results.map((result, index) => ({
              rank: index + 1,
              spotify_id: result.spotify_id,
              title: result.title,
              artist: result.artist,
              score: result.score
            }))
          })
        });
        return json(enriched, 200, origin);
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        track({
          event: "melodymind_error",
          data: withSearchMeta(analytics, {
            stage: "search",
            error: message || "search_unavailable",
            elapsed_ms: Date.now() - startedAt
          })
        });
        if (message === "request_too_large") return json({ error: message }, 413, origin);
        if (message.startsWith("invalid_")) return json({ error: message }, 400, origin);
        return json({ error: "search_unavailable" }, 502, origin);
      }
    }

    if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405, origin);

    const route =
      url.pathname === "/spotify/room"
        ? ({ name: "room", seconds: ROOM_SECONDS } as const)
        : url.pathname === "/spotify/now"
          ? ({ name: "now", seconds: NOW_SECONDS } as const)
          : null;
    if (!route) return json({ error: "not_found" }, 404, origin);

    const cacheKey = new Request(url.toString(), { method: "GET" });
    const cached = await deps.cache?.match(cacheKey);
    if (cached) {
      const headers = new Headers(cached.headers);
      headers.set("Access-Control-Allow-Origin", origin);
      return new Response(cached.body, {
        status: cached.status,
        statusText: cached.statusText,
        headers
      });
    }

    try {
      const spotify = client(env);
      const body = route.name === "room" ? await spotify.getRoom() : await spotify.getNow();
      const response = json(body, 200, origin, route.seconds);
      if (deps.cache) ctx.waitUntil(deps.cache.put(cacheKey, response.clone()));
      return response;
    } catch {
      return json({ error: "spotify_unavailable" }, 502, origin);
    }
  };
}