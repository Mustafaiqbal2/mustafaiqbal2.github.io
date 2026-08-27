export type Art = { url: string; width: number | null; height: number | null };
export type Artist = { id: string; name: string; url: string; images: Art[] };
export type ArtistSummary = Pick<Artist, "id" | "name" | "url">;
export type Track = {
  id: string;
  name: string;
  url: string;
  artists: ArtistSummary[];
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
export type RankMove = {
  artist: Artist;
  currentRank: number;
  longRank: number;
  movement: number;
};
export type CountedTrack = { track: Track; count: number };
export type CountedArtist = { artist: ArtistSummary; count: number };
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
export type LoadState<T> =
  | { status: "idle"; data: null }
  | { status: "loading"; data: T | null }
  | { status: "ready"; data: T }
  | { status: "unavailable"; data: T | null };
