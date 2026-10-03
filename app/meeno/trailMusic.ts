export type MusicCue = "forest" | "fireworks";

// One continuous Married Life recording. The ending lowers its gain without
// restarting or seeking, and explosions temporarily lower it further.
export const MUSIC_TRACKS = {
  forest: { url: "/meeno/music-married-life.mp3", gain: .34 },
  fireworks: { url: "/meeno/music-married-life.mp3", gain: .12 }
} as const;

export function createTrailMusic(context: AudioContext, destination: AudioNode) {
  const bus = context.createGain();
  bus.connect(destination);
  const abort = new AbortController();
  const buffers = new Map<string, AudioBuffer>();
  const pending = new Map<string, Promise<AudioBuffer | null>>();
  type Voice = { cue: MusicCue; source: AudioBufferSourceNode; gain: GainNode };
  const voices = new Set<Voice>();
  let current: Voice | null = null;
  let desired: MusicCue | null = null;
  let requestedAt = 0;
  let disposed = false;
  let duckUntil = 0;
  let duckDepth = 1;

  function hold(param: AudioParam, at: number) {
    if (typeof param.cancelAndHoldAtTime === "function") param.cancelAndHoldAtTime(at);
    else { const value = param.value; param.cancelScheduledValues(at); param.setValueAtTime(value, at); }
  }

  function load(cue: MusicCue): Promise<AudioBuffer | null> {
    const url=MUSIC_TRACKS[cue].url;
    const cached = buffers.get(url);
    if (cached) return Promise.resolve(cached);
    const existing = pending.get(url);
    if (existing) return existing;
    const request = fetch(url, { signal: abort.signal })
      .then(response => {
        if (!response.ok) throw new Error("Music unavailable");
        return response.arrayBuffer();
      }).then(async data => {
        // Decode the shared recording once at 24 kHz to limit mobile memory.
        const decoder = new OfflineAudioContext(2, 1, 24000);
        const buffer = await decoder.decodeAudioData(data);
        if (disposed) return null;
        buffers.set(url, buffer);
        return buffer;
      }).catch(() => null).finally(() => pending.delete(url));
    pending.set(url, request);
    return request;
  }

  function retire(voice: Voice, now: number) {
    hold(voice.gain.gain, now);
    voice.gain.gain.linearRampToValueAtTime(0, now + 2.8);
    voice.source.stop(now + 2.9);
  }
  function play(cue: MusicCue, buffer: AudioBuffer) {
    if (disposed || desired !== cue || current?.cue === cue) return;
    const now = context.currentTime;
    if(current?.source.buffer===buffer) {
      current.cue=cue;
      hold(current.gain.gain,now);
      current.gain.gain.linearRampToValueAtTime(MUSIC_TRACKS[cue].gain,now+2.8);
      return;
    }
    if (current) retire(current, now);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = context.createGain();
    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(MUSIC_TRACKS[cue].gain, now + 2.8);
    source.connect(gain); gain.connect(bus);
    const voice = { cue, source, gain };
    voices.add(voice); current = voice;
    source.onended = () => {
      source.disconnect(); gain.disconnect(); voices.delete(voice);
      if (current === voice) current = null;
    };
    // A slow connection can join at the correct musical time instead of
    // starting the introduction several seconds after the first explosion.
    source.start(now, Math.max(0, now - requestedAt) % buffer.duration);
  }

  return {
    preload() { return load("forest").then(Boolean); },
    scene(cue: MusicCue | null) {
      if (disposed || (desired === cue && (current || !cue))) return;
      desired = cue;
      requestedAt = context.currentTime;
      const now = context.currentTime;
      hold(bus.gain, now);
      bus.gain.setTargetAtTime(1, now, .25);
      duckUntil = 0; duckDepth = 1;
      if (!cue) {
        if (current) retire(current, now);
        current = null;
        return;
      }
      const cached = buffers.get(MUSIC_TRACKS[cue].url);
      if (cached) play(cue, cached);
      else void load(cue).then(buffer => { if (buffer) play(cue, buffer); });
    },
    duck(strength: number) {
      if (disposed || desired !== "fireworks") return;
      const now = context.currentTime;
      const depth = strength >= .2 ? .30 : .65;
      duckDepth = now < duckUntil ? Math.min(duckDepth, depth) : depth;
      duckUntil = Math.max(duckUntil, now + (strength >= .2 ? .55 : .20));
      hold(bus.gain, now);
      bus.gain.linearRampToValueAtTime(duckDepth, now + .035);
      bus.gain.setTargetAtTime(1, duckUntil, .48);
    },
    dispose() {
      disposed = true;
      abort.abort();
      voices.forEach(({source,gain}) => {
        source.onended = null; source.stop(); source.disconnect(); gain.disconnect();
      });
      voices.clear(); buffers.clear(); pending.clear(); current = null;
      bus.disconnect();
    }
  };
}
