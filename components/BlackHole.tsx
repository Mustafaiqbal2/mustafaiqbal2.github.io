"use client";

import { useEffect, useRef } from "react";

/**
 * Animated Interstellar-style black hole ("Gargantua") on a 2D canvas.
 *
 * - Fills its parent's width, square aspect, renders at devicePixelRatio (capped 1.75).
 * - The parent drives intensity by setting `data-intensity` ("0".."1") on the root
 *   div (e.g. via GSAP). Read every frame; defaults to 0.35.
 * - Respects prefers-reduced-motion (one static frame, no loop) and pauses the
 *   rAF loop when offscreen or when the document is hidden.
 */

const TWO = Math.PI * 2;
const PI = Math.PI;
const DPR_CAP = 1.75;
const MAX_RENDER_PX = 1600;
const FY = 0.2; // accretion-band flatten factor

type Seg = { span: number; ph: number; fq: number; fph: number; a: number };
type Arc = {
  rx: number;
  ry: number;
  lw: number;
  a: number;
  speed: number;
  dir: number;
  wf: number;
  wp: number;
  segs: Seg[];
};
type Lane = { rx: number; ry: number; lw: number; a: number; speed: number; ph: number; span: number };
type Flare = { rx: number; ry: number; th: number; sp: number; born: number; life: number; s: number };
type Twinkler = { x: number; y: number; s: number; ph: number; fq: number };
type Paint = string | CanvasGradient;

type Engine = {
  resize: (cssSize: number) => void;
  drawFrame: (tNow: number, intensity: number) => void;
};

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createGargantua(canvas: HTMLCanvasElement): Engine | null {
  const ctx = canvas.getContext("2d");
  const scene = document.createElement("canvas");
  const sctx = scene.getContext("2d");
  const blurA = document.createElement("canvas");
  const actx = blurA.getContext("2d");
  const blurB = document.createElement("canvas");
  const bctx = blurB.getContext("2d");
  const baseLayer = document.createElement("canvas");
  const basectx = baseLayer.getContext("2d");
  const flareSprite = document.createElement("canvas");
  const fctx = flareSprite.getContext("2d");
  // pre-baked fine-grain disk texture: hundreds of hairline arcs in circular
  // space, rotated rigidly per frame inside the band's flatten transform —
  // the movie's dense streak-river at the cost of two drawImage calls
  const streakRing = document.createElement("canvas");
  const srctx = streakRing.getContext("2d");
  if (!ctx || !sctx || !actx || !bctx || !basectx || !fctx || !srctx) return null;

  let W = 0;
  let H = 0;
  let cx = 0;
  let cy = 0;
  let R = 0;
  let RBAND = 0;

  let gradDisk: Paint = "#fff";
  let gradHalo: Paint = "#fff";
  let gradRing: Paint = "#fff";
  let gradBandAnnulus: Paint = "#fff";
  let gradBandBoost: Paint = "#fff";
  let gradHaloHug: Paint = "#fff";
  let gradHaloTall: Paint = "#fff";
  let gradBotHug: Paint = "#fff";
  let gradBeam: Paint = "#fff";
  let gradBeamHot: Paint = "#fff";
  let gradFrontBeam: Paint = "#fff";

  let bandArcs: Arc[] = [];
  let topArcs: Arc[] = [];
  let botArcs: Arc[] = [];
  let coreArcs: Arc[] = [];
  let dustLanes: Lane[] = [];
  let twinklers: Twinkler[] = [];
  let streakExtent = 0;
  let gradJet: Paint = "#fff";
  let gradVeil: Paint = "#000";
  const flares: Flare[] = [];
  let lastT = -1;
  let rotT = 0;

  function buildStatic(): void {
    if (!sctx || !basectx || !fctx || !srctx) return;

    // linear doppler gradients for filament strokes (left = approaching = hotter)
    const gDisk = sctx.createLinearGradient(cx - RBAND, 0, cx + RBAND, 0);
    gDisk.addColorStop(0.0, "#FFFFFF");
    gDisk.addColorStop(0.12, "#FFF7EA");
    gDisk.addColorStop(0.34, "#FFE8C4");
    gDisk.addColorStop(0.52, "#FFD9A0");
    gDisk.addColorStop(0.74, "#E9A961");
    gDisk.addColorStop(1.0, "#B96A2B");
    gradDisk = gDisk;

    const gHalo = sctx.createLinearGradient(cx - 1.5 * R, 0, cx + 1.5 * R, 0);
    gHalo.addColorStop(0.0, "#FFEFC8");
    gHalo.addColorStop(0.35, "#FFDFA8");
    gHalo.addColorStop(0.6, "#FFD9A0");
    gHalo.addColorStop(1.0, "#D2853F");
    gradHalo = gHalo;

    const gRing = sctx.createLinearGradient(cx - R, 0, cx + R, 0);
    gRing.addColorStop(0.0, "#FFFFFF");
    gRing.addColorStop(0.55, "#FFF3DC");
    gRing.addColorStop(1.0, "#FFDFAE");
    gradRing = gRing;

    // radial annulus gradient for the band base (in band-scaled space, centered 0,0)
    const gBand = sctx.createRadialGradient(0, 0, R * 1.01, 0, 0, RBAND);
    gBand.addColorStop(0.0, "rgba(255,247,234,0.92)");
    gBand.addColorStop(0.1, "rgba(255,233,200,0.72)");
    gBand.addColorStop(0.3, "rgba(255,217,160,0.46)");
    gBand.addColorStop(0.58, "rgba(226,160,92,0.26)");
    gBand.addColorStop(0.82, "rgba(185,106,43,0.09)");
    gBand.addColorStop(0.94, "rgba(185,106,43,0.025)");
    gBand.addColorStop(1.0, "rgba(185,106,43,0)");
    gradBandAnnulus = gBand;

    // left brightening boost for the band (doppler), in band-scaled space
    const gBoost = sctx.createLinearGradient(-RBAND, 0, R * 0.4, 0);
    gBoost.addColorStop(0.0, "rgba(255,250,238,0.55)");
    gBoost.addColorStop(0.55, "rgba(255,240,215,0.20)");
    gBoost.addColorStop(1.0, "rgba(255,240,215,0)");
    gradBandBoost = gBoost;

    // top halo: circular hug annulus
    const gHug = sctx.createRadialGradient(cx, cy, R * 1.005, cx, cy, R * 1.26);
    gHug.addColorStop(0.0, "rgba(255,240,208,0.72)");
    gHug.addColorStop(0.35, "rgba(255,222,170,0.34)");
    gHug.addColorStop(1.0, "rgba(255,200,140,0)");
    gradHaloHug = gHug;

    // top halo: taller faint annulus (in halo-scaled space, centered 0,0)
    const gTall = sctx.createRadialGradient(0, 0, R * 1.02, 0, 0, R * 1.48);
    gTall.addColorStop(0.0, "rgba(255,238,204,0.34)");
    gTall.addColorStop(0.45, "rgba(255,210,150,0.16)");
    gTall.addColorStop(1.0, "rgba(255,190,120,0)");
    gradHaloTall = gTall;

    // bottom lensed arc hug
    const gBot = sctx.createRadialGradient(cx, cy, R * 1.005, cx, cy, R * 1.16);
    gBot.addColorStop(0.0, "rgba(255,240,212,0.30)");
    gBot.addColorStop(0.4, "rgba(255,216,160,0.12)");
    gBot.addColorStop(1.0, "rgba(255,196,132,0)");
    gradBotHug = gBot;

    // doppler beaming glows (band-scaled space). Extents stay inside the
    // square canvas: center*|x| + radius must be < W/2 or the glow clips
    // into a hard vertical edge at the canvas boundary.
    const gBeam = sctx.createRadialGradient(-R * 1.1, 0, 0, -R * 1.1, 0, R * 0.75);
    gBeam.addColorStop(0.0, "rgba(255,250,240,0.60)");
    gBeam.addColorStop(0.45, "rgba(255,222,168,0.24)");
    gBeam.addColorStop(1.0, "rgba(255,210,150,0)");
    gradBeam = gBeam;

    const gHot = sctx.createRadialGradient(-R * 1.04, 0, 0, -R * 1.04, 0, R * 0.42);
    gHot.addColorStop(0.0, "rgba(255,255,255,0.85)");
    gHot.addColorStop(0.4, "rgba(255,244,222,0.35)");
    gHot.addColorStop(1.0, "rgba(255,238,210,0)");
    gradBeamHot = gHot;

    const gFront = sctx.createRadialGradient(-R * 1.05, R * 0.5, 0, -R * 1.05, R * 0.5, R * 0.5);
    gFront.addColorStop(0.0, "rgba(255,252,244,0.70)");
    gFront.addColorStop(0.4, "rgba(255,236,200,0.26)");
    gFront.addColorStop(1.0, "rgba(255,228,190,0)");
    gradFrontBeam = gFront;

    // static ambient layer
    basectx.clearRect(0, 0, W, H);
    const g1 = basectx.createRadialGradient(cx, cy, R * 0.5, cx, cy, W * 0.62);
    g1.addColorStop(0, "rgba(255,176,102,0.09)");
    g1.addColorStop(0.5, "rgba(255,150,80,0.03)");
    g1.addColorStop(1, "rgba(255,150,80,0)");
    basectx.fillStyle = g1;
    basectx.fillRect(0, 0, W, H);
    basectx.save();
    basectx.translate(cx, cy);
    basectx.scale(1, 0.3);
    const g2 = basectx.createRadialGradient(0, 0, R * 0.4, 0, 0, RBAND * 1.12);
    g2.addColorStop(0, "rgba(255,196,128,0.22)");
    g2.addColorStop(0.55, "rgba(255,176,104,0.10)");
    g2.addColorStop(1, "rgba(255,160,90,0)");
    basectx.fillStyle = g2;
    basectx.beginPath();
    basectx.arc(0, 0, RBAND * 1.15, 0, TWO);
    basectx.fill();
    basectx.restore();

    // starfield baked into the ambient layer: pinpricks everywhere except a
    // clearance ring around the shadow, a few hero stars with cross glints
    const srnd = mulberry32(4242);
    basectx.save();
    for (let i = 0; i < 170; i++) {
      const x = srnd() * W;
      const y = srnd() * H;
      const dx = x - cx;
      const dy = y - cy;
      if (Math.sqrt(dx * dx + dy * dy) < R * 1.35 && Math.abs(dy) < R * 0.9) continue;
      const r = (0.35 + srnd() * 0.9) * (W / 900);
      const warm = srnd();
      basectx.fillStyle = warm < 0.55 ? "#ffffff" : warm < 0.8 ? "#ffe9d2" : "#cfd8ff";
      basectx.globalAlpha = 0.14 + srnd() * 0.5;
      basectx.beginPath();
      basectx.arc(x, y, r, 0, TWO);
      basectx.fill();
    }
    // hero stars: brighter core + four-point glint
    for (let i = 0; i < 5; i++) {
      const th = srnd() * TWO;
      const rr = R * (1.9 + srnd() * 1.4);
      const x = cx + rr * Math.cos(th);
      const y = cy + rr * Math.sin(th) * 0.9;
      if (x < 6 || x > W - 6 || y < 6 || y > H - 6) continue;
      const s = (2.2 + srnd() * 2.4) * (W / 900);
      basectx.globalAlpha = 0.75;
      basectx.fillStyle = "#ffffff";
      basectx.beginPath();
      basectx.arc(x, y, s * 0.42, 0, TWO);
      basectx.fill();
      basectx.globalAlpha = 0.4;
      basectx.strokeStyle = "#ffffff";
      basectx.lineWidth = Math.max(0.6, s * 0.16);
      basectx.beginPath();
      basectx.moveTo(x - s * 3.2, y);
      basectx.lineTo(x + s * 3.2, y);
      basectx.moveTo(x, y - s * 3.2);
      basectx.lineTo(x, y + s * 3.2);
      basectx.stroke();
    }
    basectx.restore();

    // twinklers: a handful of stars whose glow breathes per frame
    twinklers = [];
    const trnd = mulberry32(808);
    for (let i = 0; i < 7; i++) {
      const th = trnd() * TWO;
      const rr = R * (1.8 + trnd() * 1.5);
      const x = cx + rr * Math.cos(th);
      const y = cy + rr * Math.sin(th) * 0.85;
      if (x < 8 || x > W - 8 || y < 8 || y > H - 8) continue;
      twinklers.push({ x, y, s: R * (0.035 + trnd() * 0.05), ph: trnd() * TWO, fq: 0.5 + trnd() * 1.4 });
    }

    // streak-ring texture: the disk's fine grain, baked once in circular
    // space at HALF resolution — the upscale's bilinear soften reads as
    // haze and the per-frame blit costs a quarter of full res
    const B = Math.ceil(RBAND + R * 0.06);
    streakExtent = B;
    streakRing.width = B;
    streakRing.height = B;
    srctx.setTransform(0.5, 0, 0, 0.5, 0, 0);
    srctx.clearRect(0, 0, B * 2, B * 2);
    srctx.lineCap = "round";
    srctx.globalCompositeOperation = "lighter";
    const grnd = mulberry32(20141107);
    for (let i = 0; i < 560; i++) {
      const t = Math.pow(grnd(), 1.25);
      const r = R * 1.015 + (RBAND - R * 1.015) * t;
      const span = 0.12 + grnd() * 1.3;
      const a0 = grnd() * TWO;
      srctx.strokeStyle = t < 0.14 ? "#FFFFFF" : t < 0.38 ? "#FFEFD2" : t < 0.68 ? "#FFD9A0" : "#D89B5A";
      srctx.globalAlpha = (0.09 + 0.4 * Math.pow(1 - t, 1.35)) * (0.5 + grnd() * 0.8);
      srctx.lineWidth = R * (0.0035 + grnd() * 0.008);
      srctx.beginPath();
      srctx.arc(B, B, r, a0, a0 + span);
      srctx.stroke();
    }
    // razor-bright inner rim of the disk texture
    srctx.strokeStyle = "#FFFFFF";
    srctx.globalAlpha = 0.5;
    srctx.lineWidth = R * 0.02;
    srctx.beginPath();
    srctx.arc(B, B, R * 1.04, 0, TWO);
    srctx.stroke();
    srctx.setTransform(1, 0, 0, 1, 0, 0);

    // polar jet: blue-shifted plasma column, drawn behind everything
    const gJet = sctx.createLinearGradient(0, 0, 0, R * 2.4);
    gJet.addColorStop(0.0, "rgba(205,222,255,0.55)");
    gJet.addColorStop(0.35, "rgba(180,205,255,0.28)");
    gJet.addColorStop(0.75, "rgba(160,190,255,0.10)");
    gJet.addColorStop(1.0, "rgba(150,180,255,0)");
    gradJet = gJet;

    // screen-space doppler veil: the receding side sinks into dusk
    const gVeil = sctx.createLinearGradient(cx + R * 0.1, 0, W, 0);
    gVeil.addColorStop(0.0, "rgba(7,8,13,0)");
    gVeil.addColorStop(0.45, "rgba(7,8,13,0.22)");
    gVeil.addColorStop(1.0, "rgba(7,8,13,0.48)");
    gradVeil = gVeil;

    // flare sprite
    flareSprite.width = 128;
    flareSprite.height = 128;
    fctx.clearRect(0, 0, 128, 128);
    const fg = fctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    fg.addColorStop(0, "rgba(255,255,255,1)");
    fg.addColorStop(0.22, "rgba(255,241,214,0.85)");
    fg.addColorStop(0.55, "rgba(255,192,120,0.30)");
    fg.addColorStop(1, "rgba(255,170,90,0)");
    fctx.fillStyle = fg;
    fctx.fillRect(0, 0, 128, 128);
  }

  function buildArcs(): void {
    const rnd = mulberry32(1337);

    bandArcs = [];
    const NB = 42;
    for (let i = 0; i < NB; i++) {
      const t = i / (NB - 1);
      const rx = R * (1.03 + (RBAND / R - 1.06) * Math.pow(t, 1.1)) * (0.996 + rnd() * 0.014);
      const fy = FY * (0.92 + 0.22 * t) + (rnd() - 0.5) * 0.02;
      const segs: Seg[] = [];
      const nseg = 1 + ((rnd() * 2.4) | 0);
      for (let s = 0; s < nseg; s++) {
        segs.push({
          span: 0.6 + rnd() * 1.8,
          ph: rnd() * TWO,
          fq: 0.5 + rnd() * 1.1,
          fph: rnd() * TWO,
          a: (0.05 + 0.2 * Math.pow(1 - t, 1.4)) * (0.9 + rnd() * 1.1)
        });
      }
      bandArcs.push({
        rx,
        ry: rx * fy,
        lw: R * (0.014 + rnd() * 0.026) * (1 - 0.3 * t),
        a: (0.03 + 0.11 * Math.pow(1 - t, 1.4)) * (0.75 + rnd() * 0.5),
        speed: 0.07 + 0.24 * Math.pow(R / rx, 1.5),
        dir: 1,
        wf: 0.2 + rnd() * 0.5,
        wp: rnd() * TWO,
        segs
      });
    }

    coreArcs = [];
    for (let i = 0; i < 3; i++) {
      const ct = i / 2;
      const crx = R * (1.1 + 0.42 * ct);
      coreArcs.push({
        rx: crx,
        ry: crx * FY,
        lw: R * (0.016 - 0.004 * ct),
        a: 0.4 - 0.1 * ct,
        speed: 0.06 + 0.16 * Math.pow(R / crx, 1.5),
        dir: 1,
        wf: 0.25 + rnd() * 0.3,
        wp: rnd() * TWO,
        segs: []
      });
    }

    dustLanes = [];
    for (let i = 0; i < 4; i++) {
      const lt = 0.22 + 0.62 * (i / 3) + (rnd() - 0.5) * 0.05;
      const lrx = R * (1.06 + (RBAND / R - 1.1) * lt);
      dustLanes.push({
        rx: lrx,
        ry: lrx * (FY * (0.94 + 0.2 * lt)),
        lw: R * (0.01 + rnd() * 0.012),
        a: 0.16 + rnd() * 0.12,
        speed: 0.05 + 0.1 * Math.pow(R / lrx, 1.5),
        ph: rnd() * TWO,
        span: 1.2 + rnd() * 1.6
      });
    }

    topArcs = [];
    const NT = 12;
    for (let i = 0; i < NT; i++) {
      const t = i / (NT - 1);
      const segs: Seg[] = [];
      const nseg = 1 + ((rnd() * 1.9) | 0);
      for (let s = 0; s < nseg; s++) {
        segs.push({
          span: 0.8 + rnd() * 1.8,
          ph: rnd() * TWO,
          fq: 0.4 + rnd() * 0.9,
          fph: rnd() * TWO,
          a: (0.03 + 0.1 * Math.pow(1 - t, 1.6)) * (0.8 + rnd() * 0.9)
        });
      }
      topArcs.push({
        rx: R * (1.012 + 0.18 * Math.pow(t, 1.15)) * (0.997 + rnd() * 0.01),
        ry: R * (1.012 + 0.34 * Math.pow(t, 1.25)) * (0.997 + rnd() * 0.01),
        lw: R * (0.014 + rnd() * 0.022),
        a: (0.022 + 0.09 * Math.pow(1 - t, 1.6)) * (0.7 + rnd() * 0.6),
        speed: 0.06 + 0.1 * (1 - t),
        dir: 1,
        wf: 0.2 + rnd() * 0.4,
        wp: rnd() * TWO,
        segs
      });
    }

    botArcs = [];
    const NL = 10;
    for (let i = 0; i < NL; i++) {
      const t = i / (NL - 1);
      const segs: Seg[] = [
        {
          span: 0.7 + rnd() * 1.4,
          ph: rnd() * TWO,
          fq: 0.4 + rnd() * 0.9,
          fph: rnd() * TWO,
          a: (0.04 + 0.1 * Math.pow(1 - t, 1.8)) * (0.8 + rnd() * 0.8)
        }
      ];
      botArcs.push({
        rx: R * (1.01 + 0.1 * Math.pow(t, 1.1)) * (0.997 + rnd() * 0.01),
        ry: R * (1.01 + 0.17 * Math.pow(t, 1.2)) * (0.997 + rnd() * 0.01),
        lw: R * (0.008 + rnd() * 0.014),
        a: (0.025 + 0.09 * Math.pow(1 - t, 1.8)) * (0.7 + rnd() * 0.6),
        speed: 0.05 + 0.09 * (1 - t),
        dir: 1,
        wf: 0.2 + rnd() * 0.4,
        wp: rnd() * TWO,
        segs
      });
    }
  }

  // weak hardware renders at 1x: half the pixels through the whole
  // stroke + bloom pipeline, invisible under the edge feather anyway
  const dprLimit = (navigator.hardwareConcurrency || 8) <= 4 ? 1 : DPR_CAP;

  function resize(cssSize: number): void {
    const dpr = Math.min(window.devicePixelRatio || 1, dprLimit);
    const px = Math.min(MAX_RENDER_PX, Math.max(64, Math.round(cssSize * dpr)));
    if (px === W) return;
    W = px;
    H = px;
    canvas.width = W;
    canvas.height = H;
    scene.width = W;
    scene.height = H;
    blurA.width = Math.max(1, W >> 2);
    blurA.height = Math.max(1, H >> 2);
    blurB.width = Math.max(1, W >> 3);
    blurB.height = Math.max(1, H >> 3);
    baseLayer.width = W;
    baseLayer.height = H;
    cx = W / 2;
    cy = H / 2;
    // RBAND must clear the square canvas edge (plus bloom) or the band's
    // left tip cuts off in a hard vertical line
    R = W * 0.263;
    RBAND = R * 1.78;
    buildStatic();
    buildArcs();
  }

  function doppler(mid: number): number {
    return 1 + 0.7 * -Math.cos(mid);
  }

  function strokeSegClipped(
    rx: number,
    ry: number,
    start: number,
    span: number,
    w0: number,
    w1: number,
    alpha: number
  ): void {
    if (!sctx) return;
    const a0 = ((((start - w0) % TWO) + TWO) % TWO) + w0;
    for (let k = 0; k < 2; k++) {
      const s0 = a0 - k * TWO;
      const s1 = s0 + span;
      const b0 = Math.max(s0, w0);
      const b1 = Math.min(s1, w1);
      if (b1 - b0 > 0.02) {
        const mid = (b0 + b1) / 2;
        sctx.globalAlpha = Math.min(1, alpha * doppler(mid));
        sctx.beginPath();
        sctx.ellipse(cx, cy, rx, ry, 0, b0, b1);
        sctx.stroke();
      }
    }
  }

  function strokeArcSet(set: Arc[], grad: Paint, w0: number, w1: number, gain: number, turb: number): void {
    if (!sctx) return;
    sctx.strokeStyle = grad;
    for (let i = 0; i < set.length; i++) {
      const A = set[i];
      const wob = 1 + 0.01 * turb * Math.sin(rotT * A.wf + A.wp);
      const rx = A.rx * wob;
      const ry = A.ry * (2 - wob);
      sctx.lineWidth = A.lw;
      sctx.globalAlpha = Math.min(1, A.a * gain);
      sctx.beginPath();
      sctx.ellipse(cx, cy, rx, ry, 0, w0, w1);
      sctx.stroke();
      const rot = rotT * A.speed * A.dir;
      for (let s = 0; s < A.segs.length; s++) {
        const sg = A.segs[s];
        const fl = 0.55 + 0.45 * Math.sin(rotT * sg.fq * 2 + sg.fph);
        strokeSegClipped(rx, ry, sg.ph + rot, sg.span, w0, w1, sg.a * gain * fl * (0.6 + 0.4 * turb));
      }
    }
  }

  // fill a half donut of the flattened band, in band-scaled space
  function fillBandHalf(top: boolean, fill: Paint, alpha: number): void {
    if (!sctx) return;
    sctx.save();
    sctx.translate(cx, cy);
    sctx.scale(1, FY);
    const a0 = top ? PI - 0.025 : -0.025;
    const a1 = top ? TWO + 0.025 : PI + 0.025;
    sctx.fillStyle = fill;
    sctx.globalAlpha = alpha;
    sctx.beginPath();
    sctx.arc(0, 0, RBAND, a0, a1, false);
    sctx.arc(0, 0, R * 1.01, a1, a0, true);
    sctx.closePath();
    sctx.fill();
    sctx.restore();
  }

  function fillHaloHalf(top: boolean, scaleY: number, fill: Paint, alpha: number, rOuter: number): void {
    if (!sctx) return;
    sctx.save();
    sctx.translate(cx, cy);
    sctx.scale(1, scaleY);
    const a0 = top ? PI - 0.05 : -0.05;
    const a1 = top ? TWO + 0.05 : PI + 0.05;
    sctx.fillStyle = fill;
    sctx.globalAlpha = alpha;
    sctx.beginPath();
    sctx.arc(0, 0, rOuter, a0, a1, false);
    sctx.arc(0, 0, R * 1.004, a1, a0, true);
    sctx.closePath();
    sctx.fill();
    sctx.restore();
  }

  function drawDustLanes(gain: number): void {
    if (!sctx) return;
    sctx.globalCompositeOperation = "source-over";
    sctx.strokeStyle = "rgba(24,12,6,1)";
    for (let i = 0; i < dustLanes.length; i++) {
      const L = dustLanes[i];
      const start = L.ph + rotT * L.speed;
      const a0 = ((start % TWO) + TWO) % TWO;
      for (let k = 0; k < 2; k++) {
        const s0 = a0 - k * TWO;
        const s1 = s0 + L.span;
        const b0 = Math.max(s0, 0.15);
        const b1 = Math.min(s1, PI - 0.15);
        if (b1 - b0 > 0.05) {
          sctx.globalAlpha = L.a * gain;
          sctx.lineWidth = L.lw;
          sctx.beginPath();
          sctx.ellipse(cx, cy, L.rx, L.ry, 0, b0, b1);
          sctx.stroke();
        }
      }
    }
    sctx.globalCompositeOperation = "lighter";
  }

  function updateFlares(dt: number, I: number): void {
    if (!sctx) return;
    if (flares.length < 5 && Math.random() < dt * (0.1 + 1.6 * I * I)) {
      const src = bandArcs[(Math.random() * bandArcs.length) | 0];
      flares.push({
        rx: src.rx,
        ry: src.ry,
        th: 0.2 + Math.random() * (PI - 0.4),
        sp: src.speed * 0.6,
        born: rotT,
        life: 1.4 + Math.random() * 2.2,
        s: R * (0.05 + 0.09 * Math.random())
      });
    }
    for (let i = flares.length - 1; i >= 0; i--) {
      const f = flares[i];
      const p = (rotT - f.born) / f.life;
      if (p >= 1) {
        flares.splice(i, 1);
        continue;
      }
      const th = f.th + f.sp * (rotT - f.born);
      if (th > PI - 0.1) {
        flares.splice(i, 1);
        continue;
      }
      const x = cx + f.rx * Math.cos(th);
      const y = cy + f.ry * Math.sin(th);
      const env = Math.sin(PI * Math.min(1, p));
      const a = env * env * (0.3 + 0.7 * I) * Math.min(1.6, doppler(th)) * 0.55;
      const size = f.s * (0.7 + 0.9 * p);
      sctx.globalAlpha = Math.min(1, a);
      sctx.drawImage(flareSprite, x - size, y - size, size * 2, size * 2);
    }
  }

  // rotate the baked grain texture inside the band's flatten transform;
  // clip picks the far (behind the hole) or near (in front) half
  function drawStreakHalf(far: boolean, alpha: number): void {
    if (!sctx) return;
    const B = streakExtent;
    sctx.save();
    sctx.translate(cx, cy);
    sctx.scale(1, FY);
    sctx.beginPath();
    if (far) sctx.rect(-B, -B, B * 2, B);
    else sctx.rect(-B, 0, B * 2, B);
    sctx.clip();
    sctx.rotate(rotT * 0.24);
    sctx.globalAlpha = Math.min(1, alpha);
    sctx.drawImage(streakRing, -B, -B, B * 2, B * 2);
    sctx.restore();
  }

  function drawJet(I: number): void {
    if (!sctx) return;
    const flick = 0.85 + 0.15 * Math.sin(rotT * 1.9);
    const a = (0.10 + 0.16 * I) * flick;
    const len = R * (2.3 + 0.3 * I);
    for (let d = 0; d < 2; d++) {
      sctx.save();
      sctx.translate(cx, cy);
      // gradient runs 0 -> +y; flip user space so the same tapered path
      // serves both poles (d=0 up, d=1 down) with the fade running outward
      sctx.scale(1, d === 0 ? -1 : 1);
      sctx.globalAlpha = a;
      sctx.fillStyle = gradJet;
      sctx.beginPath();
      sctx.moveTo(-R * 0.08, 0);
      sctx.lineTo(-R * 0.24, len);
      sctx.lineTo(R * 0.24, len);
      sctx.lineTo(R * 0.08, 0);
      sctx.closePath();
      sctx.fill();
      // hot spine
      sctx.globalAlpha = a * 0.7;
      sctx.strokeStyle = "rgba(225,236,255,0.8)";
      sctx.lineWidth = R * 0.022;
      sctx.beginPath();
      sctx.moveTo(0, R * 0.75);
      sctx.lineTo(0, len * 0.86);
      sctx.stroke();
      sctx.restore();
    }
  }

  function drawTwinklers(): void {
    if (!sctx) return;
    for (let i = 0; i < twinklers.length; i++) {
      const t = twinklers[i];
      const a = 0.1 + 0.3 * Math.abs(Math.sin(rotT * t.fq + t.ph));
      sctx.globalAlpha = a;
      sctx.drawImage(flareSprite, t.x - t.s, t.y - t.s, t.s * 2, t.s * 2);
    }
  }

  function ringCircle(r: number, lw: number, a: number): void {
    if (!sctx) return;
    sctx.globalAlpha = Math.min(1, a);
    sctx.lineWidth = lw;
    sctx.beginPath();
    sctx.arc(cx, cy, r, 0, TWO);
    sctx.stroke();
  }

  function drawFrame(tNow: number, I: number): void {
    if (!ctx || !sctx || !actx || !bctx) return;
    if (W === 0) return;
    if (lastT < 0) lastT = tNow;
    const dt = Math.min(0.1, tNow - lastT);
    lastT = tNow;
    const speedGain = 0.45 + 1.15 * I;
    rotT += dt * speedGain;

    const briGain = 0.66 + 0.7 * I;
    const turb = 0.5 + 1.3 * I;

    sctx.clearRect(0, 0, W, H);
    sctx.globalCompositeOperation = "source-over";
    sctx.globalAlpha = 0.7 + 0.5 * I;
    sctx.drawImage(baseLayer, 0, 0);
    sctx.globalAlpha = 1;
    sctx.lineCap = "round";
    sctx.globalCompositeOperation = "lighter";

    // ---- polar jet (deepest layer: everything else stacks over it) ----
    drawJet(I);

    // ---- FAR side (behind the hole) ----
    fillBandHalf(true, gradBandAnnulus, 0.62 * briGain);
    fillBandHalf(true, gradBandBoost, 0.35 * briGain);
    drawStreakHalf(true, 0.62 * briGain);
    strokeArcSet(bandArcs, gradDisk, PI - 0.05, TWO + 0.05, briGain * 0.8, turb);
    strokeArcSet(coreArcs, gradDisk, PI - 0.05, TWO + 0.05, briGain * 0.7, turb);

    // top halo (lensed far side)
    fillHaloHalf(true, 1.0, gradHaloHug, 1.0 * briGain, R * 1.26);
    fillHaloHalf(true, 1.13, gradHaloTall, 0.85 * briGain, R * 1.5);
    // bright crown hugging the top of the shadow
    sctx.strokeStyle = gradHalo;
    sctx.globalAlpha = Math.min(1, 0.26 * briGain);
    sctx.lineWidth = R * 0.1;
    sctx.beginPath();
    sctx.arc(cx, cy, R * 1.055, PI * 0.92, TWO + PI * 0.08);
    sctx.stroke();
    sctx.globalAlpha = Math.min(1, 0.12 * briGain);
    sctx.lineWidth = R * 0.17;
    sctx.beginPath();
    sctx.arc(cx, cy, R * 1.115, PI * 0.98, TWO + PI * 0.02);
    sctx.stroke();
    strokeArcSet(topArcs, gradHalo, PI - 0.12, TWO + 0.12, briGain * 0.82, turb);

    // bottom lensed arc
    fillHaloHalf(false, 1.0, gradBotHug, 0.5 * briGain, R * 1.14);
    strokeArcSet(botArcs, gradHalo, -0.1, PI + 0.1, briGain * 0.5, turb);

    // doppler beaming glow behind the hole (occluded by the horizon)
    sctx.save();
    sctx.translate(cx, cy);
    sctx.scale(1, FY * 1.6);
    sctx.globalAlpha = Math.min(1, (0.55 + 0.45 * I) * (0.9 + 0.1 * Math.sin(rotT * 0.9)));
    sctx.fillStyle = gradBeam;
    sctx.beginPath();
    sctx.arc(-R * 1.1, 0, R * 0.75, 0, TWO);
    sctx.fill();
    sctx.globalAlpha = Math.min(1, 0.5 + 0.5 * I);
    sctx.fillStyle = gradBeamHot;
    sctx.beginPath();
    sctx.arc(-R * 1.04, 0, R * 0.42, 0, TWO);
    sctx.fill();
    sctx.restore();

    // ---- event horizon ----
    sctx.globalCompositeOperation = "source-over";
    sctx.globalAlpha = 1;
    sctx.fillStyle = "#000000";
    sctx.beginPath();
    sctx.arc(cx, cy, R * 0.996, 0, TWO);
    sctx.fill();

    // ---- photon ring ----
    sctx.globalCompositeOperation = "lighter";
    sctx.strokeStyle = gradRing;
    const ringGain = (0.75 + 0.5 * I) * (0.96 + 0.04 * Math.sin(rotT * 7));
    ringCircle(R * 1.03, R * 0.04, 0.06 * ringGain);
    ringCircle(R * 1.006, R * 0.006, 0.5 * ringGain);
    ringCircle(R * 1.003, R * 0.003, 0.9 * ringGain);
    // brighter, softer along the top arc
    sctx.globalAlpha = Math.min(1, 0.2 * ringGain);
    sctx.lineWidth = R * 0.026;
    sctx.beginPath();
    sctx.arc(cx, cy, R * 1.012, PI * 0.94, TWO + PI * 0.06);
    sctx.stroke();
    sctx.globalAlpha = Math.min(1, 0.55 * ringGain);
    sctx.lineWidth = R * 0.009;
    sctx.beginPath();
    sctx.arc(cx, cy, R * 1.005, PI * 0.92, TWO + PI * 0.08);
    sctx.stroke();
    // blinding left crescent
    sctx.globalAlpha = Math.min(1, 0.6 * ringGain);
    sctx.lineWidth = R * 0.008;
    sctx.beginPath();
    sctx.arc(cx, cy, R * 1.005, PI * 0.7, PI * 1.3);
    sctx.stroke();

    // ---- NEAR side (in front of the hole) ----
    fillBandHalf(false, gradBandAnnulus, 1.0 * briGain);
    fillBandHalf(false, gradBandBoost, 0.85 * briGain);
    drawStreakHalf(false, 1.05 * briGain);
    drawDustLanes(1);
    strokeArcSet(bandArcs, gradDisk, -0.05, PI + 0.05, briGain, turb);
    strokeArcSet(coreArcs, gradDisk, -0.05, PI + 0.05, briGain, turb);

    // hot spot where the near band sweeps past the left limb
    sctx.save();
    sctx.translate(cx, cy);
    sctx.scale(1, FY * 0.92);
    sctx.globalAlpha = Math.min(1, (0.35 + 0.4 * I) * (0.92 + 0.08 * Math.sin(rotT * 1.3)));
    sctx.fillStyle = gradFrontBeam;
    sctx.beginPath();
    sctx.arc(-R * 1.05, R * 0.5, R * 0.5, 0, TWO);
    sctx.fill();
    sctx.restore();

    updateFlares(dt, I);
    drawTwinklers();

    // ---- doppler veil: the receding half sinks into dusk (screen space,
    // after all additive light so the ring and band dim together like the
    // movie's right limb) ----
    sctx.globalCompositeOperation = "source-over";
    sctx.globalAlpha = 1;
    sctx.fillStyle = gradVeil;
    sctx.fillRect(cx + R * 0.1, 0, W - cx - R * 0.1, H);
    sctx.globalCompositeOperation = "lighter";

    // ---- bloom composite ----
    actx.clearRect(0, 0, blurA.width, blurA.height);
    actx.drawImage(scene, 0, 0, blurA.width, blurA.height);
    bctx.clearRect(0, 0, blurB.width, blurB.height);
    bctx.drawImage(blurA, 0, 0, blurB.width, blurB.height);

    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(scene, 0, 0);
    ctx.globalCompositeOperation = "lighter";
    const bloom = 0.3 + 0.5 * I;
    ctx.globalAlpha = bloom * 0.85;
    ctx.drawImage(blurA, 0, 0, W, H);
    ctx.globalAlpha = bloom * 0.65;
    ctx.drawImage(blurB, 0, 0, W, H);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  return { resize, drawFrame };
}

export function BlackHole({ className }: { className?: string }) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const engine = createGargantua(canvas);
    if (!engine) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    let running = false;
    let inView = true;

    const readIntensity = (): number => {
      const raw = root.getAttribute("data-intensity");
      if (raw === null) return 0.35;
      const v = parseFloat(raw);
      return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.35;
    };

    const frame = (ms: number): void => {
      raf = requestAnimationFrame(frame);
      engine.drawFrame(ms / 1000, readIntensity());
    };

    const start = (): void => {
      if (running || reduced) return;
      running = true;
      raf = requestAnimationFrame(frame);
    };

    const stop = (): void => {
      if (!running) return;
      running = false;
      cancelAnimationFrame(raf);
    };

    const update = (): void => {
      if (inView && !document.hidden) start();
      else stop();
    };

    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? root.clientWidth;
      if (w > 0) {
        engine.resize(w);
        // Pre-rasterize the full stroke+bloom pipeline once, off-screen,
        // during boot — otherwise the first on-screen frame pays a
        // ~200ms cold raster right in the middle of the About scroll.
        engine.drawFrame(0, 0.35);
      }
    });
    ro.observe(root);

    let io: IntersectionObserver | null = null;
    const onVisibility = (): void => update();
    if (!reduced) {
      io = new IntersectionObserver((entries) => {
        inView = entries[0]?.isIntersecting ?? true;
        update();
      });
      io.observe(root);
      document.addEventListener("visibilitychange", onVisibility);
      start();
    }

    return () => {
      stop();
      ro.disconnect();
      if (io) io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={className}
      data-bh-root=""
      style={{ position: "relative", width: "100%", aspectRatio: "1 / 1" }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
      />
    </div>
  );
}
