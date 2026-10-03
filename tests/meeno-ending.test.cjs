const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const THREE = require('three');
const cache = new Map();
function load(name) {
  if (cache.has(name)) return cache.get(name);
  const filename = path.join(__dirname, '../app/meeno', name + '.ts');
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  const result = { exports: {} };
  new Function('exports', 'module', 'require', source)(result.exports, result,
    name => name.startsWith('./') ? load(name.slice(2)) : require(name));
  cache.set(name, result.exports);
  return result.exports;
}
const { MESSAGE_WINDOWS, messageVisibility, followupVisibility, questionVisible, celebrationAt,
  PAN_SECONDS, SHOW_SECONDS, SHELLS, secondaryFlowers, sparkDisplacement, FIREWORK_BURSTS,
  evadePosition, isTrailStory, measureTrail, trailProgress } = load('trailSequence');

test('narrative groups have readable pauses and never overlap', () => {
  MESSAGE_WINDOWS.forEach(([start, end],index) => assert.equal(messageVisibility((start+end)/2,index),1));
  for (let i=0;i<=10000;i++) {
    const visible = MESSAGE_WINDOWS.filter((_,index)=>messageVisibility(i/10000,index)>0);
    assert.ok(visible.length<=1);
  }
});

test('both delayed lines arrive beneath an already visible first sentence', () => {
  for (const index of [0,2]) {
    const [start,,after] = MESSAGE_WINDOWS[index];
    assert.equal(messageVisibility(start+.03,index),1);
    assert.equal(followupVisibility(start+.03,index),0);
    assert.ok(followupVisibility(after+.01,index)>0 && followupVisibility(after+.01,index)<1);
    assert.equal(followupVisibility(after+.03,index),1);
    assert.equal(messageVisibility(after+.03,index),1);
  }
});

test('the question waits until scrolling is complete, with previous text cleared', () => {
  for (const progress of [0,.8,.935,.98,.999]) assert.equal(questionVisible(progress),false);
  assert.equal(questionVisible(1),true);
  assert.ok(MESSAGE_WINDOWS.every((_,index)=>messageVisibility(1,index)===0));
});

test('camera tilt completes before launch and return waits for every final ember', () => {
  for (const reduced of [false,true]) {
    const pan = reduced ? .5 : PAN_SECONDS;
    assert.equal(celebrationAt(0,reduced).pan,0);
    assert.equal(celebrationAt(pan,reduced).pan,1);
    assert.equal(celebrationAt(pan-.01,reduced).finished,false);
    assert.ok(celebrationAt(pan-.01,reduced).fireworks<0);
    for (const shell of SHELLS) {
      assert.ok(shell.at>=1.8);
      assert.equal(celebrationAt(pan+shell.at+shell.life,reduced).finished,false);
      for (const flower of secondaryFlowers(shell)) {
        assert.equal(celebrationAt(pan+flower.at+flower.life,reduced).finished,false);
      }
    }
    assert.equal(celebrationAt(pan+SHOW_SECONDS,reduced).finished,true);
  }
});

test('smaller flowers erupt from the travelling seeds of a single parent rocket', () => {
  SHELLS.forEach((shell,index)=>{
    const flowers=secondaryFlowers(shell);
    assert.ok(flowers.length>=12 && flowers.length<=18);
    for(const flower of flowers) {
      assert.ok(flower.at>shell.at+1 && flower.at<shell.at+1.7);
      const arrival=sparkDisplacement(flower.vx,flower.vy,flower.vz,flower.delay);
      assert.equal(flower.x,shell.x*48+arrival.x);
      assert.equal(flower.y,shell.y*45+arrival.y);
      assert.equal(flower.z,arrival.z);
      assert.ok(Math.hypot(arrival.x,arrival.y,arrival.z)>7*shell.size);
      assert.ok(FIREWORK_BURSTS.some(burst=>burst.at===flower.at && burst.strength<.2));
    }
  });
  assert.deepEqual(FIREWORK_BURSTS.map(burst=>burst.at),FIREWORK_BURSTS.map(burst=>burst.at).sort((a,b)=>a-b));
});

test('three or four rockets launch together and volleys overlap without long gaps', () => {
  const groups=[];
  for(const shell of SHELLS) {
    const last=groups.at(-1);
    if(last && shell.at-last[0].at<.8) last.push(shell);
    else groups.push([shell]);
  }
  assert.ok(groups.every(group=>group.length>=3 && group.length<=4));
  for(let i=1;i<groups.length;i++) {
    const previous=groups[i-1];
    assert.ok(groups[i][0].at-2.2<Math.max(...previous.map(shell=>shell.at+shell.life)));
  }
  assert.ok(SHOW_SECONDS+PAN_SECONDS<27);
});

test('fullscreen resizing during the show cannot poison the origin after restart', () => {
  const measured=measureTrail(0,0,9200,800,false,{start:0,distance:1});
  const locked=measureTrail(-8400,0,9200,900,true,measured);
  assert.deepEqual(locked,measured);
  const restarted=measureTrail(0,0,9200,900,false,locked);
  assert.equal(trailProgress(0,restarted),0);
  assert.ok(trailProgress(585,restarted)>0 && trailProgress(585,restarted)<.1);
  assert.equal(trailProgress(restarted.distance,restarted),1);
});

test('No stays on the mobile choice area and clears the finger and Yes button', () => {
  for (const width of [240,258,284]) for (const height of [102,132]) {
    let position = {x:width-112,y:0};
    for(let tap=0;tap<12;tap++) {
      const pointerX=position.x+56, pointerY=position.y+22.5;
      const next=evadePosition(width,height,112,45,tap);
      assert.ok(next.x>=0 && next.x+112<=width && next.y>=0 && next.y+45<=height);
      assert.ok(next.y>=45 || next.x>=112,'must never cover Yes');
      assert.ok(pointerX<next.x || pointerX>next.x+112 || pointerY<next.y || pointerY>next.y+45,'must clear the touch point');
      assert.equal(next.y,height-45);
      assert.equal(next.x,tap%2===0?width-112:0);
      position=next;
    }
  }
});

test('encrypted story schema rejects incomplete or malformed narratives', () => {
  const valid={segments:Array.from({length:7},()=>({text:'test'})),question:'test?'};
  assert.equal(isTrailStory(valid),true);
  for(const value of [null,[],{}, {...valid,segments:[{text:'short'}]}, {...valid,question:null},
    {...valid,segments:valid.segments.map(()=>({text:'test',after:7}))}]) assert.equal(isTrailStory(value),false);
});

test('firework particles have finite trajectories, bounded allocation and complete cleanup', () => {
  const scene=new THREE.Scene();
  const fireworks=load('trailFireworks').createFireworks(scene);
  const points=scene.children[0];
  assert.ok(points.geometry.attributes.aStart.count>10000);
  assert.ok(points.geometry.attributes.aStart.count<40000);
  for(const attribute of Object.values(points.geometry.attributes)) {
    assert.ok(attribute.array.every(Number.isFinite));
  }
  const start=points.geometry.attributes.aStart;
  const velocity=points.geometry.attributes.aVelocity;
  const spark=points.geometry.attributes.aSpark;
  const rocketLaunches=new Set();
  for(let i=0;i<start.count;i++) if(spark.getW(i)===1) rocketLaunches.add(start.getW(i).toFixed(3));
  assert.deepEqual([...rocketLaunches],SHELLS.map(shell=>(shell.at-2.2).toFixed(3)));
  for(let i=0;i<start.count;i++) assert.ok(start.getW(i)+velocity.getW(i)<SHOW_SECONDS);
  const camera=new THREE.PerspectiveCamera(58,390/844,.09,480);
  fireworks.update(null,camera,0,600,false);
  assert.equal(points.visible,false);
  fireworks.update(3,camera,0,600,false);
  assert.equal(points.visible,true);
  assert.ok(points.position.length()>100);
  fireworks.dispose();
  assert.equal(scene.children.length,0);
});

test('iron lantern geometry is grounded and flames sit inside each hanging cage', () => {
  const {lanternGeometry,createLanternFlames,LANTERN_X,FLAME_HEIGHT}=load('trailLanterns');
  const geometry=lanternGeometry();geometry.computeBoundingBox();
  assert.ok(Math.abs(geometry.boundingBox.min.y)<.001);
  assert.ok(geometry.boundingBox.max.y>2.9 && geometry.boundingBox.max.y<3.1);
  assert.ok(geometry.attributes.position.array.every(Number.isFinite));
  const scene=new THREE.Scene();
  const lamps=load('trailWorld').woodlandLayout().lamps;
  const flames=createLanternFlames(scene,lamps,new THREE.Vector3(1,0,0));
  const mesh=scene.children[0],matrix=new THREE.Matrix4(),position=new THREE.Vector3();
  lamps.forEach((lamp,index)=>{
    mesh.getMatrixAt(index,matrix);position.setFromMatrixPosition(matrix);
    assert.ok(Math.abs(position.x-(lamp.x-lamp.flip*LANTERN_X))<.00001);
    assert.ok(Math.abs(position.y-(lamp.y+FLAME_HEIGHT-.08))<.00001);
  });
  flames.dispose();geometry.dispose();
  assert.equal(scene.children.length,0);
});
