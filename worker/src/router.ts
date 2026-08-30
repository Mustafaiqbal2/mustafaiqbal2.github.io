import { createSpotifyClient, type SpotifyClient, type SpotifyEnv } from "./spotify";
import {
  searchCatalogue,
  type MelodyMindEnv
} from "./melodymind";

export type WorkerEnv = SpotifyEnv & MelodyMindEnv & { ALLOWED_ORIGIN: string };
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

const ROOM_SECONDS = 900;
const NOW_SECONDS = 5;

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
    headers.set("Access-Control-Allow-Headers", "Content-Type");
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
    const isSearch = url.pathname === "/api/search";

    if (request.method === "OPTIONS") {
      if (!origin) return json({ error: "forbidden" }, 403, null);
      return new Response(null, { status: 204, headers: securityHeaders(origin) });
    }

    if (isHealth) return json({ status: "ok" }, 200, origin);
    if (!origin) return json({ error: "forbidden" }, 403, null);

    if (isSearch) {
      if (request.method !== "POST") {
        return json({ error: "method_not_allowed" }, 405, origin);
      }
      let query = "";
      let clarification: string | undefined;
      let limit = 10;
      try {
        const raw = await request.text();
        if (raw.length > 3_072) return json({ error: "request_too_large" }, 413, origin);
        const body = JSON.parse(raw) as Record<string, unknown>;
        query = typeof body.query === "string" ? body.query.trim() : "";
        if (query.length < 4 || query.length > 500) {
          return json({ error: "invalid_query" }, 400, origin);
        }
        if (body.clarification !== undefined && body.clarification !== null) {
          if (typeof body.clarification !== "string") {
            return json({ error: "invalid_clarification" }, 400, origin);
          }
          clarification = body.clarification.trim();
          if (!clarification || clarification.length > 500) {
            return json({ error: "invalid_clarification" }, 400, origin);
          }
        }
        if (body.limit !== undefined) {
          if (!Number.isInteger(body.limit) || Number(body.limit) < 1 || Number(body.limit) > 20) {
            return json({ error: "invalid_limit" }, 400, origin);
          }
          limit = Number(body.limit);
        }
      } catch {
        return json({ error: "invalid_json" }, 400, origin);
      }

      try {
        const catalogue = await searchCatalogue(
          query,
          limit,
          env,
          deps.fetchImpl,
          clarification
        );
        if (catalogue.type === "probe") {
          return json(
            { type: "probe", query: catalogue.query, message: catalogue.message },
            200,
            origin
          );
        }

        const spotify = client(env);
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
        return json(
          {
            type: "results",
            query: catalogue.query,
            message: catalogue.message,
            results,
            total: results.length
          },
          200,
          origin
        );
      } catch {
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
