import { renderFullAnalyticsDashboard } from "./analytics-dashboard";
import type { AnalyticsEnv, D1Database } from "./analytics";

/**
 * D1/SQLite treats RETURNING as a reserved keyword. The first full-dashboard
 * implementation used `COUNT(*) returning`, which throws at runtime. Keep the
 * dashboard implementation intact while rewriting that one legacy query to a
 * quoted alias. This can be removed once the dashboard query itself is folded
 * into a later cleanup.
 */
function dashboardDatabase(db: D1Database): D1Database {
  return {
    prepare(query: string) {
      const safeQuery = query.replace(
        "SELECT COUNT(*) returning FROM (",
        'SELECT COUNT(*) AS "returning" FROM ('
      );
      return db.prepare(safeQuery);
    },
    batch(statements) {
      return db.batch(statements);
    }
  };
}

export async function renderSafeAnalyticsDashboard(
  request: Request,
  env: AnalyticsEnv
): Promise<Response> {
  try {
    return await renderFullAnalyticsDashboard(request, {
      ...env,
      ...(env.ANALYTICS_DB
        ? { ANALYTICS_DB: dashboardDatabase(env.ANALYTICS_DB) }
        : {})
    });
  } catch (error) {
    console.error("ANALYTICS_DASHBOARD_ERROR", error);
    return new Response("Analytics dashboard unavailable. Check Worker logs.", {
      status: 500,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      }
    });
  }
}
