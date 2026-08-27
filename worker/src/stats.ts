import type {
  Artist,
  CountedArtist,
  CountedTrack,
  ListeningSnapshot,
  RankedPeriod,
  RecentTrack,
  Track
} from "./types";

export type SnapshotInput = {
  topArtists: RankedPeriod<Artist>;
  topTracks: RankedPeriod<Track>;
  recent: RecentTrack[];
};

type Counted<T> = { item: T; count: number; firstSeen: number };

function localHour(value: string, timeZone: string): number | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    hourCycle: "h23"
  })
    .formatToParts(date)
    .find((part) => part.type === "hour")?.value;

  if (hour === undefined) return null;
  const parsed = Number.parseInt(hour, 10);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 23 ? parsed : null;
}

function sortedRepeats<T>(counts: Map<string, Counted<T>>, limit: number): Counted<T>[] {
  return [...counts.values()]
    .filter(({ count }) => count > 1)
    .sort((left, right) => right.count - left.count || left.firstSeen - right.firstSeen)
    .slice(0, limit);
}

export function buildListeningSnapshot(
  input: SnapshotInput,
  timeZone = "Asia/Karachi"
): ListeningSnapshot {
  const mediumIds = new Set(input.topArtists.medium.map(({ id }) => id));
  const longIds = new Set(input.topArtists.long.map(({ id }) => id));
  const constants = input.topArtists.short
    .filter(({ id }) => mediumIds.has(id) && longIds.has(id))
    .slice(0, 5);

  const longRanks = new Map(input.topArtists.long.map((artist, index) => [artist.id, index + 1]));
  const movers = input.topArtists.short
    .map((artist, index) => {
      const currentRank = index + 1;
      const longRank = longRanks.get(artist.id);
      if (longRank === undefined) return null;
      return { artist, currentRank, longRank, movement: longRank - currentRank };
    })
    .filter((move): move is NonNullable<typeof move> => move !== null && move.movement > 0)
    .sort((left, right) => right.movement - left.movement || left.currentRank - right.currentRank)
    .slice(0, 5);

  const trackCounts = new Map<string, Counted<Track>>();
  const artistCounts = new Map<string, Counted<Track["artists"][number]>>();
  const artistIds = new Set<string>();
  const albumIds = new Set<string>();
  const listeningHours = Array<number>(24).fill(0);

  input.recent.forEach((track, index) => {
    const existingTrack = trackCounts.get(track.id);
    trackCounts.set(track.id, {
      item: track,
      count: (existingTrack?.count ?? 0) + 1,
      firstSeen: existingTrack?.firstSeen ?? index
    });

    albumIds.add(track.album.id);
    for (const artist of track.artists) {
      artistIds.add(artist.id);
      const existingArtist = artistCounts.get(artist.id);
      artistCounts.set(artist.id, {
        item: artist,
        count: (existingArtist?.count ?? 0) + 1,
        firstSeen: existingArtist?.firstSeen ?? index
      });
    }

    const hour = localHour(track.playedAt, timeZone);
    if (hour !== null) listeningHours[hour] += 1;
  });

  const repeatedTracks: CountedTrack[] = sortedRepeats(trackCounts, 3).map(({ item, count }) => ({
    track: item,
    count
  }));
  const repeatedArtists: CountedArtist[] = sortedRepeats(artistCounts, 3).map(
    ({ item, count }) => ({ artist: item, count })
  );

  return {
    topArtist: input.topArtists.short[0] ?? null,
    topTrack: input.topTracks.short[0] ?? null,
    constants,
    movers,
    repeatedTracks,
    repeatedArtists,
    uniqueArtists: artistIds.size,
    uniqueAlbums: albumIds.size,
    listeningHours
  };
}
