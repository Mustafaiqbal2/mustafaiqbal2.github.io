import { buildListeningSnapshot } from "./stats";
import type {
  Art,
  Artist,
  ListeningRoomPayload,
  Playback,
  Playlist,
  Profile,
  RankedPeriod,
  RecentTrack,
  TimeRange,
  Track
} from "./types";

const API = "https://api.spotify.com/v1";
const TOKEN_URL = "https://accounts.spotify.com/api/token";
const RANGES: Record<TimeRange, string> = {
  short: "short_term",
  medium: "medium_term",
  long: "long_term"
};

export type SpotifyEnv = {
  SPOTIFY_CLIENT_ID: string;
  SPOTIFY_REFRESH_TOKEN: string;
};

export type SpotifyClient = {
  getRoom(): Promise<ListeningRoomPayload>;
  getNow(): Promise<Playback>;
};

export class SpotifyError extends Error {
  constructor(
    public readonly endpoint: string,
    public readonly status: number
  ) {
    super("Spotify request failed: " + endpoint + " (" + status + ")");
    this.name = "SpotifyError";
  }
}

type Json = Record<string, unknown>;

function object(value: unknown, context: string): Json {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Invalid Spotify " + context);
  }
  return value as Json;
}

function string(value: unknown, context: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("Invalid Spotify " + context);
  }
  return value;
}

function optionalString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function spotifyUrl(value: unknown, context: string): string {
  const urls = object(value, context + ".external_urls");
  return string(urls.spotify, context + ".external_urls.spotify");
}

function art(value: unknown): Art[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) return [];
    const image = item as Json;
    if (typeof image.url !== "string" || image.url.length === 0) return [];
    return [
      {
        url: image.url,
        width: typeof image.width === "number" ? image.width : null,
        height: typeof image.height === "number" ? image.height : null
      }
    ];
  });
}

function normalizeArtist(value: unknown): Artist {
  const item = object(value, "artist");
  return {
    id: string(item.id, "artist.id"),
    name: string(item.name, "artist.name"),
    url: spotifyUrl(item.external_urls, "artist"),
    images: art(item.images)
  };
}

function normalizeArtistSummary(value: unknown): Track["artists"][number] {
  const item = object(value, "track.artist");
  return {
    id: string(item.id, "track.artist.id"),
    name: string(item.name, "track.artist.name"),
    url: spotifyUrl(item.external_urls, "track.artist")
  };
}

function normalizeTrack(value: unknown): Track {
  const item = object(value, "track");
  const album = object(item.album, "track.album");
  const artists = Array.isArray(item.artists) ? item.artists.map(normalizeArtistSummary) : [];
  if (artists.length === 0) throw new Error("Invalid Spotify track.artists");

  return {
    id: string(item.id, "track.id"),
    name: string(item.name, "track.name"),
    url: spotifyUrl(item.external_urls, "track"),
    artists,
    album: {
      id: string(album.id, "track.album.id"),
      name: string(album.name, "track.album.name"),
      url: spotifyUrl(album.external_urls, "track.album"),
      images: art(album.images)
    },
    durationMs: typeof item.duration_ms === "number" ? item.duration_ms : 0,
    explicit: item.explicit === true
  };
}

function normalizeRecent(value: unknown): RecentTrack[] {
  const page = object(value, "recent page");
  if (!Array.isArray(page.items)) return [];
  return page.items.map((entry, index) => {
    const history = object(entry, "recent.items[" + index + "]");
    return {
      ...normalizeTrack(history.track),
      playedAt: string(history.played_at, "recent.items[" + index + "].played_at")
    };
  });
}

function normalizePlaylist(value: unknown): Playlist {
  const item = object(value, "playlist");
  const modernItems =
    typeof item.items === "object" && item.items !== null ? (item.items as Json).total : undefined;
  const legacyItems =
    typeof item.tracks === "object" && item.tracks !== null ? (item.tracks as Json).total : undefined;

  return {
    id: string(item.id, "playlist.id"),
    name: string(item.name, "playlist.name"),
    description: optionalString(item.description),
    url: spotifyUrl(item.external_urls, "playlist"),
    images: art(item.images),
    itemCount:
      typeof modernItems === "number"
        ? modernItems
        : typeof legacyItems === "number"
          ? legacyItems
          : 0
  };
}

function normalizeProfile(value: unknown): Profile {
  const item = object(value, "profile");
  return {
    name: optionalString(item.display_name) || "Mustafa",
    url: spotifyUrl(item.external_urls, "profile"),
    image: art(item.images)[0] ?? null
  };
}

export function createSpotifyClient(
  env: SpotifyEnv,
  fetchImpl: typeof fetch = fetch
): SpotifyClient {
  let token: { value: string; expiresAt: number } | null = null;
  let tokenRefresh: Promise<string> | null = null;
  let refreshToken = env.SPOTIFY_REFRESH_TOKEN;

  async function refreshAccessToken(): Promise<string> {
    const response = await fetchImpl(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: env.SPOTIFY_CLIENT_ID
      })
    });

    if (!response.ok) throw new SpotifyError("token", response.status);
    const payload = object(await response.json(), "token response");
    const value = string(payload.access_token, "token response.access_token");
    if (typeof payload.refresh_token === "string" && payload.refresh_token.length > 0) {
      refreshToken = payload.refresh_token;
    }
    const expiresIn = typeof payload.expires_in === "number" ? payload.expires_in : 3600;
    token = { value, expiresAt: Date.now() + expiresIn * 1000 };
    return value;
  }

  async function accessToken(): Promise<string> {
    if (token && token.expiresAt - 30_000 > Date.now()) return token.value;
    if (!tokenRefresh) {
      tokenRefresh = refreshAccessToken().finally(() => {
        tokenRefresh = null;
      });
    }
    return tokenRefresh;
  }

  async function get<T = unknown>(path: string): Promise<T | null> {
    const endpoint = path.startsWith("https://") ? path : API + path;
    const response = await fetchImpl(endpoint, {
      headers: { Authorization: "Bearer " + (await accessToken()) }
    });
    if (response.status === 204) return null;
    if (!response.ok) throw new SpotifyError(new URL(endpoint).pathname, response.status);
    return (await response.json()) as T;
  }

  async function playlists(ownerId: string): Promise<Playlist[]> {
    const collected: Playlist[] = [];
    let next: string | null = API + "/me/playlists?limit=50";

    while (next) {
      const page = object(await get(next), "playlist page");
      if (Array.isArray(page.items)) {
        for (const raw of page.items) {
          const item = object(raw, "playlist");
          const owner = object(item.owner, "playlist.owner");
          if (item.public === true && owner.id === ownerId) {
            collected.push(normalizePlaylist(item));
          }
        }
      }
      next = typeof page.next === "string" && page.next.length > 0 ? page.next : null;
    }
    return collected;
  }

  async function topArtists(range: TimeRange): Promise<Artist[]> {
    const page = object(
      await get("/me/top/artists?limit=20&time_range=" + RANGES[range]),
      "top artists " + range
    );
    return Array.isArray(page.items) ? page.items.map(normalizeArtist) : [];
  }

  async function topTracks(range: TimeRange): Promise<Track[]> {
    const page = object(
      await get("/me/top/tracks?limit=20&time_range=" + RANGES[range]),
      "top tracks " + range
    );
    return Array.isArray(page.items) ? page.items.map(normalizeTrack) : [];
  }

  async function recent(): Promise<RecentTrack[]> {
    return normalizeRecent(await get("/me/player/recently-played?limit=50"));
  }

  return {
    async getRoom() {
      const ranges: TimeRange[] = ["short", "medium", "long"];
      const profileValue = await get("/me");
      const profileObject = object(profileValue, "profile");
      const ownerId = string(profileObject.id, "profile.id");
      const [playlistValues, recentValues, artistValues, trackValues] =
        await Promise.all([
          playlists(ownerId),
          recent(),
          Promise.all(ranges.map((range) => topArtists(range))),
          Promise.all(ranges.map((range) => topTracks(range)))
        ]);

      const rankedArtists = Object.fromEntries(
        ranges.map((range, index) => [range, artistValues[index]])
      ) as RankedPeriod<Artist>;
      const rankedTracks = Object.fromEntries(
        ranges.map((range, index) => [range, trackValues[index]])
      ) as RankedPeriod<Track>;

      return {
        generatedAt: new Date().toISOString(),
        profile: normalizeProfile(profileValue),
        playlists: playlistValues,
        topArtists: rankedArtists,
        topTracks: rankedTracks,
        recent: recentValues,
        snapshot: buildListeningSnapshot({
          topArtists: rankedArtists,
          topTracks: rankedTracks,
          recent: recentValues
        })
      };
    },

    async getNow() {
      const observedAt = new Date().toISOString();
      const playback = await get("/me/player/currently-playing");
      if (playback !== null) {
        const value = object(playback, "playback");
        if (value.is_playing === true && value.item) {
          return {
            isPlaying: true,
            progressMs: typeof value.progress_ms === "number" ? value.progress_ms : null,
            observedAt,
            track: normalizeTrack(value.item)
          };
        }
      }

      const latest = (await recent())[0] ?? null;
      return {
        isPlaying: false,
        progressMs: null,
        observedAt,
        track: latest
      };
    }
  };
}
