import * as THREE from "three";
import type { TrailArtwork } from "./trailAssets";
import { cameraAt, CAMERA_FOV, ENCOUNTERS, groundHeight, pathCenter, seededRandom, squirrelAt, squirrelFacesRight, woodlandLayout, type WoodlandObject } from "./trailWorld";
import { SKY_FRAGMENT, SKY_VERTEX, WOODLAND_FRAGMENT, WOODLAND_VERTEX } from "./trailShaders";
import { createFireworks } from "./trailFireworks";
import { celebrationAt } from "./trailSequence";

export type WorldRenderer = { draw: (progress: number, time: number, animate: boolean, celebration?: number | null) => void; resize: () => void; dispose: () => void };

export function createTrailRenderer(canvas: HTMLCanvasElement, artwork: TrailArtwork): WorldRenderer | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
  } catch {
    return null;
  }
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;

  const scene = new THREE.Scene();
  const fog = new THREE.Color("#071117");
  scene.background = fog;
  const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, .09, 480);
  const right = new THREE.Vector3(-1, 0, 0);
  const world = woodlandLayout();
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const animatedMaterials: THREE.ShaderMaterial[] = [];
  const lampPositions = world.lamps.map(lamp => new THREE.Vector3(lamp.x, lamp.y + 1.77, lamp.z));

  function texture(image: HTMLImageElement) {
    const map = new THREE.Texture(image);
    map.colorSpace = THREE.SRGBColorSpace;
    map.magFilter = THREE.NearestFilter;
    map.minFilter = THREE.NearestMipmapNearestFilter;
    map.needsUpdate = true;
    textures.add(map);
    return map;
  }
  const treeMap = texture(artwork.trees);
  const detailMap = texture(artwork.details);

  function material(map: THREE.Texture, kind = 0, billboard = true, wind = 0) {
    const result = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: map }, uKind: { value: kind }, uBillboard: { value: billboard ? 1 : 0 },
        uWind: { value: wind }, uRight: { value: right }, uLamps: { value: lampPositions },
        uTime: { value: 0 }, uFog: { value: fog }, uBase: { value: new THREE.Color("#777d71") }
      },
      vertexShader: WOODLAND_VERTEX,
      fragmentShader: WOODLAND_FRAGMENT,
      side: THREE.DoubleSide
    });
    animatedMaterials.push(result);
    materials.add(result);
    return result;
  }
  const treeMaterial = material(treeMap, 0, true, 1);
  const leafMaterial = material(detailMap, 0, true, .5);
  const lampMaterial = material(detailMap, 3);
  const animalMaterial = material(detailMap);

  function atlasCell(index: number, columns: number, rows: number, mirrored = false) {
    const geometry = new THREE.PlaneGeometry(1, 1, 1, 5);
    geometry.translate(0, .5, 0);
    const uv = geometry.getAttribute("uv");
    const column = index % columns;
    const row = Math.floor(index / columns);
    for (let i = 0; i < uv.count; i++) {
      const x = mirrored ? 1 - uv.getX(i) : uv.getX(i);
      uv.setXY(i, (column + .008 + x * .984) / columns, (rows - row - 1 + .008 + uv.getY(i) * .984) / rows);
    }
    geometries.add(geometry);
    return geometry;
  }
  const dummy = new THREE.Object3D();
  function instances(objects: WoodlandObject[], geometry: THREE.BufferGeometry, surface: THREE.Material) {
    const mesh = new THREE.InstancedMesh(geometry, surface, objects.length);
    objects.forEach((object, index) => {
      const anchor = surface === treeMaterial ? .024 : .035;
      dummy.position.set(object.x, object.y - object.height * anchor, object.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(object.width * object.flip, object.height, object.width);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    // Billboard vertices turn in the shader, so the original flat bounds aren't sufficient.
    mesh.frustumCulled = false;
    scene.add(mesh);
    return mesh;
  }
  for (let i = 0; i < 3; i++) {
    instances(world.trees.filter(object => object.variant === i), atlasCell(i, 3, 1), treeMaterial);
    instances(world.undergrowth.filter(object => object.variant === i), atlasCell(i, 3, 2), leafMaterial);
  }
  instances(world.lamps, atlasCell(3, 3, 2), lampMaterial);

  // Actual sloping ground under the camera, with a footpath defined in world metres.
  const ground = new THREE.PlaneGeometry(74, 158, 112, 256);
  ground.rotateX(-Math.PI / 2);
  ground.translate(0, 0, 64);
  const positions = ground.getAttribute("position");
  for (let i = 0; i < positions.count; i++) positions.setY(i, groundHeight(positions.getX(i), positions.getZ(i)));
  ground.computeVertexNormals();
  geometries.add(ground);
  scene.add(new THREE.Mesh(ground, material(detailMap, 1, false)));

  const rockGeometry = new THREE.DodecahedronGeometry(1, 0);
  geometries.add(rockGeometry);
  const rockMaterial = material(detailMap, 2, false);
  const stones = instances(world.stones, rockGeometry, rockMaterial);
  world.stones.forEach((stone, index) => {
    dummy.position.set(stone.x, stone.y, stone.z);
    dummy.rotation.set(stone.z, stone.x, stone.z * .3);
    dummy.scale.set(stone.width, stone.height, stone.width * .7);
    dummy.updateMatrix();
    stones.setMatrixAt(index, dummy.matrix);
  });
  stones.instanceMatrix.needsUpdate = true;

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(420, 32, 20),
    new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uMotion: { value: 1 } }, vertexShader: SKY_VERTEX, fragmentShader: SKY_FRAGMENT, side: THREE.BackSide, depthWrite: false })
  );
  geometries.add(sky.geometry);
  materials.add(sky.material);
  sky.renderOrder = -10;
  scene.add(sky);

  // Distant ridges stay in the world while the camera advances through the woods.
  const random = seededRandom(8429);
  for (let layer = 0; layer < 3; layer++) {
    const ridge: number[] = [];
    const face: number[] = [];
    for (let i = 0; i <= 120; i++) {
      const x = (i / 120 - .5) * 580;
      const y = 20 + layer * 8 + Math.sin(i * .083 + layer) * 13 + Math.sin(i * .19) * 6 + random() * 3;
      ridge.push(x, y, 170 + layer * 42, x, -15, 170 + layer * 42);
      if (i < 120) { const n = i * 2; face.push(n, n+1, n+2, n+1, n+3, n+2); }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(ridge, 3));
    geometry.setIndex(face);
    const surface = new THREE.MeshBasicMaterial({ color: ["#0b1920", "#112330", "#192b3c"][layer], side: THREE.DoubleSide });
    geometries.add(geometry); materials.add(surface);
    scene.add(new THREE.Mesh(geometry, surface));
  }

  function glowTexture(eyes: boolean) {
    const width = 32;
    const height = eyes ? 16 : 32;
    const data = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const d = eyes ? Math.min(Math.hypot((x-9)*.85,(y-8)*1.4), Math.hypot((x-23)*.85,(y-8)*1.4)) : Math.hypot(x-15.5,y-15.5);
      const alpha = eyes ? Math.max(0, 1-d/2.7) : Math.pow(Math.max(0, 1-d/16), 3);
      const i=(y*width+x)*4;
      data[i]=255; data[i+1]=eyes?212:177; data[i+2]=eyes?112:72; data[i+3]=Math.round(alpha*255);
    }
    const map = new THREE.DataTexture(data, width, height);
    map.needsUpdate = true;
    map.magFilter = THREE.NearestFilter;
    textures.add(map);
    return map;
  }
  const glowMap = glowTexture(false);
  const flameGlows = world.lamps.map((lamp, i) => {
    const surface = new THREE.SpriteMaterial({ map: glowMap, transparent: true, opacity: .15, depthWrite: false, blending: THREE.AdditiveBlending });
    materials.add(surface);
    const sprite = new THREE.Sprite(surface);
    sprite.position.copy(lampPositions[i]);
    sprite.scale.set(.48,.48,1);
    scene.add(sprite);
    return sprite;
  });

  const eyeMap = glowTexture(true);
  const eyes = [13, 34, 57, 69].map((z, i) => {
    const surface = new THREE.SpriteMaterial({ map: eyeMap, transparent: true, opacity: .45, depthWrite: false });
    materials.add(surface);
    const sprite = new THREE.Sprite(surface);
    const x = pathCenter(z) + (i % 2 ? -1 : 1) * 2.7;
    sprite.position.set(x, groundHeight(x,z) + .53, z);
    sprite.scale.set(.25,.125,1);
    scene.add(sprite);
    return { sprite, z, phase: i * 1.7 };
  });

  const runRight = atlasCell(5, 3, 2);
  const runLeft = atlasCell(5, 3, 2, true);
  const animals = ENCOUNTERS.map(encounter => {
    const run = new THREE.Mesh(runRight, animalMaterial);
    // Keep the geometry scale positive. Facing is an explicit UV mirror,
    // chosen from screen-space velocity instead of the spawn-side sign.
    run.scale.set(.78, .78, 1);
    run.frustumCulled = false;
    run.visible = false;
    scene.add(run);
    return { encounter, run, triggeredAt: null as number | null };
  });

  // Prepare the stars while the gate fades, so Yes doesn't allocate the show.
  const fireworks = createFireworks(scene);
  let lastProgress = 0;
  const draw = (progress: number, time: number, animate: boolean, celebration: number | null = null) => {
    const pose = cameraAt(progress, animate);
    camera.position.set(pose.x, pose.y, pose.z);
    camera.lookAt(pose.lookX, pose.lookY, pose.lookZ);
    if (celebration !== null) {
      const sequence = celebrationAt(celebration, !animate);
      const heading = Math.atan2(pose.lookX-pose.x, pose.lookZ-pose.z);
      const startElevation = Math.atan2(pose.lookY-pose.y, Math.hypot(pose.lookX-pose.x,pose.lookZ-pose.z));
      const elevation = startElevation + (.90-startElevation)*sequence.pan;
      camera.lookAt(pose.x+Math.sin(heading)*Math.cos(elevation)*10,pose.y+Math.sin(elevation)*10,pose.z+Math.cos(heading)*Math.cos(elevation)*10);
      fireworks.update(sequence.fireworks,camera,heading,canvas.height,!animate);
    } else fireworks.update(null,camera,0,canvas.height,!animate);
    camera.updateMatrixWorld();
    right.set(1,0,0).applyQuaternion(camera.quaternion);
    right.y=0; right.normalize();
    sky.position.copy(camera.position);
    sky.material.uniforms.uTime.value = animate ? time : 0;
    sky.material.uniforms.uMotion.value = animate ? 1 : 0;
    animatedMaterials.forEach(surface => { surface.uniforms.uTime.value = animate ? time : 0; });
    flameGlows.forEach((flame, i) => {
      const flicker = animate ? Math.sin(time*3.3+i*1.7)*.012+Math.sin(time*8.7+i)*.007+Math.sin(time*13.1+i*2.3)*.004 : 0;
      flame.material.opacity = .085+flicker;
      flame.scale.setScalar(.39+(animate ? Math.sin(time*6.3+i)*.018 : 0));
    });

    eyes.forEach(({sprite,z,phase}) => {
      const distance = z - pose.z;
      const approaching = Math.min(1, Math.max(0,(distance-3.5)/3));
      const far = Math.min(1, Math.max(0,(20-distance)/6));
      const blink = animate && Math.sin(time*.95+phase) > .975 ? .05 : 1;
      sprite.material.opacity = .55 * approaching * far * blink;
      sprite.visible = distance > 3.5 && distance < 20;
    });
    animals.forEach(animal => {
      if (pose.z < animal.encounter.z - 13) animal.triggeredAt = null;
      if (animate && progress > lastProgress && pose.z >= animal.encounter.z - 8 && animal.triggeredAt === null) animal.triggeredAt=time;
      const elapsed = animal.triggeredAt === null ? null : time-animal.triggeredAt;
      const state = squirrelAt(animal.encounter, elapsed);
      animal.run.visible = state.visible && state.running;
      animal.run.geometry = squirrelFacesRight(state.velocityX, state.velocityZ, right.x, right.z) ? runRight : runLeft;
      animal.run.position.set(state.x,state.y-.09,state.z);
      animal.run.scale.y = .78 * (state.stride ? .88 : 1);
    });
    lastProgress=progress;
    renderer.render(scene,camera);
  };
  let renderWidth=0, renderHeight=0;
  const resize = () => {
    const width=canvas.clientWidth, height=canvas.clientHeight;
    if (!width || !height) return;
    // Deliberate fine pixels. Cap fill-rate without reducing the walking framerate.
    const ratio=Math.min(.8, Math.sqrt(690000/(width*height)));
    const nextWidth=Math.round(width*ratio), nextHeight=Math.round(height*ratio);
    if (nextWidth!==renderWidth || nextHeight!==renderHeight) {
      renderWidth=nextWidth;renderHeight=nextHeight;
      renderer.setSize(renderWidth,renderHeight,false);
    }
    const aspect=width/height;
    if (camera.aspect!==aspect) {
      camera.aspect=aspect;
      camera.updateProjectionMatrix();
    }
  };
  const dispose = () => {
    fireworks.dispose();
    scene.clear();
    geometries.forEach(geometry=>geometry.dispose());
    materials.forEach(surface=>surface.dispose());
    textures.forEach(map=>map.dispose());
    renderer.dispose();
  };
  resize();
  return { draw, resize, dispose };
}
