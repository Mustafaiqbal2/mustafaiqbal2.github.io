import * as THREE from "three";
import { seededRandom } from "./trailWorld";
import { SHELLS } from "./trailSequence";

// Chrysanthemum, coloured peony, double pistil, and long golden willow shells.
// Each star follows a ballistic arc; its trailing samples share the same arc.
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
  if (aSpark.w>.5) {
    t=clamp((age-aSpark.x*.12)/aVelocity.w,0.0,1.0);
    p=aStart.xyz+vec3(sin(t*9.0+aSpark.y)*.12,-78.0*(1.0-t)*(1.0-t),0.0);
    alive*=smoothstep(0.0,.12,age)*(1.0-smoothstep(.86,1.0,t));
  } else {
    float drag=.46;
    p=aStart.xyz+aVelocity.xyz*((1.0-exp(-drag*t))/drag);
    p.y-=.8*t*t;
    alive*=smoothstep(0.0,.075,t)*pow(max(0.0,1.0-age/aVelocity.w),.58);
    alive*=1.0-smoothstep(.72,1.0,age/aVelocity.w);
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
    const x=shell.x*48,y=shell.y*45,z=(random()-.5)*9;
    const palette=palettes[shell.kind].map(color=>new THREE.Color(color));
    const count=shell.kind===3?310:245;
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
      const trailCount=shell.kind===3?15:10;
      for(let tail=0;tail<trailCount;tail++) {
        particle(x,y,z,shell.at,vx,vy,vz,life,tail/trailCount,seed,
          tail===0?.58:.39,0,color);
      }
    }
    // The ascending ember is deliberately narrow and warm, without a screen flash.
    for(let tail=0;tail<22;tail++) {
      particle(x,y,z,shell.at-1.8,0,0,0,1.8,tail/22,index,.62,1,palette[0]);
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
