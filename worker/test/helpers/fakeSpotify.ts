import profile from "../fixtures/spotify-profile.json";
import playlists from "../fixtures/spotify-playlists.json";
import playlistPage2 from "../fixtures/spotify-playlists-page-2.json";
import recent from "../fixtures/spotify-recent.json";
import topArtists from "../fixtures/spotify-top-artists.json";
import topTracks from "../fixtures/spotify-top-tracks.json";

type FakeOptions = { playback?: Record<string, unknown> | null };

const defaultPlayback = {
  is_playing: true,
  progress_ms: 123_000,
  item: topTracks.items[0]
};

export function createFakeSpotifyFetch(options: FakeOptions = {}) {
  let tokenRequestCount = 0;
  const requested: string[] = [];
  const playback = options.playback === undefined ? defaultPlayback : options.playback;

  const fakeFetch = async (input: string | URL | Request): Promise<Response> => {
    const raw = typeof input === "string" || input instanceof URL ? String(input) : input.url;
    const url = new URL(raw);
    requested.push(url.toString());

    if (url.hostname === "accounts.spotify.com" && url.pathname === "/api/token") {
      tokenRequestCount += 1;
      return Response.json({ access_token: "access-token", token_type: "Bearer", expires_in: 3600 });
    }

    if (url.hostname !== "api.spotify.com") return new Response("missing fake", { status: 404 });
    if (url.pathname === "/v1/me") return Response.json(profile);
    if (url.pathname === "/v1/me/playlists") {
      return Response.json(url.searchParams.get("offset") === "3" ? playlistPage2 : playlists);
    }
    if (url.pathname === "/v1/me/player/recently-played") return Response.json(recent);
    if (url.pathname === "/v1/me/player/currently-playing") {
      return playback === null ? new Response(null, { status: 204 }) : Response.json(playback);
    }
    if (url.pathname === "/v1/me/top/artists") return Response.json(topArtists);
    if (url.pathname === "/v1/me/top/tracks") return Response.json(topTracks);
    return new Response("missing fake", { status: 404 });
  };

  return {
    fetch: fakeFetch as typeof fetch,
    tokenRequests: () => tokenRequestCount,
    requested
  };
}
