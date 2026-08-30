"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_MUSIC_API_URL?.replace(/\/$/, "");
const VISITOR_KEY = "portfolio_visitor_id";
const SESSION_KEY = "portfolio_session_id";
const SESSION_LAST_KEY = "portfolio_session_last";
const OWNER_KEY = "portfolio_analytics_owner";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const OBVIOUS_BOT_RE = /(?:googlebot|bingbot|duckduckbot|yandexbot|baiduspider|slurp|facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|discordbot|telegrambot|applebot|crawler|spider)/i;

type Identity = { visitorId: string; sessionId: string };

type AnalyticsPayload = {
  event: string;
  path?: string;
  data?: Record<string, unknown>;
};

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
}

function isObviousBot(): boolean {
  if (typeof navigator === "undefined") return false;
  return OBVIOUS_BOT_RE.test(navigator.userAgent || "");
}

function analyticsOptedOut(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    const ownerMarker = params.get("analytics_owner");

    if (ownerMarker === "1" || ownerMarker === "0") {
      if (ownerMarker === "1") {
        window.localStorage.setItem(OWNER_KEY, "1");
      } else {
        window.localStorage.removeItem(OWNER_KEY);
      }

      // Reset any old analytics identity when toggling owner mode so an owner
      // browser cannot later be stitched back onto its pre-opt-out sessions.
      window.localStorage.removeItem(VISITOR_KEY);
      window.localStorage.removeItem(SESSION_KEY);
      window.localStorage.removeItem(SESSION_LAST_KEY);

      params.delete("analytics_owner");
      const search = params.toString();
      const cleanUrl = `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`;
      window.history.replaceState(window.history.state, "", cleanUrl);
    }

    return window.localStorage.getItem(OWNER_KEY) === "1";
  } catch {
    return false;
  }
}

function getIdentity(): Identity | null {
  if (typeof window === "undefined" || isObviousBot() || analyticsOptedOut()) return null;
  try {
    let visitorId = window.localStorage.getItem(VISITOR_KEY) || "";
    if (!visitorId) {
      visitorId = uuid();
      window.localStorage.setItem(VISITOR_KEY, visitorId);
    }

    const now = Date.now();
    const lastSeen = Number(window.localStorage.getItem(SESSION_LAST_KEY) || 0);
    let sessionId = window.localStorage.getItem(SESSION_KEY) || "";
    if (!sessionId || !lastSeen || now - lastSeen > SESSION_TIMEOUT_MS) {
      sessionId = uuid();
      window.localStorage.setItem(SESSION_KEY, sessionId);
    }
    window.localStorage.setItem(SESSION_LAST_KEY, String(now));
    return { visitorId, sessionId };
  } catch {
    return null;
  }
}

function categoryForLink(anchor: HTMLAnchorElement): string {
  const href = anchor.href.toLowerCase();
  const text = (anchor.textContent || "").toLowerCase();
  if (href.includes("linkedin.com")) return "linkedin";
  if (href.includes("github.com")) return "github";
  if (href.includes("open.spotify.com")) return "spotify";
  if (/\.(pdf|docx?)(?:$|[?#])/.test(href) || text.includes("resume") || text.includes("cv")) return "resume";
  if (href.startsWith("mailto:")) return "email";
  return "external";
}

function analyticsUrl(): string | null {
  if (!API_BASE) return null;
  const root = API_BASE.endsWith("/api") ? API_BASE : `${API_BASE}/api`;
  return `${root}/analytics/event`;
}

function currentUtm() {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source") || "",
    utm_medium: params.get("utm_medium") || "",
    utm_campaign: params.get("utm_campaign") || ""
  };
}

function sendEvent(payload: AnalyticsPayload) {
  const endpoint = analyticsUrl();
  const identity = getIdentity();
  if (!endpoint || !identity) return;

  const body = JSON.stringify({
    event: payload.event,
    visitor_id: identity.visitorId,
    session_id: identity.sessionId,
    path: payload.path || window.location.pathname,
    title: document.title,
    referrer: document.referrer,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    screen_width: window.screen.width,
    screen_height: window.screen.height,
    ...currentUtm(),
    data: payload.data || {}
  });

  void fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true
  }).catch(() => undefined);
}

function patchApiFetch(): () => void {
  if (!API_BASE || typeof window === "undefined") return () => undefined;
  const original = window.fetch.bind(window);
  const apiRoot = new URL(API_BASE, window.location.href).origin;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    let target = "";
    try {
      target = input instanceof Request ? input.url : new URL(String(input), window.location.href).toString();
    } catch {
      return original(input, init);
    }

    if (new URL(target).origin !== apiRoot) return original(input, init);
    const identity = getIdentity();
    if (!identity) return original(input, init);

    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    if (init?.headers) new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    headers.set("X-Analytics-Visitor", identity.visitorId);
    headers.set("X-Analytics-Session", identity.sessionId);
    headers.set("X-Analytics-Path", window.location.pathname);

    if (input instanceof Request) {
      return original(new Request(input, { ...init, headers }));
    }
    return original(input, { ...init, headers });
  };

  return () => {
    window.fetch = original;
  };
}

export function AnalyticsTracker() {
  const pathname = usePathname();
  const lastPathRef = useRef<string>("");

  useEffect(() => patchApiFetch(), []);

  useEffect(() => {
    if (!pathname || lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;
    const trackedPath = pathname;
    sendEvent({ event: "page_view", path: trackedPath });

    const startedAt = Date.now();
    let maxScroll = 0;
    let finished = false;
    const fired = new Set<number>();
    const thresholds = [25, 50, 75, 100];

    const updateScroll = () => {
      const root = document.documentElement;
      const scrollable = Math.max(1, root.scrollHeight - window.innerHeight);
      const percent = Math.min(100, Math.round((window.scrollY / scrollable) * 100));
      maxScroll = Math.max(maxScroll, percent);
      for (const threshold of thresholds) {
        if (percent >= threshold && !fired.has(threshold)) {
          fired.add(threshold);
          sendEvent({ event: "scroll_depth", path: trackedPath, data: { percent: threshold } });
        }
      }
    };

    const finish = () => {
      if (finished) return;
      finished = true;
      sendEvent({
        event: "page_engagement",
        path: trackedPath,
        data: { duration_ms: Date.now() - startedAt, max_scroll: maxScroll }
      });
    };

    const engagedTimer = window.setTimeout(() => {
      if (document.visibilityState === "visible") {
        sendEvent({ event: "engaged_30s", path: trackedPath });
      }
    }, 30_000);

    window.addEventListener("scroll", updateScroll, { passive: true });
    window.addEventListener("pagehide", finish, { once: true });
    updateScroll();

    return () => {
      window.clearTimeout(engagedTimer);
      window.removeEventListener("scroll", updateScroll);
      window.removeEventListener("pagehide", finish);
      finish();
    };
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;

      let destination: URL;
      try {
        destination = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      const category = categoryForLink(anchor);
      const label = (anchor.textContent || anchor.getAttribute("aria-label") || "").trim().slice(0, 200);
      const sameSite = destination.hostname === window.location.hostname;

      if (category === "spotify") {
        const row = anchor.closest(".mm-result");
        const product = anchor.closest(".mm-product") as HTMLElement | null;
        const rank = Number(row?.querySelector(".mm-result__number")?.textContent || 0) || undefined;
        const title = row?.querySelector(".mm-result__track strong")?.textContent?.trim() || anchor.getAttribute("aria-label") || "";
        const artist = row?.querySelector(".mm-result__track small")?.textContent?.trim() || "";
        const searchId = product?.dataset.searchId || "";
        const shownAt = Number(product?.dataset.resultsShownAt || 0);
        sendEvent({
          event: "melodymind_spotify_click",
          data: {
            search_id: searchId,
            href: destination.toString(),
            rank,
            title,
            artist,
            since_results_ms: shownAt ? Math.max(0, Date.now() - shownAt) : 0
          }
        });
        return;
      }

      if (sameSite && category !== "resume") {
        sendEvent({
          event: "internal_click",
          data: {
            href: `${destination.pathname}${destination.hash}`,
            label
          }
        });
        return;
      }

      sendEvent({
        event: "outbound_click",
        data: {
          category,
          href: destination.toString(),
          label
        }
      });
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
