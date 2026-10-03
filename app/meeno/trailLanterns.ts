import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { WoodlandObject } from "./trailWorld";

export const LANTERN_X = .42;
export const FLAME_HEIGHT = 2.33;

// Wrought-iron plinth, tapered stem, curled bracket, pointed roof and cage.
// Real geometry lets the narrow metalwork retain its shape as we walk past.
export function lanternGeometry() {
  const parts: THREE.BufferGeometry[]=[];
  function part(geometry: THREE.BufferGeometry,x:number,y:number,z=0,rotation=0) {
    geometry.rotateY(rotation);geometry.translate(x,y,z);parts.push(geometry);
  }
  part(new THREE.CylinderGeometry(.12,.17,.14,8),0,.07);
  part(new THREE.CylinderGeometry(.055,.105,.26,8),0,.25);
  part(new THREE.CylinderGeometry(.039,.055,2.35,10),0,1.52);
  for(const y of [.42,2.43,2.58]) part(new THREE.CylinderGeometry(.065,.065,.045,10),0,y);
  part(new THREE.SphereGeometry(.068,8,6),0,2.72);
  part(new THREE.ConeGeometry(.045,.16,6),0,2.83);
  const hook=new THREE.CatmullRomCurve3([
    new THREE.Vector3(0,2.60,0),new THREE.Vector3(.14,2.87,0),new THREE.Vector3(.42,2.97,0),
    new THREE.Vector3(.65,2.82,0),new THREE.Vector3(.59,2.68,0),new THREE.Vector3(.44,2.69,0),
    new THREE.Vector3(.42,2.77,0)
  ]);
  parts.push(new THREE.TubeGeometry(hook,32,.022,5,false));
  part(new THREE.CylinderGeometry(.012,.012,.16,6),LANTERN_X,2.68);
  part(new THREE.ConeGeometry(.255,.23,4),LANTERN_X,2.59,0,Math.PI/4);
  part(new THREE.BoxGeometry(.365,.025,.365),LANTERN_X,2.475);
  part(new THREE.BoxGeometry(.32,.035,.32),LANTERN_X,2.06);
  part(new THREE.ConeGeometry(.14,.11,4),LANTERN_X,2.015,0,Math.PI/4);
  for(const x of [-.146,.146]) for(const z of [-.146,.146]) {
    part(new THREE.CylinderGeometry(.012,.016,.41,5),LANTERN_X+x,2.27,z);
  }
  part(new THREE.CylinderGeometry(.065,.045,.05,10),LANTERN_X,2.10);
  const merged=mergeGeometries(parts,false);
  parts.forEach(geometry=>geometry.dispose());
  if(!merged) throw new Error("Could not assemble lantern");
  return merged;
}

const FLAME_VERTEX=`
uniform vec3 uRight;
attribute float aPhase;
varying vec2 vUv;
varying float vPhase;
varying float vDistance;
void main(){
  vUv=uv;vPhase=aPhase;
  vec3 origin=(modelMatrix*instanceMatrix*vec4(0,0,0,1)).xyz;
  vec3 world=origin+uRight*position.x*.20+vec3(0,position.y*.35,0);
  vDistance=length(cameraPosition-world);
  gl_Position=projectionMatrix*viewMatrix*vec4(world,1);
}`;
const FLAME_FRAGMENT=`
uniform float uTime;
varying vec2 vUv;
varying float vPhase;
varying float vDistance;
void main(){
  float t=uTime+vPhase;
  float height=.84+.075*sin(t*5.2)+.035*sin(t*12.7);
  float y=vUv.y/height;
  float lean=(sin(t*4.1)*.10+sin(t*9.3)*.045)*y*y;
  float width=.32*pow(max(0.0,1.0-y),.85)*smoothstep(0.0,.15,y);
  width*=1.0+.13*sin(y*15.0-t*11.0);
  float x=abs(vUv.x-.5-lean);
  float flame=(1.0-smoothstep(width*.65,width+.045,x))*(1.0-smoothstep(.87,1.0,y));
  float core=(1.0-smoothstep(width*.20,width*.55+.005,x))*(1.0-smoothstep(.45,.80,y));
  vec3 color=mix(vec3(1.0,.34,.035),vec3(1.0,.88,.46),core);
  color=mix(vec3(.21,.40,.88),color,smoothstep(.015,.17,y));
  float fade=exp(-pow(vDistance*.021,1.6));
  if(flame<.015) discard;
  gl_FragColor=vec4(color,flame*fade);
  #include <colorspace_fragment>
}`;

export function createLanternFlames(scene: THREE.Scene,lamps: WoodlandObject[],right: THREE.Vector3) {
  const geometry=new THREE.PlaneGeometry(1,1);
  geometry.setAttribute("aPhase",new THREE.InstancedBufferAttribute(Float32Array.from(lamps.map((_,i)=>i*1.7)),1));
  const material=new THREE.ShaderMaterial({
    uniforms:{uTime:{value:0},uRight:{value:right}},vertexShader:FLAME_VERTEX,fragmentShader:FLAME_FRAGMENT,
    transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending
  });
  const mesh=new THREE.InstancedMesh(geometry,material,lamps.length);
  const matrix=new THREE.Matrix4();
  lamps.forEach((lamp,index)=>{
    matrix.makeTranslation(lamp.x-lamp.flip*LANTERN_X,lamp.y+FLAME_HEIGHT-.08,lamp.z);
    mesh.setMatrixAt(index,matrix);
  });
  mesh.frustumCulled=false;scene.add(mesh);
  return {update(time:number){material.uniforms.uTime.value=time;},dispose(){scene.remove(mesh);geometry.dispose();material.dispose();}};
}
