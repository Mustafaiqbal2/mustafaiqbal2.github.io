import * as THREE from "three";
import { groundHeight, pathCenter, seededRandom } from "./trailWorld";

export function createFireflies(scene: THREE.Scene) {
  const random = seededRandom(941307);
  const positions: number[] = [], traits: number[] = [], paths: number[] = [], tails: number[] = [];
  // Small gatherings beside the trail, anchored to the undergrowth in world
  // space. Their depth changes naturally as the camera walks past them.
  for (let cluster = 0; cluster < 18; cluster++) {
    const z = 2 + cluster * 5.1;
    const side = cluster % 2 ? -1 : 1;
    for (let fly = 0; fly < 4; fly++) {
      const depth = z + (random() - .5) * 5;
      const x = pathCenter(depth) + side * (1.3 + random() * 2.6);
      const y=groundHeight(x,depth)+.85+random()*.8;
      const phase=random()*Math.PI*2, speed=.24+random()*.18, tint=random();
      const radius=.65+random()*.8, reach=1.4+random()*1.1, tilt=random()*Math.PI;
      for(let tail=0;tail<4;tail++) {
        positions.push(x,y,depth);
        traits.push(phase,speed,.8+random()*.2,tint);
        paths.push(radius,reach,tilt,side);
        tails.push(tail);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("aTraits", new THREE.Float32BufferAttribute(traits, 4));
  geometry.setAttribute("aPath", new THREE.Float32BufferAttribute(paths, 4));
  geometry.setAttribute("aTail", new THREE.Float32BufferAttribute(tails, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uHeight: { value: 600 }, uMotion: { value: 1 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      uniform float uTime, uHeight, uMotion;
      attribute vec4 aTraits;
      attribute vec4 aPath;
      attribute float aTail;
      varying float vGlow, vTint;
      void main() {
        float phase=aTraits.x;
        float t=(uTime-aTail*.15)*aTraits.y+phase;
        // Broad, lopsided loops with rising/falling turns; small deviations
        // make each insect wander instead of pulsing at a fixed point.
        float along=sin(t)*aPath.y+sin(t*2.0+aPath.z)*.32;
        float across=cos(t)*aPath.x+sin(t*3.0+phase)*.13;
        vec3 drift=vec3(across,sin(t*1.3+aPath.z)*.34+cos(t*2.0)*.14,along);
        vec4 view=modelViewMatrix*vec4(position+drift*uMotion,1.0);
        float breathing=mix(.8,.78+.22*sin(t*.7+phase),uMotion);
        float tail=exp(-aTail*1.3)*mix(step(aTail,.5),1.0,uMotion);
        vGlow=breathing*tail*aTraits.z*(1.0-smoothstep(13.0,29.0,-view.z))*smoothstep(.4,1.4,-view.z);
        vTint=aTraits.w;
        gl_PointSize=clamp(uHeight*.105/max(1.0,-view.z),4.0,29.0)*(1.0-aTail*.10);
        gl_Position=projectionMatrix*view;
      }`,
    fragmentShader: `
      varying float vGlow, vTint;
      void main() {
        float r=length(gl_PointCoord-.5)*2.0;
        if (r>1.0 || vGlow<.005) discard;
        float halo=exp(-r*r*4.8)*.23;
        float core=exp(-r*r*95.0);
        vec3 color=mix(vec3(.58,.94,.25),vec3(1.0,.73,.27),vTint);
        color=mix(color,vec3(1.0,.98,.80),core*.8);
        gl_FragColor=vec4(color,(core*.70+halo)*vGlow);
        #include <colorspace_fragment>
      }`
  });
  const swarm = new THREE.Points(geometry, material);
  swarm.frustumCulled = false;
  scene.add(swarm);
  return {
    update(time: number, height: number, animate: boolean) {
      material.uniforms.uTime.value = animate ? time : 0;
      material.uniforms.uHeight.value = height;
      material.uniforms.uMotion.value = animate ? 1 : 0;
    },
    dispose() { scene.remove(swarm); geometry.dispose(); material.dispose(); }
  };
}
