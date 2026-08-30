import type { AnalyticsEnv, D1Database } from "./analytics";

type Row = Record<string, unknown>;
type SearchRecord = {
  id: string;
  sessionId: string;
  visitorId: string;
  startedAt: number;
  query: string;
  source: string;
  previousId: string;
  attempt: number;
  probe: string;
  answer: string;
  probeResponseMs: number;
  planMs: number;
  searchMs: number;
  timeToResultsMs: number;
  feedback: string;
  clicks: Array<{ rank: number; title: string; artist: string; delayMs: number }>;
  results: Array<Record<string, unknown>>;
  telemetry: Record<string, unknown>;
  error: string;
  abandoned: string;
  restarted: string;
};

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function json(value: unknown): Record<string, unknown> {
  try {
    const parsed = JSON.parse(String(value || "{}"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function array(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
}

function n(value: unknown): number {
  const valueNumber = Number(value || 0);
  return Number.isFinite(valueNumber) ? valueNumber : 0;
}

function formatNumber(value: unknown): string {
  return new Intl.NumberFormat("en").format(n(value));
}

function formatDate(value: unknown): string {
  const number = n(value);
  if (!number) return "—";
  return new Date(number).toLocaleString("en-GB", {
    timeZone: "Asia/Karachi",
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function formatMs(value: unknown): string {
  const ms = n(value);
  if (!ms) return "—";
  return ms >= 1000 ? `${(ms / 1000).toFixed(ms >= 10_000 ? 1 : 2)}s` : `${Math.round(ms)}ms`;
}

function pct(a: number, b: number): string {
  return b ? `${Math.round((a / b) * 100)}%` : "0%";
}

function median(values: number[]): number {
  const clean = values.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
  if (!clean.length) return 0;
  const mid = Math.floor(clean.length / 2);
  return clean.length % 2 ? clean[mid] : (clean[mid - 1] + clean[mid]) / 2;
}

async function rows(db: D1Database, sql: string, ...values: unknown[]): Promise<Row[]> {
  return (await db.prepare(sql).bind(...values).all<Row>()).results ?? [];
}

async function first(db: D1Database, sql: string, ...values: unknown[]): Promise<Row> {
  return (await db.prepare(sql).bind(...values).first<Row>()) ?? {};
}

function authorized(request: Request, password: string): boolean {
  const header = request.headers.get("Authorization") || "";
  if (!header.startsWith("Basic ")) return false;
  try {
    const decoded = atob(header.slice(6));
    const separator = decoded.indexOf(":");
    return separator >= 0 && decoded.slice(separator + 1) === password;
  } catch {
    return false;
  }
}

function response(body: string, status = 200, extra?: HeadersInit): Response {
  const headers = new Headers(extra);
  headers.set("Content-Type", "text/html; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'self'");
  return new Response(body, { status, headers });
}

function groupSearches(eventRows: Row[]): SearchRecord[] {
  const searches = new Map<string, SearchRecord>();
  const ensure = (id: string, row: Row): SearchRecord => {
    let search = searches.get(id);
    if (!search) {
      search = {
        id,
        sessionId: String(row.session_id || ""),
        visitorId: String(row.visitor_id || ""),
        startedAt: n(row.ts),
        query: "",
        source: "",
        previousId: "",
        attempt: 0,
        probe: "",
        answer: "",
        probeResponseMs: 0,
        planMs: 0,
        searchMs: 0,
        timeToResultsMs: 0,
        feedback: "",
        clicks: [],
        results: [],
        telemetry: {},
        error: "",
        abandoned: "",
        restarted: ""
      };
      searches.set(id, search);
    }
    return search;
  };

  for (const row of eventRows) {
    const data = json(row.data_json);
    const id = String(data.search_id || "");
    if (!id) continue;
    const search = ensure(id, row);
    search.startedAt = Math.min(search.startedAt || n(row.ts), n(row.ts));
    const event = String(row.event || "");
    if (event === "melodymind_query") {
      search.query = String(data.query || "");
      search.source = String(data.query_source || "typed");
      search.previousId = String(data.previous_search_id || "");
      search.attempt = n(data.attempt_index);
    } else if (event === "melodymind_probe") {
      search.probe = String(data.question || "");
      search.planMs = n(data.elapsed_ms);
    } else if (event === "melodymind_probe_answer") {
      search.answer = String(data.answer || "");
      search.probeResponseMs = n(data.probe_response_ms);
    } else if (event === "melodymind_search_ready") {
      search.planMs = Math.max(search.planMs, n(data.elapsed_ms));
    } else if (event === "melodymind_results") {
      search.searchMs = n(data.elapsed_ms);
      search.results = array(data.results);
      search.telemetry = data.telemetry && typeof data.telemetry === "object" && !Array.isArray(data.telemetry)
        ? data.telemetry as Record<string, unknown>
        : {};
    } else if (event === "melodymind_results_rendered") {
      search.timeToResultsMs = n(data.time_to_results_ms);
    } else if (event === "melodymind_spotify_click") {
      search.clicks.push({
        rank: n(data.rank),
        title: String(data.title || ""),
        artist: String(data.artist || ""),
        delayMs: n(data.since_results_ms)
      });
    } else if (event === "melodymind_feedback") {
      search.feedback = String(data.value || "");
    } else if (event === "melodymind_error") {
      search.error = `${String(data.stage || "")}: ${String(data.error || "error")}`;
    } else if (event === "melodymind_abandon") {
      search.abandoned = String(data.stage || "unknown");
    } else if (event === "melodymind_restart") {
      search.restarted = String(data.stage || "unknown");
    }
  }

  return [...searches.values()]
    .filter((search) => search.query || search.results.length || search.probe)
    .sort((a, b) => b.startedAt - a.startedAt);
}

function metric(label: string, value: string, note = ""): string {
  return `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>${note ? `<small>${escapeHtml(note)}</small>` : ""}</div>`;
}

function barList(data: Row[], labelKey: string, valueKey: string): string {
  if (!data.length) return '<p class="empty">No data yet.</p>';
  const max = Math.max(...data.map((row) => n(row[valueKey])), 1);
  return `<div class="bars">${data.map((row) => {
    const value = n(row[valueKey]);
    return `<div class="bar"><div><span>${escapeHtml(row[labelKey] || "Unknown")}</span><strong>${formatNumber(value)}</strong></div><i><b style="width:${Math.max(2, Math.round((value / max) * 100))}%"></b></i></div>`;
  }).join("")}</div>`;
}

function searchCard(search: SearchRecord): string {
  const telemetry = search.telemetry;
  const views = array(telemetry.views);
  const ranking = array(telemetry.ranking);
  const resultRows = search.results.map((result) => {
    const rank = n(result.rank);
    const clicked = search.clicks.some((click) => click.rank === rank);
    return `<tr class="${clicked ? "clicked" : ""}"><td>${rank}</td><td><b>${escapeHtml(result.title)}</b><small>${escapeHtml(result.artist)}</small></td><td>${Number(result.score || 0).toFixed(4)}</td><td>${clicked ? "CLICK" : ""}</td></tr>`;
  }).join("");
  const rankRows = ranking.map((candidate) => {
    const fused = n(candidate.fused_rank);
    const finalRank = n(candidate.final_rank);
    const move = fused && finalRank ? fused - finalRank : 0;
    const sourceRanks = candidate.source_ranks && typeof candidate.source_ranks === "object"
      ? Object.entries(candidate.source_ranks as Record<string, unknown>)
        .sort((a, b) => n(a[1]) - n(b[1]))
        .map(([key, value]) => `${key}:${value}`)
        .join(" · ")
      : "";
    return `<tr><td>${finalRank}</td><td><b>${escapeHtml(candidate.title)}</b><small>${escapeHtml(candidate.artist)}</small></td><td>${fused}</td><td class="${move > 0 ? "up" : move < 0 ? "down" : ""}">${move > 0 ? `+${move}` : move}</td><td>${escapeHtml(candidate.fit)}/${escapeHtml(candidate.confidence)}</td><td class="sources">${escapeHtml(sourceRanks)}</td></tr>`;
  }).join("");

  const status = search.feedback === "hit"
    ? '<span class="pill good">HIT</span>'
    : search.feedback === "miss"
      ? '<span class="pill bad">MISS</span>'
      : search.clicks.length
        ? '<span class="pill good">CLICKED</span>'
        : search.error
          ? '<span class="pill bad">ERROR</span>'
          : search.abandoned
            ? '<span class="pill warn">ABANDONED</span>'
            : '<span class="pill">NO SIGNAL</span>';

  return `<details class="search-card"><summary><div><span class="time">${escapeHtml(formatDate(search.startedAt))}</span><b>${escapeHtml(search.query || "Search")}</b><small>${escapeHtml(search.source || "typed")} · ${search.clicks.length} clicks${search.previousId ? " · reformulation/repeat" : ""}</small></div>${status}</summary><div class="search-body">
    <div class="timeline">
      ${search.probe ? `<div><span>PROBE</span><p>${escapeHtml(search.probe)}</p></div>` : ""}
      ${search.answer ? `<div><span>ANSWER</span><p>${escapeHtml(search.answer)}</p></div>` : ""}
      ${telemetry.resolved_request ? `<div><span>RESOLVED</span><p>${escapeHtml(telemetry.resolved_request)}</p></div>` : ""}
      ${search.error ? `<div><span>ERROR</span><p>${escapeHtml(search.error)}</p></div>` : ""}
    </div>
    <div class="mini-metrics">
      ${metric("Plan", formatMs(search.planMs))}
      ${metric("Probe reply", formatMs(search.probeResponseMs))}
      ${metric("Search", formatMs(search.searchMs))}
      ${metric("End-to-end", formatMs(search.timeToResultsMs))}
      ${metric("First click", formatMs(search.clicks[0]?.delayMs || 0))}
    </div>
    ${views.length ? `<h4>Retrieval views</h4><div class="views">${views.map((view) => `<div><span>${escapeHtml(view.label)} · w=${escapeHtml(view.weight)}</span><p>${escapeHtml(view.text)}</p></div>`).join("")}</div>` : ""}
    ${resultRows ? `<h4>Final exposure</h4><div class="table"><table><thead><tr><th>#</th><th>Track</th><th>raw score</th><th>signal</th></tr></thead><tbody>${resultRows}</tbody></table></div>` : ""}
    ${rankRows ? `<h4>Retrieval → LLM reranking diagnostics</h4><div class="table"><table><thead><tr><th>final</th><th>Track</th><th>fused</th><th>move</th><th>fit/conf</th><th>per-view ranks</th></tr></thead><tbody>${rankRows}</tbody></table></div>` : ""}
    <div class="ids">search ${escapeHtml(search.id)} · session ${escapeHtml(search.sessionId.slice(0, 12))}${search.previousId ? ` · previous ${escapeHtml(search.previousId.slice(0, 12))}` : ""}</div>
  </div></details>`;
}

export async function renderFullAnalyticsDashboard(request: Request, env: AnalyticsEnv): Promise<Response> {
  const password = env.ANALYTICS_PASSWORD?.trim() || "";
  if (!password) return response("<h1>Set ANALYTICS_PASSWORD first.</h1>", 503);
  if (!authorized(request, password)) {
    return response("<h1>Authentication required</h1>", 401, { "WWW-Authenticate": 'Basic realm="Portfolio analytics"' });
  }
  const db = env.ANALYTICS_DB;
  if (!db) return response("<h1>ANALYTICS_DB is not bound.</h1>", 503);

  const url = new URL(request.url);
  const requestedDays = Number(url.searchParams.get("days") || 30);
  const days = [1, 7, 30, 90, 365].includes(requestedDays) ? requestedDays : 30;
  const since = Date.now() - days * 86_400_000;

  const [summary, returningRow, pageRows, referrerRows, countryRows, deviceRows, campaignRows, eventRows] = await Promise.all([
    first(db, `SELECT COUNT(DISTINCT visitor_id) visitors, COUNT(DISTINCT session_id) sessions,
      SUM(CASE WHEN event='page_view' THEN 1 ELSE 0 END) page_views,
      SUM(CASE WHEN event='outbound_click' THEN 1 ELSE 0 END) outbound
      FROM analytics_events WHERE ts>=?`, since),
    first(db, `SELECT COUNT(*) returning FROM (
      SELECT visitor_id FROM analytics_sessions WHERE started_at>=? GROUP BY visitor_id HAVING COUNT(*)>1
    )`, since),
    rows(db, `SELECT path label, COUNT(*) value FROM analytics_events WHERE ts>=? AND event='page_view' GROUP BY path ORDER BY value DESC LIMIT 12`, since),
    rows(db, `SELECT CASE WHEN referrer='' THEN 'Direct / unknown' ELSE referrer END label, COUNT(*) value FROM analytics_sessions WHERE started_at>=? GROUP BY label ORDER BY value DESC LIMIT 10`, since),
    rows(db, `SELECT CASE WHEN country='' THEN 'Unknown' ELSE country END label, COUNT(*) value FROM analytics_sessions WHERE started_at>=? GROUP BY label ORDER BY value DESC LIMIT 10`, since),
    rows(db, `SELECT CASE WHEN device='' THEN 'Unknown' ELSE device END label, COUNT(*) value FROM analytics_sessions WHERE started_at>=? GROUP BY label ORDER BY value DESC`, since),
    rows(db, `SELECT CASE WHEN utm_source='' THEN 'No UTM' ELSE utm_source || CASE WHEN utm_campaign='' THEN '' ELSE ' · ' || utm_campaign END END label, COUNT(*) value FROM analytics_sessions WHERE started_at>=? GROUP BY label ORDER BY value DESC LIMIT 10`, since),
    rows(db, `SELECT ts,visitor_id,session_id,event,data_json FROM analytics_events WHERE ts>=? AND event LIKE 'melodymind_%' ORDER BY ts ASC LIMIT 10000`, since)
  ]);

  const searches = groupSearches(eventRows);
  const realSearches = searches.filter((search) => search.query);
  const typed = realSearches.filter((search) => !search.source.startsWith("example"));
  const probed = realSearches.filter((search) => search.probe);
  const answered = realSearches.filter((search) => search.answer);
  const withResults = realSearches.filter((search) => search.results.length);
  const withClicks = realSearches.filter((search) => search.clicks.length);
  const repeats = realSearches.filter((search) => search.previousId);
  const feedback = realSearches.filter((search) => search.feedback);
  const hits = feedback.filter((search) => search.feedback === "hit");
  const misses = feedback.filter((search) => search.feedback === "miss");

  const rankExposure = new Map<number, { shown: number; clicks: number }>();
  const tracks = new Map<string, { title: string; artist: string; shown: number; clicks: number }>();
  for (const search of withResults) {
    for (const result of search.results) {
      const rank = n(result.rank);
      if (rank) {
        const value = rankExposure.get(rank) || { shown: 0, clicks: 0 };
        value.shown += 1;
        rankExposure.set(rank, value);
      }
      const key = `${String(result.title || "")}\0${String(result.artist || "")}`;
      const track = tracks.get(key) || { title: String(result.title || ""), artist: String(result.artist || ""), shown: 0, clicks: 0 };
      track.shown += 1;
      tracks.set(key, track);
    }
    for (const click of search.clicks) {
      if (click.rank) {
        const value = rankExposure.get(click.rank) || { shown: 0, clicks: 0 };
        value.clicks += 1;
        rankExposure.set(click.rank, value);
      }
      const key = `${click.title}\0${click.artist}`;
      const track = tracks.get(key);
      if (track) track.clicks += 1;
    }
  }

  const trackRows = [...tracks.values()]
    .filter((track) => track.shown >= 1)
    .sort((a, b) => (b.clicks / b.shown) - (a.clicks / a.shown) || b.shown - a.shown)
    .slice(0, 15);
  const rankRows = [...rankExposure.entries()].sort((a, b) => a[0] - b[0]);

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Portfolio Analytics</title><style>
  :root{color-scheme:dark;--bg:#090b0e;--panel:#11151a;--line:#252b33;--text:#f4f6f8;--muted:#8b95a3;--green:#78e6a5;--red:#ff8a8a;--amber:#ffd27a;--blue:#83b7ff}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace}main{width:min(1500px,calc(100% - 30px));margin:auto;padding:28px 0 80px}h1,h2,h3,h4{font-family:system-ui,sans-serif}h1{font-size:clamp(28px,4vw,48px);margin:0}h2{font-size:20px;margin:34px 0 14px}h3{font-size:15px;margin:0 0 14px}h4{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin:22px 0 8px}.top{display:flex;justify-content:space-between;gap:20px;align-items:end}.sub,.empty{color:var(--muted)}.filters{display:flex;gap:6px;flex-wrap:wrap}.filters a{padding:7px 10px;border:1px solid var(--line);border-radius:7px;color:var(--muted);text-decoration:none}.filters a.active{background:var(--green);color:#07100a;border-color:var(--green)}.metrics{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-top:22px}.metric{min-width:0;padding:14px;border:1px solid var(--line);border-radius:10px;background:var(--panel)}.metric span{display:block;color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.08em}.metric strong{display:block;font:700 26px/1.1 system-ui,sans-serif;margin-top:7px}.metric small{display:block;color:var(--muted);margin-top:5px}.grid{display:grid;grid-template-columns:repeat(12,1fr);gap:10px}.card{grid-column:span 4;padding:16px;border:1px solid var(--line);border-radius:10px;background:var(--panel)}.card.wide{grid-column:span 6}.bars{display:grid;gap:10px}.bar>div{display:flex;justify-content:space-between;gap:10px}.bar span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#c9ced5}.bar i{display:block;height:4px;margin-top:4px;background:#20262d}.bar b{display:block;height:100%;background:var(--blue)}.funnel{display:grid;grid-template-columns:repeat(6,1fr);gap:8px}.funnel .metric strong{font-size:20px}.searches{display:grid;gap:9px}.search-card{border:1px solid var(--line);border-radius:10px;background:var(--panel);overflow:hidden}.search-card summary{display:flex;justify-content:space-between;align-items:center;gap:20px;padding:13px 15px;cursor:pointer;list-style:none}.search-card summary::-webkit-details-marker{display:none}.search-card summary>div{min-width:0}.search-card summary b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:650 14px/1.35 system-ui,sans-serif}.search-card summary small,.time{display:block;color:var(--muted);font-size:10px}.search-body{padding:0 15px 18px;border-top:1px solid var(--line)}.pill{flex:0 0 auto;border:1px solid var(--line);border-radius:999px;padding:5px 8px;color:var(--muted);font-size:9px}.pill.good{color:var(--green);border-color:#285b3b}.pill.bad{color:var(--red);border-color:#633}.pill.warn{color:var(--amber);border-color:#675327}.timeline{display:grid;gap:8px;margin-top:14px}.timeline>div,.views>div{padding:10px 12px;border-left:2px solid #303842;background:#0d1014}.timeline span,.views span{color:var(--muted);font-size:9px;letter-spacing:.08em}.timeline p,.views p{margin:4px 0 0;color:#d5d9de}.mini-metrics{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;margin-top:10px}.mini-metrics .metric strong{font-size:16px}.views{display:grid;grid-template-columns:repeat(2,1fr);gap:7px}.table{overflow:auto;border:1px solid var(--line);border-radius:7px}table{width:100%;border-collapse:collapse;white-space:nowrap}th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #20262d}th{color:var(--muted);font-size:9px;text-transform:uppercase}td small{display:block;color:var(--muted)}tr.clicked{background:rgba(120,230,165,.07)}.up{color:var(--green)}.down{color:var(--red)}.sources{font-size:10px;color:var(--muted)}.ids{margin-top:12px;color:#59616c;font-size:9px}.track-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.track-list{border:1px solid var(--line);border-radius:10px;background:var(--panel);padding:14px}.track-row{display:grid;grid-template-columns:minmax(0,1fr) 55px 55px 55px;gap:8px;padding:7px 0;border-bottom:1px solid #20262d}.track-row span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rank-row{display:grid;grid-template-columns:36px 1fr 1fr 1fr;gap:8px;padding:6px 0;border-bottom:1px solid #20262d}@media(max-width:1000px){.metrics{grid-template-columns:repeat(3,1fr)}.card,.card.wide{grid-column:span 6}.funnel{grid-template-columns:repeat(3,1fr)}.mini-metrics{grid-template-columns:repeat(3,1fr)}}@media(max-width:680px){.top{align-items:start;flex-direction:column}.metrics,.funnel,.mini-metrics{grid-template-columns:repeat(2,1fr)}.card,.card.wide{grid-column:1/-1}.views,.track-grid{grid-template-columns:1fr}.search-card summary{align-items:start}.sources{max-width:260px;overflow:hidden;text-overflow:ellipsis}}
  </style></head><body><main><header class="top"><div><h1>Portfolio analytics</h1><div class="sub">Passive product evidence · Asia/Karachi time · ${days}-day window</div></div><nav class="filters">${[1,7,30,90,365].map((d)=>`<a class="${d===days?"active":""}" href="?days=${d}">${d===365?"1y":`${d}d`}</a>`).join("")}<a href="">Refresh</a></nav></header>
  <div class="metrics">${metric("Visitors", formatNumber(summary.visitors), `${formatNumber(returningRow.returning)} returning`)}${metric("Sessions", formatNumber(summary.sessions))}${metric("Page views", formatNumber(summary.page_views))}${metric("Real MelodyMind queries", formatNumber(typed.length), `${realSearches.length-typed.length} example-driven`)}${metric("Spotify conversion", pct(withClicks.length, withResults.length), `${withClicks.length}/${withResults.length} result sets`)}${metric("Feedback hit rate", pct(hits.length, feedback.length), `${hits.length} hit · ${misses.length} miss`)}</div>
  <h2>MelodyMind funnel</h2><div class="funnel">${metric("Queries", formatNumber(realSearches.length))}${metric("Probed", formatNumber(probed.length), pct(probed.length, realSearches.length))}${metric("Answered", formatNumber(answered.length), pct(answered.length, probed.length))}${metric("Results", formatNumber(withResults.length), pct(withResults.length, realSearches.length))}${metric("Spotify click", formatNumber(withClicks.length), pct(withClicks.length, withResults.length))}${metric("Repeat / reformulate", formatNumber(repeats.length), pct(repeats.length, realSearches.length))}</div>
  <div class="metrics">${metric("Median plan", formatMs(median(realSearches.map(s=>s.planMs))))}${metric("Median probe reply", formatMs(median(answered.map(s=>s.probeResponseMs))))}${metric("Median retrieval", formatMs(median(withResults.map(s=>s.searchMs))))}${metric("Median end-to-end", formatMs(median(withResults.map(s=>s.timeToResultsMs))))}${metric("Median first click", formatMs(median(withClicks.map(s=>s.clicks[0]?.delayMs||0))))}${metric("Abandoned active search", formatNumber(realSearches.filter(s=>s.abandoned).length))}</div>
  <h2>Traffic</h2><div class="grid"><section class="card"><h3>Top pages</h3>${barList(pageRows,"label","value")}</section><section class="card"><h3>Referrers</h3>${barList(referrerRows,"label","value")}</section><section class="card"><h3>Countries</h3>${barList(countryRows,"label","value")}</section><section class="card"><h3>Devices</h3>${barList(deviceRows,"label","value")}</section><section class="card wide"><h3>Campaigns / story links</h3>${barList(campaignRows,"label","value")}</section></div>
  <h2>Recommendation behavior</h2><div class="track-grid"><section class="track-list"><h3>Tracks by observed CTR</h3>${trackRows.length?trackRows.map((track)=>`<div class="track-row"><span>${escapeHtml(track.title)}<small>${escapeHtml(track.artist)}</small></span><b>${track.shown} shown</b><b>${track.clicks} click</b><b>${pct(track.clicks,track.shown)}</b></div>`).join(""):'<p class="empty">No exposures yet.</p>'}</section><section class="track-list"><h3>Position bias</h3>${rankRows.length?rankRows.map(([rank,value])=>`<div class="rank-row"><b>#${rank}</b><span>${value.shown} shown</span><span>${value.clicks} clicks</span><span>${pct(value.clicks,value.shown)}</span></div>`).join(""):'<p class="empty">No rank data yet.</p>'}</section></div>
  <h2>Recent MelodyMind searches</h2><div class="sub" style="margin-bottom:10px">Open a row to see the complete conversation, exposure, clicks, retrieval views and LLM rerank movement.</div><div class="searches">${realSearches.slice(0,50).map(searchCard).join("") || '<p class="empty">No searches yet.</p>'}</div>
  </main></body></html>`;

  return response(html);
}
