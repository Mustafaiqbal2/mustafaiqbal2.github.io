import type {
  AnalyticsEnv,
  AnalyticsEvent,
  AnalyticsIdentity,
  D1Database
} from "./analytics";

export type TasteTrack = {
  track_id: string;
  spotify_id: string;
  title: string;
  artist: string;
  score: number;
  signals: number;
};

export type TasteArtist = {
  artist: string;
  score: number;
  signals: number;
};

export type TasteProfile = {
  version: number;
  signal_count: number;
  positive_tracks: TasteTrack[];
  negative_tracks: TasteTrack[];
  positive_artists: TasteArtist[];
  negative_artists: TasteArtist[];
};

type TasteDelta = {
  score: number;
  starts?: number;
  meaningful?: number;
  strong?: number;
  skips?: number;
  repeats?: number;
  opens?: number;
};

const ID_RE = /^[A-Za-z0-9_-]{8,96}$/;
const TRACK_ID_RE = /^[A-Za-z0-9:_-]{1,180}$/;
const SPOTIFY_ID_RE = /^[A-Za-z0-9]{8,64}$/;
let tasteSchemaReady: Promise<void> | null = null;

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function finite(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function eventDelta(event: string, action: string): TasteDelta | null {
  if (event === "melodymind_spotify_click") {
    return { score: 0.7, opens: 1 };
  }
  if (event !== "melodymind_playback") return null;
  switch (action) {
    case "start":
      return { score: 0.02, starts: 1 };
    case "meaningful":
      return { score: 0.45, meaningful: 1 };
    case "engaged":
      return { score: 0.8, strong: 1 };
    case "majority":
      return { score: 1.3, strong: 1 };
    case "replay":
      return { score: 1.5, repeats: 1 };
    case "quick_skip":
      return { score: -0.1, skips: 1 };
    default:
      return null;
  }
}

async function ensureTasteSchema(db: D1Database): Promise<void> {
  if (tasteSchemaReady) return tasteSchemaReady;
  tasteSchemaReady = (async () => {
    await db.batch([
      db.prepare(`CREATE TABLE IF NOT EXISTS melodymind_taste_tracks (
        visitor_id TEXT NOT NULL,
        track_id TEXT NOT NULL,
        spotify_id TEXT NOT NULL DEFAULT '',
        title TEXT NOT NULL DEFAULT '',
        artist TEXT NOT NULL DEFAULT '',
        score REAL NOT NULL DEFAULT 0,
        starts INTEGER NOT NULL DEFAULT 0,
        meaningful_plays INTEGER NOT NULL DEFAULT 0,
        strong_plays INTEGER NOT NULL DEFAULT 0,
        quick_skips INTEGER NOT NULL DEFAULT 0,
        repeats INTEGER NOT NULL DEFAULT 0,
        opens INTEGER NOT NULL DEFAULT 0,
        last_seen INTEGER NOT NULL,
        PRIMARY KEY(visitor_id, track_id)
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS melodymind_taste_artists (
        visitor_id TEXT NOT NULL,
        artist_key TEXT NOT NULL,
        artist TEXT NOT NULL DEFAULT '',
        score REAL NOT NULL DEFAULT 0,
        signals INTEGER NOT NULL DEFAULT 0,
        last_seen INTEGER NOT NULL,
        PRIMARY KEY(visitor_id, artist_key)
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS melodymind_taste_profiles (
        visitor_id TEXT PRIMARY KEY,
        version INTEGER NOT NULL DEFAULT 0,
        signal_count INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL
      )`),
      db.prepare("CREATE INDEX IF NOT EXISTS idx_mm_taste_tracks_score ON melodymind_taste_tracks(visitor_id, score DESC)"),
      db.prepare("CREATE INDEX IF NOT EXISTS idx_mm_taste_artists_score ON melodymind_taste_artists(visitor_id, score DESC)")
    ]);
  })().catch((error) => {
    tasteSchemaReady = null;
    throw error;
  });
  return tasteSchemaReady;
}

export async function recordTasteEvent(
  env: AnalyticsEnv,
  identity: AnalyticsIdentity,
  event: AnalyticsEvent
): Promise<void> {
  const db = env.ANALYTICS_DB;
  const visitorId = text(event.visitorId, 96) || identity.visitorId;
  if (!db || !ID_RE.test(visitorId)) return;

  const data = event.data || {};
  const delta = eventDelta(event.event, text(data.action, 40));
  if (!delta) return;

  const trackId = text(data.track_id, 180);
  const spotifyId = text(data.spotify_id, 64);
  const title = text(data.title, 220);
  const artist = text(data.artist, 220);
  if (!TRACK_ID_RE.test(trackId) || !SPOTIFY_ID_RE.test(spotifyId) || !artist) return;

  await ensureTasteSchema(db);
  const now = Date.now();
  const artistKey = artist.toLocaleLowerCase("en").replace(/\s+/g, " ").slice(0, 220);
  const artistDelta = delta.score * 0.45;
  await db.batch([
    db.prepare(`INSERT INTO melodymind_taste_tracks (
      visitor_id, track_id, spotify_id, title, artist, score, starts,
      meaningful_plays, strong_plays, quick_skips, repeats, opens, last_seen
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(visitor_id, track_id) DO UPDATE SET
      spotify_id = excluded.spotify_id,
      title = excluded.title,
      artist = excluded.artist,
      score = MAX(-8, MIN(12, melodymind_taste_tracks.score + excluded.score)),
      starts = melodymind_taste_tracks.starts + excluded.starts,
      meaningful_plays = melodymind_taste_tracks.meaningful_plays + excluded.meaningful_plays,
      strong_plays = melodymind_taste_tracks.strong_plays + excluded.strong_plays,
      quick_skips = melodymind_taste_tracks.quick_skips + excluded.quick_skips,
      repeats = melodymind_taste_tracks.repeats + excluded.repeats,
      opens = melodymind_taste_tracks.opens + excluded.opens,
      last_seen = excluded.last_seen`)
      .bind(
        visitorId,
        trackId,
        spotifyId,
        title,
        artist,
        delta.score,
        delta.starts || 0,
        delta.meaningful || 0,
        delta.strong || 0,
        delta.skips || 0,
        delta.repeats || 0,
        delta.opens || 0,
        now
      ),
    db.prepare(`INSERT INTO melodymind_taste_artists (
      visitor_id, artist_key, artist, score, signals, last_seen
    ) VALUES (?, ?, ?, ?, 1, ?)
    ON CONFLICT(visitor_id, artist_key) DO UPDATE SET
      artist = excluded.artist,
      score = MAX(-8, MIN(12, melodymind_taste_artists.score + excluded.score)),
      signals = melodymind_taste_artists.signals + 1,
      last_seen = excluded.last_seen`)
      .bind(visitorId, artistKey, artist, artistDelta, now),
    db.prepare(`INSERT INTO melodymind_taste_profiles (
      visitor_id, version, signal_count, updated_at
    ) VALUES (?, 1, 1, ?)
    ON CONFLICT(visitor_id) DO UPDATE SET
      version = melodymind_taste_profiles.version + 1,
      signal_count = melodymind_taste_profiles.signal_count + 1,
      updated_at = excluded.updated_at`)
      .bind(visitorId, now)
  ]);
}

export async function readTasteProfile(
  env: AnalyticsEnv,
  visitorId: string
): Promise<TasteProfile | null> {
  const db = env.ANALYTICS_DB;
  if (!db || !ID_RE.test(visitorId)) return null;
  await ensureTasteSchema(db);

  const meta = await db.prepare(
    "SELECT version, signal_count FROM melodymind_taste_profiles WHERE visitor_id = ?"
  ).bind(visitorId).first<{ version: number; signal_count: number }>();
  if (!meta || finite(meta.signal_count) < 1) return null;

  const [positiveTracks, negativeTracks, positiveArtists, negativeArtists] = await Promise.all([
    db.prepare(`SELECT track_id, spotify_id, title, artist, score,
      starts + meaningful_plays + strong_plays + quick_skips + repeats + opens AS signals
      FROM melodymind_taste_tracks
      WHERE visitor_id = ? AND score >= 0.25
      ORDER BY score DESC, last_seen DESC LIMIT 18`)
      .bind(visitorId).all<TasteTrack>(),
    db.prepare(`SELECT track_id, spotify_id, title, artist, score,
      starts + meaningful_plays + strong_plays + quick_skips + repeats + opens AS signals
      FROM melodymind_taste_tracks
      WHERE visitor_id = ? AND score <= -0.25
      ORDER BY score ASC, last_seen DESC LIMIT 10`)
      .bind(visitorId).all<TasteTrack>(),
    db.prepare(`SELECT artist, score, signals FROM melodymind_taste_artists
      WHERE visitor_id = ? AND score >= 0.25
      ORDER BY score DESC, last_seen DESC LIMIT 12`)
      .bind(visitorId).all<TasteArtist>(),
    db.prepare(`SELECT artist, score, signals FROM melodymind_taste_artists
      WHERE visitor_id = ? AND score <= -0.25
      ORDER BY score ASC, last_seen DESC LIMIT 8`)
      .bind(visitorId).all<TasteArtist>()
  ]);

  return {
    version: Math.max(1, Math.round(finite(meta.version))),
    signal_count: Math.max(1, Math.round(finite(meta.signal_count))),
    positive_tracks: positiveTracks.results || [],
    negative_tracks: negativeTracks.results || [],
    positive_artists: positiveArtists.results || [],
    negative_artists: negativeArtists.results || []
  };
}
