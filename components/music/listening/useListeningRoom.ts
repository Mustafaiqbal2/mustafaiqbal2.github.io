"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { musicApiUrl, parseListeningRoom, parsePlayback } from "./data";
import type { ListeningRoomPayload, LoadState, Playback } from "./types";

const POLL_MS = 20_000;

export type ListeningRoomState = {
  room: LoadState<ListeningRoomPayload>;
  playback: LoadState<Playback>;
  refresh(): void;
};

async function responseJson(url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal
  });
  if (!response.ok) throw new Error("Music API returned " + response.status + ".");
  return response.json();
}

export function useListeningRoom(active: boolean): ListeningRoomState {
  const [room, setRoom] = useState<LoadState<ListeningRoomPayload>>({
    status: "idle",
    data: null
  });
  const [playback, setPlayback] = useState<LoadState<Playback>>({
    status: "idle",
    data: null
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const roomSequence = useRef(0);
  const playbackSequence = useRef(0);

  const refresh = useCallback(() => setRefreshKey((value) => value + 1), []);

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    const sequence = ++roomSequence.current;

    setRoom((current) => ({ status: "loading", data: current.data }));
    void (async () =>
      parseListeningRoom(
        await responseJson(musicApiUrl("/spotify/room"), controller.signal)
      ))()
      .then((data) => {
        if (roomSequence.current === sequence) setRoom({ status: "ready", data });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (roomSequence.current === sequence) {
          setRoom((current) => ({ status: "unavailable", data: current.data }));
        }
        if (process.env.NODE_ENV === "development") console.warn(error);
      });

    return () => {
      controller.abort();
      roomSequence.current += 1;
    };
  }, [active, refreshKey]);

  useEffect(() => {
    if (!active) return;
    let controller: AbortController | null = null;

    const poll = () => {
      if (document.visibilityState !== "visible") return;
      controller?.abort();
      controller = new AbortController();
      const signal = controller.signal;
      const sequence = ++playbackSequence.current;
      setPlayback((current) => ({ status: "loading", data: current.data }));

      void (async () =>
        parsePlayback(await responseJson(musicApiUrl("/spotify/now"), signal)))()
        .then((data) => {
          if (playbackSequence.current === sequence) setPlayback({ status: "ready", data });
        })
        .catch((error: unknown) => {
          if (signal.aborted) return;
          if (playbackSequence.current === sequence) {
            setPlayback((current) => ({ status: "unavailable", data: current.data }));
          }
          if (process.env.NODE_ENV === "development") console.warn(error);
        });
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") poll();
      else controller?.abort();
    };

    poll();
    const interval = window.setInterval(poll, POLL_MS);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      controller?.abort();
      playbackSequence.current += 1;
    };
  }, [active, refreshKey]);

  return { room, playback, refresh };
}
