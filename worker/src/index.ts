import { renderFullAnalyticsDashboard } from "./analytics-dashboard";
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

export default {
  fetch(request: Request, env: WorkerEnv, ctx: WorkerContext): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (path === "/analytics" || path === "/analytics/") {
      return renderFullAnalyticsDashboard(request, env);
    }
    return router(request, env, ctx);
  }
};
