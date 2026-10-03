import * as THREE from "three";
import { groundHeight, pathCenter, seededRandom } from "./trailWorld";

export function createFireflies(scene: THREE.Scene) {
  const random = seededRandom(941307);
  const positions: number[] = [], traits: number[] = [];
  // Small gatherings beside the trail, anchored to the undergrowth in world
  // space. Their depth changes naturally as the camera walks past them.
  for (let cluster = 0; cluster < 18; cluster++) {
    const z = 2 + cluster * 5.1;
    const side = cluster % 2 ? -1 : 1;
    for (let fly = 0; fly < 8; fly++) {
      const depth = z + (random() - .5) * 5;
      const x = pathCenter(depth) + side * (1.3 + random() * 2.6);
      positions.push(x, groundHeight(x, depth) + .48 + random() * 1.45, depth);
      traits.push(random() * Math.PI * 2, .55 + random() * .8, .62 + random() * .38, random());
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("aTraits", new THREE.Float32BufferAttribute(traits, 4));
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uHeight: { value: 600 }, uMotion: { value: 1 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      uniform float uTime, uHeight, uMotion;
      attribute vec4 aTraits;
      varying float vGlow, vTint;
      void main() {
        float phase=aTraits.x;
        float t=uTime*aTraits.y;
        vec3 drift=vec3(sin(t*.43+phase)*.26, sin(t*.69+phase)*.16, cos(t*.37+phase)*.30);
        vec4 view=modelViewMatrix*vec4(position+drift*uMotion,1.0);
        float pulse=pow(.5+.5*sin(t*1.7+phase),4.0);
        float breathing=mix(.48,.10+pulse*.90,uMotion);
        vGlow=breathing*aTraits.z*(1.0-smoothstep(12.0,30.0,-view.z))*smoothstep(.5,1.8,-view.z);
        vTint=aTraits.w;
        gl_PointSize=clamp(uHeight*.043/max(1.0,-view.z),2.0,17.0);
        gl_Position=projectionMatrix*view;
      }`,
    fragmentShader: `
      varying float vGlow, vTint;
      void main() {
        float r=length(gl_PointCoord-.5)*2.0;
        if (r>1.0 || vGlow<.005) discard;
        float halo=exp(-r*r*5.5)*.24;
        float core=1.0-smoothstep(.08,.32,r);
        vec3 color=mix(vec3(.70,1.0,.19),vec3(1.0,.70,.14),vTint);
        color=mix(color,vec3(1.0,.96,.67),core*.65);
        gl_FragColor=vec4(color,(core*.85+halo)*vGlow);
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
