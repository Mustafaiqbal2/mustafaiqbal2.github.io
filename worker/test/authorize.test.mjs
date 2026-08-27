import { describe, expect, it } from "vitest";
import { buildAuthorizeUrl, SCOPES } from "../scripts/authorize.mjs";

describe("Spotify authorization URL", () => {
  it("uses the loopback callback, PKCE and the four required scopes", () => {
    const url = buildAuthorizeUrl("client-id", "state-value", "challenge-value");

    expect(url.searchParams.get("client_id")).toBe("client-id");
    expect(url.searchParams.get("redirect_uri")).toBe("http://127.0.0.1:8788/callback");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("code_challenge")).toBe("challenge-value");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("scope")?.split(" ").sort()).toEqual([...SCOPES].sort());
    expect(url.searchParams.get("state")).toBe("state-value");
  });
});
