import type {
  Art,
  Artist,
  ArtistSummary,
  CountedArtist,
  CountedTrack,
  ListeningRoomPayload,
  ListeningSnapshot,
  Playback,
  Playlist,
  Profile,
  RankedPeriod,
  RecentTrack,
  TimeRange,
  Track
} from "./types";

type Json = Record<string, unknown>;

function fail(path: string): never {
  throw new Error("Invalid Listening Room response at " + path);
}

function record(value: unknown, path: string): Json {
  if (typeof value !== "object" || value === null || Array.isArray(value)) fail(path);
  return value as Json;
}

function list(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) fail(path);
  return value;
}

function text(value: unknown, path: string, allowEmpty = false): string {
  if (typeof value !== "string" || (!allowEmpty && value.length === 0)) fail(path);
  return value;
}

function numeric(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) fail(path);
  return value;
}

function integer(value: unknown, path: string): number {
  const number = numeric(value, path);
  if (!Number.isInteger(number) || number < 0) fail(path);
  return number;
}

function bool(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") fail(path);
  return value;
}

function nullableNumber(value: unknown, path: string): number | null {
  return value === null ? null : numeric(value, path);
}

function art(value: unknown, path: string): Art {
  const item = record(value, path);
  const width = item.width === null ? null : integer(item.width, path + ".width");
  const height = item.height === null ? null : integer(item.height, path + ".height");
  return { url: text(item.url, path + ".url"), width, height };
}

function artistSummary(value: unknown, path: string): ArtistSummary {
  const item = record(value, path);
  return {
    id: text(item.id, path + ".id"),
    name: text(item.name, path + ".name"),
    url: text(item.url, path + ".url")
  };
}

function artist(value: unknown, path: string): Artist {
  const item = record(value, path);
  return {
    ...artistSummary(item, path),
    images: list(item.images, path + ".images").map((image, index) =>
      art(image, path + ".images[" + index + "]")
    )
  };
}

function track(value: unknown, path: string): Track {
  const item = record(value, path);
  const album = record(item.album, path + ".album");
  const artists = list(item.artists, path + ".artists").map((entry, index) =>
    artistSummary(entry, path + ".artists[" + index + "]")
  );
  if (artists.length === 0) fail(path + ".artists");
  return {
    id: text(item.id, path + ".id"),
    name: text(item.name, path + ".name"),
    url: text(item.url, path + ".url"),
    artists,
    album: {
      id: text(album.id, path + ".album.id"),
      name: text(album.name, path + ".album.name"),
      url: text(album.url, path + ".album.url"),
      images: list(album.images, path + ".album.images").map((image, index) =>
        art(image, path + ".album.images[" + index + "]")
      )
    },
    durationMs: integer(item.durationMs, path + ".durationMs"),
    explicit: bool(item.explicit, path + ".explicit")
  };
}

function recentTrack(value: unknown, path: string): RecentTrack {
  const item = record(value, path);
  return { ...track(item, path), playedAt: text(item.playedAt, path + ".playedAt") };
}

function playlist(value: unknown, path: string): Playlist {
  const item = record(value, path);
  return {
    id: text(item.id, path + ".id"),
    name: text(item.name, path + ".name"),
    description: text(item.description, path + ".description", true),
    url: text(item.url, path + ".url"),
    images: list(item.images, path + ".images").map((image, index) =>
      art(image, path + ".images[" + index + "]")
    ),
    itemCount: integer(item.itemCount, path + ".itemCount")
  };
}

function ranked<T>(
  value: unknown,
  path: string,
  parse: (entry: unknown, path: string) => T
): RankedPeriod<T> {
  const item = record(value, path);
  const ranges: TimeRange[] = ["short", "medium", "long"];
  return Object.fromEntries(
    ranges.map((range) => [
      range,
      list(item[range], path + "." + range).map((entry, index) =>
        parse(entry, path + "." + range + "[" + index + "]")
      )
    ])
  ) as RankedPeriod<T>;
}

function snapshot(value: unknown, path: string): ListeningSnapshot {
  const item = record(value, path);
  const hours = list(item.listeningHours, path + ".listeningHours").map((count, index) =>
    integer(count, path + ".listeningHours[" + index + "]")
  );
  if (hours.length !== 24) fail(path + ".listeningHours");

  const repeatedTracks: CountedTrack[] = list(
    item.repeatedTracks,
    path + ".repeatedTracks"
  ).map((entry, index) => {
    const counted = record(entry, path + ".repeatedTracks[" + index + "]");
    return {
      track: track(counted.track, path + ".repeatedTracks[" + index + "].track"),
      count: integer(counted.count, path + ".repeatedTracks[" + index + "].count")
    };
  });
  const repeatedArtists: CountedArtist[] = list(
    item.repeatedArtists,
    path + ".repeatedArtists"
  ).map((entry, index) => {
    const counted = record(entry, path + ".repeatedArtists[" + index + "]");
    return {
      artist: artistSummary(counted.artist, path + ".repeatedArtists[" + index + "].artist"),
      count: integer(counted.count, path + ".repeatedArtists[" + index + "].count")
    };
  });

  return {
    topArtist: item.topArtist === null ? null : artist(item.topArtist, path + ".topArtist"),
    topTrack: item.topTrack === null ? null : track(item.topTrack, path + ".topTrack"),
    constants: list(item.constants, path + ".constants").map((entry, index) =>
      artist(entry, path + ".constants[" + index + "]")
    ),
    movers: list(item.movers, path + ".movers").map((entry, index) => {
      const move = record(entry, path + ".movers[" + index + "]");
      return {
        artist: artist(move.artist, path + ".movers[" + index + "].artist"),
        currentRank: integer(move.currentRank, path + ".movers[" + index + "].currentRank"),
        longRank: integer(move.longRank, path + ".movers[" + index + "].longRank"),
        movement: numeric(move.movement, path + ".movers[" + index + "].movement")
      };
    }),
    repeatedTracks,
    repeatedArtists,
    uniqueArtists: integer(item.uniqueArtists, path + ".uniqueArtists"),
    uniqueAlbums: integer(item.uniqueAlbums, path + ".uniqueAlbums"),
    listeningHours: hours
  };
}

function profile(value: unknown, path: string): Profile {
  const item = record(value, path);
  return {
    name: text(item.name, path + ".name"),
    url: text(item.url, path + ".url"),
    image: item.image === null ? null : art(item.image, path + ".image")
  };
}

export function parseListeningRoom(value: unknown): ListeningRoomPayload {
  const root = record(value, "root");
  return {
    generatedAt: text(root.generatedAt, "generatedAt"),
    profile: profile(root.profile, "profile"),
    playlists: list(root.playlists, "playlists").map((entry, index) =>
      playlist(entry, "playlists[" + index + "]")
    ),
    topArtists: ranked(root.topArtists, "topArtists", artist),
    topTracks: ranked(root.topTracks, "topTracks", track),
    recent: list(root.recent, "recent").map((entry, index) =>
      recentTrack(entry, "recent[" + index + "]")
    ),
    snapshot: snapshot(root.snapshot, "snapshot")
  };
}

export function parsePlayback(value: unknown): Playback {
  const root = record(value, "playback");
  return {
    isPlaying: bool(root.isPlaying, "playback.isPlaying"),
    progressMs: nullableNumber(root.progressMs, "playback.progressMs"),
    observedAt: text(root.observedAt, "playback.observedAt"),
    track: root.track === null ? null : track(root.track, "playback.track")
  };
}

export function musicApiUrl(path: "/spotify/room" | "/spotify/now"): string {
  const base = process.env.NEXT_PUBLIC_MUSIC_API_URL?.trim().replace(/\/+$/, "");
  if (!base) throw new Error("NEXT_PUBLIC_MUSIC_API_URL is not configured.");
  return base + path;
}
