import { createSpotifyClient, type SpotifyClient, type SpotifyEnv } from "./spotify";

export type WorkerEnv = SpotifyEnv & { ALLOWED_ORIGIN: string };
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
const NOW_SECONDS = 15;

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
    headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
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

    if (request.method === "OPTIONS") {
      if (!origin) return json({ error: "forbidden" }, 403, null);
      return new Response(null, { status: 204, headers: securityHeaders(origin) });
    }

    if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405, origin);
    if (isHealth) return json({ status: "ok" }, 200, origin);
    if (!origin) return json({ error: "forbidden" }, 403, null);

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
