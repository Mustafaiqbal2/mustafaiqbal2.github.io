import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { chromium } from "playwright-core";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const repoRoot = process.cwd();
const workRoot = process.env.SOURCE_WORK_ROOT || "C:\\Users\\musta\\OneDrive\\Desktop\\WORK";
const startupRoot = process.env.SOURCE_STARTUP_ROOT || "C:\\Users\\musta\\OneDrive\\Desktop\\Start-up";
const thesisPdf = process.env.SOURCE_MELODY_THESIS || "C:\\Users\\musta\\Downloads\\thesis.pdf";
const outputRoot = path.join(repoRoot, "public", "projects");
const imagesRoot = path.join(repoRoot, "public", "images");
const chromePath = process.env.CHROME_EXECUTABLE_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const mermaidBundle = require.resolve("mermaid/dist/mermaid.min.js");

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
        panel: "rgba(17, 24, 39, 0.78)",
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

const renderMermaid = async (diagram, output, dark = false, width = 2200, height = 1500) => {
  await ensureDir(path.dirname(output));
  const p = paletteFor(dark);
  const browser = await chromium.launch({ executablePath: chromePath, headless: true });
  const tmp = output.replace(/\.webp$/i, ".mermaid.png");
  try {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    await page.setContent(
      `<!doctype html>
      <html>
        <head>
          <style>
            html,
            body {
              width: ${width}px;
              height: ${height}px;
              margin: 0;
              overflow: hidden;
              background: ${p.bg};
            }
            #diagram {
              width: ${width}px;
              height: ${height}px;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 54px;
              box-sizing: border-box;
              background:
                radial-gradient(circle at 78% 16%, ${dark ? "rgba(45, 212, 191, .12)" : "rgba(15, 118, 110, .09)"}, transparent 34%),
                radial-gradient(circle at 16% 82%, ${dark ? "rgba(167, 139, 250, .11)" : "rgba(124, 58, 237, .08)"}, transparent 36%),
                ${p.bg};
            }
            #diagram svg {
              max-width: 100%;
              max-height: 100%;
              overflow: visible;
            }
          </style>
        </head>
        <body><div id="diagram"></div></body>
      </html>`,
      { waitUntil: "domcontentloaded" }
    );
    await page.addScriptTag({ path: mermaidBundle });
    const svg = await page.evaluate(
      async ({ diagramText, palette, isDark }) => {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "loose",
          theme: "base",
          themeVariables: {
            background: palette.bg,
            mainBkg: palette.panelSolid,
            primaryColor: palette.panelSolid,
            primaryTextColor: palette.ink,
            primaryBorderColor: palette.lineStrong,
            lineColor: palette.primary,
            secondaryColor: palette.panel,
            tertiaryColor: palette.bg2,
            textColor: palette.ink,
            fontFamily: "Inter, Arial, sans-serif",
            fontSize: "18px",
            edgeLabelBackground: isDark ? "#101827" : "#ffffff"
          },
          er: {
            diagramPadding: 32,
            entityPadding: 14,
            stroke: palette.lineStrong,
            fill: palette.panelSolid,
            fontSize: 17,
            useMaxWidth: false
          },
          flowchart: {
            useMaxWidth: false,
            htmlLabels: true,
            curve: "basis",
            nodeSpacing: 52,
            rankSpacing: 58
          }
        });
        const id = `diagram-${Date.now()}-${Math.round(Math.random() * 100000)}`;
        const result = await mermaid.render(id, diagramText);
        return result.svg;
      },
      { diagramText: diagram, palette: p, isDark: dark }
    );
    await page.evaluate((renderedSvg) => {
      const root = document.getElementById("diagram");
      if (!root) return;
      root.innerHTML = renderedSvg;
      const svgElement = root.querySelector("svg");
      if (!svgElement) return;
      svgElement.setAttribute("width", "100%");
      svgElement.setAttribute("height", "100%");
      svgElement.setAttribute("preserveAspectRatio", "xMidYMid meet");
      svgElement.style.width = "100%";
      svgElement.style.height = "100%";
      svgElement.style.maxWidth = "100%";
      svgElement.style.maxHeight = "100%";
    }, svg);
    await page.waitForTimeout(180);
    await page.locator("#diagram").screenshot({ path: tmp });
    await sharp(tmp).webp({ quality: 90 }).toFile(output);
  } finally {
    await fs.rm(tmp, { force: true });
    await browser.close();
  }
};

const parsePrismaModels = async (schemaPath) => {
  if (!(await fileExists(schemaPath))) {
    console.warn(`missing Prisma schema: ${schemaPath}`);
    return { models: new Map(), relations: [] };
  }

  const source = await fs.readFile(schemaPath, "utf8");
  const modelMatches = source.matchAll(/model\s+(\w+)\s+\{([\s\S]*?)\n\}/g);
  const models = new Map();

  for (const match of modelMatches) {
    const [, name, body] = match;
    const fields = [];
    const relationFields = [];
    for (const rawLine of body.split(/\r?\n/)) {
      const line = rawLine.replace(/\/\/.*$/, "").trim();
      if (!line || line.startsWith("@@")) continue;
      const parts = line.split(/\s+/);
      if (parts.length < 2) continue;
      const field = parts[0];
      const type = parts[1];
      fields.push({ name: field, type, raw: line });
      if (line.includes("@relation")) {
        relationFields.push({ name: field, type, raw: line });
      }
    }
    models.set(name, { name, fields, relationFields });
  }

  const relations = [];
  for (const model of models.values()) {
    for (const field of model.relationFields) {
      const target = field.type.replace(/[?\[\]]/g, "");
      if (target && models.has(target)) {
        relations.push({ from: target, to: model.name, label: field.name });
      }
    }
  }

  return { models, relations };
};

const scalarTypes = new Set(["String", "Int", "Float", "Boolean", "DateTime", "Json", "Decimal", "Bytes", "BigInt"]);

const prismaTypeForMermaid = (type) => {
  const clean = type.replace("[]", "_list").replace("?", "");
  return clean.replace(/[^A-Za-z0-9_]/g, "_");
};

const prismaErd = async (schemaPath, selectedModels, title) => {
  const { models, relations } = await parsePrismaModels(schemaPath);
  const selected = selectedModels.filter((name) => models.has(name));
  const selectedSet = new Set(selected);
  const chunks = ["erDiagram"];
  chunks.push(`%% ${title}`);

  for (const name of selected) {
    const model = models.get(name);
    chunks.push(`  ${name} {`);
    const scalarFields = model.fields
      .filter((field) => scalarTypes.has(field.type.replace(/[?\[\]]/g, "")) || field.raw.includes("@id") || field.raw.includes("@unique"))
      .slice(0, 7);
    for (const field of scalarFields) {
      const flags = [];
      if (field.raw.includes("@id")) flags.push("PK");
      if (field.raw.includes("@unique")) flags.push("UK");
      chunks.push(`    ${prismaTypeForMermaid(field.type)} ${field.name}${flags.length ? ` "${flags.join(",")}"` : ""}`);
    }
    chunks.push("  }");
  }

  const seen = new Set();
  for (const relation of relations) {
    if (!selectedSet.has(relation.from) || !selectedSet.has(relation.to)) continue;
    const key = `${relation.from}-${relation.to}-${relation.label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    chunks.push(`  ${relation.from} ||--o{ ${relation.to} : "${relation.label}"`);
  }

  return chunks.join("\n");
};

const mermaidFlow = (title, nodes, edges) => [
  "flowchart LR",
  `  %% ${title}`,
  ...nodes.map(([id, label]) => `  ${id}["${label}"]`),
  ...edges.map(([from, to, label]) => `  ${from} -->${label ? `|"${label}"|` : ""} ${to}`)
].join("\n");

const extractVideoFrame = async (videoPath, output, timestamp, width = 1500) => {
  if (!(await fileExists(videoPath))) {
    console.warn(`missing video source: ${videoPath}`);
    return;
  }
  await ensureDir(path.dirname(output));
  const tmp = output.replace(/\.webp$/i, ".png");
  try {
    execFileSync("ffmpeg", ["-y", "-ss", timestamp, "-i", videoPath, "-frames:v", "1", "-vf", `scale=${width}:-1`, tmp], {
      stdio: "ignore"
    });
    await writeWebp(tmp, output, { resize: { width, withoutEnlargement: true }, quality: 86 });
  } catch (error) {
    console.warn(`could not extract video frame from ${videoPath}: ${error.message}`);
  } finally {
    await fs.rm(tmp, { force: true });
  }
};

const text = (x, y, content, size, fill, weight = 500, attrs = "") =>
  `<text x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}" ${attrs}>${escapeXml(content)}</text>`;

const panel = (x, y, w, h, title, detail, p, accent = p.primary) => `
  <g transform="translate(${x} ${y})">
    <rect width="${w}" height="${h}" rx="22" fill="${p.panel}" stroke="${p.line}"/>
    <circle cx="34" cy="38" r="11" fill="${accent}"/>
    ${text(58, 43, title, 24, p.ink, 650)}
    ${text(24, 82, detail, 17, p.muted, 400)}
  </g>
`;

const shell = (dark, body, title = "") => {
  const p = paletteFor(dark);
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${p.bg}"/>
      <stop offset="1" stop-color="${p.bg2}"/>
    </linearGradient>
    <radialGradient id="glowA" cx="76%" cy="20%" r="60%">
      <stop offset="0" stop-color="${p.primary}" stop-opacity="${dark ? ".22" : ".12"}"/>
      <stop offset="1" stop-color="${p.primary}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowB" cx="12%" cy="82%" r="50%">
      <stop offset="0" stop-color="${p.accent}" stop-opacity="${dark ? ".2" : ".1"}"/>
      <stop offset="1" stop-color="${p.accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1600" height="1000" fill="url(#bg)"/>
  <rect width="1600" height="1000" fill="url(#glowA)"/>
  <rect width="1600" height="1000" fill="url(#glowB)"/>
  <path d="M0 100H1600M0 250H1600M0 400H1600M0 550H1600M0 700H1600M0 850H1600M160 0V1000M320 0V1000M480 0V1000M640 0V1000M800 0V1000M960 0V1000M1120 0V1000M1280 0V1000M1440 0V1000" stroke="${p.grid}" stroke-width="1"/>
  ${title ? text(92, 112, title, 22, p.muted, 600, 'letter-spacing="2"') : ""}
  ${body}
</svg>`;
};

const topologyVisual = (dark) => {
  const p = paletteFor(dark);
  const layers = [
    ["PRODUCT SURFACE", ["Dashboard", "Agent modules", "Admin", "Operations"]],
    ["CONTROL PLANE", ["Accounts", "Profiles", "Roles", "Agent access", "Usage"]],
    ["DATA MODEL", ["Prisma", "Postgres", "Assets", "Knowledge", "Logs"]],
    ["AI + RETRIEVAL", ["OpenAI", "Anthropic", "Gemini", "Pinecone", "Embeddings"]],
    ["EXTERNAL SERVICES", ["Stripe", "S3", "SES", "SQS", "Google APIs"]]
  ];
  const layerSvg = layers
    .map((layer, index) => {
      const y = 185 + index * 136;
      const color = index % 2 ? p.accent : p.primary;
      return `
      <g transform="translate(140 ${y})">
        <rect width="1320" height="98" rx="26" fill="${p.panel}" stroke="${p.lineStrong}"/>
        <rect width="250" height="98" rx="26" fill="${color}" opacity="${dark ? ".18" : ".12"}"/>
        ${text(34, 58, layer[0], 23, color, 760)}
        ${layer[1]
          .map(
            (item, itemIndex) => `
          <g transform="translate(${320 + itemIndex * 184} 24)">
            <rect width="148" height="50" rx="16" fill="${p.panelSolid}" stroke="${p.line}"/>
            ${text(18, 32, item, 18, p.ink, 560)}
          </g>`
          )
          .join("")}
      </g>`;
    })
    .join("");
  return shell(
    dark,
    `
    ${layerSvg}
    <path d="M800 282V321M800 418V457M800 554V593M800 690V729" stroke="${p.primary}" stroke-width="5" opacity=".52"/>
    <g transform="translate(1075 842)">
      <rect width="385" height="72" rx="24" fill="${p.panelSolid}" stroke="${p.line}"/>
      ${text(28, 45, "Private product: architecture only", 23, p.muted, 560)}
    </g>
    `,
    "SIMPLABOTS MULTI-TENANT SAAS ARCHITECTURE"
  );
};

const domainModelVisual = (dark) => {
  const p = paletteFor(dark);
  const groups = [
    ["TENANCY", 95, 190, ["User", "Account", "ProfileGroup", "Profile", "ProfileGroupAgent"]],
    ["COMMERCIAL", 600, 190, ["PricingPlan", "Subscription", "Invoice", "Transaction", "CreditStorage"]],
    ["AGENTS", 1105, 190, ["Agent", "AIEngine", "Response", "Question", "Notification"]],
    ["ASSETS + KNOWLEDGE", 250, 600, ["UserAsset", "KnowledgeBase", "Document", "VectorRecord"]],
    ["INTEGRATIONS", 840, 600, ["Integration", "BusinessLocation", "BusinessReview", "ReviewDraft"]]
  ];
  const groupSvg = groups
    .map(
      ([title, x, y, rows], index) => `
      <g transform="translate(${x} ${y})">
        <rect width="400" height="${index < 3 ? 320 : 245}" rx="28" fill="${p.panel}" stroke="${p.lineStrong}"/>
        ${text(28, 46, title, 22, index % 2 ? p.accent : p.primary, 760)}
        ${(rows)
          .map(
            (row, rowIndex) => `
          <g transform="translate(28 ${78 + rowIndex * 43})">
            <rect width="344" height="30" rx="10" fill="${p.panelSolid}" stroke="${p.line}"/>
            <circle cx="18" cy="15" r="5" fill="${rowIndex % 2 ? p.accent : p.primary}"/>
            ${text(36, 21, row, 17, p.ink, 560)}
          </g>`
          )
          .join("")}
      </g>`
    )
    .join("");
  return shell(
    dark,
    `
    ${groupSvg}
    <path d="M495 350H600M1000 350H1105M800 510V600M450 600L675 510M1040 600L925 510" fill="none" stroke="${p.primary}" stroke-width="4" opacity=".38"/>
    <path d="M1305 510C1390 570 1390 660 1240 720" fill="none" stroke="${p.accent}" stroke-width="4" opacity=".34"/>
    `,
    "SIMPLABOTS DOMAIN MODEL GROUPS"
  );
};

const performancePipelineVisual = (dark) => {
  const p = paletteFor(dark);
  const stages = [
    ["OAuth", "offline tokens"],
    ["Import", "locations"],
    ["Sync", "reviews"],
    ["Filter", "skip waste"],
    ["Draft", "AI replies"],
    ["Cache", "fast pages"],
    ["Publish", "manual control"]
  ];
  return shell(
    dark,
    `
    <g transform="translate(95 320)">
      <path d="M80 140H1380" stroke="${p.lineStrong}" stroke-width="3"/>
      ${stages
        .map((stage, index) => {
          const x = 20 + index * 210;
          const y = index % 2 ? 180 : 0;
          return `
          <g transform="translate(${x} ${y})">
            <rect width="180" height="132" rx="20" fill="${p.panel}" stroke="${p.line}"/>
            <circle cx="30" cy="33" r="11" fill="${index % 2 ? p.accent : p.primary}"/>
            ${text(53, 41, stage[0], 24, p.ink, 650)}
            ${text(24, 82, stage[1], 17, p.muted, 400)}
          </g>`;
        })
        .join("")}
    </g>
    <g transform="translate(150 720)">
      <rect width="520" height="120" rx="26" fill="${p.panel}" stroke="${p.line}"/>
      ${text(34, 52, "Before: 60-120 min", 28, p.muted, 500)}
      ${text(34, 92, "After: 10-20 min", 36, p.primary, 700)}
    </g>
    <g transform="translate(930 720)">
      <rect width="520" height="120" rx="26" fill="${p.panel}" stroke="${p.line}"/>
      ${text(34, 52, "Cache-hit page path", 28, p.muted, 500)}
      ${text(34, 92, "50-200ms", 36, p.accent, 700)}
    </g>
    `,
    "REVVY PERFORMANCE PIPELINE"
  );
};

const classificationVisual = (dark) => {
  const p = paletteFor(dark);
  const nodes = [
    ["Gmail sync", "OAuth, messages, threads", 90, 250, p.primary],
    ["Contact rules", "known senders first", 405, 170, p.accent],
    ["Thread context", "subject, recipients, history", 720, 250, p.primary],
    ["Structured LLM", "JSON category + reason", 1035, 170, p.accent],
    ["Decision log", "inspectable evidence", 405, 570, p.warm],
    ["Gmail labels", "apply, review, correct", 1035, 570, p.primary]
  ];
  const nodeSvg = nodes
    .map(
      ([title, detail, x, y, accent]) => `
      <g transform="translate(${x} ${y})">
        <rect width="250" height="118" rx="24" fill="${p.panel}" stroke="${p.lineStrong}"/>
        <circle cx="36" cy="40" r="12" fill="${accent}"/>
        ${text(60, 45, title, 24, p.ink, 650)}
        ${text(28, 82, detail, 17, p.muted, 400)}
      </g>`
    )
    .join("");
  return shell(
    dark,
    `
    ${nodeSvg}
    <path d="M340 309C380 258 396 238 405 229M655 229C690 242 705 263 720 309M970 309C1008 255 1022 235 1035 229M845 368C780 480 670 540 655 570M1285 229C1390 342 1390 525 1285 629M655 688C755 780 1010 776 1110 688" fill="none" stroke="${p.primary}" stroke-width="4" opacity=".48"/>
    <g transform="translate(128 780)">
      <rect width="1344" height="84" rx="26" fill="${p.panel}" stroke="${p.line}"/>
      ${["Priority", "Financial", "Scheduling", "Team", "Orders", "Newsletters", "FYI/CC", "Uncategorized"]
        .map(
          (item, index) => `
        <g transform="translate(${28 + index * 160} 22)">
          <rect width="132" height="40" rx="14" fill="${p.panelSolid}" stroke="${p.line}"/>
          ${text(17, 26, item, 15, p.ink, 560)}
        </g>`
        )
        .join("")}
    </g>
    `,
    "EMMY ROUTING AND CORRECTION LOOP"
  );
};

const cadContractVisual = (dark) => {
  const p = paletteFor(dark);
  return shell(
    dark,
    `
    <g transform="translate(90 190)">
      <rect width="1420" height="610" rx="28" fill="${p.panel}" stroke="${p.line}"/>
      <path d="M110 120H1310M110 245H1310M110 370H1310M110 495H1310M245 40V570M520 40V570M795 40V570M1070 40V570" stroke="${p.grid}" stroke-width="2"/>
      <path d="M210 455H525V245H800V455H1160" fill="none" stroke="${p.ink}" stroke-width="4" opacity=".55"/>
      <path d="M525 245V150H915V245" fill="none" stroke="${p.primary}" stroke-width="5" opacity=".78"/>
      <path d="M800 455V570" stroke="${p.accent}" stroke-width="5" opacity=".68"/>
      <circle cx="525" cy="245" r="18" fill="${p.primary}"/>
      <circle cx="800" cy="455" r="18" fill="${p.accent}"/>
      <rect x="960" y="105" width="290" height="150" rx="20" fill="${p.panelSolid}" stroke="${p.line}"/>
      ${text(990, 152, "AI interprets", 28, p.ink, 650)}
      ${text(990, 196, "CAD decides geometry", 22, p.primary, 650)}
      <rect x="240" y="520" width="460" height="70" rx="20" fill="${p.panelSolid}" stroke="${p.line}"/>
      ${text(270, 564, "Unresolved geometry stays visible", 23, p.muted, 500)}
    </g>
    `,
    "CAD SAFETY CONTRACT"
  );
};

const musicArchitectureVisual = (dark) => {
  const p = paletteFor(dark);
  const wave = Array.from({ length: 34 }, (_, index) => {
    const x = 160 + index * 38;
    const h = 38 + Math.sin(index * 0.9) * 26 + (index % 5) * 8;
    return `<rect x="${x}" y="${510 - h / 2}" width="14" height="${h}" rx="7" fill="${index % 2 ? p.accent : p.primary}" opacity=".75"/>`;
  }).join("");
  return shell(
    dark,
    `
    <g transform="translate(95 170)">
      <rect width="350" height="660" rx="44" fill="${p.panel}" stroke="${p.lineStrong}"/>
      <rect x="34" y="78" width="282" height="500" rx="30" fill="${dark ? "#0b1020" : "#ffffff"}" stroke="${p.line}"/>
      <circle cx="175" cy="620" r="19" fill="${p.line}"/>
      ${text(75, 160, "Text", 25, p.primary, 650)}
      ${text(75, 230, "Image", 25, p.accent, 650)}
      ${text(75, 300, "Voice", 25, p.warm, 650)}
      <path d="M75 375H275M75 430H245M75 485H290" stroke="${p.muted}" stroke-width="9" stroke-linecap="round" opacity=".45"/>
    </g>
    ${wave}
    <path d="M520 505 C700 265, 885 735, 1050 505 S1320 300, 1450 520" fill="none" stroke="${p.primary}" stroke-width="5" opacity=".44"/>
    ${panel(570, 220, 300, 118, "CLAP", "frozen audio encoder", p)}
    ${panel(920, 235, 330, 118, "InfoNCE", "projection alignment", p, p.accent)}
    ${panel(720, 660, 330, 118, "Pinecone", "mood vector search", p)}
    ${panel(1110, 640, 330, 118, "Spotify", "playlist export path", p, p.warm)}
    `,
    "MELODYMIND THESIS ARCHITECTURE"
  );
};

const recruitmentFlowVisual = (dark) => {
  const p = paletteFor(dark);
  const lanes = [
    ["CV / GitHub", "candidate evidence"],
    ["Nomic", "embeddings"],
    ["Weaviate", "semantic match"],
    ["Llama 3", "interview flow"],
    ["FastAPI", "services"],
    ["Docker", "lab deploy"]
  ];
  return shell(
    dark,
    `
    <g transform="translate(110 270)">
      ${lanes
        .map((lane, index) => {
          const x = (index % 3) * 470;
          const y = Math.floor(index / 3) * 250;
          return `
          <g transform="translate(${x} ${y})">
            <rect width="390" height="150" rx="26" fill="${p.panel}" stroke="${p.line}"/>
            <circle cx="42" cy="46" r="16" fill="${index % 2 ? p.accent : p.primary}"/>
            ${text(72, 55, lane[0], 29, p.ink, 650)}
            ${text(34, 104, lane[1], 19, p.muted)}
          </g>`;
        })
        .join("")}
      <path d="M390 75H470M860 75H940M195 150V250M665 150V250M1135 150V250M390 325H470M860 325H940" stroke="${p.primary}" stroke-width="4" opacity=".48"/>
    </g>
    <g transform="translate(1125 140)">
      <rect width="350" height="90" rx="24" fill="${p.panelSolid}" stroke="${p.line}"/>
      ${text(28, 55, "4-person team led", 28, p.primary, 700)}
    </g>
    `,
    "RECRUITMENT RAG FLOW"
  );
};

const systemsVisual = (dark) => {
  const p = paletteFor(dark);
  return shell(
    dark,
    `
    <g transform="translate(160 230)">
      ${["CUDA", "OpenCL", "MPI", "Compiler", "RAG"].map((item, index) => {
        const angle = (index / 5) * Math.PI * 2 - Math.PI / 2;
        const x = 560 + Math.cos(angle) * 390;
        const y = 300 + Math.sin(angle) * 250;
        return `<g transform="translate(${x} ${y})"><circle r="82" fill="${p.panel}" stroke="${p.line}"/>${text(-45, 8, item, 25, p.ink, 650)}</g>`;
      }).join("")}
      <circle cx="560" cy="300" r="104" fill="${p.panelSolid}" stroke="${p.lineStrong}"/>
      ${text(493, 292, "Systems", 30, p.primary, 700)}
      ${text(500, 330, "depth", 24, p.muted, 500)}
    </g>
    `,
    "SYSTEMS DEPTH"
  );
};

const thumbVisual = (slug, dark) => {
  const p = paletteFor(dark);
  const bg = `
    <rect x="80" y="80" width="1440" height="840" rx="36" fill="${p.panel}" stroke="${p.line}"/>
  `;

  if (slug === "simplabots") {
    return shell(dark, `${bg}<circle cx="800" cy="500" r="145" fill="none" stroke="${p.primary}" stroke-width="5"/><circle cx="800" cy="500" r="55" fill="${p.primary}" opacity=".7"/>${[0,1,2,3,4,5,6,7].map((i)=>{const a=i*Math.PI/4;const x=800+Math.cos(a)*320;const y=500+Math.sin(a)*220;return `<circle cx="${x}" cy="${y}" r="54" fill="${i%2?p.accent:p.panelSolid}" stroke="${p.lineStrong}"/><path d="M800 500L${x} ${y}" stroke="${p.lineStrong}" stroke-width="2" opacity=".45"/>`;}).join("")}`);
  }
  if (slug === "revvy") {
    return shell(dark, `${bg}${[0,1,2,3,4].map((i)=>`<rect x="${180+i*250}" y="${260+i%2*130}" width="190" height="260" rx="30" fill="${p.panelSolid}" stroke="${p.lineStrong}"/><path d="M${215+i*250} ${330+i%2*130}h120M${215+i*250} ${380+i%2*130}h95M${215+i*250} ${430+i%2*130}h135" stroke="${p.muted}" stroke-width="9" stroke-linecap="round" opacity=".45"/><circle cx="${330+i*250}" cy="${560+i%2*130}" r="20" fill="${i%2?p.accent:p.primary}"/>`).join("")}<path d="M210 735C430 610 620 810 820 665S1190 580 1400 710" fill="none" stroke="${p.primary}" stroke-width="7" opacity=".45"/>`);
  }
  if (slug === "emmy") {
    return shell(dark, `${bg}${[0,1,2,3,4,5].map((i)=>`<rect x="${170+(i%3)*410}" y="${230+Math.floor(i/3)*250}" width="310" height="145" rx="22" fill="${p.panelSolid}" stroke="${p.lineStrong}"/><circle cx="${210+(i%3)*410}" cy="${278+Math.floor(i/3)*250}" r="13" fill="${i%2?p.accent:p.primary}"/><path d="M${245+(i%3)*410} ${268+Math.floor(i/3)*250}h160M${245+(i%3)*410} ${310+Math.floor(i/3)*250}h205" stroke="${p.muted}" stroke-width="8" stroke-linecap="round" opacity=".45"/>`).join("")}<path d="M330 555C520 380 720 700 920 520S1170 350 1340 540" fill="none" stroke="${p.primary}" stroke-width="5" opacity=".48"/>`);
  }
  if (slug === "cad-understanding") {
    return shell(dark, `${bg}<g transform="translate(160 190)"><path d="M80 520H410V320H740V520H1220" fill="none" stroke="${p.ink}" stroke-width="5" opacity=".55"/><path d="M410 320V210H870V320" fill="none" stroke="${p.primary}" stroke-width="6"/><path d="M180 170H1260M180 260H1260M180 350H1260M180 440H1260M180 530H1260M300 120V610M520 120V610M740 120V610M960 120V610M1180 120V610" stroke="${p.grid}" stroke-width="3"/><circle cx="410" cy="320" r="20" fill="${p.accent}"/><circle cx="740" cy="520" r="20" fill="${p.primary}"/></g>`);
  }
  if (slug === "melodymind") {
    return shell(dark, `${bg}${Array.from({length:38},(_,i)=>{const h=60+Math.sin(i*.75)*48+(i%4)*16;return `<rect x="${155+i*34}" y="${500-h/2}" width="15" height="${h}" rx="8" fill="${i%2?p.accent:p.primary}" opacity=".72"/>`;}).join("")}<rect x="1010" y="220" width="280" height="520" rx="42" fill="${p.panelSolid}" stroke="${p.lineStrong}"/><path d="M1060 340h180M1060 420h145M1060 500h205" stroke="${p.muted}" stroke-width="10" stroke-linecap="round" opacity=".45"/><circle cx="1150" cy="625" r="48" fill="${p.primary}" opacity=".7"/>`);
  }
  return shell(dark, `${bg}<g transform="translate(150 270)">${[0,1,2,3,4,5].map((i)=>{const x=(i%3)*420;const y=Math.floor(i/3)*240;return `<rect x="${x}" y="${y}" width="330" height="135" rx="24" fill="${p.panelSolid}" stroke="${p.lineStrong}"/><circle cx="${x+42}" cy="${y+50}" r="15" fill="${i%2?p.accent:p.primary}"/><path d="M${x+80} ${y+43}h170M${x+80} ${y+82}h210" stroke="${p.muted}" stroke-width="9" stroke-linecap="round" opacity=".45"/>`;}).join("")}</g><path d="M455 335H570M875 335H990M315 405V510M735 405V510M1155 405V510" stroke="${p.primary}" stroke-width="5" opacity=".45"/>`);
};

const writeThumbPair = async (slug) => {
  const factories = {
    simplabots: topologyVisual,
    revvy: performancePipelineVisual,
    emmy: classificationVisual,
    "cad-understanding": cadContractVisual,
    melodymind: musicArchitectureVisual,
    "recruitment-rag": recruitmentFlowVisual
  };
  const factory = factories[slug] || ((dark) => thumbVisual(slug, dark));
  await writeSvgWebp(factory(false), path.join(outputRoot, slug, "thumb-light.webp"));
  await writeSvgWebp(factory(true), path.join(outputRoot, slug, "thumb-dark.webp"));
};

const writePair = async (slug, basename, svgFactory) => {
  await writeSvgWebp(svgFactory(false), path.join(outputRoot, slug, `${basename}-light.webp`));
  await writeSvgWebp(svgFactory(true), path.join(outputRoot, slug, `${basename}-dark.webp`));
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
const simplabotsSchema = path.join(workRoot, "AutoButt", "spbots", "simplabots", "prisma", "schema.prisma");
const revvySchema = path.join(workRoot, "AutoButt", "Revvy", "revvy", "prisma", "schema.prisma");
const emmySchema = path.join(workRoot, "AutoButt", "Emmy", "Emmy", "prisma", "schema.prisma");
const cadFinal = path.join(startupRoot, "artifacts", "architectural_reconstruction_final");
const profilePhoto = path.join(workRoot, "me.jpeg");
const emmyPng = path.join(workRoot, "emmy.png");
const revvyPng = path.join(workRoot, "revvy.png");
const recruitmentInterviewVideo = path.join(workRoot, "Interview Demo - Made with Clipchamp.mp4");
const recruitmentCompleteVideo = path.join(workRoot, "Complete Vedio.mp4");

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
  })
]);

for (const slug of ["simplabots", "revvy", "emmy", "cad-understanding", "melodymind", "recruitment-rag"]) {
  await writeThumbPair(slug);
}

await Promise.all([
  writePair("simplabots", "platform-topology", topologyVisual),
  writePair("simplabots", "domain-model", domainModelVisual),
  writePair("revvy", "performance-pipeline", performancePipelineVisual),
  writePair("emmy", "classification-loop", classificationVisual),
  writePair("cad-understanding", "safety-contract", cadContractVisual),
  writePair("melodymind", "music-architecture", musicArchitectureVisual),
  writePair("recruitment-rag", "recruitment-flow", recruitmentFlowVisual),
  writePair("systems", "systems-depth", systemsVisual)
]);

try {
  const simplabotsErd = await prismaErd(
    simplabotsSchema,
    [
      "User",
      "Account",
      "Profile",
      "ProfileUser",
      "ProfileGroup",
      "ProfileGroupUser",
      "ProfileGroupAgent",
      "Agent",
      "Transaction",
      "Subscription",
      "Invoice",
      "CreditStorage",
      "PricingPlan"
    ],
    "Simplabots tenancy and billing ERD"
  );
  const revvyErd = await prismaErd(
    revvySchema,
    ["User", "Workspace", "WorkspaceUser", "Connection", "Location", "AutomationSetting", "Review", "Draft", "Job", "UserPreferences"],
    "Revvy review automation ERD"
  );
  const emmyErd = await prismaErd(
    emmySchema,
    ["GmailAccount", "ContactGroup", "ContactGroupCategory", "Category", "Email", "EmailCategorization", "TrainingData", "GmailLabel"],
    "Emmy Gmail categorization ERD"
  );

  const simplabotsFlow = mermaidFlow(
    "Simplabots platform architecture",
    [
      ["U", "Users / accounts / profiles"],
      ["UI", "Next.js dashboard + agent modules"],
      ["CP", "Control plane: roles, groups, access"],
      ["B", "Stripe billing + credits + usage"],
      ["A", "Agent runtime: Chattie, Revvy, Emmy, Dominic, Hunter"],
      ["K", "Assets + knowledge base + Pinecone"],
      ["C", "Cloud services: S3, SES, SQS, Google APIs"]
    ],
    [
      ["U", "UI", "auth context"],
      ["UI", "CP", "profile/account scope"],
      ["CP", "A", "agent access"],
      ["B", "A", "usage gates"],
      ["A", "K", "retrieval"],
      ["A", "C", "side effects"]
    ]
  );
  const revvyFlow = mermaidFlow(
    "Revvy Google Business Profile workflow",
    [
      ["O", "Google OAuth"],
      ["L", "Account + location import"],
      ["S", "Review sync + batch upserts"],
      ["F", "Skip replied / low priority / existing drafts"],
      ["D", "AI draft generation"],
      ["C", "Tagged cache invalidation"],
      ["P", "Manual approval + publish reply"]
    ],
    [
      ["O", "L", "offline token"],
      ["L", "S", "locations"],
      ["S", "F", "reviews"],
      ["F", "D", "eligible only"],
      ["D", "C", "draft writes"],
      ["C", "P", "fast review UI"]
    ]
  );
  const emmyFlow = mermaidFlow(
    "Emmy categorization workflow",
    [
      ["G", "Gmail OAuth + sync"],
      ["R", "Contact groups + category constraints"],
      ["T", "Thread context builder"],
      ["M", "Structured LLM router"],
      ["L", "Categorization log"],
      ["A", "Gmail label apply"],
      ["C", "User correction + training data"]
    ],
    [
      ["G", "R", "known sender"],
      ["R", "T", "ambiguous"],
      ["T", "M", "context pack"],
      ["M", "L", "JSON evidence"],
      ["L", "A", "label decision"],
      ["A", "C", "manual move"],
      ["C", "R", "feedback"]
    ]
  );

  const mermaidJobs = [
    [simplabotsErd, path.join(outputRoot, "simplabots", "prisma-erd-light.webp"), false, 2400, 1700],
    [simplabotsErd, path.join(outputRoot, "simplabots", "prisma-erd-dark.webp"), true, 2400, 1700],
    [simplabotsFlow, path.join(outputRoot, "simplabots", "platform-flow-light.webp"), false, 2200, 1300],
    [simplabotsFlow, path.join(outputRoot, "simplabots", "platform-flow-dark.webp"), true, 2200, 1300],
    [revvyErd, path.join(outputRoot, "revvy", "review-erd-light.webp"), false, 2200, 1450],
    [revvyErd, path.join(outputRoot, "revvy", "review-erd-dark.webp"), true, 2200, 1450],
    [revvyFlow, path.join(outputRoot, "revvy", "review-flow-light.webp"), false, 2200, 1300],
    [revvyFlow, path.join(outputRoot, "revvy", "review-flow-dark.webp"), true, 2200, 1300],
    [emmyErd, path.join(outputRoot, "emmy", "email-erd-light.webp"), false, 2200, 1450],
    [emmyErd, path.join(outputRoot, "emmy", "email-erd-dark.webp"), true, 2200, 1450],
    [emmyFlow, path.join(outputRoot, "emmy", "email-flow-light.webp"), false, 2200, 1300],
    [emmyFlow, path.join(outputRoot, "emmy", "email-flow-dark.webp"), true, 2200, 1300]
  ];
  for (const job of mermaidJobs) {
    await renderMermaid(...job);
  }
} catch (error) {
  console.warn(`could not render Mermaid diagrams: ${error.message}`);
}

await Promise.all([
  extractVideoFrame(recruitmentInterviewVideo, path.join(outputRoot, "recruitment-rag", "interview-demo-frame-1.webp"), "00:00:03"),
  extractVideoFrame(recruitmentInterviewVideo, path.join(outputRoot, "recruitment-rag", "interview-demo-frame-2.webp"), "00:00:13"),
  extractVideoFrame(recruitmentCompleteVideo, path.join(outputRoot, "recruitment-rag", "job-automation-frame-1.webp"), "00:00:05")
]);

await renderThesisPages();

const revvyVideo = path.join(workRoot, "Revvy.mp4");
const revvyOutput = path.join(outputRoot, "revvy", "revvy-demo.mp4");
await copyIfExists(revvyVideo, revvyOutput);

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

console.log("Prepared evidence-driven portfolio media in public/projects");
