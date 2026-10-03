export const WOODLAND_VERTEX = `
uniform vec3 uRight;
uniform vec3 uLamps[10];
uniform float uTime;
uniform float uBillboard;
uniform float uWind;
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vLight;
varying float vDistance;
varying float vFace;
void main() {
  vUv = uv;
  mat4 transform = modelMatrix;
  #ifdef USE_INSTANCING
    transform = modelMatrix * instanceMatrix;
  #endif
  vec4 world = transform * vec4(position, 1.0);
  if (uBillboard > .5) {
    float sx = length(transform[0].xyz) * sign(transform[0].x);
    float sy = length(transform[1].xyz);
    world.xyz = transform[3].xyz + uRight * position.x * sx + vec3(0.0, position.y * sy, 0.0);
    float breeze = sin(uTime * .63 + world.z * .37 + world.x) * .027;
    world.x += breeze * pow(position.y, 2.0) * uWind;
  }
  vWorld = world.xyz;
  vDistance = length(cameraPosition - world.xyz);
  vec3 n = normalize(mat3(transform) * normal);
  vFace = .5 + max(0.0, dot(n, normalize(vec3(-.3, .8, -.5)))) * .7;
  // The ambient floor is deliberately low. Amber light is local to each lamp.
  float pathX = sin(world.z * .075) * 2.7 + sin(world.z * .031) * 3.2;
  float bankShadow = mix(1.0, .36, smoothstep(1.3, 5.0, abs(world.x - pathX)));
  vLight = vec3(.032, .055, .087) * bankShadow;
  if (uBillboard < .5) vLight *= vFace;
  for (int i = 0; i < 10; i++) {
    vec3 delta = world.xyz - uLamps[i];
    float d2 = dot(delta, delta);
    float phase=float(i)*1.7;
    float flame = .88 + .09*sin(uTime*5.2+phase) + .055*sin(uTime*12.7+phase) + .035*sin(uTime*4.1+phase);
    // The shade directs most light down into a distinct, soft-edged pool.
    float down=-delta.y/max(.01,sqrt(d2));
    float cone=smoothstep(.61,.92,down);
    float reach=1.0-smoothstep(8.0,18.0,d2);
    float bars=.90+.10*sin(atan(delta.x,delta.z)*4.0+uTime*.10);
    vLight += vec3(5.05,2.40,.72)*flame*reach*(cone*bars+.035)/(1.0+d2*1.18);
  }
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

export const WOODLAND_FRAGMENT = `
uniform sampler2D uMap;
uniform float uKind;
uniform vec3 uFog;
uniform vec3 uBase;
uniform float uTime;
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vLight;
varying float vDistance;
varying float vFace;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);
}
void main() {
  vec3 albedo;
  if (uKind < .5) {
    vec4 texel = texture2D(uMap, vUv);
    if (texel.a < .6) discard;
    albedo = texel.rgb;
  } else if (uKind < 1.5) {
    float center = sin(vWorld.z * .075) * 2.7 + sin(vWorld.z * .031) * 3.2;
    float edge = abs(vWorld.x - center);
    float ragged = noise(vWorld.xz * 3.0) * .19 + noise(vWorld.xz * 11.0) * .065;
    float path = 1.0 - smoothstep(.76 + ragged, 1.10 + ragged, edge);
    float grain = hash(floor(vWorld.xz * 65.0));
    float earth = noise(vWorld.xz * 8.0);
    vec3 dirt = mix(vec3(.125,.098,.065), vec3(.25,.213,.157), earth);
    vec3 moss = mix(vec3(.015,.033,.016), vec3(.048,.074,.033), noise(vWorld.xz * 6.0));
    albedo = mix(moss, dirt, path) * (.76 + grain * .45);
    float chips = step(.975, hash(floor(vWorld.xz * 24.0)));
    albedo += vec3(.08,.09,.092) * chips * path;
  } else if (uKind < 2.5) {
    float grain = hash(floor(vWorld.xz * 48.0 + vWorld.y * 21.0));
    albedo = uBase * (.7 + grain * .5);
    float moss = smoothstep(.64, .78, noise(vWorld.xz * 12.0));
    albedo = mix(albedo, vec3(.034,.064,.026), moss * .6);
  } else {
    // Cool iron highlights and restrained tarnish, without the old wooden texture.
    float grain=hash(floor(vWorld.xy*175.0+vWorld.z));
    albedo=mix(vec3(.11,.14,.16),vec3(.22,.25,.27),grain)*vFace;
  }
  vec3 color = albedo * vLight;
  if (uKind > 2.5) {
    color+=albedo*vec3(.018,.028,.043)*vFace;
  }
  float fog = 1.0 - exp(-pow(vDistance * .017, 1.7));
  color = mix(color, uFog, fog);
  // A modest colour lift preserves the blue night and richer amber pools,
  // without raising the ambient exposure of the forest banks.
  float luminance=dot(color,vec3(.2126,.7152,.0722));
  color=max(vec3(0.0),mix(vec3(luminance),color,1.12));
  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export const SKY_VERTEX = `
varying vec3 vDirection;
void main() {
  vDirection = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

export const SKY_FRAGMENT = `
uniform float uTime;
uniform float uMotion;
varying vec3 vDirection;
float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);
}
float dust(vec2 p) {
  return noise(p)*.55 + noise(p*2.07+19.0)*.29 + noise(p*4.13-7.0)*.16;
}
float galaxy(vec2 uv, vec2 center, float tilt) {
  vec2 p=uv-center;
  p=mat2(cos(tilt),-sin(tilt),sin(tilt),cos(tilt))*p;
  p/=vec2(.027,.010);
  float r=length(p);
  float angle=atan(p.y,p.x);
  float arms=pow(.5+.5*cos(angle*2.0-r*7.5),3.0);
  return exp(-r*2.0)*(.15+arms*.55)*(.65+noise(uv*850.0)*.35)+exp(-r*15.0)*.7;
}
float meteor(vec2 uv, float clock, float seed) {
  float cycle=floor(clock/17.0);
  float age=mod(clock,17.0);
  if (age>1.25) return 0.0;
  vec2 start=vec2(.455+hash(vec2(cycle,seed))*.07,.61+hash(vec2(seed,cycle))*.037);
  vec2 direction=normalize(vec2(.85,-.39));
  vec2 head=start+direction*age*.047;
  vec2 relative=uv-head;
  float along=dot(relative,direction);
  float across=abs(relative.x*direction.y-relative.y*direction.x);
  float tail=(1.0-smoothstep(.00007,.00037,across))*smoothstep(-.027,0.0,along)*(1.0-step(.0002,along));
  float spark=exp(-dot(relative,relative)*22000000.0);
  float life=smoothstep(0.0,.12,age)*(1.0-smoothstep(.8,1.25,age));
  return (tail*.75+spark)*life;
}
void main() {
  vec3 dir=normalize(vDirection);
  vec2 uv=vec2(atan(dir.x,dir.z)/6.283185+.5,asin(dir.y)/3.141592+.5);
  float elevation=clamp(dir.y,0.0,1.0);
  vec3 color=mix(vec3(.01,.024,.046),vec3(.002,.004,.015),elevation);
  float drift=uTime*.012;
  float lane=dir.x*.7+dir.y*.34-dir.z*.07-.035;
  float band=exp(-pow(lane*8.0,2.0));
  vec2 cloudUV=uv*vec2(100.0,145.0)+vec2(drift,-drift*.4);
  float clouds=dust(cloudUV);
  float veil=noise(cloudUV*.42+13.0);
  float density=pow(clouds,2.1)*band;
  vec3 nebula=mix(vec3(.034,.082,.16),vec3(.11,.041,.13),veil);
  nebula=mix(nebula,vec3(.031,.13,.14),smoothstep(.64,.86,clouds)*.65);
  nebula+=vec3(.095,.041,.024)*smoothstep(.7,.9,veil);
  float dustLane=smoothstep(.33,.56,noise(cloudUV*1.9+5.0));
  color+=nebula*density*(.4+dustLane*.9)*smoothstep(0.0,.14,dir.y);
  color+=vec3(.13,.081,.20)*galaxy(uv,vec2(.479,.625),-.35);
  color+=vec3(.052,.13,.16)*galaxy(uv,vec2(.564,.603),.6)*.6;
  vec2 cells=uv*vec2(2100.0,1100.0);
  vec2 id=floor(cells);
  float star=step(.992,hash(id))*(1.0-smoothstep(.02,.38,length(fract(cells)-.5)));
  float twinkle=.79+.21*sin(uTime*(.45+hash(id+9.0)) + hash(id+17.0)*6.28);
  vec3 starColor=mix(vec3(.41,.62,.95),vec3(.92,.72,.53),hash(id+5.0));
  color+=starColor*star*(.25+hash(id+31.0)*.85)*mix(1.0,twinkle,uMotion)*smoothstep(0.0,.1,dir.y);
  color+=vec3(.65,.82,1.0)*(meteor(uv,uTime+12.0,3.0)+meteor(uv,uTime*.73+4.0,9.0)*.55)*uMotion;
  color=max(vec3(0.0),mix(vec3(dot(color,vec3(.2126,.7152,.0722))),color,1.08));
  gl_FragColor=vec4(color,1.0);
  #include <colorspace_fragment>
}`;
