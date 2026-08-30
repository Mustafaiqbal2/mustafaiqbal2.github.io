export type D1Result<T = Record<string, unknown>> = {
  results?: T[];
  success?: boolean;
};

export type D1PreparedStatement = {
  bind(...values: unknown[]): D1PreparedStatement;
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  first<T = Record<string, unknown>>(column?: string): Promise<T | null>;
};

export type D1Database = {
  prepare(query: string): D1PreparedStatement;
  batch<T = Record<string, unknown>>(
    statements: D1PreparedStatement[]
  ): Promise<D1Result<T>[]>;
};

export type AnalyticsEnv = {
  ANALYTICS_DB?: D1Database;
  ANALYTICS_PASSWORD?: string;
};

export type AnalyticsIdentity = {
  visitorId: string;
  sessionId: string;
};

export type AnalyticsEvent = {
  event: string;
  path?: string;
  title?: string;
  referrer?: string;
  visitorId?: string;
  sessionId?: string;
  language?: string;
  timezone?: string;
  screenWidth?: number;
  screenHeight?: number;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  data?: Record<string, unknown>;
};

const ID_RE = /^[A-Za-z0-9_-]{8,96}$/;
const EVENT_RE = /^[a-z0-9_]{2,64}$/;
let schemaReady: Promise<void> | null = null;

function cleanText(value: unknown, max = 500): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanId(value: unknown): string {
  const text = cleanText(value, 96);
  return ID_RE.test(text) ? text : "";
}

function cleanEvent(value: unknown): string {
  const text = cleanText(value, 64).toLowerCase();
  return EVENT_RE.test(text) ? text : "";
}

function safeNumber(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function normalizePath(value: unknown): string {
  const raw = cleanText(value, 500);
  if (!raw) return "/";
  try {
    const parsed = new URL(raw, "https://portfolio.invalid");
    return parsed.pathname.slice(0, 400) || "/";
  } catch {
    return raw.split(/[?#]/, 1)[0].slice(0, 400) || "/";
  }
}

function normalizeReferrer(value: unknown): string {
  const raw = cleanText(value, 1000);
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`.slice(0, 500);
  } catch {
    return "";
  }
}

function stringifyData(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "{}";
  try {
    return JSON.stringify(value).slice(0, 12_000);
  } catch {
    return "{}";
  }
}

function browserInfo(userAgent: string): { device: string; browser: string; os: string } {
  const ua = userAgent.toLowerCase();
  const device = /ipad|tablet|kindle/.test(ua)
    ? "tablet"
    : /mobi|iphone|android/.test(ua)
      ? "mobile"
      : "desktop";

  const browser = /edg\//.test(ua)
    ? "Edge"
    : /opr\//.test(ua)
      ? "Opera"
      : /firefox\//.test(ua)
        ? "Firefox"
        : /chrome\//.test(ua)
          ? "Chrome"
          : /safari\//.test(ua)
            ? "Safari"
            : "Other";

  const os = /windows nt/.test(ua)
    ? "Windows"
    : /iphone|ipad|ios/.test(ua)
      ? "iOS"
      : /mac os x/.test(ua)
        ? "macOS"
        : /android/.test(ua)
          ? "Android"
          : /linux/.test(ua)
            ? "Linux"
            : "Other";

  return { device, browser, os };
}

function cfString(request: Request, key: string): string {
  const cf = (request as Request & { cf?: Record<string, unknown> }).cf;
  return cleanText(cf?.[key], 120);
}

async function ensureSchema(db: D1Database): Promise<void> {
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
    await db.batch([
      db.prepare(`CREATE TABLE IF NOT EXISTS analytics_visitors (
        visitor_id TEXT PRIMARY KEY,
        first_seen INTEGER NOT NULL,
        last_seen INTEGER NOT NULL,
        first_path TEXT NOT NULL DEFAULT '/',
        first_referrer TEXT NOT NULL DEFAULT '',
        country TEXT NOT NULL DEFAULT '',
        region TEXT NOT NULL DEFAULT '',
        city TEXT NOT NULL DEFAULT '',
        device TEXT NOT NULL DEFAULT '',
        browser TEXT NOT NULL DEFAULT '',
        os TEXT NOT NULL DEFAULT ''
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS analytics_sessions (
        session_id TEXT PRIMARY KEY,
        visitor_id TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        last_seen INTEGER NOT NULL,
        landing_path TEXT NOT NULL DEFAULT '/',
        referrer TEXT NOT NULL DEFAULT '',
        country TEXT NOT NULL DEFAULT '',
        region TEXT NOT NULL DEFAULT '',
        city TEXT NOT NULL DEFAULT '',
        device TEXT NOT NULL DEFAULT '',
        browser TEXT NOT NULL DEFAULT '',
        os TEXT NOT NULL DEFAULT '',
        language TEXT NOT NULL DEFAULT '',
        timezone TEXT NOT NULL DEFAULT '',
        screen_width INTEGER,
        screen_height INTEGER,
        utm_source TEXT NOT NULL DEFAULT '',
        utm_medium TEXT NOT NULL DEFAULT '',
        utm_campaign TEXT NOT NULL DEFAULT ''
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS analytics_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts INTEGER NOT NULL,
        visitor_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        event TEXT NOT NULL,
        path TEXT NOT NULL DEFAULT '/',
        title TEXT NOT NULL DEFAULT '',
        data_json TEXT NOT NULL DEFAULT '{}'
      )`),
      db.prepare("CREATE INDEX IF NOT EXISTS idx_analytics_events_ts ON analytics_events(ts)"),
      db.prepare("CREATE INDEX IF NOT EXISTS idx_analytics_events_event_ts ON analytics_events(event, ts)"),
      db.prepare("CREATE INDEX IF NOT EXISTS idx_analytics_events_session_ts ON analytics_events(session_id, ts)"),
      db.prepare("CREATE INDEX IF NOT EXISTS idx_analytics_sessions_started ON analytics_sessions(started_at)")
    ]);
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}

export function readAnalyticsIdentity(request: Request): AnalyticsIdentity {
  return {
    visitorId: cleanId(request.headers.get("X-Analytics-Visitor")),
    sessionId: cleanId(request.headers.get("X-Analytics-Session"))
  };
}

export async function recordAnalyticsEvent(
  env: AnalyticsEnv,
  request: Request,
  input: AnalyticsEvent
): Promise<void> {
  const db = env.ANALYTICS_DB;
  if (!db) return;

  const headerIdentity = readAnalyticsIdentity(request);
  const visitorId = cleanId(input.visitorId) || headerIdentity.visitorId;
  const sessionId = cleanId(input.sessionId) || headerIdentity.sessionId;
  const event = cleanEvent(input.event);
  if (!visitorId || !sessionId || !event) return;

  await ensureSchema(db);

  const now = Date.now();
  const path = normalizePath(input.path || new URL(request.url).pathname);
  const referrer = normalizeReferrer(input.referrer || request.headers.get("Referer"));
  const { device, browser, os } = browserInfo(request.headers.get("User-Agent") || "");
  const country = cfString(request, "country");
  const region = cfString(request, "region");
  const city = cfString(request, "city");
  const language = cleanText(input.language, 80);
  const timezone = cleanText(input.timezone, 100);
  const screenWidth = safeNumber(input.screenWidth, 0, 20_000);
  const screenHeight = safeNumber(input.screenHeight, 0, 20_000);
  const title = cleanText(input.title, 300);
  const utmSource = cleanText(input.utmSource, 120);
  const utmMedium = cleanText(input.utmMedium, 120);
  const utmCampaign = cleanText(input.utmCampaign, 180);
  const dataJson = stringifyData(input.data);

  await db.batch([
    db.prepare(`INSERT INTO analytics_visitors (
      visitor_id, first_seen, last_seen, first_path, first_referrer,
      country, region, city, device, browser, os
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(visitor_id) DO UPDATE SET last_seen = excluded.last_seen`)
      .bind(
        visitorId,
        now,
        now,
        path,
        referrer,
        country,
        region,
        city,
        device,
        browser,
        os
      ),
    db.prepare(`INSERT INTO analytics_sessions (
      session_id, visitor_id, started_at, last_seen, landing_path, referrer,
      country, region, city, device, browser, os, language, timezone,
      screen_width, screen_height, utm_source, utm_medium, utm_campaign
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(session_id) DO UPDATE SET last_seen = excluded.last_seen`)
      .bind(
        sessionId,
        visitorId,
        now,
        now,
        path,
        referrer,
        country,
        region,
        city,
        device,
        browser,
        os,
        language,
        timezone,
        screenWidth,
        screenHeight,
        utmSource,
        utmMedium,
        utmCampaign
      ),
    db.prepare(`INSERT INTO analytics_events (
      ts, visitor_id, session_id, event, path, title, data_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .bind(now, visitorId, sessionId, event, path, title, dataJson)
  ]);
}

export async function parseClientAnalyticsEvent(request: Request): Promise<AnalyticsEvent> {
  const raw = await request.text();
  if (raw.length > 16_000) throw new Error("analytics_too_large");
  const body = JSON.parse(raw) as Record<string, unknown>;
  const data = body.data && typeof body.data === "object" && !Array.isArray(body.data)
    ? body.data as Record<string, unknown>
    : undefined;
  return {
    event: cleanEvent(body.event),
    path: normalizePath(body.path),
    title: cleanText(body.title, 300),
    referrer: normalizeReferrer(body.referrer),
    visitorId: cleanId(body.visitor_id),
    sessionId: cleanId(body.session_id),
    language: cleanText(body.language, 80),
    timezone: cleanText(body.timezone, 100),
    screenWidth: safeNumber(body.screen_width, 0, 20_000) ?? undefined,
    screenHeight: safeNumber(body.screen_height, 0, 20_000) ?? undefined,
    utmSource: cleanText(body.utm_source, 120),
    utmMedium: cleanText(body.utm_medium, 120),
    utmCampaign: cleanText(body.utm_campaign, 180),
    data
  };
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatNumber(value: unknown): string {
  const number = Number(value || 0);
  return Number.isFinite(number) ? new Intl.NumberFormat("en").format(number) : "0";
}

function formatDate(value: unknown): string {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return "—";
  return new Date(number).toLocaleString("en-GB", {
    timeZone: "Asia/Karachi",
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function percent(numerator: unknown, denominator: unknown): string {
  const n = Number(numerator || 0);
  const d = Number(denominator || 0);
  if (!d) return "0%";
  return `${Math.round((n / d) * 100)}%`;
}

function parseJson(value: unknown): Record<string, unknown> {
  try {
    const parsed = JSON.parse(String(value || "{}"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function basicAuthorized(request: Request, password: string): boolean {
  const header = request.headers.get("Authorization") || "";
  if (!header.startsWith("Basic ")) return false;
  try {
    const decoded = atob(header.slice(6));
    const separator = decoded.indexOf(":");
    if (separator < 0) return false;
    return decoded.slice(separator + 1) === password;
  } catch {
    return false;
  }
}

function htmlResponse(body: string, status = 200, headers?: HeadersInit): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Content-Type", "text/html; charset=utf-8");
  responseHeaders.set("Cache-Control", "no-store");
  responseHeaders.set("X-Content-Type-Options", "nosniff");
  responseHeaders.set("X-Frame-Options", "DENY");
  responseHeaders.set("Referrer-Policy", "no-referrer");
  responseHeaders.set(
    "Content-Security-Policy",
    "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src 'self' data:; form-action 'self'; base-uri 'none'"
  );
  return new Response(body, { status, headers: responseHeaders });
}

type Row = Record<string, unknown>;

async function rows(db: D1Database, sql: string, ...values: unknown[]): Promise<Row[]> {
  const result = await db.prepare(sql).bind(...values).all<Row>();
  return result.results ?? [];
}

async function first(db: D1Database, sql: string, ...values: unknown[]): Promise<Row> {
  return (await db.prepare(sql).bind(...values).first<Row>()) ?? {};
}

function table(
  headings: string[],
  data: Row[],
  render: (row: Row) => string[]
): string {
  if (!data.length) return '<p class="empty">No data yet.</p>';
  return `<div class="table-wrap"><table><thead><tr>${headings
    .map((heading) => `<th>${escapeHtml(heading)}</th>`)
    .join("")}</tr></thead><tbody>${data
    .map((row) => `<tr>${render(row).map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
    .join("")}</tbody></table></div>`;
}

function barList(data: Row[], labelKey: string, valueKey: string): string {
  if (!data.length) return '<p class="empty">No data yet.</p>';
  const max = Math.max(...data.map((row) => Number(row[valueKey] || 0)), 1);
  return `<div class="bar-list">${data.map((row) => {
    const value = Number(row[valueKey] || 0);
    const width = Math.max(2, Math.round((value / max) * 100));
    return `<div class="bar-row"><div class="bar-meta"><span>${escapeHtml(row[labelKey] || "Direct / unknown")}</span><strong>${formatNumber(value)}</strong></div><div class="bar-track"><i style="width:${width}%"></i></div></div>`;
  }).join("")}</div>`;
}

function trendChart(data: Row[]): string {
  if (!data.length) return '<p class="empty">No trend data yet.</p>';
  const max = Math.max(...data.map((row) => Number(row.page_views || 0)), 1);
  return `<div class="trend">${data.map((row) => {
    const value = Number(row.page_views || 0);
    const height = Math.max(3, Math.round((value / max) * 100));
    return `<div class="trend-day" title="${escapeHtml(row.day)} · ${formatNumber(row.visitors)} visitors · ${formatNumber(value)} page views · ${formatNumber(row.searches)} MelodyMind searches"><i style="height:${height}%"></i><span>${escapeHtml(String(row.day || "").slice(5))}</span></div>`;
  }).join("")}</div>`;
}

export async function renderAnalyticsDashboard(
  request: Request,
  env: AnalyticsEnv
): Promise<Response> {
  const password = env.ANALYTICS_PASSWORD?.trim() || "";
  if (!password) {
    return htmlResponse(
      "<h1>Analytics dashboard is not unlocked.</h1><p>Set the Worker secret ANALYTICS_PASSWORD, then reload.</p>",
      503
    );
  }
  if (!basicAuthorized(request, password)) {
    return htmlResponse(
      "<h1>Authentication required</h1>",
      401,
      { "WWW-Authenticate": 'Basic realm="Portfolio analytics"' }
    );
  }

  const db = env.ANALYTICS_DB;
  if (!db) {
    return htmlResponse("<h1>Analytics database is not bound.</h1>", 503);
  }
  await ensureSchema(db);

  const url = new URL(request.url);
  const requestedDays = Number(url.searchParams.get("days") || 30);
  const days = [1, 7, 30, 90, 365].includes(requestedDays) ? requestedDays : 30;
  const since = Date.now() - days * 86_400_000;

  const [metrics, daily, pages, referrers, countries, cities, devices, campaigns, outbound, songs, queries, recent, sessions] = await Promise.all([
    first(db, `SELECT
      COUNT(DISTINCT visitor_id) AS visitors,
      COUNT(DISTINCT session_id) AS sessions,
      SUM(CASE WHEN event = 'page_view' THEN 1 ELSE 0 END) AS page_views,
      SUM(CASE WHEN event = 'melodymind_query' THEN 1 ELSE 0 END) AS searches,
      SUM(CASE WHEN event = 'melodymind_probe' THEN 1 ELSE 0 END) AS probes,
      SUM(CASE WHEN event = 'melodymind_probe_answer' THEN 1 ELSE 0 END) AS probe_answers,
      SUM(CASE WHEN event = 'melodymind_results' THEN 1 ELSE 0 END) AS result_sets,
      SUM(CASE WHEN event = 'melodymind_spotify_click' THEN 1 ELSE 0 END) AS spotify_clicks,
      SUM(CASE WHEN event = 'outbound_click' THEN 1 ELSE 0 END) AS outbound_clicks
      FROM analytics_events WHERE ts >= ?`, since),
    rows(db, `SELECT date(ts / 1000, 'unixepoch') AS day,
      COUNT(DISTINCT visitor_id) AS visitors,
      SUM(CASE WHEN event = 'page_view' THEN 1 ELSE 0 END) AS page_views,
      SUM(CASE WHEN event = 'melodymind_query' THEN 1 ELSE 0 END) AS searches
      FROM analytics_events WHERE ts >= ? GROUP BY day ORDER BY day ASC`, since),
    rows(db, `SELECT path, COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS visitors
      FROM analytics_events WHERE ts >= ? AND event = 'page_view'
      GROUP BY path ORDER BY views DESC LIMIT 15`, since),
    rows(db, `SELECT CASE WHEN referrer = '' THEN 'Direct / unknown' ELSE referrer END AS label,
      COUNT(*) AS value FROM analytics_sessions WHERE started_at >= ? GROUP BY label ORDER BY value DESC LIMIT 12`, since),
    rows(db, `SELECT CASE WHEN country = '' THEN 'Unknown' ELSE country END AS label,
      COUNT(*) AS value FROM analytics_sessions WHERE started_at >= ? GROUP BY label ORDER BY value DESC LIMIT 12`, since),
    rows(db, `SELECT CASE WHEN city = '' THEN 'Unknown' ELSE city END AS label,
      COUNT(*) AS value FROM analytics_sessions WHERE started_at >= ? GROUP BY label ORDER BY value DESC LIMIT 12`, since),
    rows(db, `SELECT device AS label, COUNT(*) AS value FROM analytics_sessions
      WHERE started_at >= ? GROUP BY device ORDER BY value DESC`, since),
    rows(db, `SELECT
      CASE WHEN utm_source = '' THEN 'No UTM' ELSE utm_source || CASE WHEN utm_campaign = '' THEN '' ELSE ' · ' || utm_campaign END END AS label,
      COUNT(*) AS value FROM analytics_sessions WHERE started_at >= ? GROUP BY label ORDER BY value DESC LIMIT 12`, since),
    rows(db, `SELECT json_extract(data_json, '$.category') AS category,
      json_extract(data_json, '$.href') AS href, COUNT(*) AS clicks
      FROM analytics_events WHERE ts >= ? AND event = 'outbound_click'
      GROUP BY category, href ORDER BY clicks DESC LIMIT 20`, since),
    rows(db, `SELECT
      COALESCE(json_extract(data_json, '$.title'), json_extract(data_json, '$.label'), 'Unknown track') AS title,
      COALESCE(json_extract(data_json, '$.artist'), '') AS artist,
      COUNT(*) AS clicks
      FROM analytics_events WHERE ts >= ? AND event = 'melodymind_spotify_click'
      GROUP BY title, artist ORDER BY clicks DESC LIMIT 15`, since),
    rows(db, `SELECT ts, session_id, json_extract(data_json, '$.query') AS query
      FROM analytics_events WHERE ts >= ? AND event = 'melodymind_query'
      ORDER BY ts DESC LIMIT 40`, since),
    rows(db, `SELECT ts, session_id, event, path, data_json
      FROM analytics_events WHERE ts >= ? ORDER BY ts DESC LIMIT 80`, since),
    rows(db, `SELECT session_id, visitor_id, last_seen, landing_path, referrer, country, city, device, browser,
      utm_source, utm_campaign FROM analytics_sessions WHERE started_at >= ? ORDER BY last_seen DESC LIMIT 30`, since)
  ]);

  const views = Number(metrics.page_views || 0);
  const visitors = Number(metrics.visitors || 0);
  const searches = Number(metrics.searches || 0);
  const probes = Number(metrics.probes || 0);
  const answers = Number(metrics.probe_answers || 0);
  const results = Number(metrics.result_sets || 0);
  const spotifyClicks = Number(metrics.spotify_clicks || 0);

  const recentRows = recent.map((row) => {
    const data = parseJson(row.data_json);
    const detail = row.event === "melodymind_query"
      ? data.query
      : row.event === "melodymind_probe"
        ? data.question
        : row.event === "melodymind_probe_answer"
          ? data.answer
          : row.event === "melodymind_results"
            ? `${data.total ?? 0} results · ${data.elapsed_ms ?? "?"} ms`
            : row.event === "melodymind_spotify_click"
              ? `${data.title ?? data.label ?? "Track"}${data.artist ? ` — ${data.artist}` : ""}`
              : row.event === "outbound_click"
                ? `${data.category ?? "link"}: ${data.href ?? ""}`
                : row.event === "page_engagement"
                  ? `${Math.round(Number(data.duration_ms || 0) / 1000)}s · ${data.max_scroll ?? 0}% scroll`
                  : "";
    return { ...row, detail };
  });

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Portfolio Analytics</title>
<style>
:root{color-scheme:dark;--bg:#0b0d10;--panel:#12151a;--line:#242932;--muted:#8d96a4;--text:#f5f7fa;--accent:#85f3b5;--accent2:#8db7ff;--warn:#ffd479}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:14px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}main{width:min(1500px,calc(100% - 32px));margin:0 auto;padding:28px 0 72px}header.top{display:flex;justify-content:space-between;gap:20px;align-items:end;margin-bottom:24px}h1{font:700 clamp(25px,4vw,42px)/1.05 system-ui,sans-serif;margin:0}h2{font:650 18px/1.2 system-ui,sans-serif;margin:0 0 16px}.sub{color:var(--muted);margin-top:7px}.filters{display:flex;gap:6px;flex-wrap:wrap}.filters a{color:var(--muted);border:1px solid var(--line);padding:7px 10px;text-decoration:none;border-radius:7px}.filters a.active{color:#08100c;background:var(--accent);border-color:var(--accent)}.grid{display:grid;grid-template-columns:repeat(12,1fr);gap:12px}.card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:18px;min-width:0}.metric{grid-column:span 2}.metric strong{display:block;font:720 30px/1 system-ui,sans-serif;margin:7px 0}.metric span,.hint{color:var(--muted);font-size:12px}.wide{grid-column:span 8}.side{grid-column:span 4}.half{grid-column:span 6}.full{grid-column:1/-1}.kicker{font-size:11px;color:var(--accent);text-transform:uppercase;letter-spacing:.09em}.trend{height:180px;display:flex;align-items:end;gap:4px;padding-top:18px;overflow:hidden}.trend-day{height:100%;flex:1;min-width:7px;display:flex;flex-direction:column;justify-content:end;align-items:center;gap:6px}.trend-day i{display:block;width:100%;max-width:22px;background:linear-gradient(var(--accent2),var(--accent));border-radius:4px 4px 1px 1px}.trend-day span{font-size:9px;color:var(--muted);writing-mode:vertical-rl;display:none}.trend-day:nth-last-child(-n+10) span{display:block}.bar-list{display:grid;gap:12px}.bar-meta{display:flex;justify-content:space-between;gap:15px;white-space:nowrap}.bar-meta span{overflow:hidden;text-overflow:ellipsis}.bar-track{height:6px;background:#0b0d10;border-radius:99px;overflow:hidden;margin-top:5px}.bar-track i{display:block;height:100%;background:var(--accent2)}.table-wrap{overflow:auto;max-height:520px}table{border-collapse:collapse;width:100%;font-size:12px}th{text-align:left;color:var(--muted);font-weight:500;position:sticky;top:0;background:var(--panel);z-index:1}th,td{padding:9px 10px;border-bottom:1px solid var(--line);vertical-align:top}td{max-width:650px;word-break:break-word}.empty{color:var(--muted)}code{color:var(--accent)}.funnel{display:flex;align-items:stretch;gap:7px;overflow:auto}.step{min-width:135px;flex:1;padding:14px;background:#0d1014;border:1px solid var(--line);border-radius:9px}.step strong{display:block;font:700 22px system-ui,sans-serif}.step small{color:var(--muted)}.arrow{display:flex;align-items:center;color:var(--muted)}@media(max-width:1000px){.metric{grid-column:span 4}.wide,.side,.half{grid-column:1/-1}}@media(max-width:600px){main{width:min(100% - 18px,1500px);padding-top:18px}.metric{grid-column:span 6}header.top{align-items:start;flex-direction:column}}
</style></head><body><main>
<header class="top"><div><div class="kicker">PRIVATE · FIRST-PARTY</div><h1>Portfolio Analytics</h1><div class="sub">Last ${days} day${days === 1 ? "" : "s"} · times shown in Pakistan time · no raw IP addresses stored</div></div><nav class="filters">${[1,7,30,90,365].map((value) => `<a class="${days === value ? "active" : ""}" href="?days=${value}">${value === 365 ? "1y" : `${value}d`}</a>`).join("")}</nav></header>
<section class="grid">
<div class="card metric"><span>VISITORS</span><strong>${formatNumber(visitors)}</strong><span>${views ? (views / Math.max(visitors,1)).toFixed(1) : "0"} views / visitor</span></div>
<div class="card metric"><span>SESSIONS</span><strong>${formatNumber(metrics.sessions)}</strong><span>anonymous browser sessions</span></div>
<div class="card metric"><span>PAGE VIEWS</span><strong>${formatNumber(views)}</strong><span>all portfolio routes</span></div>
<div class="card metric"><span>MM SEARCHES</span><strong>${formatNumber(searches)}</strong><span>${percent(searches, visitors)} of visitors</span></div>
<div class="card metric"><span>SPOTIFY CLICKS</span><strong>${formatNumber(spotifyClicks)}</strong><span>${percent(spotifyClicks, results)} of result sets</span></div>
<div class="card metric"><span>OUTBOUND CLICKS</span><strong>${formatNumber(metrics.outbound_clicks)}</strong><span>GitHub · LinkedIn · CV · etc.</span></div>
<div class="card full"><h2>MelodyMind funnel</h2><div class="funnel">
<div class="step"><small>Queries</small><strong>${formatNumber(searches)}</strong></div><div class="arrow">→</div>
<div class="step"><small>Probes</small><strong>${formatNumber(probes)}</strong><small>${percent(probes, searches)} of queries</small></div><div class="arrow">→</div>
<div class="step"><small>Probe answers</small><strong>${formatNumber(answers)}</strong><small>${percent(answers, probes)} response rate</small></div><div class="arrow">→</div>
<div class="step"><small>Result sets</small><strong>${formatNumber(results)}</strong><small>${percent(results, searches)} query→results</small></div><div class="arrow">→</div>
<div class="step"><small>Spotify clicks</small><strong>${formatNumber(spotifyClicks)}</strong><small>${percent(spotifyClicks, results)} results→click</small></div>
</div></div>
<div class="card wide"><h2>Traffic trend</h2>${trendChart(daily)}</div>
<div class="card side"><h2>Top referrers</h2>${barList(referrers,"label","value")}</div>
<div class="card half"><h2>Top pages</h2>${table(["Page","Views","Visitors"],pages,row=>[escapeHtml(row.path),formatNumber(row.views),formatNumber(row.visitors)])}</div>
<div class="card half"><h2>Countries</h2>${barList(countries,"label","value")}</div>
<div class="card half"><h2>Cities</h2>${barList(cities,"label","value")}</div>
<div class="card half"><h2>Devices</h2>${barList(devices,"label","value")}</div>
<div class="card half"><h2>Campaigns / UTM</h2>${barList(campaigns,"label","value")}</div>
<div class="card half"><h2>Top outbound links</h2>${table(["Type","Destination","Clicks"],outbound,row=>[escapeHtml(row.category||"link"),escapeHtml(row.href),formatNumber(row.clicks)])}</div>
<div class="card half"><h2>Spotify tracks people opened</h2>${table(["Track","Artist","Clicks"],songs,row=>[escapeHtml(row.title),escapeHtml(row.artist),formatNumber(row.clicks)])}</div>
<div class="card half"><h2>Recent MelodyMind queries</h2>${table(["Time","Session","Query"],queries,row=>[escapeHtml(formatDate(row.ts)),`<code>${escapeHtml(String(row.session_id||"").slice(0,8))}</code>`,escapeHtml(row.query)])}</div>
<div class="card half"><h2>Recent sessions</h2>${table(["Last seen","Visitor","Landing","Location","Device","Source"],sessions,row=>[escapeHtml(formatDate(row.last_seen)),`<code>${escapeHtml(String(row.visitor_id||"").slice(0,8))}</code>`,escapeHtml(row.landing_path),escapeHtml([row.city,row.country].filter(Boolean).join(", ")||"—"),escapeHtml(`${row.device||""} · ${row.browser||""}`),escapeHtml(row.utm_source||row.referrer||"Direct")])}</div>
<div class="card full"><h2>Live-ish activity stream</h2><p class="hint">Useful for reconstructing anonymous journeys and debugging MelodyMind behavior.</p>${table(["Time","Session","Event","Page","Detail"],recentRows,row=>[escapeHtml(formatDate(row.ts)),`<code>${escapeHtml(String(row.session_id||"").slice(0,8))}</code>`,escapeHtml(row.event),escapeHtml(row.path),escapeHtml(row.detail)])}</div>
</section></main></body></html>`;

  return htmlResponse(html);
}
