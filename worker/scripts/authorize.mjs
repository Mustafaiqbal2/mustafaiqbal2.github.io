import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { createInterface } from "node:readline/promises";
import { spawn } from "node:child_process";

const CALLBACK = "http://127.0.0.1:8788/callback";
const TIMEOUT_MS = 5 * 60 * 1000;

export const SCOPES = [
  "user-read-currently-playing",
  "user-read-recently-played",
  "user-top-read",
  "playlist-read-private"
];

export function buildAuthorizeUrl(clientId, state, codeChallenge) {
  const url = new URL("https://accounts.spotify.com/authorize");
  url.search = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: CALLBACK,
    scope: SCOPES.join(" "),
    state,
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
    show_dialog: "true"
  }).toString();
  return url;
}

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function tryOpenBrowser(url) {
  try {
    let child;
    if (process.platform === "win32") {
      child = spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" });
    } else if (process.platform === "darwin") {
      child = spawn("open", [url], { detached: true, stdio: "ignore" });
    } else {
      child = spawn("xdg-open", [url], { detached: true, stdio: "ignore" });
    }
    child.unref();
  } catch {
    // The printed URL remains available when automatic opening is unavailable.
  }
}

function waitForCode(expectedState) {
  let server;
  let timeout;

  const code = new Promise((resolve, reject) => {
    server = createServer((request, response) => {
      const url = new URL(request.url ?? "/", "http://127.0.0.1:8788");
      if (url.pathname !== "/callback") {
        response.writeHead(404).end("Not found");
        return;
      }

      const error = url.searchParams.get("error");
      const state = url.searchParams.get("state");
      const authorizationCode = url.searchParams.get("code");

      if (error) {
        response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Spotify authorization was cancelled. Return to the terminal.");
        reject(new Error("Spotify authorization returned: " + error));
        return;
      }
      if (state !== expectedState) {
        response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("State check failed. Return to the terminal.");
        reject(new Error("Spotify authorization state did not match."));
        return;
      }
      if (!authorizationCode) {
        response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("No authorization code was returned.");
        reject(new Error("Spotify returned no authorization code."));
        return;
      }

      response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Spotify connected. You can close this tab and return to the terminal.");
      resolve(authorizationCode);
    });

    server.once("error", reject);
    server.listen(8788, "127.0.0.1");
    timeout = setTimeout(() => reject(new Error("Spotify authorization timed out.")), TIMEOUT_MS);
  });

  return {
    code,
    close() {
      if (timeout) clearTimeout(timeout);
      if (server) server.close();
    }
  };
}

async function exchangeCode(clientId, authorizationCode, verifier) {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: "authorization_code",
      code: authorizationCode,
      redirect_uri: CALLBACK,
      code_verifier: verifier
    })
  });

  if (!response.ok) throw new Error("Spotify token exchange failed with status " + response.status + ".");
  const payload = await response.json();
  if (typeof payload.refresh_token !== "string" || payload.refresh_token.length === 0) {
    throw new Error("Spotify did not return a refresh token.");
  }
  return payload.refresh_token;
}

async function main() {
  const readline = createInterface({ input: process.stdin, output: process.stdout });
  const clientId = (await readline.question("Spotify client ID: ")).trim();
  readline.close();
  if (!clientId) throw new Error("A Spotify client ID is required.");

  const state = base64Url(randomBytes(24));
  const verifier = base64Url(randomBytes(64));
  const challenge = base64Url(createHash("sha256").update(verifier).digest());
  const authorizationUrl = buildAuthorizeUrl(clientId, state, challenge).toString();
  const callback = waitForCode(state);

  console.log("\nOpen this URL if the browser does not open automatically:\n");
  console.log(authorizationUrl + "\n");
  tryOpenBrowser(authorizationUrl);

  try {
    const authorizationCode = await callback.code;
    const refreshToken = await exchangeCode(clientId, authorizationCode, verifier);
    console.log("\nSpotify refresh token (copy it into the Cloudflare secret prompt):\n");
    console.log(refreshToken + "\n");
  } finally {
    callback.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Spotify authorization failed.");
    process.exitCode = 1;
  });
}
