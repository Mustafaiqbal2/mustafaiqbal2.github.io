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

export type CatalogueProbeResponse = {
  type: "probe";
  query: string;
  message: string;
  conversationToken?: string;
};

export type CatalogueSearchReadyResponse = {
  type: "search_ready";
  query: string;
  message: string;
  planToken: string;
};

export type CatalogueResultsResponse = {
  type: "results";
  query: string;
  message: string;
  results: CatalogueMatch[];
};

export type CataloguePlanResponse = CatalogueProbeResponse | CatalogueSearchReadyResponse;
export type CatalogueResponse = CatalogueProbeResponse | CatalogueResultsResponse;
export type CataloguePlanInput =
  | { query: string; clarification?: string }
  | { conversationToken: string; message: string };

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

function serviceConfig(env: MelodyMindEnv): { base: string; token: string } {
  const base = env.MELODYMIND_SEARCH_URL?.trim().replace(/\/$/, "");
  const token = env.MELODYMIND_SERVICE_TOKEN?.trim();
  if (!base || !token) throw new Error("MelodyMind search service is not configured");
  return { base, token };
}

async function servicePost(
  path: string,
  body: unknown,
  env: MelodyMindEnv,
  fetchImpl: typeof fetch,
  timeoutMs: number
): Promise<Json> {
  const { base, token } = serviceConfig(env);
  const response = await fetchImpl(base + path, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: "Bearer " + token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!response.ok) {
    throw new Error("MelodyMind search service returned " + response.status);
  }
  return object(await response.json(), "response");
}

export async function planCatalogue(
  input: CataloguePlanInput,
  env: MelodyMindEnv,
  fetchImpl: typeof fetch = fetch
): Promise<CataloguePlanResponse> {
  const body = "conversationToken" in input
    ? { conversation_token: input.conversationToken, message: input.message }
    : { query: input.query, clarification: input.clarification || undefined };

  const payload = await servicePost(
    "/internal/plan",
    body,
    env,
    fetchImpl,
    30_000
  );

  if (payload.type === "probe") {
    const conversationToken = optionalString(payload.conversation_token);
    return {
      type: "probe",
      query: requiredString(payload.query, "query"),
      message: requiredString(payload.message, "probe message"),
      ...(conversationToken ? { conversationToken } : {})
    };
  }
  if (payload.type !== "search_ready") {
    throw new Error("Invalid MelodyMind plan response");
  }
  return {
    type: "search_ready",
    query: requiredString(payload.query, "query"),
    message: typeof payload.message === "string" ? payload.message : "",
    planToken: requiredString(payload.plan_token, "plan token")
  };
}

export async function executeCataloguePlan(
  planToken: string,
  limit: number,
  env: MelodyMindEnv,
  fetchImpl: typeof fetch = fetch
): Promise<CatalogueResultsResponse> {
  const payload = await servicePost(
    "/internal/execute",
    { plan_token: planToken, limit },
    env,
    fetchImpl,
    90_000
  );
  const results = Array.isArray(payload.results)
    ? payload.results.map(normalizeMatch).slice(0, limit)
    : [];
  return {
    type: "results",
    query: requiredString(payload.query, "query"),
    message: typeof payload.message === "string" ? payload.message : "",
    results
  };
}

export async function searchCatalogue(
  query: string,
  limit: number,
  env: MelodyMindEnv,
  fetchImpl: typeof fetch = fetch,
  clarification?: string
): Promise<CatalogueResponse> {
  const payload = await servicePost(
    "/internal/search",
    { query, limit, clarification: clarification || undefined },
    env,
    fetchImpl,
    90_000
  );
  if (payload.type === "probe") {
    const conversationToken = optionalString(payload.conversation_token);
    return {
      type: "probe",
      query: requiredString(payload.query, "query"),
      message: requiredString(payload.message, "probe message"),
      ...(conversationToken ? { conversationToken } : {})
    };
  }

  const results = Array.isArray(payload.results)
    ? payload.results.map(normalizeMatch).slice(0, limit)
    : [];
  return {
    type: "results",
    query: requiredString(payload.query, "query"),
    message: typeof payload.message === "string" ? payload.message : "",
    results
  };
}