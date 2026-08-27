import { describe, expect, it } from "vitest";
import { buildListeningSnapshot } from "../src/stats";
import type { Artist, RankedPeriod, RecentTrack, Track } from "../src/types";

const art = [{ url: "https://i.scdn.co/image/test", width: 640, height: 640 }];

const makeArtist = (id: string, name: string): Artist => ({
  id,
  name,
  url: `https://open.spotify.com/artist/${id}`,
  images: art
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
  durationMs: 240_000,
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
};

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
