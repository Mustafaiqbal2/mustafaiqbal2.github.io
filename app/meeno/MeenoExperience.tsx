"use client";

import { FormEvent, useEffect, useLayoutEffect, useState } from "react";
import sealedContent from "./content.json";
import { ReefLife } from "./ReefLife";
import { TrailEntrance } from "./TrailEntrance";
import { loadTrailArtwork } from "./trailAssets";
import { UnderwaterCanvas } from "./UnderwaterCanvas";
import { isTrailStory, type TrailStory } from "./trailSequence";
import { useAmbience } from "./useAmbience";

type Phase = "locked" | "fading" | "open";

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

async function unlockContent(password: string): Promise<TrailStory | null> {
  try {
    const rawKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
    const key = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: fromBase64(sealedContent.salt),
        iterations: sealedContent.iterations,
        hash: "SHA-256"
      },
      rawKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(sealedContent.iv) },
      key,
      fromBase64(sealedContent.data)
    );
    const lines: unknown = JSON.parse(new TextDecoder().decode(decrypted));
    return isTrailStory(lines) ? lines : null;
  } catch {
    return null;
  }
}

export function MeenoExperience() {
  const [phase, setPhase] = useState<Phase>("locked");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [story, setStory] = useState<TrailStory | null>(null);
  const sound = useAmbience(phase === "locked" ? "ocean" : "forest");

  useLayoutEffect(() => {
    document.documentElement.classList.add("meeno-page");
    return () => document.documentElement.classList.remove("meeno-page", "meeno-locked", "meeno-celebrating");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("meeno-locked", phase !== "open");
  }, [phase]);

  useEffect(() => {
    // Decode the individual woodland sprites behind the gate.
    const timeout = window.setTimeout(() => { void loadTrailArtwork().catch(() => {}); }, 700);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (phase !== "fading") return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timeout = window.setTimeout(() => setPhase("open"), reducedMotion ? 120 : 950);
    return () => window.clearTimeout(timeout);
  }, [phase]);

  async function handleUnlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sound.start();
    if (busy) return;
    setBusy(true);
    setError("");
    const lines = await unlockContent(password);
    if (!lines) {
      setBusy(false);
      setError("Wrong password.");
      return;
    }
    await Promise.race([
      loadTrailArtwork().catch(() => {}),
      new Promise<void>(resolve => window.setTimeout(resolve, 4000))
    ]);
    setBusy(false);
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.scrollTo({ top: 0, behavior: "instant" });
    setStory(lines);
    setPassword("");
    setPhase("fading");
  }

  return (
    <main id="main" className={`meeno-root meeno-root--${phase}`}
      onPointerDownCapture={event => { if (!(event.target as HTMLElement).closest(".meeno-sound")) sound.start(); }}
      onFocusCapture={event => { if (!(event.target as HTMLElement).closest(".meeno-sound")) sound.start(); }}>
      <div className="meeno-next">{phase !== "locked" && story && <TrailEntrance story={story} onBurst={sound.burst} />}</div>

      <button className="meeno-sound" type="button" onClick={sound.toggle} aria-label={sound.active ? "Mute ambience" : "Turn sound on"} aria-pressed={sound.active}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 9h4l5-4v14l-5-4H4z" />
          {sound.active ? <><path d="M16 8a6 6 0 0 1 0 8" /><path d="M19 5a10 10 0 0 1 0 14" /></> : <path d="m17 10 4 4m0-4-4 4" />}
        </svg>
      </button>

      {phase !== "open" && (
        <div className={`meeno-gate ${phase === "fading" ? "meeno-gate--fading" : ""}`}>
          <div className="meeno-gate__water" aria-hidden="true">
            <UnderwaterCanvas />
            <div className="meeno-gate__depth" />
            <ReefLife />
          </div>

          <div className="meeno-entry">
          <h1 className="meeno-welcome">Welcome!</h1>
          <form className="meeno-keyhole" onSubmit={handleUnlock} aria-busy={busy}>
            <span className="meeno-keyhole__corner meeno-keyhole__corner--a" aria-hidden="true" />
            <span className="meeno-keyhole__corner meeno-keyhole__corner--b" aria-hidden="true" />
            <span className="meeno-keyhole__corner meeno-keyhole__corner--c" aria-hidden="true" />
            <span className="meeno-keyhole__corner meeno-keyhole__corner--d" aria-hidden="true" />
            <label htmlFor="meeno-password">Password</label>
            <div className="meeno-keyhole__field">
              <input
                id="meeno-password"
                type="password"
                autoComplete="off"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-describedby={error ? "meeno-password-error" : undefined}
                disabled={phase === "fading"}
              />
              <button type="submit" disabled={busy || !password.trim() || phase === "fading"} aria-label="Enter">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 12h15m-6-6 6 6-6 6" />
                </svg>
              </button>
            </div>
            <p id="meeno-password-error" role="alert">{error}</p>
          </form>
          </div>
        </div>
      )}
    </main>
  );
}
