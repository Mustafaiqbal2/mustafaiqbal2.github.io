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
export const FIREWORK_DRAG = .46;
export const FIREWORK_GRAVITY = .8;
// Each ascending rocket opens a large shell, then releases many smaller flowers.
// Leave breathing room for each compound shell to finish before the next launch.
export const SHELLS = [
  { at: 2.2, x: 0, y: .1, size: 1.35, kind: 0, life: 5.1, flowers: 12 },
  { at: 10, x: -.07, y: .18, size: 1.4, kind: 1, life: 5.1, flowers: 14 },
  { at: 17.8, x: .07, y: .2, size: 1.45, kind: 2, life: 5.1, flowers: 16 },
  { at: 25.6, x: 0, y: .22, size: 1.55, kind: 3, life: 5.6, flowers: 18 }
];
export function sparkDisplacement(vx: number, vy: number, vz: number, seconds: number) {
  const drag = (1-Math.exp(-FIREWORK_DRAG*seconds))/FIREWORK_DRAG;
  return { x:vx*drag, y:vy*drag-FIREWORK_GRAVITY*seconds*seconds, z:vz*drag };
}
export function secondaryFlowers(shell: typeof SHELLS[number]) {
  return Array.from({length:shell.flowers},(_,index)=>{
    const latitude=1-2*(index+.5)/shell.flowers;
    const longitude=index*2.39996323+shell.kind*.7;
    const radius=Math.sqrt(1-latitude*latitude);
    const speed=11.2*shell.size;
    const vx=Math.cos(longitude)*radius*speed,vy=latitude*speed,vz=Math.sin(longitude)*radius*speed;
    const delay=1.12+(index*7%11)*.046;
    const displacement=sparkDisplacement(vx,vy,vz,delay);
    return {
      at:shell.at+delay, delay, life:2.65+(index%3)*.17,
      x:shell.x*48+displacement.x, y:shell.y*45+displacement.y, z:displacement.z,
      vx,vy,vz, tint:index%3
    };
  });
}
export const FIREWORK_BURSTS = SHELLS.flatMap(shell=>[
  {at:shell.at,strength:shell.kind===3?.8:.65},
  ...secondaryFlowers(shell).map(flower=>({at:flower.at,strength:.07}))
]).sort((a,b)=>a.at-b.at);
export const SHOW_SECONDS = Math.max(...SHELLS.flatMap(shell=>[
  shell.at+shell.life,...secondaryFlowers(shell).map(flower=>flower.at+flower.life)
]))+1;
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
