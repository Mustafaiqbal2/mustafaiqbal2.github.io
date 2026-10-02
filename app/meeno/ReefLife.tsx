"use client";

import { useEffect, useRef } from "react";

type Color = [number, number, number];

const tint = ([r, g, b]: Color, alpha: number) => `rgba(${r}, ${g}, ${b}, ${alpha})`;

function jellyfish(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: Color,
  phase: number,
  time: number
) {
  const pulse = Math.sin(time * 1.25 + phase);
  const driftX = Math.sin(time * 0.34 + phase * 2) * radius * 0.28;
  const driftY = Math.sin(time * 0.46 + phase) * radius * 0.38;
  context.save();
  context.translate(x + driftX, y + driftY);
  context.rotate(Math.sin(time * .23 + phase) * .065);

  const halo = context.createRadialGradient(0, 0, radius * 0.12, 0, 0, radius * 1.9);
  halo.addColorStop(0, tint(color, 0.16));
  halo.addColorStop(0.55, tint(color, 0.065));
  halo.addColorStop(1, tint(color, 0));
  context.fillStyle = halo;
  context.beginPath();
  context.arc(0, 0, radius * 1.9, 0, Math.PI * 2);
  context.fill();

  // Thin filaments are drawn before the translucent bell, so they appear to begin inside it.
  for (let strand = 0; strand < 11; strand += radius < 24 ? 2 : 1) {
    const offset = (strand - 5) / 5;
    const startX = offset * radius * 0.72;
    const length = radius * (1.4 + (strand % 4) * 0.27);
    const wave = Math.sin(time * 0.7 + phase + strand * 0.54);
    context.beginPath();
    context.moveTo(startX, radius * 0.23);
    context.bezierCurveTo(
      startX + wave * radius * 0.24,
      radius * 0.68,
      startX - wave * radius * 0.32 + offset * radius * 0.08,
      length * 0.74,
      startX + Math.sin(time * 0.58 + strand) * radius * 0.27,
      length
    );
    context.strokeStyle = tint(color, strand % 3 === 0 ? 0.48 : 0.27);
    context.lineWidth = strand % 4 === 0 ? 1.45 : 0.75;
    context.shadowColor = tint(color, 0.62);
    context.shadowBlur = radius < 24 ? 0 : strand % 4 === 0 ? 8 : 4;
    context.stroke();
  }

  // The oral arms fold and trail more broadly than the filaments.
  for (const side of [-1, 1]) {
    const arm = context.createLinearGradient(0, radius * 0.12, 0, radius * 1.65);
    arm.addColorStop(0, tint(color, 0.3));
    arm.addColorStop(1, tint(color, 0));
    context.fillStyle = arm;
    context.beginPath();
    context.moveTo(side * radius * 0.17, radius * 0.14);
    context.bezierCurveTo(side * radius * 0.42, radius * 0.5, side * radius * 0.06, radius * 1.12, side * radius * 0.3, radius * 1.63);
    context.bezierCurveTo(side * radius * 0.03, radius * 1.22, side * radius * 0.32, radius * 0.62, side * radius * 0.05, radius * 0.15);
    context.fill();
  }

  context.save();
  context.scale(1 + pulse * 0.055, 1 - pulse * 0.07);
  const bell = context.createRadialGradient(-radius * .22, -radius * .36, radius * .02, 0, -radius * .12, radius);
  bell.addColorStop(0, tint(color, .13));
  bell.addColorStop(.42, tint(color, .24));
  bell.addColorStop(.75, tint(color, .41));
  bell.addColorStop(1, tint(color, .055));
  context.beginPath();
  context.moveTo(-radius * 0.94, radius * 0.2);
  context.bezierCurveTo(-radius * 0.94, -radius * 0.4, -radius * 0.42, -radius * 0.76, 0, -radius * 0.76);
  context.bezierCurveTo(radius * 0.42, -radius * 0.76, radius * 0.94, -radius * 0.4, radius * 0.94, radius * 0.2);
  context.quadraticCurveTo(radius * 0.63, radius * 0.32, radius * 0.42, radius * 0.2);
  context.quadraticCurveTo(radius * 0.21, radius * 0.31, 0, radius * 0.2);
  context.quadraticCurveTo(-radius * 0.21, radius * 0.31, -radius * 0.42, radius * 0.2);
  context.quadraticCurveTo(-radius * 0.63, radius * 0.32, -radius * 0.94, radius * 0.2);
  context.closePath();
  context.fillStyle = bell;
  context.shadowColor = tint(color, 0.75);
  context.shadowBlur = radius * 0.48;
  context.fill();
  context.shadowBlur = 0;
  context.strokeStyle = tint(color, 0.72);
  context.lineWidth = 1.2;
  context.stroke();

  // Fine tissue and internal moon-jelly lobes sit inside the translucent bell.
  context.save();
  context.clip();
  for (let lobe = 0; lobe < 4; lobe++) {
    const angle = lobe * Math.PI * .5 + phase * .12;
    context.beginPath();
    context.ellipse(Math.cos(angle) * radius * .15, -radius * .13 + Math.sin(angle) * radius * .095, radius * .17, radius * .085, angle, 0, Math.PI * 2);
    context.strokeStyle = tint(color, .26 + pulse * .035);
    context.lineWidth = Math.max(.6, radius * .009);
    context.stroke();
  }
  for (let fleck = 0; fleck < 31; fleck++) {
    const a = fleck * 2.39996;
    const distance = Math.sqrt((fleck + .5) / 31);
    const speckX = Math.cos(a) * radius * distance * .85;
    const speckY = -radius * .22 + Math.sin(a) * radius * distance * .52;
    const glimmer = .12 + Math.sin(time * .65 + fleck * 1.8 + phase) * .055;
    context.fillStyle = tint(color, glimmer);
    context.beginPath();
    context.arc(speckX, speckY, .4 + fleck % 3 * .22, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();

  context.beginPath();
  context.ellipse(0, -radius * 0.39, radius * 0.54, radius * 0.24, 0, Math.PI, 0);
  context.strokeStyle = "rgba(255,255,255,0.27)";
  context.lineWidth = 0.8;
  context.stroke();
  context.beginPath();
  context.ellipse(0, radius * .205, radius * .82, radius * .085, 0, 0, Math.PI);
  context.strokeStyle = tint(color, .46);
  context.lineWidth = 1;
  context.stroke();
  for (let rib = -3; rib <= 3; rib++) {
    context.beginPath();
    context.moveTo(rib * radius * 0.12, -radius * 0.57);
    context.quadraticCurveTo(rib * radius * 0.22, -radius * 0.1, rib * radius * 0.26, radius * 0.2);
    context.strokeStyle = tint(color, 0.17);
    context.stroke();
  }
  context.restore();
  context.restore();
}

function coralBranch(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  length: number,
  angle: number,
  thickness: number,
  depth: number,
  seed: number,
  color: Color
) {
  const endX = x + Math.sin(angle) * length;
  const endY = y - Math.cos(angle) * length;
  const bend = Math.sin(seed * 5.17) * length * 0.1;
  context.beginPath();
  context.moveTo(x, y);
  context.quadraticCurveTo((x + endX) / 2 + bend, (y + endY) / 2, endX, endY);
  context.strokeStyle = tint(color, 0.29 + depth * 0.065);
  context.lineWidth = thickness;
  context.lineCap = "round";
  context.shadowColor = tint(color, 0.3);
  context.shadowBlur = 7;
  context.stroke();
  context.shadowBlur = 0;

  if (depth === 0) {
    context.beginPath();
    context.arc(endX, endY, Math.max(1, thickness * 0.65), 0, Math.PI * 2);
    context.fillStyle = tint(color, 0.53);
    context.fill();
    return;
  }

  const spread = 0.31 + Math.sin(seed * 2.31) * 0.08;
  coralBranch(context, endX, endY, length * 0.7, angle - spread, thickness * 0.69, depth - 1, seed + 1.7, color);
  coralBranch(context, endX, endY, length * 0.66, angle + spread * 0.9, thickness * 0.66, depth - 1, seed + 3.1, color);
  if (depth > 2) coralBranch(context, endX, endY, length * 0.46, angle + Math.sin(seed) * 0.12, thickness * 0.54, depth - 2, seed + 5.3, color);
}

function coral(context: CanvasRenderingContext2D, width: number, height: number) {
  const seabed = context.createLinearGradient(0, height * 0.75, 0, height);
  seabed.addColorStop(0, "rgba(0,18,26,0)");
  seabed.addColorStop(1, "rgba(0,15,21,0.64)");
  context.fillStyle = seabed;
  context.fillRect(0, height * 0.7, width, height * 0.3);

  const scale = width < 650
    ? Math.min(width / 650, height / 720)
    : Math.min(width / 1100, height / 720);
  const groups = [
    { x: width * 0.035, stems: 4, color: [235, 171, 105] as Color, lean: 0.18 },
    { x: width * 0.96, stems: 5, color: [176, 198, 147] as Color, lean: -0.18 }
  ];
  groups.forEach((group, groupIndex) => {
    context.save();
    context.translate(group.x, height + 10);
    for (let stem = 0; stem < group.stems; stem++) {
      coralBranch(
        context,
        (stem - 2) * 24 * scale,
        0,
        (63 + (stem % 3) * 15) * scale,
        group.lean + (stem - 2) * 0.16,
        Math.max(1.4, 8 * scale),
        4,
        stem * 4.3 + groupIndex * 12,
        group.color
      );
    }
    context.restore();
  });
}

function bubbles(context: CanvasRenderingContext2D, width: number, height: number, time: number) {
  for (let bubble = 0; bubble < 24; bubble++) {
    const side = bubble % 2;
    const stream = side ? width * 0.925 : width * 0.075;
    const rise = (time * (18 + (bubble % 5) * 5) + bubble * 51.7) % (height * 0.82);
    const x = stream + Math.sin(time * 0.43 + bubble * 2.7) * (9 + bubble % 4 * 4);
    const y = height - rise;
    const radius = 1.1 + bubble % 4 * 0.55;
    const fade = Math.min(1, (height - y) / 65, y / 110);
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.strokeStyle = `rgba(190, 255, 240, ${0.19 * Math.max(0, fade)})`;
    context.lineWidth = 0.8;
    context.stroke();
    context.beginPath();
    context.arc(x - radius * 0.3, y - radius * 0.35, 0.45, 0, Math.PI * 2);
    context.fillStyle = `rgba(220, 255, 250, ${0.25 * Math.max(0, fade)})`;
    context.fill();
  }
}

function seaGrass(context: CanvasRenderingContext2D, width: number, height: number, time: number) {
  const unit = Math.min(width, height);
  for (let blade = 0; blade < 22; blade++) {
    const side = blade % 2;
    const spread = (blade % 11) / 11;
    const x = side ? width * (1 - spread * .17) : width * spread * .16;
    const length = unit * (.09 + (blade % 5) * .025);
    const lean = Math.sin(time * .38 + blade * 1.7) * length * .09;
    context.beginPath();
    context.moveTo(x, height + 4);
    context.bezierCurveTo(x - 11, height - length * .45, x + lean - 6, height - length * .8, x + lean, height - length);
    context.bezierCurveTo(x + lean + 4, height - length * .7, x + 10, height - length * .3, x + 6, height + 4);
    context.fillStyle = blade % 3 ? "rgba(12,53,59,.7)" : "rgba(28,75,78,.54)";
    context.fill();
  }
}

function distantFish(context: CanvasRenderingContext2D, width: number, height: number, time: number) {
  // Small distant schools give the empty water scale, behind the jellyfish.
  for (let i = 0; i < 13; i++) {
    const direction = i < 7 ? 1 : -1;
    const travel = (time * 9 + i * 29) % (width + 210) - 105;
    const x = direction > 0 ? travel : width - travel;
    const y = height * (i < 7 ? .29 : .8) + Math.sin(i * 2.1) * 24 + Math.sin(time * .6 + i) * 5;
    const size = (i % 3 + 2) * .9;
    context.save();
    context.translate(x, y);
    context.scale(direction, 1);
    context.fillStyle = "rgba(129,185,195,.14)";
    context.beginPath();
    context.ellipse(0, 0, size, size * .35, 0, 0, Math.PI * 2);
    context.moveTo(-size * .6, 0);
    context.lineTo(-size * 1.55, -size * .49);
    context.lineTo(-size * 1.55, size * .49);
    context.fill();
    context.restore();
  }
}

export function ReefLife() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const coralRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const coralCanvas = coralRef.current;
    const context = canvas?.getContext("2d", { alpha: true });
    const coralContext = coralCanvas?.getContext("2d", { alpha: true });
    if (!canvas || !context || !coralCanvas || !coralContext) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let previous = 0;

    const resize = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.25, 1200 / Math.max(1, width));
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      coralCanvas.width = canvas.width;
      coralCanvas.height = canvas.height;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      coralContext.setTransform(ratio, 0, 0, ratio, 0, 0);
      coral(coralContext, width, height);
    };

    const render = (now: number) => {
      if (now - previous >= 32 || previous === 0) {
        previous = now;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const time = motion.matches ? 0 : now * 0.001;
        context.clearRect(0, 0, width, height);
        const mobile = width < 650;
        const unit = Math.min(width, height);
        distantFish(context, width, height, time);
        // Smaller, dimmer animals behind the main four add depth.
        context.globalAlpha = .32;
        jellyfish(context, width * .37, height * .16, unit * .023, [110, 184, 230], 3.1, time * .8);
        jellyfish(context, width * .66, height * .77, unit * .029, [206, 142, 217], 5.7, time * .83);
        context.globalAlpha = 1;
        const creatures: Array<{ x: number; y: number; r: number; color: Color; phase: number }> = mobile
          ? [
              { x: 0.13, y: 0.21, r: unit * 0.105, color: [51, 178, 255], phase: 0.2 },
              { x: 0.82, y: 0.69, r: unit * 0.13, color: [168, 127, 255], phase: 2.4 },
              { x: 0.25, y: 0.73, r: unit * 0.065, color: [255, 99, 196], phase: 4.6 }
            ]
          : [
              { x: 0.13, y: 0.23, r: unit * 0.11, color: [51, 178, 255], phase: 0.2 },
              { x: 0.83, y: 0.33, r: unit * 0.13, color: [168, 127, 255], phase: 2.4 },
              { x: 0.22, y: 0.76, r: unit * 0.065, color: [255, 99, 196], phase: 4.6 },
              { x: 0.74, y: 0.11, r: unit * 0.043, color: [221, 235, 117], phase: 6.1 }
            ];
        creatures.forEach((creature) => jellyfish(context, width * creature.x, height * creature.y, creature.r, creature.color, creature.phase, time));
        bubbles(context, width, height, time);
        seaGrass(context, width, height, time);
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
    };
  }, []);

  return (
    <>
      <canvas ref={coralRef} className="meeno-coral-canvas" aria-hidden="true" />
      <canvas ref={canvasRef} className="meeno-reef-canvas" aria-hidden="true" />
    </>
  );
}
