const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const filename = path.join(__dirname, '../app/meeno/trailWorld.ts');
const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;
const worldModule = { exports: {} };
new Function('exports', 'module', source)(worldModule.exports, worldModule);
const { cameraAt, woodlandLayout, WALK_LENGTH, CAMERA_FOV, pathCenter, groundHeight, squirrelAt, squirrelFacesRight } = worldModule.exports;

test('walking passes fixed landmarks with a constant field of view', () => {
  const world = woodlandLayout();
  const before = JSON.stringify(world);
  const start = cameraAt(0);
  const end = cameraAt(1);
  assert.equal(end.z - start.z, WALK_LENGTH);
  assert.ok(world.lamps.filter(lamp => lamp.z > start.z && lamp.z < end.z).length >= 6);
  for (let i = 0; i <= 100; i++) {
    const camera = cameraAt(i / 100);
    assert.equal(camera.fov, CAMERA_FOV);
    assert.ok(Math.abs(camera.x - pathCenter(camera.z)) < .03);
    const clearance = camera.y - groundHeight(camera.x, camera.z);
    assert.ok(clearance > 1.6 && clearance < 1.68);
  }
  assert.equal(JSON.stringify(world), before, 'the landscape itself must not scale or travel with the camera');
  assert.ok(Math.abs(cameraAt(.45).x - start.x) > 1, 'the camera follows the bend');
});

test('squirrel stays hidden in cover until approached, crosses, then returns to cover', () => {
  for (const side of [-1, 1]) {
    const encounter = { z: 19, side };
    const idle = squirrelAt(encounter, null);
    const run = squirrelAt(encounter, 1.4);
    const gone = squirrelAt(encounter, 2.4);
    assert.ok(!idle.visible && !idle.running);
    assert.ok(Math.abs(idle.x-pathCenter(idle.z)) > 3);
    assert.ok(run.visible && run.running);
    assert.equal(gone.visible, false);
    assert.ok((idle.x-pathCenter(idle.z)) * (gone.x-pathCenter(gone.z)) < 0);
    assert.ok(Math.abs(gone.x-pathCenter(gone.z)) > 3);
    const cover = woodlandLayout().undergrowth.filter(object => object.variant === 1);
    for (const location of [idle, gone]) {
      assert.ok(cover.some(bush => Math.abs(bush.x-location.x)<.4 && Math.abs(bush.z-location.z)<.4 && bush.height>1.3));
    }
  }
});

test('squirrel sprite faces its projected movement as the camera rounds bends', () => {
  for (const side of [-1, 1]) for (const progress of [.12, .45, .78]) {
    const pose = cameraAt(progress);
    const forwardX = pose.lookX-pose.x, forwardZ = pose.lookZ-pose.z;
    const length = Math.hypot(forwardX,forwardZ);
    const rightX = -forwardZ/length, rightZ = forwardX/length;
    const a = squirrelAt({z:19,side},1);
    const b = squirrelAt({z:19,side},1.01);
    const actualMotion = (b.x-a.x)*rightX+(b.z-a.z)*rightZ;
    assert.equal(squirrelFacesRight(a.velocityX,a.velocityZ,rightX,rightZ), actualMotion>0);
  }
});

test('both banks have nearby shrub cover along the full walking route', () => {
  const bushes = woodlandLayout().undergrowth.filter(object => object.variant === 1);
  for (let z=0;z<=WALK_LENGTH;z+=3) for (const side of [-1,1]) {
    const nearby = bushes.filter(bush => Math.abs(bush.z-z)<2 && (bush.x-pathCenter(bush.z))*side>1.2 && (bush.x-pathCenter(bush.z))*side<6);
    assert.ok(nearby.length>=2, `bank ${side} near ${z} metres needs continuous cover`);
  }
});

test('the walking corridor stays clear of trunks and lamp posts', () => {
  const layout = woodlandLayout();
  assert.ok(layout.trees.every(tree => Math.abs(tree.x-pathCenter(tree.z)) > 1.7));
  assert.ok(layout.lamps.every(lamp => Math.abs(lamp.x-pathCenter(lamp.z)) > 1.2));
  assert.ok([...layout.trees, ...layout.undergrowth].every(object => Number.isFinite(object.x+object.y+object.z)));
});
