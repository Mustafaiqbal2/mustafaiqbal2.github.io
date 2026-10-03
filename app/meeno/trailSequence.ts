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
// Overlapping volleys spread three or four compound shells across the sky.
const VOLLEYS = [
  { at:2.2, positions:[[-.40,.02],[0,.67],[.40,.12]] },
  { at:5.1, positions:[[-.43,.39],[-.14,-.22],[.16,.70],[.43,.15]] },
  { at:8.0, positions:[[-.39,.06],[.02,.66],[.41,.25]] },
  { at:10.9, positions:[[-.43,.37],[-.15,-.16],[.15,.69],[.43,.15]] },
  { at:13.8, positions:[[-.40,.02],[0,.67],[.40,.12]] },
  { at:16.7, positions:[[-.43,.37],[-.15,-.16],[.15,.69],[.43,.15]] }
];
export const SHELLS = VOLLEYS.flatMap((wave,waveIndex)=>wave.positions.map(([x,y],index)=>({
  at:wave.at+index*.16, x,y, size:waveIndex===VOLLEYS.length-1?1.03:.90+index*.025,
  kind:waveIndex===VOLLEYS.length-1?3:(waveIndex+index)%3, life:waveIndex===VOLLEYS.length-1?5.6:5.1, flowers:12
})));
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
  {at:shell.at,strength:shell.kind===3?.63:.52,pan:shell.x*1.7},
  ...secondaryFlowers(shell).map(flower=>({at:flower.at,strength:.045,pan:shell.x*1.7}))
]).sort((a,b)=>a.at-b.at);
export const SHOW_SECONDS = Math.max(...SHELLS.flatMap(shell=>[
  shell.at+shell.life,...secondaryFlowers(shell).map(flower=>flower.at+flower.life)
]))+1;
export function celebrationAt(elapsed: number, reduced = false) {
  const panDuration = reduced ? .5 : PAN_SECONDS;
  const raw = clamp(elapsed/panDuration);
  return { pan: raw*raw*(3-2*raw), fireworks: elapsed-panDuration, finished: elapsed >= panDuration+SHOW_SECONDS };
}

// The first dodge is straight down; subsequent taps alternate along the bottom.
export function evadePosition(width: number, height: number, buttonWidth: number, buttonHeight: number, step: number) {
  const x=Math.max(0,width-buttonWidth), y=Math.max(0,height-buttonHeight);
  return {x:step%2===0?x:0,y};
}

export type TrailMeasurement = {start:number;distance:number};
export function measureTrail(top: number, scrollY: number, height: number, viewport: number,
  locked: boolean, previous: TrailMeasurement): TrailMeasurement {
  // A fixed body has a negative visual offset and scrollY=0. It must never
  // overwrite the real document origin while the fireworks/fullscreen resize.
  if(locked) return previous;
  const distance=Math.max(1,height-viewport);
  return {start:top+scrollY,distance:Math.max(1,distance-Math.min(distance*.08,viewport*3))};
}
export function trailProgress(scrollY: number, measurement: TrailMeasurement) {
  const travelled=scrollY-measurement.start;
  return travelled>=measurement.distance-2?1:clamp(travelled/measurement.distance);
}
