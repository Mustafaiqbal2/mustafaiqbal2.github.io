import { describe, expect, it } from "vitest";
import { createSpotifyClient } from "../src/spotify";
import { createFakeSpotifyFetch } from "./helpers/fakeSpotify";

const env = {
  SPOTIFY_CLIENT_ID: "client-id",
  SPOTIFY_CLIENT_SECRET: "client-secret",
  SPOTIFY_REFRESH_TOKEN: "refresh-token"
};

describe("Spotify client", () => {
  it("refreshes once and shapes the full room response", async () => {
    const fake = createFakeSpotifyFetch();
    const client = createSpotifyClient(env, fake.fetch);
    const room = await client.getRoom();

    expect(fake.tokenRequests()).toBe(1);
    expect(room.profile.name).toBe("Mustafa");
    expect(room.playlists.map(({ name }) => name)).toEqual([
      "Midnight drives",
      "Songs for staring at the ceiling",
      "Everything else"
    ]);
    expect(room.playlists.every((playlist) => playlist.name !== "Private draft")).toBe(true);
    expect(room.topArtists.short[0]?.name).toBe("The 1975");
    expect(room.snapshot.topTrack?.name).toBe("About You");
  });

  it("returns the recent track when playback is empty", async () => {
    const fake = createFakeSpotifyFetch({ playback: null });
    const client = createSpotifyClient(env, fake.fetch);
    const now = await client.getNow();

    expect(now.isPlaying).toBe(false);
    expect(now.progressMs).toBeNull();
    expect(now.track?.name).toBe("About You");
  });

  it("reuses a valid access token", async () => {
    const fake = createFakeSpotifyFetch();
    const client = createSpotifyClient(env, fake.fetch);

    await client.getNow();
    await client.getRoom();

    expect(fake.tokenRequests()).toBe(1);
  });
});
