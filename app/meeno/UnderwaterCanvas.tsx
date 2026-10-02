"use client";

import { useEffect, useRef } from "react";

const vertexSource = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

const fragmentSource = `
precision highp float;
uniform vec2 resolution;
uniform float time;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), f.x), f.y);
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  vec2 p = (gl_FragCoord.xy - 0.5 * resolution) / min(resolution.x, resolution.y);
  float t = time;

  vec3 deep = vec3(0.002, 0.028, 0.061);
  vec3 middle = vec3(0.006, 0.16, 0.185);
  vec3 light = vec3(0.055, 0.44, 0.41);
  vec3 color = mix(deep, middle, smoothstep(0.0, 0.86, uv.y));
  color = mix(color, light, 0.6 * smoothstep(0.3, 1.0, uv.y));

  float source = exp(-pow((uv.x - 0.52) * 2.5, 2.0)) * smoothstep(0.13, 0.95, uv.y);
  color += vec3(0.05, 0.19, 0.16) * source;

  // Rays fan down from above the view; no visible waterline or surface band.
  float rayX = (uv.x - .46) / (1.35 - uv.y * .48);
  float sway = sin(uv.y * 3.2 + t * .19) * .025;
  float beamA = pow(max(0.0, sin((rayX + sway) * 21.0 + 1.6)), 10.0);
  float beamB = pow(max(0.0, sin((rayX - sway) * 34.0 - .5)), 16.0);
  float suspended = .46 + noise(vec2(uv.x * 9.0 - t * .027, uv.y * 3.5 + t * .035)) * .54;
  color += vec3(.065, .24, .21) * (beamA * .53 + beamB * .21) * suspended * smoothstep(.03, .95, uv.y);
  float bluePocket = noise(p * 2.1 + vec2(t * .012, -t * .008));
  color = mix(color, color * vec3(.64, .74, .96), bluePocket * .34);

  float currentA = sin(uv.x * 8.5 + uv.y * 3.4 + t * 0.24);
  float currentB = sin(uv.x * 15.0 - uv.y * 4.2 - t * 0.31);
  float softCurrent = pow(max(0.0, currentA * currentB), 4.0);
  color += vec3(0.018, 0.058, 0.062) * softCurrent * smoothstep(0.08, 0.88, uv.y);

  float floorMask = 1.0 - smoothstep(0.08, 0.46, uv.y);
  float floorRipple = sin(p.x * 14.0 + sin(p.y * 6.0 + t * 0.4) * 1.6 + t * 0.4);
  floorRipple *= sin(p.y * 10.0 - sin(p.x * 5.0 - t * 0.3) * 1.4);
  color += vec3(0.035, 0.18, 0.15) * pow(max(0.0, floorRipple), 8.0) * floorMask;

  // Continuous suspended particles at two depths instead of blinking grid cells.
  for (int layer = 0; layer < 2; layer++) {
    float depth = float(layer);
    vec2 cells = (p + vec2(t * (.004 + depth * .002), t * (.009 + depth * .005))) * (37.0 - depth * 13.0);
    vec2 id = floor(cells);
    vec2 spot = vec2(hash(id), hash(id + 31.0)) * .65 + .175;
    float mote = 1.0 - smoothstep(.012, .075, length(fract(cells) - spot));
    float rare = step(.86 + depth * .045, hash(id + 7.0));
    color += vec3(.15, .32, .37) * mote * rare * (.22 + depth * .12);
  }

  float vignette = 1.0 - smoothstep(0.35, 1.05, length(p * vec2(0.75, 0.8)));
  color *= 0.55 + vignette * 0.45;
  gl_FragColor = vec4(color, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function UnderwaterCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { alpha: false, antialias: false, powerPreference: "low-power" });
    if (!gl) return;

    const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertex || !fragment) return;
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.useProgram(program);
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const resolution = gl.getUniformLocation(program, "resolution");
    const time = gl.getUniformLocation(program, "time");
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let previous = 0;

    const resize = () => {
      const ratio = Math.min(
        window.devicePixelRatio || 1,
        1.25,
        1000 / Math.max(1, canvas.clientWidth),
        720 / Math.max(1, canvas.clientHeight)
      );
      canvas.width = Math.round(canvas.clientWidth * ratio);
      canvas.height = Math.round(canvas.clientHeight * ratio);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const render = (now: number) => {
      if (now - previous >= 41 || previous === 0) {
        previous = now;
        gl.uniform2f(resolution, canvas.width, canvas.height);
        gl.uniform1f(time, motion.matches ? 0 : now * 0.001);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      if (!motion.matches && !document.hidden) frame = requestAnimationFrame(render);
    };

    const refresh = () => {
      cancelAnimationFrame(frame);
      resize();
      frame = requestAnimationFrame(render);
    };
    resize();
    frame = requestAnimationFrame(render);
    window.addEventListener("resize", refresh);
    document.addEventListener("visibilitychange", refresh);
    motion.addEventListener("change", refresh);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", refresh);
      document.removeEventListener("visibilitychange", refresh);
      motion.removeEventListener("change", refresh);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    };
  }, []);

  return <canvas ref={canvasRef} className="meeno-water-canvas" aria-hidden="true" />;
}
