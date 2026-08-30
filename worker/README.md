# Music API Worker

This Worker supplies live Spotify data to the Listening Room on the static portfolio.

## One-time Spotify setup

1. Open the existing MelodyMind app in the Spotify Developer Dashboard.
2. In Settings, add this redirect URI exactly:

```text
http://127.0.0.1:8788/callback
```

3. Run:

```powershell
npm run spotify:authorize
```

4. Enter the Spotify client ID. Approve the requested access in the browser.
5. Keep the refresh token shown in the local terminal for the Cloudflare secret step.

The helper uses PKCE and does not request or store the Spotify client secret.

## Cloudflare setup

Sign in:

```powershell
npx wrangler login
```

Add each value through Wrangler's hidden prompt:

```powershell
npx wrangler secret put SPOTIFY_CLIENT_ID --config worker/wrangler.toml
npx wrangler secret put SPOTIFY_REFRESH_TOKEN --config worker/wrangler.toml
npx wrangler secret put ALLOWED_ORIGIN --config worker/wrangler.toml
npx wrangler secret put MELODYMIND_SEARCH_URL --config worker/wrangler.toml
npx wrangler secret put MELODYMIND_SERVICE_TOKEN --config worker/wrangler.toml
```

Use `https://mustafaiqbal2.github.io` for `ALLOWED_ORIGIN`.

`MELODYMIND_SEARCH_URL` is the private CLaMP3 service described in
`services/melodymind-search`. Use the same random `MELODYMIND_SERVICE_TOKEN` in
both deployments. The Worker exposes `/api/search`, adds live Spotify metadata,
and remains the only API URL used by the static site.

Deploy:

```powershell
npm run worker:deploy
```

The deployment prints the `workers.dev` URL. Record it here after the first deployment.

No Spotify or Cloudflare secret belongs in a repository file, command argument, chat message, or browser bundle.
