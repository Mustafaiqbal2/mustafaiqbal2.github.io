# Listening Room design

## Purpose

Replace the `On rotation` placeholder on `/music` with a live, scroll-driven view of Mustafa's Spotify listening. The section should feel like entering an after-hours listening room, while the data remains clear enough to understand without knowing Spotify's API.

The tab label is `Listening room`. Its hash is `#listening`. The old `#rotation` hash remains as a compatibility alias and redirects to the new tab.

## Product rules

- Music data updates itself. Track, artist, and playlist lists are never maintained by hand.
- Spotify's ordering is presented as Spotify's ordering. The site does not invent play counts or listening-time statistics.
- The page says `now playing` only when the latest refresh found an active track. Otherwise it says `last heard` and shows the most recent track.
- Only public playlists appear on the public website.
- Every track, artist, playlist, and profile link opens the matching Spotify page.
- If Spotify is unavailable, the section keeps its layout and shows a plain unavailable state. It does not substitute fake listening data.

## Experience

### Entry

Selecting `Listening room` replaces the story panel instead of opening a modal. The translucent tab bar stays visible. The story's ScrollTriggers are removed when its panel unmounts, so hidden pins cannot affect the listening-room scroll length.

The room begins almost dark. Scroll reveals a floor line, two side walls, a low record console, and a central album sleeve. The perspective is shallow and poster-like rather than a literal 3D render. Album artwork provides the changing colour; the site keeps its ink, bone, violet, pink, and cyan system.

### Scene 1 — Now / last heard

- A central album sleeve and a simplified rotating record form the main focus.
- The track title and artist are full-size readable text beside the artwork.
- A small status line reads `now playing` or `last heard` according to the refresh data.
- Scroll brings the room lights up, places the sleeve on the console, and draws the track information.
- The animation never pretends that a scheduled static refresh is a second-by-second playback position.

### Scene 2 — Recently played

- The latest twelve tracks move across the room on a horizontal album-art ribbon.
- The active card enlarges at the centre and exposes title, artist, and played time.
- Desktop uses one pinned, scrubbed pass. Mobile renders the same tracks as a readable vertical sequence with lightweight entrances.

### Scene 3 — Top artists

- Three scroll beats show short-, medium-, and long-term Spotify rankings.
- Artist portraits occupy the room's poster wall. Rank changes are communicated by reordering and scale, not made-up percentages.
- The period labels use plain language: `last month`, `last six months`, and `long term`.

### Scene 4 — Playlists

- Public playlists become a record shelf of cover tiles.
- Scrolling moves along the shelf on desktop. Mobile uses a two-column shelf with normal vertical flow.
- Hover or focus exposes the playlist name and a direct Spotify link. Touch users see the name without relying on hover.

### Scene 5 — Exit

- The room settles into a complete final composition.
- A direct `open my Spotify` action is the primary exit.
- A small timestamp states when the data was last refreshed.

## Motion and performance

- Desktop scenes may pin and scrub, following the established `/music` story architecture.
- Mobile does not inherit desktop pins except where a single contained viewport is necessary. Content remains readable in normal document flow.
- Only transform and opacity animate continuously. Album artwork is never blurred per frame.
- Infinite record rotation pauses when off-screen and is disabled for reduced motion or weak-device mode.
- `prefers-reduced-motion` receives the final composed state with no hidden content.
- Artwork has fixed aspect ratios and reserved dimensions to prevent layout shift.

## Data pipeline

### Generated file

The UI reads one typed static file at `public/data/listening-room.json`. A checked-in empty-state file lets local builds and pull requests succeed without credentials.

The generated shape contains:

- profile name, profile URL, and image;
- refresh timestamp;
- current track when Spotify reports one;
- recently played tracks;
- top artists and top tracks for short, medium, and long periods;
- public playlists;
- Spotify URLs and artwork URLs for each item.

### Refresh

A script exchanges a Spotify refresh token for a short-lived access token, calls Spotify's profile and listening endpoints, validates the response, and writes the generated JSON.

The Pages workflow gains a scheduled run. On a scheduled or manually dispatched build, the script refreshes the JSON before `next build`. A normal pull-request or local build without secrets uses the checked-in empty state. The workflow never writes the refresh token or access token into the export.

Required repository secrets:

- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `SPOTIFY_REFRESH_TOKEN`

Required authorization scopes:

- `user-read-currently-playing`
- `user-read-recently-played`
- `user-top-read`
- `playlist-read-private` so the script can retrieve the account's list and then publish only entries marked public

The scheduled interval is one hour. This keeps the page self-updating without burning GitHub Actions time on near-constant static redeploys. A true second-by-second now-playing display would require a serverless proxy and is outside this implementation.

## Component boundaries

- `MusicPage` owns tab selection, hash compatibility, and which panel is mounted.
- `ListeningRoom` owns its data load, empty/error state, weak-device handling, and scene lifecycle.
- Scene components own markup and their own GSAP builders.
- `listeningRoomData.ts` owns validation and display-safe defaults.
- `scripts/refresh-spotify.mjs` owns Spotify authentication and generated JSON.

No scene reads environment variables or calls Spotify from the browser.

## Accessibility

- The tab remains a native button with `aria-pressed`.
- The listening panel has a labelled region and logical heading order.
- Album art has useful alternative text; decorative room geometry is hidden from assistive technology.
- All Spotify links are reachable by keyboard and have visible focus states.
- Mobile controls meet a 44px touch-target floor.

## Verification

- Typecheck and static export succeed with no Spotify secrets.
- A fixture run proves the generated data renders every scene.
- An empty-state run proves the tab remains usable when Spotify is unavailable.
- Screenshots cover 390x844, 834x1112, 1366x768, and 1440x900.
- Automated checks detect horizontal overflow, hidden final content, stale story pins after tab switches, and links without Spotify URLs.
- Reduced-motion and a simulated four-core device render complete content without continuous animation.
