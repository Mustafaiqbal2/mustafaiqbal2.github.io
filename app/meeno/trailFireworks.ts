import * as THREE from "three";
import { seededRandom } from "./trailWorld";
import { FIREWORK_DRAG, FIREWORK_GRAVITY, secondaryFlowers, SHELLS } from "./trailSequence";

// One rocket opens a large shell; its travelling seeds blossom into smaller shells.
// Parent, seed, and flower trajectories share the same drag and gravity.
const VERTEX = `
attribute vec4 aStart;
attribute vec4 aVelocity;
attribute vec4 aSpark;
attribute vec3 aColor;
uniform float uTime;
uniform float uFit;
uniform float uResolution;
uniform float uGentle;
varying vec3 vColor;
varying float vAlpha;
void main() {
  float age=uTime-aStart.w;
  float lag=aSpark.x*min(.62,max(0.0,age)*.37);
  float t=max(0.0,age-lag);
  vec3 p;
  float alive=step(0.0,age)*step(age,aVelocity.w);
  if (aSpark.w>.5 && aSpark.w<1.5) {
    t=clamp((age-aSpark.x*.12)/aVelocity.w,0.0,1.0);
    p=aStart.xyz+vec3(sin(t*9.0+aSpark.y)*.12,-78.0*(1.0-t)*(1.0-t),0.0);
    alive*=smoothstep(0.0,.12,age)*(1.0-smoothstep(.86,1.0,t));
  } else {
    float drag=${FIREWORK_DRAG};
    p=aStart.xyz+aVelocity.xyz*((1.0-exp(-drag*t))/drag);
    p.y-=${FIREWORK_GRAVITY}*t*t;
    alive*=smoothstep(0.0,.075,t);
    if (aSpark.w>1.5) {
      alive*=1.0-smoothstep(aVelocity.w-.05,aVelocity.w,age);
    } else {
      alive*=pow(max(0.0,1.0-age/aVelocity.w),.58);
      alive*=1.0-smoothstep(.72,1.0,age/aVelocity.w);
    }
  }
  p.xy*=uFit;
  vec4 mv=modelViewMatrix*vec4(p,1.0);
  gl_Position=projectionMatrix*mv;
  float tail=1.0-aSpark.x*.86;
  float shimmer=.83+.17*sin(t*17.0+aSpark.y*61.0);
  vAlpha=alive*tail*shimmer*mix(1.0,.66,uGentle);
  vColor=mix(aColor,vec3(1.0,.47,.10),aSpark.x*.42);
  gl_PointSize=clamp(aSpark.z*uResolution/max(1.0,-mv.z),1.0,8.0)*mix(.6,1.0,tail);
  if (alive<=0.0) gl_Position=vec4(2.0,2.0,2.0,1.0);
}`;
const FRAGMENT = `
varying vec3 vColor;
varying float vAlpha;
void main() {
  float r=length(gl_PointCoord-.5)*2.0;
  if(r>1.0 || vAlpha<.005) discard;
  float core=exp(-r*r*14.0);
  float halo=pow(1.0-r,2.0)*.4;
  gl_FragColor=vec4(vColor*(.7+core*.8),vAlpha*(core+halo));
  #include <colorspace_fragment>
}`;

export function createFireworks(scene: THREE.Scene) {
  const random=seededRandom(92571);
  const starts: number[]=[], velocities: number[]=[], sparks: number[]=[], colors: number[]=[];
  const palettes = [
    ["#ffc36b", "#ffedc2"], ["#f385b5", "#96f0e4"],
    ["#aac5ff", "#c7a4ff"], ["#e9ad50", "#ffdf9e"]
  ];
  function particle(x: number,y: number,z: number,birth: number,vx: number,vy: number,vz: number,
    life: number,tail: number,seed: number,size: number,launch: number,color: THREE.Color) {
    starts.push(x,y,z,birth); velocities.push(vx,vy,vz,life);
    sparks.push(tail,seed,size,launch); colors.push(color.r,color.g,color.b);
  }
  SHELLS.forEach((shell,index) => {
    const x=shell.x*48,y=shell.y*45,z=0;
    const palette=palettes[shell.kind].map(color=>new THREE.Color(color));
    const count=shell.kind===3?400:340;
    for(let star=0;star<count;star++) {
      // Uniform spherical distribution, with a smaller contrasting inner pistil.
      const inner=star%5===0;
      const latitude=1-2*(star+.5)/count;
      const longitude=star*2.39996323;
      const radius=Math.sqrt(1-latitude*latitude);
      const speed=(inner?6.2:12.8)*shell.size*(.96+random()*.08);
      const vx=Math.cos(longitude)*radius*speed;
      const vy=latitude*speed;
      const vz=Math.sin(longitude)*radius*speed;
      const life=shell.life*(.84+random()*.16);
      const seed=random();
      const color=palette[inner?1:0];
      const trailCount=shell.kind===3?13:11;
      for(let tail=0;tail<trailCount;tail++) {
        particle(x,y,z,shell.at,vx,vy,vz,life,tail/trailCount,seed,
          tail===0?.66:.42,0,color);
      }
    }
    secondaryFlowers(shell).forEach((flower,flowerIndex)=>{
      const seed=random();
      // These embers actually travel from the main burst to each smaller flower.
      for(let tail=0;tail<5;tail++) {
        particle(x,y,z,shell.at,flower.vx,flower.vy,flower.vz,flower.delay,
          tail/5,seed,.57,2,palette[1]);
      }
      const flowerColor=flower.tint===0?palette[1]:flower.tint===1?palette[0]:
        new THREE.Color(shell.kind===3?"#fff0c9":["#9debe4","#c1b6ff","#f6b5d5"][shell.kind]);
      const drift=Math.exp(-FIREWORK_DRAG*flower.delay)*.18;
      for(let star=0;star<42;star++) {
        const latitude=1-2*(star+.5)/42;
        const longitude=star*2.39996323+flowerIndex*.4;
        const radius=Math.sqrt(1-latitude*latitude);
        const speed=(3.2+random()*.7)*shell.size;
        const vx=Math.cos(longitude)*radius*speed+flower.vx*drift;
        const vy=latitude*speed+flower.vy*drift-2*FIREWORK_GRAVITY*flower.delay*.18;
        const vz=Math.sin(longitude)*radius*speed+flower.vz*drift;
        const life=flower.life*(.88+random()*.12);
        const sparkle=random();
        for(let tail=0;tail<6;tail++) {
          particle(flower.x,flower.y,flower.z,flower.at,vx,vy,vz,life,
            tail/6,sparkle,tail===0?.61:.36,0,flowerColor);
        }
      }
    });
    // The ascending ember is deliberately narrow and warm, without a screen flash.
    for(let tail=0;tail<22;tail++) {
      particle(x,y,z,shell.at-2.2,0,0,0,2.2,tail/22,index,.72,1,palette[0]);
    }
  });
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute("position",new THREE.Float32BufferAttribute(new Float32Array(starts.length/4*3),3));
  geometry.setAttribute("aStart",new THREE.Float32BufferAttribute(starts,4));
  geometry.setAttribute("aVelocity",new THREE.Float32BufferAttribute(velocities,4));
  geometry.setAttribute("aSpark",new THREE.Float32BufferAttribute(sparks,4));
  geometry.setAttribute("aColor",new THREE.Float32BufferAttribute(colors,3));
  const material=new THREE.ShaderMaterial({
    uniforms:{uTime:{value:-1},uFit:{value:1},uResolution:{value:650},uGentle:{value:0}},
    vertexShader:VERTEX,fragmentShader:FRAGMENT,
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending
  });
  const points=new THREE.Points(geometry,material);
  points.frustumCulled=false;
  points.visible=false;
  scene.add(points);
  const up=new THREE.Vector3(0,1,0);
  const target=new THREE.Vector3();
  const direction=new THREE.Vector3();
  const rotation=new THREE.Matrix4();
  return {
    update(time: number|null,camera: THREE.PerspectiveCamera,heading: number,resolution: number,reduced: boolean) {
      points.visible=time!==null && time>=0;
      if(!points.visible) return;
      direction.set(Math.sin(heading)*Math.cos(.90),Math.sin(.90),Math.cos(heading)*Math.cos(.90));
      points.position.copy(camera.position).addScaledVector(direction,105);
      target.copy(camera.position).add(direction);
      rotation.lookAt(camera.position,target,up);
      points.quaternion.setFromRotationMatrix(rotation);
      material.uniforms.uTime.value=time;
      // Keep complete shells within a portrait viewport, including the finale.
      material.uniforms.uFit.value=Math.min(1.35,Math.max(.22,camera.aspect*1.25));
      material.uniforms.uResolution.value=resolution;
      material.uniforms.uGentle.value=reduced?1:0;
    },
    dispose() { scene.remove(points);geometry.dispose();material.dispose(); }
  };
}
