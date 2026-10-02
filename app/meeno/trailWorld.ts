export const WALK_LENGTH = 74;
export const CAMERA_FOV = 58;

export function pathCenter(z: number) {
  return Math.sin(z * .075) * 2.7 + Math.sin(z * .031) * 3.2;
}

export function trailHeight(z: number) {
  return Math.sin(z * .047) * .65 + z * .018;
}

export function groundHeight(x: number, z: number) {
  const edge = Math.abs(x - pathCenter(z));
  const bank = Math.min(2.7, Math.max(0, edge - 1) * .16);
  const rough = Math.sin(x * 1.9 + z * .5) * .12 * Math.min(1, Math.max(0, edge - .8) / 2.2);
  return trailHeight(z) + bank + rough;
}

export function cameraAt(progress: number, motion = true) {
  const z = Math.max(0, Math.min(1, progress)) * WALK_LENGTH;
  const step = motion ? Math.sin(z * 3.7) : 0;
  return {
    x: pathCenter(z) + (motion ? Math.sin(z * 1.85) * .022 : 0),
    y: trailHeight(z) + 1.64 + step * .019,
    z,
    lookX: pathCenter(z + 7),
    lookY: trailHeight(z + 7) + 1.82,
    lookZ: z + 7,
    fov: CAMERA_FOV
  };
}

export function seededRandom(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export type WoodlandObject = { x: number; y: number; z: number; width: number; height: number; variant: number; flip: number };

export function woodlandLayout() {
  const random = seededRandom(20031002);
  const trees: WoodlandObject[] = [];
  const undergrowth: WoodlandObject[] = [];
  const stones: WoodlandObject[] = [];
  const lamps: WoodlandObject[] = [];
  const object = (x: number, z: number, width: number, height: number, variant: number): WoodlandObject => ({
    x, y: groundHeight(x, z) - .045, z, width, height, variant, flip: random() > .5 ? 1 : -1
  });

  // Different stands, densities and clearings; the path is not a corridor of copies.
  for (let row = 0; row < 42; row++) {
    const z = -5 + row * 3.3;
    for (const side of [-1, 1]) {
      const h = 7.8 + random() * 5.2;
      const x = pathCenter(z) + side * (2.4 + random() * 2.3);
      trees.push(object(x, z + random() * 1.5, h * (.36 + random() * .11), h, Math.floor(random() * 3)));
    }
  }
  for (let i = 0; i < 155; i++) {
    const z = random() * 148 - 8;
    const x = pathCenter(z) + (i % 2 ? 1 : -1) * (5.1 + random() * 19);
    const h = 7 + random() * 9;
    trees.push(object(x, z, h * .47, h, Math.floor(random() * 3)));
  }
  for (let i = 0; i < 440; i++) {
    const z = random() * 142 - 6;
    const side = i % 2 ? 1 : -1;
    const x = pathCenter(z) + side * (1.08 + Math.pow(random(), 1.9) * 8);
    const variant = Math.floor(random() * 3);
    const size = variant === 1 ? .85 + random() * 1.9 : .48 + random() * 1.2;
    undergrowth.push(object(x, z, size * (variant === 0 ? 1.2 : 1), size, variant));
  }
  for (let i = 0; i < 660; i++) {
    const z = random() * 137 - 5;
    const onPath = i % 3 === 0;
    const x = pathCenter(z) + (random() > .5 ? 1 : -1) * (onPath ? random() * .9 : .95 + random() * 2.4);
    const size = onPath ? .035 + random() * .14 : .12 + random() * .46;
    stones.push(object(x, z, size, size * (.28 + random() * .5), 0));
  }
  for (let i = 0; i < 10; i++) {
    const z = 5 + i * 11;
    const side = i % 3 === 0 ? -1 : 1;
    const x = pathCenter(z) + side * (1.35 + random() * .24);
    lamps.push({ ...object(x, z, 2.65, 2.65, 3), flip: side });
  }
  // Keep the original route and landmarks. Fill its banks with a separate
  // deterministic scatter, leaving the overhead gap open to the sky.
  const thicket = seededRandom(42031002);
  for (let row = 0; row < 94; row++) {
    const z = row * 1.5 - 5;
    for (const side of [-1, 1]) {
      const fernZ = z + thicket() * .7;
      const fernX = pathCenter(fernZ) + side * (1.55 + thicket() * .5);
      const fernHeight = .66 + thicket() * .48;
      undergrowth.push(object(fernX, fernZ, fernHeight * 1.3, fernHeight, 0));
      for (const band of [3.15, 5.7, 9.2]) {
        const bushZ = z + thicket() * 1.1;
        const bushX = pathCenter(bushZ) + side * (band + thicket() * 1.5);
        const height = 1.3 + thicket() * 1.2;
        undergrowth.push(object(bushX, bushZ, height * 1.08, height, 1));
      }
    }
  }
  for (let i = 0; i < 75; i++) {
    const z = thicket() * 141 - 5;
    const x = pathCenter(z) + (i % 2 ? -1 : 1) * (7.5 + thicket() * 10);
    const height = 6.5 + thicket() * 4;
    trees.push(object(x, z, height * .45, height, Math.floor(thicket() * 3)));
  }
  for (const encounter of ENCOUNTERS) {
    // Real occluding cover at both ends of each animal's route.
    for (const end of [0, 1]) {
      const z = encounter.z + end * 1.35 - .25;
      const x = pathCenter(z) + encounter.side * (end ? -3.45 : 3.15);
      undergrowth.push(object(x, z, 2.1, 1.6, 1));
      undergrowth.push(object(x + .45, z - .16, 1.45, 1.02, 0));
    }
  }
  return { trees, undergrowth, stones, lamps };
}

export const ENCOUNTERS = [
  { z: 19, side: -1 },
  { z: 48, side: 1 }
];

export function squirrelAt(encounter: { z: number; side: number }, elapsed: number | null) {
  const run = elapsed === null ? 0 : Math.max(0, Math.min(1, (elapsed - .2) / 2.05));
  const z = encounter.z + run * 1.35;
  const x = pathCenter(z) + encounter.side * (3.15 - run * 6.6);
  const running = run > 0 && run < 1;
  return {
    x, z,
    y: groundHeight(x, z) + (running ? Math.abs(Math.sin((elapsed ?? 0) * 23)) * .075 : 0),
    running,
    visible: elapsed !== null && running,
    velocityX: (Math.cos(z * .075) * .2025 + Math.cos(z * .031) * .0992) * 1.35 - encounter.side * 6.6,
    velocityZ: 1.35,
    stride: running ? Math.floor((elapsed ?? 0) * 13) % 2 : 0
  };
}

export function squirrelFacesRight(velocityX: number, velocityZ: number, cameraRightX: number, cameraRightZ: number) {
  return velocityX * cameraRightX + velocityZ * cameraRightZ >= 0;
}
