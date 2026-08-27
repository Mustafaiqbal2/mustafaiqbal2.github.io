import { describe, expect, it, vi } from "vitest";
import { createRouter, type ResponseCache, type WorkerContext, type WorkerEnv } from "../src/router";
import type { SpotifyClient } from "../src/spotify";

const allowedOrigin = "https://mustafaiqbal2.github.io";
const env: WorkerEnv = {
  SPOTIFY_CLIENT_ID: "client-id",
  SPOTIFY_CLIENT_SECRET: "client-secret",
  SPOTIFY_REFRESH_TOKEN: "refresh-token",
  ALLOWED_ORIGIN: allowedOrigin
};

function memoryCache(): ResponseCache {
  const values = new Map<string, Response>();
  return {
    async match(request) {
      return values.get(request.url)?.clone();
    },
    async put(request, response) {
      values.set(request.url, response.clone());
    }
  };
}

function testHarness(overrides: Partial<SpotifyClient> = {}) {
  const room = vi.fn(async () => ({ marker: "room" }));
  const now = vi.fn(async () => ({ marker: "now" }));
  const client = { getRoom: room, getNow: now, ...overrides } as unknown as SpotifyClient;
  const waitUntil = vi.fn((promise: Promise<unknown>) => {
    void promise;
  });
  const handler = createRouter({
    cache: memoryCache(),
    clientFactory: () => client
  });

  const request = async (
    path: string,
    options: { origin?: string; method?: string } = {}
  ): Promise<Response> => {
    const headers = new Headers();
    if (options.origin) headers.set("Origin", options.origin);
    return handler(
      new Request("https://music-api.example" + path, {
        method: options.method ?? "GET",
        headers
      }),
      env,
      { waitUntil } satisfies WorkerContext
    );
  };

  return { request, room, now, waitUntil };
}

describe("Worker router", () => {
  it("allows only the configured site origin", async () => {
    const { request } = testHarness();
    const allowed = await request("/spotify/room", { origin: allowedOrigin });
    const blocked = await request("/spotify/room", { origin: "https://example.com" });

    expect(allowed.headers.get("access-control-allow-origin")).toBe(allowedOrigin);
    expect(blocked.status).toBe(403);
  });

  it("answers originless health checks but not originless Spotify requests", async () => {
    const { request } = testHarness();

    expect((await request("/health")).status).toBe(200);
    expect((await request("/spotify/room")).status).toBe(403);
  });

  it("caches room longer than now and serves cached room data", async () => {
    const { request, room } = testHarness();
    const first = await request("/spotify/room", { origin: allowedOrigin });
    await Promise.resolve();
    const second = await request("/spotify/room", { origin: allowedOrigin });
    const now = await request("/spotify/now", { origin: allowedOrigin });

    expect(first.headers.get("cache-control")).toContain("s-maxage=900");
    expect(now.headers.get("cache-control")).toContain("s-maxage=15");
    expect(await second.json()).toEqual({ marker: "room" });
    expect(room).toHaveBeenCalledTimes(1);
  });

  it("does not leak an upstream Spotify error", async () => {
    const getRoom = vi.fn(async () => {
      throw new Error("secret upstream body");
    });
    const { request } = testHarness({ getRoom });
    const response = await request("/spotify/room", { origin: allowedOrigin });

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "spotify_unavailable" });
  });

  it("handles preflight and rejects unsupported methods", async () => {
    const { request } = testHarness();
    const preflight = await request("/spotify/room", {
      origin: allowedOrigin,
      method: "OPTIONS"
    });
    const post = await request("/spotify/room", { origin: allowedOrigin, method: "POST" });

    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-methods")).toBe("GET, OPTIONS");
    expect(post.status).toBe(405);
  });
});
