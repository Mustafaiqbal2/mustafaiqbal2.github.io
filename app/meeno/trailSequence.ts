export type TrailStory = { segments: { text: string; after?: string }[]; question: string };

export function isTrailStory(value: unknown): value is TrailStory {
  if (!value || typeof value !== "object") return false;
  const story = value as TrailStory;
  return typeof story.question === "string" && Array.isArray(story.segments) && story.segments.length === 7 &&
    story.segments.every(segment => segment && typeof segment.text === "string" &&
      (segment.after === undefined || typeof segment.after === "string"));
}

// A second sentence arrives while its first sentence is still on screen.
export const MESSAGE_WINDOWS = [
  [.045, .215, .108], [.245, .34], [.365, .52, .427],
  [.55, .665], [.695, .775], [.80, .85], [.88, .975]
];
const clamp = (value: number) => Math.max(0, Math.min(1, value));
export function messageVisibility(progress: number, index: number) {
  const window = MESSAGE_WINDOWS[index];
  return window ? Math.min(clamp((progress-window[0])/.018), clamp((window[1]-progress)/.018)) : 0;
}
export function followupVisibility(progress: number, index: number) {
  const start = MESSAGE_WINDOWS[index]?.[2];
  return start === undefined ? 0 : clamp((progress-start)/.022);
}
export const questionVisible = (progress: number) => progress >= .9999;

export const PAN_SECONDS = 3.2;
// Pauses between individual shells, followed by a layered golden finale.
export const SHELLS = [
  { at: 1.8, x: 0, y: 0, size: 1, kind: 0, life: 4.4 },
  { at: 5.5, x: -.29, y: .07, size: .86, kind: 1, life: 4.1 },
  { at: 8.9, x: .25, y: .16, size: .95, kind: 2, life: 4.7 },
  { at: 12.5, x: -.08, y: .29, size: 1.04, kind: 3, life: 5.4 },
  { at: 16.3, x: -.28, y: -.05, size: .8, kind: 1, life: 4.2 },
  { at: 16.9, x: .29, y: .10, size: .8, kind: 0, life: 4.4 },
  { at: 20.8, x: -.31, y: .13, size: .82, kind: 3, life: 5.6 },
  { at: 21.4, x: .31, y: .17, size: .82, kind: 3, life: 5.6 },
  { at: 22.3, x: 0, y: .35, size: 1.15, kind: 3, life: 5.8 }
];
export const SHOW_SECONDS = Math.max(...SHELLS.map(shell => shell.at+shell.life)) + 1;
export function celebrationAt(elapsed: number, reduced = false) {
  const panDuration = reduced ? .5 : PAN_SECONDS;
  const raw = clamp(elapsed/panDuration);
  return { pan: raw*raw*(3-2*raw), fireworks: elapsed-panDuration, finished: elapsed >= panDuration+SHOW_SECONDS };
}

// Work in the button's local coordinate system, with enough room for fingers.
export function evadePosition(width: number, height: number, buttonWidth: number, buttonHeight: number,
  pointerX: number, pointerY: number, previousX: number, previousY: number) {
  const maxX = Math.max(0, width-buttonWidth);
  const maxY = Math.max(0, height-buttonHeight);
  const candidates = [
    { x: 0, y: maxY }, { x: maxX, y: maxY },
    { x: maxX, y: 0 }, { x: maxX*.5, y: maxY }
  ];
  return candidates.reduce((best, point) => {
    const score = (p: { x: number; y: number }) =>
      Math.hypot(p.x+buttonWidth/2-pointerX, p.y+buttonHeight/2-pointerY) +
      Math.min(70, Math.hypot(p.x-previousX, p.y-previousY))*.6;
    return score(point) > score(best) ? point : best;
  });
}
