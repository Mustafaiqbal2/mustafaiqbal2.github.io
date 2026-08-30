export type MelodyMindEnv = {
  MELODYMIND_SEARCH_URL: string;
  MELODYMIND_SERVICE_TOKEN: string;
};

export type CatalogueMatch = {
  trackId: string;
  spotifyId: string;
  title: string;
  artist: string;
  album: string | null;
  score: number;
};

export type CatalogueResponse = {
  query: string;
  results: CatalogueMatch[];
};

type Json = Record<string, unknown>;

function object(value: unknown, context: string): Json {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Invalid MelodyMind " + context);
  }
  return value as Json;
}

function requiredString(value: unknown, context: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("Invalid MelodyMind " + context);
  }
  return value;
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function normalizeMatch(value: unknown): CatalogueMatch {
  const match = object(value, "search match");
  if (typeof match.score !== "number" || !Number.isFinite(match.score)) {
    throw new Error("Invalid MelodyMind match score");
  }
  return {
    trackId: requiredString(match.track_id, "track_id"),
    spotifyId: requiredString(match.spotify_id, "spotify_id"),
    title: requiredString(match.title, "title"),
    artist: requiredString(match.artist, "artist"),
    album: optionalString(match.album),
    score: match.score
  };
}

export async function searchCatalogue(
  query: string,
  limit: number,
  env: MelodyMindEnv,
  fetchImpl: typeof fetch = fetch
): Promise<CatalogueResponse> {
  const base = env.MELODYMIND_SEARCH_URL?.trim().replace(/\/$/, "");
  const token = env.MELODYMIND_SERVICE_TOKEN?.trim();
  if (!base || !token) throw new Error("MelodyMind search service is not configured");

  const response = await fetchImpl(base + "/internal/search", {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: "Bearer " + token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query, limit }),
    signal: AbortSignal.timeout(45_000)
  });
  if (!response.ok) {
    throw new Error("MelodyMind search service returned " + response.status);
  }

  const payload = object(await response.json(), "search response");
  const results = Array.isArray(payload.results)
    ? payload.results.map(normalizeMatch).slice(0, limit)
    : [];
  return {
    query: requiredString(payload.query, "query"),
    results
  };
}
