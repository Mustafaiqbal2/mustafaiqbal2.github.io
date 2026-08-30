import { renderSafeAnalyticsDashboard } from "./analytics-dashboard-safe";
import { createRouter, type ResponseCache, type WorkerContext, type WorkerEnv } from "./router";

const workerCaches = caches as CacheStorage & { default: Cache };
const responseCache: ResponseCache = {
  async match(request) {
    return (await workerCaches.default.match(request)) ?? undefined;
  },
  async put(request, response) {
    await workerCaches.default.put(request, response);
  }
};

const router = createRouter({ cache: responseCache });

function unexpectedErrorResponse(request: Request, env: WorkerEnv): Response {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  const origin = request.headers.get("Origin");
  if (origin && origin === env.ALLOWED_ORIGIN) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }
  return new Response(JSON.stringify({ error: "worker_unavailable" }), {
    status: 500,
    headers
  });
}

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: WorkerContext): Promise<Response> {
    try {
      const path = new URL(request.url).pathname;
      if (path === "/analytics" || path === "/analytics/") {
        return await renderSafeAnalyticsDashboard(request, env);
      }
      return await router(request, env, ctx);
    } catch (error) {
      console.error("WORKER_UNHANDLED", {
        path: new URL(request.url).pathname,
        error
      });
      return unexpectedErrorResponse(request, env);
    }
  }
};
