# Listening Room design

## Purpose

Replace the `On rotation` placeholder on `/music` with a live view of Mustafa's Spotify listening. The section uses the visual language of an after-hours listening room, but it remains easier to move through than the main landing page or the MelodyMind story.

The tab label is `Listening room`. Its hash is `#listening`. The old `#rotation` hash remains as a compatibility alias and redirects to the new tab.

## Product rules

- Tracks, artists, playlists, and artwork come from Spotify and update without editing the website.
- Only public playlists appear on the public website.
- Every track, artist, playlist, and profile opens its matching Spotify page.
- If Spotify cannot be reached, the page keeps its layout and shows an unavailable state. It does not insert placeholder music.
- Spotify credentials stay inside Cloudflare Worker secrets and never enter the browser or the static export.

## Experience

### Entry

Selecting `Listening room` replaces the Story panel. The translucent tab bar remains visible. The Story ScrollTriggers are removed when the Story panel unmounts, so its pins cannot affect the Listening Room.

The room begins with a large playlist shelf rather than a separate title scene. Album and playlist artwork supplies most of the colour. The surrounding interface stays within the site's ink, bone, violet, pink, and cyan system.

### Floating listening pill

Current playback is a floating pill, not a full scene.

- Desktop places it at the lower-right edge of the viewport.
- Mobile places it above the safe area and keeps it clear of the tab controls.
- It contains album art, track title, artist, and a compact equalizer while a track is playing.
- When playback is idle, it shows the latest track returned by recently played.
- Selecting the pill opens the track on Spotify.
- The pill remains present while the Listening Room is active and leaves with the tab.
- Motion uses transforms and opacity only. Reduced-motion mode keeps the pill still.

### Section 1: Playlists

- Public playlists form the main entrance to the room.
- Desktop uses a deep record shelf with one focused cover and neighbouring covers visible in perspective.
- Scrolling moves focus through the shelf without turning the entire page into a long horizontal strip.
- Mobile uses a readable two-column shelf in normal vertical flow.
- Playlist names are always visible. Hover and focus may reveal additional movement, but no information depends on hover.

### Section 2: Top artists

- Artist portraits occupy a poster wall.
- The wall has three views: last month, last six months, and long term.
- Scroll moves between the three views on desktop. Mobile uses explicit controls and a short vertical list.
- Artist rank controls position and scale. No percentage graphics are added.
- A compact top-tracks strip sits with each period so the artist and track rankings can be read together.

### Section 3: Listening snapshot

This section uses Spotify rankings and the latest listening history to create a compact Wrapped-like interlude.

Initial cards may include:

- current top artist and current top track;
- artists appearing across the month, six-month, and long-term rankings;
- the largest differences between current and long-term rankings;
- repeated artists and tracks in recent listening;
- the number of different artists and albums in recent listening;
- a clock built from recent playback timestamps.

The cards use the same live response as the surrounding sections. This first version does not maintain a long-term listening database. A later version can add Cloudflare D1 and start collecting history from its launch date.

### Section 4: Recently played

- The latest tracks appear after playlists, artists, and the listening snapshot.
- Desktop uses an album-art ribbon with a focused card at the centre.
- Mobile renders a normal vertical history with lightweight entrances.
- Each item includes artwork, track, artist, playback time, and a Spotify link.

### Exit

- The room settles into one complete composition.
- `Open my Spotify` is the primary action.
- The floating pill remains available until the user changes tabs or leaves `/music`.

## Motion and performance

- Desktop may use contained pinning and scrubbed transitions for the shelf and poster wall.
- Mobile remains in normal document flow. It does not inherit desktop scene coordinates.
- Continuous animation is limited to transform and opacity.
- Artwork is never blurred or filtered per frame.
- Infinite motion pauses off-screen and is disabled in reduced-motion or weak-device mode.
- Artwork dimensions are reserved before loading to prevent layout shift.
- The floating pill polls only while the Listening Room tab is active and the document is visible.

## Live data architecture

### Cloudflare Worker

The static GitHub Pages site calls one Cloudflare Worker. The Worker owns Spotify token refresh, API requests, response shaping, caching, CORS, and error handling.

Initial routes:

- `GET /spotify/room` returns profile, public playlists, top artists, top tracks, recent tracks, and computed listening snapshot data.
- `GET /spotify/now` returns current playback or the latest recent track.
- `GET /health` returns a small status response without exposing credentials.

The route namespace leaves room for a later `/melodymind/search` endpoint. MelodyMind search is not part of this implementation and will receive its own design before the Worker is connected to a vector database.

### Refresh behaviour

- `/spotify/now` uses a short cache and the browser refreshes it while the tab is visible.
- `/spotify/room` uses a longer cache because rankings and playlists do not need second-by-second requests.
- The browser stops polling when the tab is hidden or the user leaves the Listening Room.
- A failed refresh keeps the most recent successful browser response for the current visit.

### Spotify data

The Worker requests:

- current playback;
- recently played tracks;
- top artists and tracks for short, medium, and long periods;
- the current user's playlists;
- the current user's profile.

Required authorization scopes:

- `user-read-currently-playing`
- `user-read-recently-played`
- `user-top-read`
- `playlist-read-private`

The Worker filters the playlist response to public playlists before returning it.

### Secrets

Cloudflare stores:

- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `SPOTIFY_REFRESH_TOKEN`
- `ALLOWED_ORIGIN`

The values are added through `wrangler secret put` or the Cloudflare dashboard. They are not placed in `.env`, source files, GitHub Actions, or browser code.

### Free-tier target

The implementation targets the Cloudflare Workers Free plan. It uses no paid storage product, no automatic paid-plan switch, and no per-request third-party service beyond Spotify. Request caching and visibility-aware polling keep usage far below the current free allowance for normal portfolio traffic.

## Setup hand-off

Mustafa is needed only at these points:

1. Confirm that the existing MelodyMind Spotify Developer app is still accessible and that its owner account has Spotify Premium.
2. Add the localhost redirect URI supplied by the implementation.
3. Run the one-time local authorization command, sign into Spotify, and approve the four scopes.
4. Create or sign into a Cloudflare account.
5. Run the supplied Wrangler login command in the browser.

After login, the implementation scripts create the Worker and prompt locally for each secret. Secrets are never pasted into chat.

## Component boundaries

- `MusicPage` owns tab selection, hash compatibility, and which panel is mounted.
- `ListeningRoom` owns data loading, empty/error states, weak-device handling, and section lifecycle.
- `ListeningPill` owns current-playback polling and visibility rules.
- Listening Room sections own their markup and GSAP builders.
- `listeningRoomData.ts` owns response validation and display-safe defaults.
- `worker/` owns Spotify authentication, caching, response shaping, and future API namespaces.

No scene reads environment variables or calls Spotify directly.

## Accessibility

- The tab remains a native button with `aria-pressed`.
- The panel has a labelled region and logical heading order.
- Artwork has useful alternative text; decorative room geometry is hidden from assistive technology.
- Spotify links are keyboard reachable and have visible focus states.
- Mobile controls meet a 44px touch-target floor.
- The floating pill does not cover focused content or the mobile safe area.

## Verification

- Typecheck and static export succeed without Spotify credentials.
- Worker tests cover token refresh, Spotify failure, CORS, cache headers, private-playlist filtering, and response validation.
- Fixture responses render every section and the floating pill locally.
- An unavailable response leaves the tab usable.
- Screenshots cover 390x844, 834x1112, 1366x768, and 1440x900.
- Automated checks detect horizontal overflow, hidden final content, stale Story pins after tab switches, and broken Spotify links.
- Reduced-motion and simulated weak-device runs render complete content without continuous animation.
