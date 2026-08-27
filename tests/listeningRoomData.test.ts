import { describe, expect, it } from "vitest";
import roomFixture from "../worker/test/fixtures/listening-room.json";
import { parseListeningRoom, parsePlayback } from "../components/music/listening/data";

describe("Listening Room response validation", () => {
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

  it("accepts active and idle playback", () => {
    const track = roomFixture.recent[0];
    expect(
      parsePlayback({
        isPlaying: true,
        progressMs: 120000,
        observedAt: "2026-08-27T20:00:00.000Z",
        track
      }).track?.name
    ).toBe(track.name);
    expect(
      parsePlayback({
        isPlaying: false,
        progressMs: null,
        observedAt: "2026-08-27T20:00:00.000Z",
        track: null
      }).track
    ).toBeNull();
  });
});
