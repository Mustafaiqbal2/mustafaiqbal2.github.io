import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const repoRoot = process.cwd();
const workRoot = process.env.SOURCE_WORK_ROOT || "C:\\Users\\musta\\OneDrive\\Desktop\\WORK";
const startupRoot = process.env.SOURCE_STARTUP_ROOT || "C:\\Users\\musta\\OneDrive\\Desktop\\Start-up";
const thesisPdf = process.env.SOURCE_MELODY_THESIS || path.join(workRoot, "thesis.pdf");
const outputRoot = path.join(repoRoot, "public", "projects");
const imagesRoot = path.join(repoRoot, "public", "images");

const fileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const ensureDir = async (dirPath) => fs.mkdir(dirPath, { recursive: true });

const escapeXml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const paletteFor = (dark) =>
  dark
    ? {
        bg: "#080b12",
        bg2: "#101827",
        panel: "rgba(17, 24, 39, 0.76)",
        panelSolid: "#111827",
        ink: "#f8fafc",
        muted: "#aab3c2",
        line: "#293241",
        lineStrong: "#3d4a5f",
        primary: "#2dd4bf",
        accent: "#a78bfa",
        warm: "#f59e0b",
        grid: "rgba(255,255,255,.055)"
      }
    : {
        bg: "#f7f8fa",
        bg2: "#eef3f8",
        panel: "rgba(255, 255, 255, 0.78)",
        panelSolid: "#ffffff",
        ink: "#111827",
        muted: "#4b5563",
        line: "#dbe2ea",
        lineStrong: "#b7c2d0",
        primary: "#0f766e",
        accent: "#7c3aed",
        warm: "#b45309",
        grid: "rgba(15,23,42,.06)"
      };

const shell = (dark, body, label = "") => {
  const p = paletteFor(dark);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000" role="img" aria-label="${escapeXml(label)}">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="${p.bg}"/>
      <stop offset="1" stop-color="${p.bg2}"/>
    </linearGradient>
    <radialGradient id="glow" cx=".22" cy=".18" r=".8">
      <stop offset="0" stop-color="${p.primary}" stop-opacity=".22"/>
      <stop offset=".42" stop-color="${p.accent}" stop-opacity=".09"/>
      <stop offset="1" stop-color="${p.bg}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="70" height="70" patternUnits="userSpaceOnUse">
      <path d="M70 0H0V70" fill="none" stroke="${p.grid}" stroke-width="1"/>
    </pattern>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="24" stdDeviation="28" flood-color="#000" flood-opacity="${dark ? ".42" : ".13"}"/>
    </filter>
  </defs>
  <rect width="1600" height="1000" fill="url(#bg)"/>
  <rect width="1600" height="1000" fill="url(#grid)"/>
  <rect width="1600" height="1000" fill="url(#glow)"/>
  ${body}
</svg>`;
};

const writeWebp = async (input, output, options = {}) => {
  if (!(await fileExists(input))) {
    console.warn(`missing media source: ${input}`);
    return;
  }

  await ensureDir(path.dirname(output));
  let image = sharp(input, { animated: false }).rotate();

  if (options.resize) {
    image = image.resize(options.resize);
  }

  await image.webp({ quality: options.quality || 84 }).toFile(output);
};

const copyIfExists = async (input, output) => {
  if (!(await fileExists(input))) {
    console.warn(`missing media source: ${input}`);
    return;
  }

  await ensureDir(path.dirname(output));
  await fs.copyFile(input, output);
};

const writeSvgWebp = async (svg, output, width = 1600, height = 1000) => {
  await ensureDir(path.dirname(output));
  await sharp(Buffer.from(svg)).resize(width, height).webp({ quality: 88 }).toFile(output);
};

const pill = (x, y, w, h, text, p, fill = p.panelSolid) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="24" fill="${fill}" stroke="${p.lineStrong}" filter="url(#soft)"/>
   <circle cx="${x + 38}" cy="${y + h / 2}" r="11" fill="${p.primary}"/>
   <text x="${x + 66}" y="${y + h / 2 + 7}" fill="${p.ink}" font-family="Inter,Arial,sans-serif" font-size="25" font-weight="650">${escapeXml(text)}</text>`;

const thumbVisual = (slug, dark) => {
  const p = paletteFor(dark);
  if (slug === "simplabots") {
    const modules = [
      ["Tenancy", 210, 250],
      ["Agents", 580, 170],
      ["Billing", 980, 245],
      ["Knowledge", 1030, 610],
      ["Assets", 590, 725],
      ["Cloud APIs", 220, 610]
    ];
    return shell(
      dark,
      `<g transform="translate(0 0)">
        <rect x="120" y="120" width="1360" height="760" rx="44" fill="${p.panel}" stroke="${p.line}" filter="url(#soft)"/>
        <circle cx="800" cy="500" r="124" fill="${p.panelSolid}" stroke="${p.primary}" stroke-width="4"/>
        <text x="730" y="490" fill="${p.primary}" font-family="Inter,Arial,sans-serif" font-size="34" font-weight="750">AI SaaS</text>
        <text x="712" y="535" fill="${p.muted}" font-family="Inter,Arial,sans-serif" font-size="21">shared platform core</text>
        ${modules
          .map(([label, x, y], i) => {
            const cx = x + 145;
            const cy = y + 54;
            return `<path d="M800 500C${800 + (cx - 800) * 0.35} ${500 + (cy - 500) * 0.2} ${800 + (cx - 800) * 0.7} ${500 + (cy - 500) * 0.82} ${cx} ${cy}" fill="none" stroke="${i % 2 ? p.accent : p.primary}" stroke-width="4" opacity=".62"/>
              ${pill(x, y, 290, 108, label, p)}`;
          })
          .join("")}
      </g>`,
      "Simplabots architecture preview"
    );
  }

  if (slug === "revvy") {
    return shell(
      dark,
      `<rect x="120" y="130" width="1360" height="740" rx="44" fill="${p.panel}" stroke="${p.line}" filter="url(#soft)"/>
       ${["OAuth", "Sync", "Filter", "Draft", "Publish"].map((label, i) => {
         const x = 180 + i * 258;
         const y = i % 2 ? 410 : 285;
         return `<g>${pill(x, y, 210, 110, label, p)}<text x="${x + 30}" y="${y + 150}" fill="${p.muted}" font-family="Inter,Arial,sans-serif" font-size="20">${i === 2 ? "avoid wasted AI" : i === 4 ? "manual approval" : "review workflow"}</text></g>`;
       }).join("")}
       <path d="M300 345C470 230 570 560 780 450S1050 280 1320 470" fill="none" stroke="${p.primary}" stroke-width="8" opacity=".42"/>`,
      "Revvy workflow preview"
    );
  }

  if (slug === "emmy") {
    return shell(
      dark,
      `<rect x="125" y="130" width="1350" height="740" rx="44" fill="${p.panel}" stroke="${p.line}" filter="url(#soft)"/>
       ${[
         ["Gmail", 215, 265],
         ["Contact rules", 545, 190],
         ["Thread context", 875, 285],
         ["LLM log", 555, 540],
         ["Labels", 925, 610]
       ]
         .map(([label, x, y]) => pill(x, y, 290, 112, label, p))
         .join("")}
       <path d="M360 325C520 415 680 210 820 310S1010 500 1080 665M690 600C735 420 860 430 1020 345" fill="none" stroke="${p.primary}" stroke-width="6" opacity=".5"/>`,
      "Emmy classification preview"
    );
  }

  if (slug === "cad-understanding") {
    return shell(
      dark,
      `<rect x="118" y="118" width="1364" height="764" rx="42" fill="${p.panel}" stroke="${p.line}" filter="url(#soft)"/>
       <g transform="translate(190 210)">
        <path d="M0 480H310V285H610V480H1110" fill="none" stroke="${p.ink}" stroke-width="5" opacity=".68"/>
        <path d="M310 285V165H760V285" fill="none" stroke="${p.primary}" stroke-width="7"/>
        <path d="M80 130H1080M80 220H1080M80 310H1080M80 400H1080M210 70V560M430 70V560M650 70V560M870 70V560" stroke="${p.grid}" stroke-width="4"/>
        ${["Contexts", "Evidence", "Safety"].map((label, i) => pill(110 + i * 335, 590, 255, 92, label, p)).join("")}
       </g>`,
      "CAD reconstruction preview"
    );
  }

  if (slug === "melodymind") {
    return shell(
      dark,
      `<rect x="118" y="118" width="1364" height="764" rx="42" fill="${p.panel}" stroke="${p.line}" filter="url(#soft)"/>
       <g transform="translate(190 230)">
       ${Array.from({ length: 42 }, (_, i) => {
         const h = 70 + Math.sin(i * 0.72) * 54 + (i % 5) * 17;
         return `<rect x="${i * 25}" y="${260 - h / 2}" width="12" height="${h}" rx="8" fill="${i % 2 ? p.accent : p.primary}" opacity=".76"/>`;
       }).join("")}
       </g>
       ${pill(890, 230, 360, 110, "CLAP + InfoNCE", p)}
       ${pill(960, 410, 300, 110, "Pinecone", p)}
       ${pill(880, 590, 390, 110, "Spotify export", p)}
       <path d="M770 500C850 310 930 295 1080 285M770 500C880 480 960 480 1110 465M770 500C870 640 960 640 1080 645" fill="none" stroke="${p.primary}" stroke-width="5" opacity=".5"/>`,
      "MelodyMind product preview"
    );
  }

  return shell(
    dark,
    `<rect x="118" y="118" width="1364" height="764" rx="42" fill="${p.panel}" stroke="${p.line}" filter="url(#soft)"/>
     ${[
       ["Sources", 220, 260],
       ["Embeddings", 560, 190],
       ["Weaviate", 930, 275],
       ["Interview", 855, 595],
       ["FastAPI", 420, 610]
     ]
       .map(([label, x, y]) => pill(x, y, 290, 110, label, p))
       .join("")}
     <path d="M365 315C520 285 595 250 705 245S940 290 1070 330M700 250C760 450 860 500 1000 648M570 670C700 590 860 610 1000 650" fill="none" stroke="${p.primary}" stroke-width="6" opacity=".5"/>`,
    "Recruitment RAG preview"
  );
};

const writeThumbPair = async (slug) => {
  await writeSvgWebp(thumbVisual(slug, false), path.join(outputRoot, slug, "thumb-light.webp"));
  await writeSvgWebp(thumbVisual(slug, true), path.join(outputRoot, slug, "thumb-dark.webp"));
};

const extractVideoFrame = async (videoPath, output, timestamp, width = 1500) => {
  if (!(await fileExists(videoPath))) {
    console.warn(`missing video source: ${videoPath}`);
    return;
  }

  const tmp = output.replace(/\.webp$/i, ".frame.png");
  await ensureDir(path.dirname(tmp));
  try {
    execFileSync("ffmpeg", ["-y", "-ss", timestamp, "-i", videoPath, "-frames:v", "1", "-vf", `scale=${width}:-1`, tmp], {
      stdio: "ignore"
    });
    await writeWebp(tmp, output, { resize: { width, withoutEnlargement: true }, quality: 84 });
  } catch (error) {
    console.warn(`could not extract video frame ${videoPath}: ${error.message}`);
  } finally {
    await fs.rm(tmp, { force: true });
  }
};

const renderThesisPages = async () => {
  if (!(await fileExists(thesisPdf))) {
    console.warn(`missing MelodyMind thesis source: ${thesisPdf}`);
    return;
  }

  const targetDir = path.join(outputRoot, "melodymind");
  await ensureDir(targetDir);
  const py = `
import sys
from pathlib import Path
try:
    import fitz
except Exception as exc:
    print("missing PyMuPDF:", exc)
    raise SystemExit(3)
pdf = fitz.open(sys.argv[1])
out = Path(sys.argv[2])
for page_num in (39, 40):
    page = pdf[page_num - 1]
    pix = page.get_pixmap(matrix=fitz.Matrix(2.2, 2.2), alpha=False)
    pix.save(out / f"thesis-page-{page_num}.png")
`;

  try {
    execFileSync("python", ["-c", py, thesisPdf, targetDir], { stdio: "inherit" });
    for (const pageNum of [39, 40]) {
      const png = path.join(targetDir, `thesis-page-${pageNum}.png`);
      const webp = path.join(targetDir, `thesis-page-${pageNum}.webp`);
      if (await fileExists(png)) {
        await writeWebp(png, webp, { resize: { width: 1500, withoutEnlargement: true }, quality: 86 });
        await fs.rm(png, { force: true });
      }
    }
  } catch (error) {
    console.warn(`could not render MelodyMind thesis pages: ${error.message}`);
  }
};

await ensureDir(outputRoot);
await ensureDir(imagesRoot);

const simplabotsImages = path.join(workRoot, "AutoButt", "spbots", "simplabots", "public", "images");
const cadFinal = path.join(startupRoot, "artifacts", "architectural_reconstruction_final");
const profilePhoto = path.join(workRoot, "me.jpeg");
const emmyPng = path.join(workRoot, "emmy.png");
const revvyPng = path.join(workRoot, "revvy.png");
const revvyVideo = path.join(workRoot, "Revvy.mp4");
const recruitmentInterviewVideo = path.join(workRoot, "Interview Demo - Made with Clipchamp.mp4");
const recruitmentCompleteVideo = path.join(workRoot, "Complete Vedio.mp4");

for (const slug of ["simplabots", "revvy", "emmy", "cad-understanding", "melodymind", "recruitment-rag"]) {
  await writeThumbPair(slug);
}

await Promise.all([
  copyIfExists(profilePhoto, path.join(imagesRoot, "me.jpeg")),
  writeWebp(emmyPng, path.join(outputRoot, "emmy", "emmy-screenshot.webp"), {
    resize: { width: 1500, withoutEnlargement: true },
    quality: 86
  }),
  writeWebp(revvyPng, path.join(outputRoot, "revvy", "revvy-screenshot.webp"), {
    resize: { width: 1500, withoutEnlargement: true },
    quality: 86
  }),
  writeWebp(path.join(simplabotsImages, "Dominic.webp"), path.join(outputRoot, "simplabots", "dominic-agent.webp"), {
    resize: { width: 720, withoutEnlargement: true }
  }),
  writeWebp(path.join(simplabotsImages, "Revvy.webp"), path.join(outputRoot, "revvy", "revvy-agent.webp"), {
    resize: { width: 720, withoutEnlargement: true }
  }),
  writeWebp(path.join(simplabotsImages, "Emmy.webp"), path.join(outputRoot, "emmy", "emmy-agent.webp"), {
    resize: { width: 720, withoutEnlargement: true }
  }),
  writeWebp(path.join(simplabotsImages, "Melody.webp"), path.join(outputRoot, "melodymind", "melody-agent.webp"), {
    resize: { width: 720, withoutEnlargement: true }
  }),
  writeWebp(path.join(cadFinal, "drawing_context_assessment.png"), path.join(outputRoot, "cad-understanding", "drawing-contexts.webp"), {
    resize: { width: 1600, withoutEnlargement: true }
  }),
  writeWebp(path.join(cadFinal, "context_581b392d1d218937_bcc2eb8f01239000_spaces.png"), path.join(outputRoot, "cad-understanding", "space-hypotheses.webp"), {
    resize: { width: 1600, withoutEnlargement: true }
  }),
  writeWebp(path.join(cadFinal, "context_581b392d1d218937_bcc2eb8f01239000_architectural_graph.png"), path.join(outputRoot, "cad-understanding", "boundary-graph.webp"), {
    resize: { width: 1600, withoutEnlargement: true }
  }),
  writeWebp(path.join(cadFinal, "linework_evidence_assessment.png"), path.join(outputRoot, "cad-understanding", "linework-evidence.webp"), {
    resize: { width: 1600, withoutEnlargement: true }
  }),
  extractVideoFrame(recruitmentInterviewVideo, path.join(outputRoot, "recruitment-rag", "interview-demo-frame-1.webp"), "00:00:03"),
  extractVideoFrame(recruitmentInterviewVideo, path.join(outputRoot, "recruitment-rag", "interview-demo-frame-2.webp"), "00:00:13"),
  extractVideoFrame(recruitmentCompleteVideo, path.join(outputRoot, "recruitment-rag", "job-automation-frame-1.webp"), "00:00:05"),
  extractVideoFrame(recruitmentCompleteVideo, path.join(outputRoot, "recruitment-rag", "job-automation-frame-2.webp"), "00:00:14")
]);

await renderThesisPages();
await copyIfExists(revvyVideo, path.join(outputRoot, "revvy", "revvy-demo.mp4"));

if (await fileExists(revvyVideo)) {
  const posterPng = path.join(outputRoot, "revvy", "revvy-poster.png");
  const posterWebp = path.join(outputRoot, "revvy", "revvy-poster.webp");
  try {
    await ensureDir(path.dirname(posterPng));
    execFileSync("ffmpeg", ["-y", "-ss", "00:00:02", "-i", revvyVideo, "-frames:v", "1", "-vf", "scale=1280:-1", posterPng], {
      stdio: "ignore"
    });
    await writeWebp(posterPng, posterWebp, { resize: { width: 1280, withoutEnlargement: true }, quality: 84 });
    await fs.rm(posterPng, { force: true });
  } catch (error) {
    console.warn(`could not create Revvy video poster: ${error.message}`);
  }
}

console.log("Prepared real/safe portfolio media in public/projects");
