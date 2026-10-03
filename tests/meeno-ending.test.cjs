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
  assert.equal(groups.length,6);
  assert.equal(SHELLS.length,21);
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

test('typing pauses with the scene, preserves punctuation and resets for a second walk', () => {
  const {createTypewriter}=load('trailTypewriter');
  const text='Hello, you.\nStill here?';
  const writer=createTypewriter(text);
  assert.equal(writer.advance(false,20),0);
  assert.equal(writer.advance(true,0),1);
  const first=writer.advance(true,.12);
  assert.ok(first>1 && first<text.length);
  assert.equal(writer.advance(false,20),first);
  assert.equal(writer.advance(true,10),Array.from(text).length);
  assert.equal(writer.complete,true);
  writer.reset();
  assert.equal(writer.count,0);
  assert.equal(writer.complete,false);
  assert.equal(writer.advance(true,0,true),Array.from(text).length);
});

test('fast scrolling can finish a line and its following speech without moving letters backwards', () => {
  const {createTypewriter}=load('trailTypewriter');
  const writer=createTypewriter('Keep the words exactly as written.');
  assert.equal(writer.advance(true,.1,false,15),15);
  assert.equal(writer.advance(true,.1,false,3),15);
  assert.equal(writer.advance(true,0,false,1000),34);
  assert.equal(writer.complete,true);
});

test('fireflies occupy the bushes along the entire walk and remain a single small draw call', () => {
  const {groundHeight,pathCenter,WALK_LENGTH}=load('trailWorld');
  const scene=new THREE.Scene();
  const fireflies=load('trailFireflies').createFireflies(scene);
  assert.equal(scene.children.length,1);
  const swarm=scene.children[0];
  assert.ok(swarm.isPoints);
  const positions=swarm.geometry.attributes.position;
  assert.ok(positions.count>=200 && positions.count<400);
  assert.equal(Array.from(swarm.geometry.attributes.aTail.array).filter(tail=>tail===0).length,72);
  const paths=swarm.geometry.attributes.aPath;
  for(let i=0;i<paths.count;i++) {
    assert.ok(paths.getX(i)>=.65 && paths.getY(i)>=1.4,'each insect travels a visible route');
  }
  let first=Infinity,last=-Infinity;
  for(let i=0;i<positions.count;i++) {
    const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
    const edge=Math.abs(x-pathCenter(z));
    assert.ok(edge>1.29 && edge<3.91,'fireflies belong beside the walking corridor');
    const height=y-groundHeight(x,z);
    assert.ok(height>.47 && height<1.94,'hover above grounded foliage');
    first=Math.min(first,z);last=Math.max(last,z);
  }
  assert.ok(first<3 && last>WALK_LENGTH);
  assert.equal(swarm.material.depthWrite,false);
  assert.equal(swarm.material.depthTest,true,'trees should occlude insects behind them');
  fireflies.update(8,670,true);
  assert.equal(swarm.material.uniforms.uTime.value,8);
  fireflies.update(8,670,false);
  assert.equal(swarm.material.uniforms.uTime.value,0);
  assert.equal(swarm.material.uniforms.uMotion.value,0);
  fireflies.dispose();
  assert.equal(scene.children.length,0);
});

function musicHarness(t, fetcher) {
  const gains=[],sources=[];
  const originalDecoder=global.OfflineAudioContext;
  global.OfflineAudioContext=class {
    async decodeAudioData() { return {duration:120}; }
  };
  t.after(()=>{
    if(originalDecoder) global.OfflineAudioContext=originalDecoder;
    else delete global.OfflineAudioContext;
  });
  t.mock.method(global,'fetch',fetcher ?? (async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)})));
  const context={
    currentTime:0,
    createGain() {
      const events=[];
      const node={connect(){},disconnect(){node.disconnected=true;},events,gain:{value:1,
        cancelAndHoldAtTime(at){events.push(['hold',at]);},
        linearRampToValueAtTime(value,at){events.push(['ramp',value,at]);},
        setTargetAtTime(value,at,tau){events.push(['target',value,at,tau]);}
      }};
      gains.push(node);return node;
    },
    createBufferSource() {
      const source={connect(){},disconnect(){source.disconnected=true;},
        start(at,offset){source.started={at,offset};},stop(at){source.stoppedAt=at ?? context.currentTime;}};
      sources.push(source);return source;
    }
  };
  const music=load('trailMusic').createTrailMusic(context,{});
  return {context,music,gains,sources,settle:()=>new Promise(setImmediate)};
}

test('Married Life plays continuously through Yes and replay while its level ducks below bursts', async t => {
  const {MUSIC_TRACKS}=load('trailMusic');
  const {context,music,gains,sources,settle}=musicHarness(t);
  music.preload();await settle();
  assert.equal(global.fetch.mock.calls.length,1,'only one recording is fetched and decoded');
  assert.equal(sources.length,0,'preloading must not start a song on the password screen');
  context.currentTime=8;music.scene('forest');
  assert.equal(sources.length,1);
  assert.deepEqual(sources[0].started,{at:8,offset:0});
  assert.equal(sources[0].loop,true);
  assert.ok(gains[1].events.some(e=>e[0]==='ramp' && e[1]===MUSIC_TRACKS.forest.gain));
  context.currentTime=24;music.scene('fireworks');
  assert.equal(sources.length,1);
  assert.equal(sources[0].stoppedAt,undefined,'Yes must not stop or restart Married Life');
  assert.ok(gains[1].events.some(e=>e[0]==='ramp' && e[1]===MUSIC_TRACKS.fireworks.gain && e[2]===26.8));
  assert.ok(MUSIC_TRACKS.fireworks.gain<MUSIC_TRACKS.forest.gain*.4);
  music.duck(.52);
  assert.equal(gains[0].events.filter(e=>e[0]==='ramp').at(-1)[1],.30);
  context.currentTime=24.16;music.duck(.045);
  assert.equal(gains[0].events.filter(e=>e[0]==='ramp').at(-1)[1],.30,'a child burst cannot raise the existing duck');
  assert.equal(gains[0].events.filter(e=>e[0]==='target').at(-1)[2],24.55,'a child burst cannot shorten the existing duck');
  context.currentTime=50;music.scene('forest');
  assert.equal(sources.length,1);
  assert.deepEqual(sources[0].started,{at:8,offset:0},'the playback cursor is retained on replay');
  music.scene('forest');
  assert.equal(sources.length,1);
  music.dispose();
  assert.ok(sources.every(source=>source.disconnected));
  assert.ok(gains.every(gain=>gain.disconnected));
});

test('late music downloads respect the latest scene and join at its elapsed time', async t => {
  const resolve={};
  const {context,music,sources,settle}=musicHarness(t,url=>new Promise(done=>{resolve[url]=done;}));
  const tracks=load('trailMusic').MUSIC_TRACKS;
  const response={ok:true,arrayBuffer:async()=>new ArrayBuffer(1)};
  music.preload();music.scene('forest');
  context.currentTime=10;music.scene('fireworks');
  context.currentTime=12;
  resolve[tracks.forest.url](response);await settle();
  assert.equal(sources.length,1);
  assert.deepEqual(sources[0].started,{at:12,offset:2});
  music.dispose();
});

test('music failure stays silent and an unmounted page cannot start a pending track', async t => {
  let resolve;
  const {music,sources,settle}=musicHarness(t,()=>new Promise(done=>{resolve=done;}));
  music.scene('forest');
  resolve({ok:false});await settle();
  assert.equal(sources.length,0);
  music.scene('forest');
  music.dispose();
  resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)});await settle();
  assert.equal(sources.length,0);
});

test('video export walks the whole route, asks the question, then includes every final ember', () => {
  const {videoAt,VIDEO_WALK_SECONDS,VIDEO_YES_AT,VIDEO_SECONDS}=load('trailVideoTimeline');
  assert.equal(videoAt(0).progress,0);
  assert.equal(videoAt(VIDEO_WALK_SECONDS/2).progress,.5);
  assert.deepEqual(videoAt(VIDEO_WALK_SECONDS),{progress:1,question:true,ending:null,finished:false});
  assert.ok(VIDEO_YES_AT-VIDEO_WALK_SECONDS>=5);
  assert.equal(videoAt(VIDEO_YES_AT).ending,0);
  assert.equal(videoAt(VIDEO_YES_AT).question,false);
  assert.ok(celebrationAt(videoAt(VIDEO_SECONDS).ending).finished);
  assert.ok(VIDEO_SECONDS<120);
  for(const [start,end] of MESSAGE_WINDOWS) assert.ok((end-start)*VIDEO_WALK_SECONDS>=3.5);
});

test('video captions preserve authored line breaks and character positions while balancing words', () => {
  const {captionLines}=load('trailVideoTimeline');
  const text='A little woodland walk.\nAnd a second line, exactly as written.';
  const lines=captionLines(text,22,value=>value.length);
  assert.ok(lines.length>=3);
  for(const line of lines) {
    assert.equal(Array.from(text).slice(line.start,line.start+Array.from(line.text).length).join(''),line.text);
    assert.ok(!line.text.includes('\n'));
    assert.ok(line.text.length<=22);
  }
  assert.ok(lines.some(line=>line.start===text.indexOf('And')));
  const unicode='A 🌙 and another line';
  for(const line of captionLines(unicode,12,value=>Array.from(value).length)) {
    assert.equal(Array.from(unicode).slice(line.start,line.start+Array.from(line.text).length).join(''),line.text);
  }
});

test('video export prefers supported MP4, falls back to WebM, and rejects unsupported encoders', () => {
  const {videoMime}=load('trailVideoTimeline');
  assert.match(videoMime(type=>type.startsWith('video/mp4')),/^video\/mp4/);
  assert.match(videoMime(type=>type==='video/webm;codecs=vp8,opus'),/^video\/webm/);
  assert.equal(videoMime(()=>false),null);
});

function recordingHarness(t) {
  const originals={document:global.document,MediaRecorder:global.MediaRecorder};
  const recorders=[],draws=[];
  let released=0;
  const track=()=>({kind:'video',stopped:false,stop(){this.stopped=true;}});
  const audio={...track(),kind:'audio'};
  const tap={stream:{getAudioTracks:()=>[audio]},dispose(){released++;audio.stop();}};
  global.document={createElement:()=>({width:0,height:0,
    getContext:()=>({fillRect(){},drawImage(...args){draws.push(args);},save(){},restore(){},translate(){},scale(){},strokeRect(){},fillText(){},createLinearGradient:()=>({addColorStop(){}})}),
    captureStream:()=>{
      const tracks=[track()];
      return {getTracks:()=>tracks,addTrack:track=>tracks.push(track)};
    }
  })};
  global.MediaRecorder=class {
    static isTypeSupported(type){return type==='video/mp4';}
    constructor(stream,options){this.state='inactive';this.stream=stream;this.mimeType=options.mimeType;recorders.push(this);}
    start(){this.state='recording';this.starts=(this.starts??0)+1;}
    pause(){this.state='paused';}
    resume(){this.state='recording';}
    stop(){this.state='inactive';queueMicrotask(()=>{this.ondataavailable?.({data:new Blob(['movie'])});this.onstop?.();});}
  };
  t.after(()=>{for(const [key,value] of Object.entries(originals)){if(value===undefined) delete global[key];else global[key]=value;}});
  return {recorders,tap,draws,get released(){return released;},settle:()=>new Promise(setImmediate)};
}

test('the existing walk is recorded once and its completed video is immediately ready without a replay', async t => {
  const harness=recordingHarness(t),files=[];
  const {createTrailRecording,recordingSize}=load('trailRecording');
  const capture=createTrailRecording(390,844,harness.tap,file=>files.push(file));
  const source={width:312,height:675},viewport={width:390,height:844};
  assert.ok(capture);
  assert.equal(harness.recorders[0].starts,undefined,'gate preparation must not record the password screen');
  capture.frame(source,viewport,[],null,false);
  capture.frame(source,viewport,[],null,true);
  assert.equal(harness.recorders[0].starts,1);
  assert.ok(harness.draws.some(draw=>draw[0]===source),'reuse the live renderer output');
  capture.pause(true);assert.equal(harness.recorders[0].state,'paused');
  capture.pause(false);assert.equal(harness.recorders[0].state,'recording');
  capture.finish();await harness.settle();
  assert.equal(files.length,1);
  assert.equal(files[0].type,'video/mp4');
  assert.equal(await files[0].text(),'movie');
  assert.ok(harness.recorders[0].stream.getTracks().every(track=>track.stopped));
  assert.equal(harness.released,1);
  for(const [w,h] of [[390,844],[1920,1080],[360,780]]) {
    const size=recordingSize(w,h);
    assert.ok(size.width<=540 && size.height<=960);
    assert.equal(size.width%2,0);assert.equal(size.height%2,0);
    assert.ok(Math.abs(size.width/size.height-w/h)<.006);
  }
});

test('disposing a walk cannot publish a stale recording into the next replay', async t => {
  const harness=recordingHarness(t),files=[];
  const capture=load('trailRecording').createTrailRecording(390,844,harness.tap,file=>files.push(file));
  capture.frame({width:312,height:675},{width:390,height:844},[],null,false);
  capture.dispose();await harness.settle();
  assert.equal(files.length,0);
  assert.ok(harness.recorders[0].stream.getTracks().every(track=>track.stopped));
});
