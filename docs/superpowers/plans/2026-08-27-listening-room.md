# Listening Room Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `On rotation` stub with a responsive Listening Room that displays live Spotify playlists, rankings, listening statistics, recent tracks, and a floating playback pill.

**Architecture:** The static Next.js site fetches a small typed API hosted by one Cloudflare Worker. The Worker owns Spotify OAuth refresh, response shaping, caching, and CORS; the browser owns presentation and visibility-aware polling. UI development uses deterministic fixtures until the final deployment task, so no credential is needed during implementation.

**Tech Stack:** Next.js 16, React 19, TypeScript 5.9, GSAP 3.15, Cloudflare Workers with Wrangler, Spotify Web API, Vitest, Playwright Core.

**Spec:** `docs/superpowers/specs/2026-08-27-listening-room-design.md`

## Global Constraints

- The public tab is named `Listening room`; `#rotation` remains an input alias but never appears in rendered copy.
- The section order is playlists, top artists and tracks, listening snapshot, recently played, then Spotify profile.
- Current playback is a floating pill, not a full-screen scene.
- The site contains no provenance labels, disclaimer prose, invented play totals, or hand-maintained music lists.
- Only public playlists leave the Worker.
- Spotify credentials exist only as Cloudflare secrets or temporary values entered in the local authorization process.
- Mobile uses normal vertical document flow and does not inherit desktop scene coordinates or pins.
- Continuous animation uses transform and opacity; it pauses off-screen and in weak-device or reduced-motion modes.
- The implementation stays on the Cloudflare Workers Free plan and adds no paid storage product.
- MelodyMind vector search is outside this plan; the Worker reserves a separate `/melodymind/` namespace without implementing it.

---

## File Map

### Worker

- `worker/src/types.ts` — public response types plus the narrow Spotify response types consumed by this feature.
- `worker/src/stats.ts` — pure listening-stat calculations.
- `worker/src/spotify.ts` — access-token refresh, Spotify requests, pagination, and response normalization.
- `worker/src/router.ts` — CORS, route selection, response caching, and error responses.
- `worker/src/index.ts` — Cloudflare Worker entry point.
- `worker/wrangler.toml` — free-plan Worker configuration.
- `worker/scripts/authorize.mjs` — one-time localhost OAuth helper.
- `worker/README.md` — exact local authorization, secret, deployment, and recovery commands.
- `worker/test/*.test.ts` — unit tests with injected fetch and an in-memory cache.
- `worker/test/helpers/fakeSpotify.ts` — deterministic token and endpoint responses for Worker tests.
- `worker/test/fixtures/*.json` — deterministic Spotify and final API responses used by tests and screenshots.

### Browser

- `components/music/listening/types.ts` — browser-facing mirror of the Worker contract.
- `components/music/listening/data.ts` — runtime validation and API URL assembly.
- `components/music/listening/useListeningRoom.ts` — room fetch, now-playing polling, visibility handling, and stale-response protection.
- `components/music/listening/ListeningRoom.tsx` — section composition and empty/error shell.
- `components/music/listening/ListeningPill.tsx` — floating playback pill.
- `components/music/listening/PlaylistShelf.tsx` — playlist-first entrance.
- `components/music/listening/TopArtistsWall.tsx` — period-aware artist wall and top-track strip.
- `components/music/listening/ListeningSnapshot.tsx` — Wrapped-style cards.
- `components/music/listening/RecentTracks.tsx` — recent listening ribbon/list.
- `components/music/listening/useListeningMotion.ts` — scoped desktop timelines and lightweight mobile reveals.
- `components/music/listening/listening-room.css` — all Listening Room layout and responsive rules.
- `components/music/musicTabs.ts` — tab IDs and hash normalization.
- `components/music/MusicPage.tsx` — conditional Story/Listening Room mounting and scroll lifecycle.

### Verification and deployment

- `vitest.config.ts` — Node-based pure unit tests.
- `scripts/verify-listening-room.mjs` — fixture interception, screenshots, overflow checks, console checks, and tab-switch checks.
- `.github/workflows/pages.yml` — injects the public Worker URL into the static build.
- `.env.example` — documents only the public Worker URL.

---

### Task 1: Test foundation and listening statistics

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `vitest.config.ts`
- Create: `worker/src/types.ts`
- Create: `worker/src/stats.ts`
- Create: `worker/test/stats.test.ts`

**Interfaces:**
- Produces: `Track`, `Artist`, `Playlist`, `RankedPeriod<T>`, `ListeningSnapshot`, and `ListeningRoomPayload`.
- Produces: `buildListeningSnapshot(input: SnapshotInput): ListeningSnapshot`.

- [ ] **Step 1: Add the test and Worker tools**

Run:

```powershell
npm install --save-dev vitest wrangler
```

Add these scripts to `package.json`:

```json
{
  "test": "vitest run",
  "test:worker": "vitest run worker/test",
  "worker:dev": "wrangler dev --config worker/wrangler.toml",
  "worker:deploy": "wrangler deploy --config worker/wrangler.toml",
  "spotify:authorize": "node worker/scripts/authorize.mjs"
}
```

- [ ] **Step 2: Define the public contract**

Create `worker/src/types.ts` with these exact exported shapes:

```ts
export type Art = { url: string; width: number | null; height: number | null };
export type Artist = { id: string; name: string; url: string; images: Art[] };
export type Track = {
  id: string;
  name: string;
  url: string;
  artists: Array<Pick<Artist, "id" | "name" | "url">>;
  album: { id: string; name: string; url: string; images: Art[] };
  durationMs: number;
  explicit: boolean;
};
export type RecentTrack = Track & { playedAt: string };
export type Playlist = {
  id: string;
  name: string;
  description: string;
  url: string;
  images: Art[];
  itemCount: number;
};
export type TimeRange = "short" | "medium" | "long";
export type RankedPeriod<T> = Record<TimeRange, T[]>;
export type RankMove = { artist: Artist; currentRank: number; longRank: number; movement: number };
export type CountedTrack = { track: Track; count: number };
export type CountedArtist = { artist: Pick<Artist, "id" | "name" | "url">; count: number };
export type ListeningSnapshot = {
  topArtist: Artist | null;
  topTrack: Track | null;
  constants: Artist[];
  movers: RankMove[];
  repeatedTracks: CountedTrack[];
  repeatedArtists: CountedArtist[];
  uniqueArtists: number;
  uniqueAlbums: number;
  listeningHours: number[];
};
export type Playback = {
  isPlaying: boolean;
  progressMs: number | null;
  observedAt: string;
  track: Track | null;
};
export type Profile = { name: string; url: string; image: Art | null };
export type ListeningRoomPayload = {
  generatedAt: string;
  profile: Profile;
  playlists: Playlist[];
  topArtists: RankedPeriod<Artist>;
  topTracks: RankedPeriod<Track>;
  recent: RecentTrack[];
  snapshot: ListeningSnapshot;
};
```

- [ ] **Step 3: Write failing statistics tests**

Create `worker/test/stats.test.ts` with fixtures that assert:

```ts
import { describe, expect, it } from "vitest";
import { buildListeningSnapshot } from "../src/stats";
import type { Artist, RankedPeriod, RecentTrack, Track } from "../src/types";

const art = [{ url: "https://i.scdn.co/image/test", width: 640, height: 640 }];
const makeArtist = (id: string, name: string): Artist => ({
  id, name, url: `https://open.spotify.com/artist/${id}`, images: art
});
const makeTrack = (id: string, name: string, artist: Artist, albumId = id): Track => ({
  id,
  name,
  url: `https://open.spotify.com/track/${id}`,
  artists: [{ id: artist.id, name: artist.name, url: artist.url }],
  album: {
    id: albumId,
    name: `Album ${albumId}`,
    url: `https://open.spotify.com/album/${albumId}`,
    images: art
  },
  durationMs: 240000,
  explicit: false
});

const the1975 = makeArtist("a1", "The 1975");
const rising = makeArtist("a2", "Rising artist");
const third = makeArtist("a3", "Third artist");
const fillers = Array.from({ length: 5 }, (_, index) =>
  makeArtist(`f${index}`, `Filler ${index}`)
);
const aboutYou = makeTrack("t1", "About You", the1975, "album-1");
const sameAlbum = makeTrack("t2", "Robbers", the1975, "album-1");
const secondTrack = makeTrack("t3", "Second track", rising, "album-2");
const thirdTrack = makeTrack("t4", "Third track", third, "album-3");
const played = (track: Track, hour: number): RecentTrack => ({
  ...track,
  playedAt: `2026-08-27T${String(hour).padStart(2, "0")}:00:00+05:00`
});

const fixtureInput = {
  topArtists: {
    short: [the1975, rising],
    medium: [the1975],
    long: [the1975, ...fillers, rising]
  } satisfies RankedPeriod<Artist>,
  topTracks: {
    short: [aboutYou],
    medium: [aboutYou],
    long: [aboutYou]
  } satisfies RankedPeriod<Track>,
  recent: [
    played(aboutYou, 1),
    played(aboutYou, 2),
    played(sameAlbum, 3),
    played(secondTrack, 4),
    played(thirdTrack, 5)
  ]
};

const emptyInput = {
  topArtists: { short: [], medium: [], long: [] },
  topTracks: { short: [], medium: [], long: [] },
  recent: []
} satisfies typeof fixtureInput;

describe("buildListeningSnapshot", () => {
  it("finds constants, movement, repeats, diversity and listening hours", () => {
    const result = buildListeningSnapshot(fixtureInput);
    expect(result.topArtist?.name).toBe("The 1975");
    expect(result.topTrack?.name).toBe("About You");
    expect(result.constants.map((artist) => artist.name)).toEqual(["The 1975"]);
    expect(result.movers[0]).toMatchObject({ currentRank: 2, longRank: 7, movement: 5 });
    expect(result.repeatedTracks[0]).toMatchObject({ count: 2 });
    expect(result.repeatedArtists[0]).toMatchObject({ count: 3 });
    expect(result.uniqueArtists).toBe(3);
    expect(result.uniqueAlbums).toBe(3);
    expect(result.listeningHours.reduce((sum, count) => sum + count, 0)).toBe(5);
  });

  it("returns empty collections when Spotify returns no history", () => {
    const result = buildListeningSnapshot(emptyInput);
    expect(result).toMatchObject({
      topArtist: null,
      topTrack: null,
      constants: [],
      movers: [],
      repeatedTracks: [],
      repeatedArtists: [],
      uniqueArtists: 0,
      uniqueAlbums: 0
    });
    expect(result.listeningHours).toEqual(Array(24).fill(0));
  });
});
```

- [ ] **Step 4: Run the tests and confirm failure**

Run: `npm test -- worker/test/stats.test.ts`

Expected: FAIL because `worker/src/stats.ts` does not exist.

- [ ] **Step 5: Implement the pure statistics function**

Create `worker/src/stats.ts`. It must:

```ts
export type SnapshotInput = {
  topArtists: RankedPeriod<Artist>;
  topTracks: RankedPeriod<Track>;
  recent: RecentTrack[];
};

export function buildListeningSnapshot(
  input: SnapshotInput,
  timeZone = "Asia/Karachi"
): ListeningSnapshot {
  // rank maps use Spotify IDs; repeat maps use track and artist IDs;
  // listeningHours uses Intl.DateTimeFormat with the supplied time zone.
}
```

Sort repeated items by count descending and preserve first-seen order for ties. Keep at most five constants, five movers, three repeated tracks, and three repeated artists.

- [ ] **Step 6: Run tests and typecheck**

Run:

```powershell
npm test -- worker/test/stats.test.ts
npm run typecheck
```

Expected: both commands pass.

- [ ] **Step 7: Commit**

```powershell
git add package.json package-lock.json vitest.config.ts worker/src/types.ts worker/src/stats.ts worker/test/stats.test.ts
git commit -m "Add Spotify listening data contract"
```

---

### Task 2: Spotify API client and normalization

**Files:**
- Create: `worker/src/spotify.ts`
- Create: `worker/test/spotify.test.ts`
- Create: `worker/test/helpers/fakeSpotify.ts`
- Create: `worker/test/fixtures/spotify-profile.json`
- Create: `worker/test/fixtures/spotify-playlists.json`
- Create: `worker/test/fixtures/spotify-recent.json`
- Create: `worker/test/fixtures/spotify-top-artists.json`
- Create: `worker/test/fixtures/spotify-top-tracks.json`

**Interfaces:**
- Consumes: types from `worker/src/types.ts`.
- Produces: `createSpotifyClient(env: SpotifyEnv, fetchImpl?: typeof fetch): SpotifyClient`.
- Produces: `SpotifyClient.getRoom(): Promise<ListeningRoomPayload>`.
- Produces: `SpotifyClient.getNow(): Promise<Playback>`.

- [ ] **Step 1: Write failing client tests**

Tests inject a fetch function and verify:

```ts
const fake = createFakeSpotifyFetch();

it("refreshes once and shapes the full room response", async () => {
  const client = createSpotifyClient(env, fake.fetch);
  const room = await client.getRoom();
  expect(fake.tokenRequests()).toBe(1);
  expect(room.playlists.every((playlist) => playlist.name !== "Private draft")).toBe(true);
  expect(room.topArtists.short[0].name).toBe("The 1975");
  expect(room.snapshot.topTrack?.name).toBe("About You");
});

it("returns the recent track when playback is empty", async () => {
  const idle = createFakeSpotifyFetch({ playback: null });
  const client = createSpotifyClient(env, idle.fetch);
  const now = await client.getNow();
  expect(now.isPlaying).toBe(false);
  expect(now.track?.name).toBe("About You");
});

it("reuses a valid access token", async () => {
  const client = createSpotifyClient(env, fake.fetch);
  await client.getNow();
  await client.getRoom();
  expect(fake.tokenRequests()).toBe(1);
});
```

`createFakeSpotifyFetch` maps the token endpoint and each exact Spotify path to the JSON files listed above, tracks token-request count in closure state, and accepts `{ playback: object | null }` to produce active or 204 playback responses.

- [ ] **Step 2: Confirm failure**

Run: `npm test -- worker/test/spotify.test.ts`

Expected: FAIL because `createSpotifyClient` does not exist.

- [ ] **Step 3: Implement the client**

Create `worker/src/spotify.ts` with:

```ts
export type SpotifyEnv = {
  SPOTIFY_CLIENT_ID: string;
  SPOTIFY_CLIENT_SECRET: string;
  SPOTIFY_REFRESH_TOKEN: string;
};

export type SpotifyClient = {
  getRoom(): Promise<ListeningRoomPayload>;
  getNow(): Promise<Playback>;
};

export function createSpotifyClient(
  env: SpotifyEnv,
  fetchImpl: typeof fetch = fetch
): SpotifyClient;
```

Implementation requirements:

- Refresh at `https://accounts.spotify.com/api/token` with HTTP Basic authentication.
- Hold the access token and expiry in the client closure; refresh 30 seconds before expiry.
- Request `/me`, `/me/playlists?limit=50`, `/me/player/recently-played?limit=50`, and `/me/top/{type}?limit=20&time_range={range}`.
- Follow playlist pagination while `next` is non-null.
- Read playlist item count from `items.total`, with `tracks.total` as a compatibility fallback.
- Filter `public !== true` before normalization.
- Treat current-playback status 204 as idle and use the newest recent track.
- Throw `SpotifyError` containing the endpoint and status for non-2xx responses; never include tokens or response headers.

- [ ] **Step 4: Run tests and typecheck**

Run:

```powershell
npm test -- worker/test/spotify.test.ts
npm run typecheck
```

Expected: pass.

- [ ] **Step 5: Commit**

```powershell
git add worker/src/spotify.ts worker/test/spotify.test.ts worker/test/helpers/fakeSpotify.ts worker/test/fixtures
git commit -m "Add the Spotify Worker client"
```

---

### Task 3: Worker routes, cache, and CORS

**Files:**
- Create: `worker/src/router.ts`
- Create: `worker/src/index.ts`
- Create: `worker/wrangler.toml`
- Create: `worker/test/router.test.ts`

**Interfaces:**
- Consumes: `createSpotifyClient`.
- Produces: `createRouter(deps: RouterDeps): (request: Request, env: WorkerEnv, ctx: WorkerContext) => Promise<Response>`.
- Produces routes `GET /health`, `GET /spotify/room`, and `GET /spotify/now`.

- [ ] **Step 1: Write failing router tests**

```ts
it("allows only the configured site origin", async () => {
  const response = await request("/spotify/room", {
    origin: "https://mustafaiqbal2.github.io"
  });
  expect(response.headers.get("access-control-allow-origin"))
    .toBe("https://mustafaiqbal2.github.io");
  expect((await blockedRequest()).status).toBe(403);
});

it("caches room longer than now", async () => {
  const room = await request("/spotify/room");
  const now = await request("/spotify/now");
  expect(room.headers.get("cache-control")).toContain("s-maxage=900");
  expect(now.headers.get("cache-control")).toContain("s-maxage=15");
});

it("does not leak an upstream Spotify body", async () => {
  spotify.getRoom.mockRejectedValue(new Error("secret upstream body"));
  const response = await request("/spotify/room");
  expect(response.status).toBe(502);
  expect(await response.json()).toEqual({ error: "spotify_unavailable" });
});
```

- [ ] **Step 2: Confirm failure**

Run: `npm test -- worker/test/router.test.ts`

Expected: FAIL because the router does not exist.

- [ ] **Step 3: Implement cache and routing**

`worker/src/router.ts` must define:

```ts
export type WorkerEnv = SpotifyEnv & { ALLOWED_ORIGIN: string };
export type WorkerContext = { waitUntil(promise: Promise<unknown>): void };
export type ResponseCache = {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
};
export type RouterDeps = {
  fetchImpl?: typeof fetch;
  cache?: ResponseCache;
  now?: () => Date;
};
```

Rules:

- Reject non-GET methods with 405.
- Answer OPTIONS with the same origin restriction and allowed method GET.
- Permit only the exact `ALLOWED_ORIGIN`. Permit an originless request only for `/health`.
- Cache only successful GET responses.
- Use 900 seconds for room and 15 seconds for now.
- Add `Vary: Origin`, `X-Content-Type-Options: nosniff`, and JSON content type.
- Return `{ status: "ok" }` from health.
- Return `{ error: "spotify_unavailable" }` with 502 for Spotify failures.

`worker/src/index.ts` adapts `caches.default` to `ResponseCache` and exports:

```ts
export default {
  fetch(request: Request, env: WorkerEnv, ctx: WorkerContext) {
    return router(request, env, ctx);
  }
};
```

- [ ] **Step 4: Configure Wrangler**

Create `worker/wrangler.toml`:

```toml
name = "mustafa-music-api"
main = "src/index.ts"
compatibility_date = "2026-08-27"
workers_dev = true

[observability]
enabled = true
head_sampling_rate = 0.1
```

Do not define secrets or paid bindings.

- [ ] **Step 5: Run Worker tests**

Run:

```powershell
npm run test:worker
npm run typecheck
npx wrangler deploy --dry-run --config worker/wrangler.toml
```

Expected: tests and typecheck pass; Wrangler produces a dry-run bundle without authentication.

- [ ] **Step 6: Commit**

```powershell
git add worker/src/router.ts worker/src/index.ts worker/wrangler.toml worker/test/router.test.ts
git commit -m "Add cached Spotify Worker routes"
```

---

### Task 4: One-time Spotify authorization helper

**Files:**
- Create: `worker/scripts/authorize.mjs`
- Create: `worker/README.md`
- Create: `worker/test/authorize.test.mjs`

**Interfaces:**
- Produces: local callback `http://127.0.0.1:8788/callback`.
- Produces: `buildAuthorizeUrl(clientId: string, state: string): URL`.
- Produces: one refresh token printed only to the local terminal.

- [ ] **Step 1: Write failing URL tests**

```ts
it("requests the exact four scopes and loopback callback", () => {
  const url = buildAuthorizeUrl("client-id", "state-value");
  expect(url.searchParams.get("redirect_uri")).toBe("http://127.0.0.1:8788/callback");
  expect(url.searchParams.get("scope")?.split(" ").sort()).toEqual([
    "playlist-read-private",
    "user-read-currently-playing",
    "user-read-recently-played",
    "user-top-read"
  ]);
  expect(url.searchParams.get("state")).toBe("state-value");
});
```

- [ ] **Step 2: Confirm failure**

Run: `npm test -- worker/test/authorize.test.mjs`

Expected: FAIL because the helper does not exist.

- [ ] **Step 3: Implement the localhost helper**

The script must:

- read client ID and client secret from interactive local input;
- create a cryptographically random state;
- listen only on `127.0.0.1:8788`;
- print and attempt to open the Spotify authorization URL;
- reject callback state mismatch;
- exchange the code at Spotify's token endpoint;
- print the refresh token once and close the server;
- never write credentials or tokens to disk;
- time out after five minutes.

Export `buildAuthorizeUrl` for the unit test while keeping execution behind:

```js
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
```

- [ ] **Step 4: Document exact commands**

`worker/README.md` contains:

```text
Redirect URI: http://127.0.0.1:8788/callback
npm run spotify:authorize
npx wrangler login
npx wrangler secret put SPOTIFY_CLIENT_ID --config worker/wrangler.toml
npx wrangler secret put SPOTIFY_CLIENT_SECRET --config worker/wrangler.toml
npx wrangler secret put SPOTIFY_REFRESH_TOKEN --config worker/wrangler.toml
npx wrangler secret put ALLOWED_ORIGIN --config worker/wrangler.toml
npm run worker:deploy
```

The value for `ALLOWED_ORIGIN` is `https://mustafaiqbal2.github.io`.

- [ ] **Step 5: Verify and commit**

Run:

```powershell
npm test -- worker/test/authorize.test.mjs
git grep -n -E 'gsk_|SPOTIFY_CLIENT_SECRET=|SPOTIFY_REFRESH_TOKEN=' -- ':!docs/superpowers/plans/*'
```

Expected: test passes; grep finds no secret value.

```powershell
git add worker/scripts/authorize.mjs worker/README.md worker/test/authorize.test.mjs
git commit -m "Add one-time Spotify authorization"
```

---

### Task 5: Browser data boundary and polling

**Files:**
- Create: `components/music/listening/types.ts`
- Create: `components/music/listening/data.ts`
- Create: `components/music/listening/useListeningRoom.ts`
- Create: `tests/listeningRoomData.test.ts`
- Create: `worker/test/fixtures/listening-room.json`
- Create: `.env.example`

**Interfaces:**
- Consumes: `ListeningRoomPayload` and `Playback` JSON from the Worker.
- Produces: `parseListeningRoom(value: unknown): ListeningRoomPayload`.
- Produces: `parsePlayback(value: unknown): Playback`.
- Produces: `useListeningRoom(active: boolean): ListeningRoomState`.

- [ ] **Step 1: Mirror the public Worker contract**

Create `components/music/listening/types.ts` with the same public fields from `worker/src/types.ts`. Do not import Worker source into the browser bundle.

Add:

```ts
export type LoadState<T> =
  | { status: "idle"; data: null }
  | { status: "loading"; data: T | null }
  | { status: "ready"; data: T }
  | { status: "unavailable"; data: T | null };
```

- [ ] **Step 2: Write failing validation tests**

Create `worker/test/fixtures/listening-room.json` with six playlists, complete short/medium/long artist and track arrays, fifty recent tracks, a populated snapshot, and valid Spotify URLs. Import it in the test as `roomFixture`.

```ts
it("accepts the complete fixture", () => {
  expect(parseListeningRoom(roomFixture).playlists).toHaveLength(6);
});

it("rejects a track without a Spotify URL", () => {
  const broken = structuredClone(roomFixture);
  broken.recent[0].url = "";
  expect(() => parseListeningRoom(broken)).toThrow("recent[0].url");
});

it("rejects malformed listening hours", () => {
  const broken = structuredClone(roomFixture);
  broken.snapshot.listeningHours = [1, 2];
  expect(() => parseListeningRoom(broken)).toThrow("listeningHours");
});
```

- [ ] **Step 3: Confirm failure**

Run: `npm test -- tests/listeningRoomData.test.ts`

Expected: FAIL because the parser does not exist.

- [ ] **Step 4: Implement validation and URLs**

`data.ts` exports:

```ts
export function musicApiUrl(path: "/spotify/room" | "/spotify/now"): string;
export function parseListeningRoom(value: unknown): ListeningRoomPayload;
export function parsePlayback(value: unknown): Playback;
```

`musicApiUrl` trims a trailing slash from `NEXT_PUBLIC_MUSIC_API_URL` and throws a clear configuration error when absent.

- [ ] **Step 5: Implement the hook**

`useListeningRoom(active)`:

- fetches room once when active becomes true;
- polls now every 20 seconds while active and `document.visibilityState === "visible"`;
- refreshes immediately when the document becomes visible;
- aborts requests on deactivation and unmount;
- ignores responses from an older request sequence;
- keeps the last successful data during a temporary failure;
- performs no request while inactive.

Return:

```ts
export type ListeningRoomState = {
  room: LoadState<ListeningRoomPayload>;
  playback: LoadState<Playback>;
  refresh(): void;
};
```

- [ ] **Step 6: Verify and commit**

Run:

```powershell
npm test -- tests/listeningRoomData.test.ts
npm run typecheck
```

Create `.env.example` containing only:

```text
NEXT_PUBLIC_MUSIC_API_URL=
```

```powershell
git add components/music/listening .env.example tests/listeningRoomData.test.ts worker/test/fixtures/listening-room.json
git commit -m "Add the Listening Room data boundary"
```

---

### Task 6: Replace the rotation overlay with a real tab panel

**Files:**
- Create: `components/music/musicTabs.ts`
- Create: `tests/musicTabs.test.ts`
- Create: `components/music/listening/ListeningRoom.tsx`
- Modify: `components/music/MusicPage.tsx`
- Modify: `app/music.css`

**Interfaces:**
- Produces: `TabId = "story" | "melodymind" | "listening"`.
- Produces: `tabFromHash(hash: string): TabId`.
- Consumes: `ListeningRoom({ active: boolean })`.

- [ ] **Step 1: Write failing hash tests**

```ts
expect(tabFromHash("#listening")).toBe("listening");
expect(tabFromHash("#rotation")).toBe("listening");
expect(tabFromHash("#melodymind")).toBe("melodymind");
expect(tabFromHash("#unknown")).toBe("story");
```

- [ ] **Step 2: Confirm failure**

Run: `npm test -- tests/musicTabs.test.ts`

Expected: FAIL because `musicTabs.ts` does not exist.

- [ ] **Step 3: Implement tab state**

`musicTabs.ts` exports the type, labels, descriptions, and pure hash parser. The Listening Room entry is:

```ts
{
  id: "listening",
  label: "Listening room",
  desc: "Playlists, artists and whatever is playing right now."
}
```

- [ ] **Step 4: Build the initial panel shell**

`ListeningRoom.tsx` must render a labelled `section`, loading state, unavailable state with a retry button, and children only when room data is ready. It calls `useListeningRoom(active)`.

- [ ] **Step 5: Refactor MusicPage lifecycle**

Change `MusicPage.tsx` so:

- Story mounts only when `active === "story"`.
- Listening Room mounts only when `active === "listening"`.
- MelodyMind remains the only fixed overlay.
- `mu-overlay-open` and Lenis stop only for MelodyMind.
- choosing Story or Listening Room scrolls to that panel after it mounts;
- choosing Listening Room writes `#listening`;
- incoming `#rotation` becomes Listening Room and is replaced with `#listening`;
- leaving Story destroys its ScrollTriggers through the existing StoryTab cleanup;
- the Listening Room tab motif uses the existing equalizer artwork.

Use a `panelsReady` boolean set after the first hash-reading effect. Server HTML renders the hero and tabs without either panel; hydration then mounts only the resolved panel. If the initial hash resolves to Listening Room or MelodyMind, remove `lv-boot` immediately. If it resolves to Story, StoryTab releases the gate after its builders finish. This prevents Story pins from building underneath a direct `#listening` visit.

Delete the complete `active === "rotation"` stub block.

- [ ] **Step 6: Remove obsolete overlay assumptions**

In `app/music.css`, keep `.mu-stub` for MelodyMind only. Rename the file header from “rotation” to “listening room” and add a normal-flow `.mu-listening-root` baseline.

- [ ] **Step 7: Verify and commit**

Run:

```powershell
npm test -- tests/musicTabs.test.ts
npm run typecheck
npm run build
```

Expected: all pass; `out/music/index.html` contains “Listening room” and does not contain “On rotation”.

```powershell
git add components/music/musicTabs.ts tests/musicTabs.test.ts components/music/listening/ListeningRoom.tsx components/music/MusicPage.tsx app/music.css
git commit -m "Open the Listening Room tab"
```

---

### Task 7: Build the four Listening Room sections

**Files:**
- Create: `components/music/listening/ListeningPill.tsx`
- Create: `components/music/listening/PlaylistShelf.tsx`
- Create: `components/music/listening/TopArtistsWall.tsx`
- Create: `components/music/listening/ListeningSnapshot.tsx`
- Create: `components/music/listening/RecentTracks.tsx`
- Create: `components/music/listening/listening-room.css`
- Modify: `components/music/listening/ListeningRoom.tsx`

**Interfaces:**
- Consumes typed data only; no child fetches Spotify directly.
- Produces stable data hooks: `data-lr-section="playlists|artists|snapshot|recent"`.

- [ ] **Step 1: Build the floating pill**

`ListeningPill` accepts:

```ts
type ListeningPillProps = {
  playback: LoadState<Playback>;
  fallback: RecentTrack | null;
};
```

The complete pill is one Spotify link containing 48px artwork, title, artist, and four equalizer bars. Use `aria-label="Open {track} by {artist} on Spotify"`. Add `data-playing="true|false"` so CSS runs equalizer motion only during playback.

- [ ] **Step 2: Build the playlist shelf**

`PlaylistShelf({ playlists })` renders:

- heading `Playlists`;
- one focused cover and visible neighbours on desktop;
- names beneath every cover;
- item counts as ordinary metadata;
- a two-column mobile grid under 768px;
- an empty message when no public playlists are returned.

Use native `<img loading="lazy" decoding="async">` with fixed width/height attributes from the selected image.

- [ ] **Step 3: Build top artists and tracks**

`TopArtistsWall` holds local `TimeRange` state for keyboard/mobile controls. Render all three desktop layers so GSAP can crossfade them, but expose only the active layer to assistive technology. Each period contains ten artists and five tracks.

Period copy is:

- `Last month`
- `Last six months`
- `Long term`

- [ ] **Step 4: Build the listening snapshot**

`ListeningSnapshot` renders cards only when their source arrays contain data. The clock uses one 24-segment radial SVG and the supplied `listeningHours` array. Card headings are direct: `Top artist`, `Top track`, `Always around`, `Moving up`, `On repeat`, and `Listening clock`.

- [ ] **Step 5: Build recently played**

`RecentTracks` renders the latest twelve items on desktop and latest ten on mobile. Each card links directly to Spotify and includes artwork, title, artist, and a locally formatted time.

- [ ] **Step 6: Compose and style the room**

Import `listening-room.css` from `ListeningRoom.tsx`. Compose:

```tsx
<section className="lr" aria-labelledby="lr-title">
  <PlaylistShelf playlists={room.playlists} />
  <TopArtistsWall artists={room.topArtists} tracks={room.topTracks} />
  <ListeningSnapshot snapshot={room.snapshot} />
  <RecentTracks tracks={room.recent} />
  <a className="lr-profile" href={room.profile.url}>Open my Spotify</a>
  <ListeningPill playback={playback} fallback={room.recent[0] ?? null} />
</section>
```

Responsive CSS requirements:

- no horizontal overflow at 320px;
- 44px minimum controls;
- fixed pill width capped at `min(360px, calc(100vw - 24px))`;
- pill bottom uses `max(12px, env(safe-area-inset-bottom))`;
- artwork remains square;
- text truncates inside the pill but remains complete in link aria-labels;
- mobile sections use normal flow and `min-height: auto`.

- [ ] **Step 7: Verify static rendering and commit**

Run:

```powershell
npm run typecheck
npm run build
```

Expected: pass with no API URL required at build time.

```powershell
git add components/music/listening
git commit -m "Build the Spotify Listening Room"
```

---

### Task 8: Add scoped motion and weak-device behavior

**Files:**
- Create: `components/music/listening/useListeningMotion.ts`
- Modify: `components/music/listening/ListeningRoom.tsx`
- Modify: `components/music/listening/listening-room.css`

**Interfaces:**
- Produces: `useListeningMotion(root: RefObject<HTMLElement | null>, ready: boolean): void`.

- [ ] **Step 1: Implement one scoped GSAP context**

Use `gsap.matchMedia(root.current)` with:

```ts
const conditions = {
  desktop: "(min-width: 1024px)",
  mobile: "(max-width: 1023px)",
  reduce: "(prefers-reduced-motion: reduce)"
};
```

Every ScrollTrigger must be created inside the context and removed by `mm.revert()`.

- [ ] **Step 2: Animate the playlist shelf**

Desktop uses a contained pinned section no longer than 260% of the viewport. Covers move on x, y, rotation, scale, and opacity only. The focused cover remains fully readable and neighbouring covers never cross its title.

Mobile uses IntersectionObserver-driven CSS reveal classes without pinning.

- [ ] **Step 3: Animate the artist periods**

Desktop scrubs between three wall layers. Artist cards change position and scale as one timeline; track strips enter after the matching wall. Mobile period buttons switch immediately with a 180ms opacity/translate transition.

- [ ] **Step 4: Animate snapshot and recent listening**

Snapshot cards reveal in two short rows. Recently played uses one contained horizontal ribbon on desktop and ordinary vertical reveals on mobile.

- [ ] **Step 5: Add performance gates**

Skip desktop pinning when:

```ts
const weak =
  (navigator.hardwareConcurrency || 8) <= 4 ||
  ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 4;
```

Pause equalizer and ambient CSS motion when:

- Listening Room is inactive;
- `document.visibilityState !== "visible"`;
- reduced motion is enabled;
- weak-device mode is active.

- [ ] **Step 6: Verify and commit**

Run:

```powershell
npm run typecheck
npm run build
```

Inspect Chrome Performance with 4x CPU throttling while moving through all four sections. No single Listening Room scripting task should exceed 50ms after initial data render.

```powershell
git add components/music/listening/useListeningMotion.ts components/music/listening/ListeningRoom.tsx components/music/listening/listening-room.css
git commit -m "Animate the Listening Room"
```

---

### Task 9: Systematic responsive and lifecycle verification

**Files:**
- Create: `scripts/verify-listening-room.mjs`
- Modify: `worker/test/fixtures/listening-room.json`
- Modify: components and CSS only when a measured failure identifies a root cause.

**Interfaces:**
- Consumes: static export and the final API fixture.
- Produces: screenshots and a JSON verification report under ignored `tmp/listening-room/`.

- [ ] **Step 1: Create the final fixture**

Include at least:

- six public playlists with mixed title lengths;
- twenty artists in each period with overlap and movement;
- twenty tracks in each period;
- fifty recent tracks with repeats and varied timestamps;
- an active playback response;
- an idle playback response.

- [ ] **Step 2: Build the verification script**

The Playwright script must:

- intercept `/spotify/room` and `/spotify/now` with fixtures;
- open `/music/#listening`;
- capture 390x844, 834x1112, 1366x768, and 1440x900;
- capture playlist, artist, snapshot, recent, and final states;
- assert `scrollWidth <= clientWidth`;
- assert every section heading and profile link has a non-zero bounding box;
- assert the pill stays within the viewport and does not intersect the tabs;
- switch Story → Listening Room → Story and assert the number of Story ScrollTriggers returns to its original count;
- record console errors, hydration errors, failed requests, and long tasks;
- repeat 1366x768 with four-core and 4x CPU emulation;
- repeat one viewport with reduced motion.

- [ ] **Step 3: Run the full matrix**

Run:

```powershell
npm test
npm run typecheck
npm run build
python -m http.server 4174 -d out
node scripts/verify-listening-room.mjs
```

Expected report:

```json
{
  "horizontalOverflow": 0,
  "hiddenRequiredElements": 0,
  "tabPillIntersections": 0,
  "consoleErrors": 0,
  "hydrationErrors": 0,
  "failedRequests": 0,
  "longTasksOver50msAfterRender": 0
}
```

- [ ] **Step 4: Review every screenshot**

Use image inspection on all screenshots. Reject the build for clipped text, cards crossing headings, the pill covering controls, unreadable artwork labels, empty final states, or mobile layouts that depend on desktop transforms.

- [ ] **Step 5: Commit**

```powershell
git add scripts/verify-listening-room.mjs worker/test/fixtures/listening-room.json
git add components/music/listening components/music/MusicPage.tsx app/music.css
git commit -m "Verify the Listening Room across screen sizes"
```

---

### Task 10: Connect Spotify and deploy the free Worker

**Files:**
- Modify: `.github/workflows/pages.yml`
- Modify: `worker/README.md` to record the deployed Worker URL.

**Interfaces:**
- Consumes: Spotify Developer app, Spotify Premium owner account, Cloudflare account.
- Produces: public Worker URL stored as GitHub variable `NEXT_PUBLIC_MUSIC_API_URL`.

- [ ] **Step 1: Stop for Mustafa's Spotify action**

Give exactly these instructions:

1. Open the existing MelodyMind app in the Spotify Developer Dashboard.
2. Open Settings.
3. Add `http://127.0.0.1:8788/callback` as a redirect URI and save.
4. Confirm when saved. Do not send the client secret in chat.

- [ ] **Step 2: Generate the refresh token locally**

Run `npm run spotify:authorize` in Mustafa's terminal. Mustafa enters the client ID and secret into the local prompts, approves Spotify in the browser, and keeps the printed refresh token for the next step.

- [ ] **Step 3: Stop for Cloudflare login**

Run:

```powershell
npx wrangler login
```

Mustafa completes the browser login. Then enter the four secrets using the commands in `worker/README.md`. Wrangler prompts locally; no value appears in chat or shell history.

- [ ] **Step 4: Deploy and verify the Worker**

Run:

```powershell
$deployOutput = npm run worker:deploy 2>&1
$deployText = $deployOutput -join "`n"
$workerUrl = [regex]::Match($deployText, 'https://[a-z0-9.-]+\.workers\.dev').Value
if (-not $workerUrl) { throw "Wrangler did not return a workers.dev URL." }
Invoke-RestMethod "$workerUrl/health"
```

Expected: `status: ok`.

Open `/spotify/room` with an Origin header matching the portfolio and verify playlists, rankings, and recent tracks are populated. Open `/spotify/now` while Spotify is playing and verify the current track changes.

Add the exact value of `$workerUrl` to a `Deployed endpoint` line in `worker/README.md`.

- [ ] **Step 5: Connect the static build**

Set the GitHub repository variable:

```powershell
gh variable set NEXT_PUBLIC_MUSIC_API_URL --body $workerUrl
```

Modify `.github/workflows/pages.yml` build environment:

```yaml
NEXT_PUBLIC_MUSIC_API_URL: ${{ vars.NEXT_PUBLIC_MUSIC_API_URL }}
```

- [ ] **Step 6: Run final live-data verification**

Run:

```powershell
$env:NEXT_PUBLIC_MUSIC_API_URL = $workerUrl
npm test
npm run typecheck
npm run build
```

Serve `out/`, open `/music/#listening`, and verify the real playlists, artists, recent tracks, and floating pill at desktop and mobile widths.

- [ ] **Step 7: Commit, merge, and deploy**

```powershell
git add .github/workflows/pages.yml worker/README.md
git commit -m "Connect the live Listening Room"
git push origin revamp
git checkout main
git merge --ff-only revamp
git push origin main
```

Poll the deployed site until `Listening room` and the Worker URL are present. Confirm the live pill updates by changing the Spotify track and waiting for the next poll.
