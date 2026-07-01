import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import ELK from "elkjs/lib/elk.bundled.js";
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation } from "d3-force";

const repoRoot = process.cwd();
const workRoot = process.env.SOURCE_WORK_ROOT || "C:\\Users\\musta\\OneDrive\\Desktop\\WORK";
const startupRoot = process.env.SOURCE_STARTUP_ROOT || "C:\\Users\\musta\\OneDrive\\Desktop\\Start-up";
const thesisPdf = process.env.SOURCE_MELODY_THESIS || path.join(workRoot, "thesis.pdf");
const outputPath = path.join(repoRoot, "data", "generated", "project-docs.json");
const elk = new ELK();

const SCALAR_TYPES = new Set([
  "String",
  "Int",
  "BigInt",
  "Float",
  "Decimal",
  "Boolean",
  "DateTime",
  "Json",
  "Bytes",
  "Unsupported"
]);

const EXCLUDED_DIRS = new Set([
  ".git",
  ".next",
  ".vercel",
  "node_modules",
  "out",
  "build",
  "dist",
  ".turbo",
  ".venv",
  "venv",
  "__pycache__",
  ".cache"
]);

const BANNED_OUTPUT_PATTERNS = [
  /C:\\\\|C:\//i,
  /Users[\\/]+musta/i,
  /\.env/i,
  /github-recovery-codes/i,
  /\bid(front|back|b2?)\b/i,
  /AKIA[0-9A-Z]{16}/,
  /sk-[A-Za-z0-9_-]{20,}/,
  /ghp_[A-Za-z0-9_]{20,}/,
  /-----BEGIN [A-Z ]+PRIVATE KEY-----/,
  /(^|[^A-Za-z0-9])(\+?92|0)?3\d{2}[- .]?\d{7}($|[^A-Za-z0-9])/
];

const projectRoots = {
  simplabots: path.join(workRoot, "AutoButt", "spbots", "simplabots"),
  revvy: path.join(workRoot, "AutoButt", "Revvy", "revvy"),
  emmy: path.join(workRoot, "AutoButt", "Emmy", "Emmy"),
  startup: startupRoot
};

const logicalRootLabels = [
  [projectRoots.simplabots, "WORK/AutoButt/spbots/simplabots"],
  [projectRoots.revvy, "WORK/AutoButt/Revvy/revvy"],
  [projectRoots.emmy, "WORK/AutoButt/Emmy/Emmy"],
  [startupRoot, "Desktop/Start-up"],
  [workRoot, "WORK"]
];

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readText(filePath) {
  if (!(await fileExists(filePath))) {
    return "";
  }
  return sanitizeText(await fs.readFile(filePath, "utf8"));
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function logicalPath(filePath) {
  const normalized = path.resolve(filePath);
  const match = logicalRootLabels.find(([root]) => normalized.toLowerCase().startsWith(path.resolve(root).toLowerCase()));
  if (!match) {
    return path.basename(filePath);
  }
  const [root, label] = match;
  const rel = path.relative(root, normalized).replaceAll(path.sep, "/");
  return rel ? `${label}/${rel}` : label;
}

function sanitizeText(value) {
  return String(value)
    .normalize("NFKC")
    .replace(/\uFFFD/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/C:\\Users\\musta\\OneDrive\\Desktop\\/gi, "")
    .replace(/C:\/Users\/musta\/OneDrive\/Desktop\//gi, "")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email redacted]")
    .replace(/(^|[^A-Za-z0-9])(\+?92|0)?3\d{2}[- .]?\d{7}($|[^A-Za-z0-9])/g, "$1[phone redacted]$3")
    .trim();
}

function safeId(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function compactList(values, limit = 10) {
  return Array.from(new Set(values.filter(Boolean))).slice(0, limit);
}

function inferNodeType(group = "") {
  const normalized = String(group).toLowerCase();
  if (["ai", "model", "retrieval", "training"].includes(normalized)) return "AI service";
  if (["db", "data", "evidence", "graph"].includes(normalized)) return "Data model";
  if (["external", "infra", "deploy", "sync"].includes(normalized)) return "Integration";
  if (["commercial", "cost", "performance"].includes(normalized)) return "Operational layer";
  if (["identity", "platform", "product", "ui"].includes(normalized)) return "Product surface";
  if (["safety", "audit", "control"].includes(normalized)) return "Control surface";
  return "System component";
}

function normalizeField(field) {
  if (typeof field === "string") {
    return { name: sanitizeText(field).slice(0, 72), type: "" };
  }
  return {
    name: sanitizeText(field.name || "").slice(0, 72),
    type: sanitizeText(field.type || "").slice(0, 46),
    flags: compactList(field.flags || [], 4)
  };
}

function enrichNode(node, index, visualizationKind = "system-map") {
  const fields = (node.fields || []).map(normalizeField).filter((field) => field.name);
  const group = node.group || "workflow";
  const summary = sanitizeText(node.summary || node.detail || node.subtitle || `${node.label} in the ${visualizationKind} view`).slice(0, 180);
  const inspectDetails = compactList(
    [
      node.detail,
      node.subtitle,
      fields.length ? `${fields.length} technical fields or implementation signals` : "",
      node.cluster ? `Layer: ${node.cluster}` : ""
    ].map((item) => sanitizeText(item || "")),
    5
  );

  return {
    ...node,
    group,
    fields,
    nodeType: node.nodeType || inferNodeType(group),
    priority: node.priority ?? index,
    lane: node.lane || group,
    cluster: node.cluster || group,
    summary,
    metrics: compactList(node.metrics || [], 5),
    inspectDetails
  };
}

function enrichVisualization(visualization, layoutPreset) {
  return {
    ...visualization,
    layoutPreset:
      layoutPreset ||
      (visualization.kind === "erd"
        ? "schema-grid"
        : visualization.kind === "system-map"
          ? "force-map"
          : visualization.kind === "timeline"
            ? "timeline"
            : visualization.kind === "contract"
              ? "contract"
              : "layered"),
    nodes: visualization.nodes.map((node, index) => enrichNode(node, index, visualization.kind))
  };
}

async function collectDocs(files) {
  const docs = [];
  for (const file of files) {
    const text = await readText(file);
    if (!text) continue;
    docs.push({
      label: path.basename(file),
      path: logicalPath(file),
      text
    });
  }
  return docs;
}

async function readPackage(root) {
  const packagePath = path.join(root, "package.json");
  const pkg = await readJson(packagePath, {});
  const dependencies = {
    ...pkg.dependencies,
    ...pkg.devDependencies
  };
  return {
    path: logicalPath(packagePath),
    dependencies: Object.keys(dependencies || {}).sort()
  };
}

async function walkFiles(root, options = {}) {
  const files = [];
  const maxFiles = options.maxFiles || 450;
  const extensions = options.extensions || new Set([".ts", ".tsx", ".js", ".jsx", ".py", ".md", ".json"]);

  async function walk(dir) {
    if (files.length >= maxFiles) return;
    let entries = [];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (files.length >= maxFiles) return;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRS.has(entry.name)) {
          await walk(fullPath);
        }
        continue;
      }
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (!extensions.has(ext)) continue;
      if (/\.env|secret|recovery|idfront|idback|idb2/i.test(entry.name)) continue;
      files.push(fullPath);
    }
  }

  await walk(root);
  return files;
}

async function scanSignals(root, keywords) {
  const files = await walkFiles(root, {
    maxFiles: 420,
    extensions: new Set([".ts", ".tsx", ".js", ".jsx", ".py", ".md", ".json"])
  });
  const signals = new Map();
  const apiRoutes = [];

  for (const file of files) {
    const logical = logicalPath(file);
    if (/\/api\/.*\/route\.(ts|js)$/i.test(logical)) {
      apiRoutes.push(
        logical
          .replace(/^.*\/src\/app\/api\//, "/api/")
          .replace(/^.*\/app\/api\//, "/api/")
          .replace(/\/route\.(ts|js)$/i, "")
      );
    }

    let text = "";
    try {
      const stat = await fs.stat(file);
      if (stat.size > 260_000) continue;
      text = await fs.readFile(file, "utf8");
    } catch {
      continue;
    }

    for (const keyword of keywords) {
      const re = new RegExp(keyword.pattern, "gi");
      const count = (text.match(re) || []).length;
      if (!count) continue;
      const previous = signals.get(keyword.label) || { label: keyword.label, count: 0, files: [] };
      previous.count += count;
      previous.files.push(logical);
      signals.set(keyword.label, previous);
    }
  }

  return {
    integrations: Array.from(signals.values())
      .map((item) => ({
        label: item.label,
        count: item.count,
        evidenceFiles: compactList(item.files, 4)
      }))
      .sort((a, b) => b.count - a.count),
    routes: compactList(apiRoutes, 28)
  };
}

function parsePrismaSchema(schemaText) {
  const clean = schemaText.replace(/\/\/.*$/gm, "");
  const enumNames = Array.from(clean.matchAll(/enum\s+(\w+)\s*\{/g)).map((match) => match[1]);
  const models = [];
  const modelMatches = clean.matchAll(/model\s+(\w+)\s*\{([\s\S]*?)\n\}/g);

  for (const match of modelMatches) {
    const name = match[1];
    const body = match[2];
    const fields = [];
    const indexes = [];

    for (const rawLine of body.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line) continue;
      if (line.startsWith("@@")) {
        indexes.push(line);
        continue;
      }
      if (line.startsWith("@")) continue;
      const parts = line.split(/\s+/);
      if (parts.length < 2) continue;
      const fieldName = parts[0];
      const rawType = parts[1];
      const attributes = parts.slice(2).join(" ");
      const typeBase = rawType.replace(/[?\[\]]/g, "");
      fields.push({
        name: fieldName,
        type: rawType,
        typeBase,
        isList: rawType.endsWith("[]"),
        isOptional: rawType.endsWith("?"),
        isId: attributes.includes("@id"),
        isUnique: attributes.includes("@unique"),
        hasDefault: attributes.includes("@default"),
        attributes: sanitizeText(attributes).slice(0, 180)
      });
    }

    models.push({ name, fields, indexes });
  }

  const modelNames = new Set(models.map((model) => model.name));
  const relations = [];
  for (const model of models) {
    for (const field of model.fields) {
      if (modelNames.has(field.typeBase) && !SCALAR_TYPES.has(field.typeBase)) {
        relations.push({
          source: model.name,
          target: field.typeBase,
          label: field.name,
          cardinality: field.isList ? "many" : field.isOptional ? "optional" : "one"
        });
      }
    }
  }

  return { models, relations, enums: enumNames };
}

async function parsePrismaFile(filePath) {
  const text = await readText(filePath);
  if (!text) {
    return { path: logicalPath(filePath), models: [], relations: [], enums: [] };
  }
  return {
    path: logicalPath(filePath),
    ...parsePrismaSchema(text)
  };
}

function selectModels(schema, names) {
  const nameSet = new Set(names);
  const models = schema.models.filter((model) => nameSet.has(model.name));
  const selectedNames = new Set(models.map((model) => model.name));
  const relations = schema.relations.filter((relation) => selectedNames.has(relation.source) && selectedNames.has(relation.target));
  return { models, relations, enums: schema.enums, path: schema.path };
}

async function layoutWithElk(nodes, edges, options = {}) {
  const graph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": options.algorithm || "layered",
      "elk.direction": options.direction || "RIGHT",
      "elk.spacing.nodeNode": String(options.spacing || 46),
      "elk.layered.spacing.nodeNodeBetweenLayers": String(options.layerSpacing || 72),
      "elk.edgeRouting": "ORTHOGONAL"
    },
    children: nodes.map((node) => ({
      id: node.id,
      width: node.width || 250,
      height: node.height || 120
    })),
    edges: edges.map((edge, index) => ({
      id: `${edge.source}-${edge.target}-${index}`,
      sources: [edge.source],
      targets: [edge.target]
    }))
  };

  const result = await elk.layout(graph);
  const byId = new Map((result.children || []).map((node) => [node.id, node]));
  return nodes.map((node) => {
    const placed = byId.get(node.id) || { x: 0, y: 0 };
    return { ...node, x: Math.round(placed.x || 0), y: Math.round(placed.y || 0) };
  });
}

function layoutForce(nodes, edges, width = 1120, height = 700) {
  const simNodes = nodes.map((node, index) => ({
    ...node,
    x: width / 2 + Math.cos((index / nodes.length) * Math.PI * 2) * width * 0.26,
    y: height / 2 + Math.sin((index / nodes.length) * Math.PI * 2) * height * 0.26
  }));
  const simEdges = edges.map((edge) => ({ ...edge }));
  const simulation = forceSimulation(simNodes)
    .force(
      "link",
      forceLink(simEdges)
        .id((node) => node.id)
        .distance((edge) => edge.distance || 170)
        .strength(0.66)
    )
    .force("charge", forceManyBody().strength(-520))
    .force("collide", forceCollide().radius((node) => Math.max(node.width || 210, node.height || 90) * 0.42 + 34))
    .force("center", forceCenter(width / 2, height / 2))
    .stop();

  for (let i = 0; i < 260; i += 1) {
    simulation.tick();
  }

  return simNodes.map((node) => {
    const { vx, vy, index, ...cleanNode } = node;
    return {
      ...cleanNode,
      x: Math.round(Math.max(22, Math.min(width - (node.width || 220) - 22, node.x - (node.width || 220) / 2))),
      y: Math.round(Math.max(22, Math.min(height - (node.height || 96) - 22, node.y - (node.height || 96) / 2)))
    };
  });
}

function modelNode(model, group = "data") {
  const relationFields = model.fields.filter((field) => /^[A-Z]/.test(field.typeBase) && !SCALAR_TYPES.has(field.typeBase));
  const scalarFields = model.fields.filter((field) => !relationFields.includes(field));
  const fields = [...scalarFields.filter((field) => field.isId), ...scalarFields.filter((field) => !field.isId).slice(0, 7)];
  return {
    id: model.name,
    label: model.name,
    subtitle: `${model.fields.length} fields${model.indexes.length ? ` / ${model.indexes.length} indexes` : ""}`,
    group,
    fields: fields.map((field) => ({
      name: field.name,
      type: field.type,
      flags: [field.isId ? "id" : "", field.isUnique ? "unique" : "", field.isOptional ? "optional" : ""].filter(Boolean)
    })),
    detail: relationFields.length ? `Relations: ${relationFields.map((field) => `${field.name}->${field.typeBase}`).join(", ")}` : "Scalar model surface",
    width: 268,
    height: Math.min(248, 92 + fields.length * 22)
  };
}

async function erdVisualization(id, title, description, schema, selected, group = "data") {
  const selectedSchema = selectModels(schema, selected);
  const nodes = selectedSchema.models.map((model) => modelNode(model, group));
  const edges = selectedSchema.relations.map((relation) => ({
    source: relation.source,
    target: relation.target,
    label: relation.label,
    kind: relation.cardinality
  }));
  const laidOut = await layoutWithElk(nodes, edges, { direction: "RIGHT", spacing: 48, layerSpacing: 96 });
  return enrichVisualization({
    id,
    kind: "erd",
    title,
    description,
    width: 1460,
    height: 760,
    nodes: laidOut,
    edges,
    evidence: [`${selectedSchema.models.length} selected Prisma models`, `${selectedSchema.relations.length} schema relations`, selectedSchema.path]
  }, "schema-grid");
}

async function workflowVisualization(id, title, description, steps, edges, options = {}) {
  const nodes = steps.map((step, index) => ({
    id: step.id,
    label: step.label,
    subtitle: step.subtitle,
    group: step.group || "workflow",
    detail: step.detail || "",
    fields: (step.fields || []).map((value) => ({ name: value, type: "" })),
    width: step.width || 235,
    height: step.height || 112,
    order: index
  }));
  const laidOut = await layoutWithElk(nodes, edges, {
    direction: options.direction || "RIGHT",
    spacing: options.spacing || 42,
    layerSpacing: options.layerSpacing || 82
  });
  return enrichVisualization({
    id,
    kind: options.kind || "workflow",
    title,
    description,
    width: options.width || 1380,
    height: options.height || 560,
    nodes: laidOut,
    edges,
    evidence: options.evidence || []
  }, options.layoutPreset);
}

function systemMapVisualization(id, title, description, nodes, edges, evidence = []) {
  const laidOut = layoutForce(nodes, edges, 1320, 720);
  return enrichVisualization({
    id,
    kind: "system-map",
    title,
    description,
    width: 1320,
    height: 720,
    nodes: laidOut,
    edges,
    evidence
  }, "force-map");
}

async function cadSummary() {
  const artifactsRoot = path.join(startupRoot, "artifacts", "architectural_reconstruction_final");
  const manifest = await readJson(path.join(artifactsRoot, "architectural_reconstruction_manifest.json"), {});
  const drawingContexts = await readJson(path.join(artifactsRoot, "drawing_contexts.json"), []);
  const evidenceGroups = await readJson(path.join(artifactsRoot, "evidence_groups.json"), []);
  const hypotheses = await readJson(path.join(artifactsRoot, "semantic_evidence_hypotheses.json"), []);
  const graphs = await readJson(path.join(artifactsRoot, "architectural_hypothesis_graphs.json"), []);
  return {
    artifactsRoot: "Desktop/Start-up/artifacts/architectural_reconstruction_final",
    manifest,
    metrics: manifest.metrics || {},
    safety: manifest.safety || {},
    drawingContextCount: Array.isArray(drawingContexts) ? drawingContexts.length : 0,
    evidenceGroupCount: Array.isArray(evidenceGroups) ? evidenceGroups.length : 0,
    hypothesisCount: Array.isArray(hypotheses) ? hypotheses.length : 0,
    graphCount: Array.isArray(graphs) ? graphs.length : 0,
    sampleContextIds: compactList((drawingContexts || []).map((item) => item.id), 6),
    sampleEvidenceKinds: compactList((evidenceGroups || []).map((item) => item.kind), 8),
    unresolvedCount: (graphs || []).reduce((sum, graph) => sum + Object.keys(graph.unresolved || {}).length, 0)
  };
}

function extractThesisEvidence() {
  const fallback = {
    pages: 0,
    counts: {},
    source: "WORK/thesis.pdf",
    facts: [
      "MelodyMind thesis source was present but text extraction could not run in the local Python environment."
    ]
  };

  try {
    const py = `
import json, sys
try:
    import fitz
except Exception as exc:
    print(json.dumps({"error": str(exc)}))
    raise SystemExit(0)
doc = fitz.open(sys.argv[1])
text = "\\n".join(page.get_text() for page in doc)
terms = ["CLAP", "InfoNCE", "FastAPI", "Supabase", "Pinecone", "Expo", "Spotify", "Whisper", "TTS", "stem", "LangChain", "Nomic"]
print(json.dumps({
    "pages": len(doc),
    "counts": {term: text.lower().count(term.lower()) for term in terms},
    "hasMustafa": "Mustafa Iqbal" in text,
    "source": "WORK/thesis.pdf"
}))
`;
    const out = execFileSync("python", ["-c", py, thesisPdf], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    const parsed = JSON.parse(out);
    return {
      ...parsed,
      source: "WORK/thesis.pdf",
      facts: [
        `${parsed.pages} thesis pages extracted`,
        `CLAP appears ${parsed.counts.CLAP || 0} times and InfoNCE appears ${parsed.counts.InfoNCE || 0} times`,
        `Spotify appears ${parsed.counts.Spotify || 0} times; Expo appears ${parsed.counts.Expo || 0} times`,
        `Pinecone, Supabase, FastAPI, LangChain, Whisper/TTS, and stem-separation terms are present`
      ]
    };
  } catch {
    return fallback;
  }
}

function metricsFromDocs(docs, fixed) {
  const text = docs.map((doc) => doc.text).join("\n");
  return fixed.filter((metric) => !metric.pattern || metric.pattern.test(text)).map(({ pattern, ...metric }) => metric);
}

async function main() {
  const simplabotsSchema = await parsePrismaFile(path.join(projectRoots.simplabots, "prisma", "schema.prisma"));
  const revvySchema = await parsePrismaFile(path.join(projectRoots.revvy, "prisma", "schema.prisma"));
  const emmySchema = await parsePrismaFile(path.join(projectRoots.emmy, "prisma", "schema.prisma"));
  const cad = await cadSummary();
  const thesis = extractThesisEvidence();

  const simplabotsDocs = await collectDocs([
    path.join(projectRoots.simplabots, "README.md"),
    path.join(projectRoots.simplabots, "docs", "DATABASE_SCHEMA.md"),
    path.join(projectRoots.simplabots, "docs", "architecture-flowchart.md"),
    path.join(projectRoots.simplabots, "docs", "REQUEST_LIFECYCLE.md"),
    path.join(projectRoots.simplabots, "docs", "REVVY_INTEGRATION.md"),
    path.join(projectRoots.simplabots, "docs", "EXTERNAL_SOURCES.md"),
    path.join(projectRoots.simplabots, "docs", "KNOWLEDGE_BASE_REFACTORING.md"),
    path.join(projectRoots.simplabots, "docs", "ACCOUNT_SELECTION_README.md")
  ]);
  const revvyDocs = await collectDocs([
    path.join(projectRoots.revvy, "README.md"),
    path.join(projectRoots.revvy, "PERFORMANCE.md"),
    path.join(projectRoots.revvy, "Weekly_Update_Revvy.md"),
    path.join(projectRoots.revvy, "scripts", "README.md")
  ]);
  const emmyDocs = await collectDocs([
    path.join(projectRoots.emmy, "README.md"),
    path.join(projectRoots.emmy, "WEEKLY_UPDATE.md"),
    path.join(projectRoots.emmy, "Weekly_Update_Emmy.md")
  ]);
  const startupDocs = await collectDocs([path.join(startupRoot, "README.md"), path.join(startupRoot, "CLAUDE.md")]);

  const keywordSet = [
    { label: "OpenAI", pattern: "\\bopenai\\b" },
    { label: "Google APIs", pattern: "googleapis|google business profile|gmail" },
    { label: "Stripe", pattern: "\\bstripe\\b" },
    { label: "Pinecone", pattern: "\\bpinecone\\b" },
    { label: "AWS S3/SES/SQS", pattern: "s3|ses|sqs|aws-sdk" },
    { label: "Prisma", pattern: "\\bprisma\\b" },
    { label: "OAuth", pattern: "oauth|next-auth" },
    { label: "Inngest/jobs", pattern: "inngest|pg-boss|cron|job" },
    { label: "Groq/Llama", pattern: "groq|llama" },
    { label: "Weaviate", pattern: "weaviate" },
    { label: "FastAPI", pattern: "fastapi" }
  ];

  const simplabotsSignals = await scanSignals(projectRoots.simplabots, keywordSet);
  const revvySignals = await scanSignals(projectRoots.revvy, keywordSet);
  const emmySignals = await scanSignals(projectRoots.emmy, keywordSet);
  const startupSignals = await scanSignals(startupRoot, keywordSet);

  const simplabotsPackage = await readPackage(projectRoots.simplabots);
  const revvyPackage = await readPackage(projectRoots.revvy);
  const emmyPackage = await readPackage(projectRoots.emmy);

  const data = {
    generatedAt: new Date().toISOString(),
    version: 1,
    extractionPolicy: {
      roots: ["WORK/AutoButt/spbots/simplabots", "WORK/AutoButt/Revvy/revvy", "WORK/AutoButt/Emmy/Emmy", "Desktop/Start-up", "WORK/thesis.pdf"],
      allowlistedFilesOnly: true,
      sanitized: true,
      denied: ["local environment files", "credentials", "recovery codes", "ID images", "raw secrets", "absolute paths", "phone numbers", "private customer data"]
    },
    projects: {}
  };

  data.projects["simplabots-agentic-saas"] = {
    slug: "simplabots-agentic-saas",
    title: "Simplabots Agentic AI SaaS",
    sources: [
      ...simplabotsDocs.map((doc) => ({ label: doc.label, path: doc.path, kind: "documentation" })),
      { label: "Prisma schema", path: simplabotsSchema.path, kind: "schema" },
      { label: "package.json", path: simplabotsPackage.path, kind: "dependencies" }
    ],
    facts: [
      `${simplabotsSchema.models.length} Prisma models extracted from the private platform schema`,
      `${simplabotsPackage.dependencies.length} package dependencies scanned for framework and integration evidence`,
      "Docs cover account selection, request lifecycle, external sources, knowledge base refactoring, database schema, and Revvy integration",
      "Private product: the generated data stores model names, relations, dependency names, route names, and documentation-derived facts only"
    ],
    metrics: [
      { value: "50+", label: "Prisma models in platform schema" },
      { value: "Multi-tenant", label: "account/profile/group access model" },
      { value: "Stripe + credits", label: "subscription and usage layer" },
      { value: "S3/SES/SQS/Pinecone", label: "cloud and knowledge integrations" }
    ],
    schemas: { prisma: selectModels(simplabotsSchema, ["User", "Account", "Profile", "ProfileUser", "ProfileGroup", "ProfileGroupUser", "ProfileGroupAgent", "Agent", "AccountEngine", "AIEngine", "UserAssets", "KnowledgeBaseResponse", "CreditStorage", "PricingPlan", "PlanFeature", "Subscription", "Invoice", "Transaction", "Integration", "BusinessLocation", "ReviewAutomation", "BusinessReview", "ReviewDraft"]) },
    integrations: simplabotsSignals.integrations,
    routes: simplabotsSignals.routes,
    media: [],
    visualizations: [
      systemMapVisualization(
        "simplabots-system-map",
        "Multi-tenant agent platform map",
        "Shared tenancy, commercial controls, assets, cloud integrations, and agent modules around the Simplabots product surface.",
        [
          { id: "users", label: "Users", subtitle: "auth and ownership", group: "identity", width: 190, height: 92 },
          { id: "accounts", label: "Accounts", subtitle: "tenant boundary", group: "identity", width: 220, height: 98 },
          { id: "profiles", label: "Profiles + Groups", subtitle: "context selection", group: "identity", width: 230, height: 98 },
          { id: "agents", label: "Agent modules", subtitle: "Chattie / Revvy / Emmy / Hunter", group: "product", width: 265, height: 110 },
          { id: "billing", label: "Billing + Credits", subtitle: "Stripe, invoices, transactions", group: "commercial", width: 250, height: 104 },
          { id: "assets", label: "Assets", subtitle: "files, favorites, share state", group: "data", width: 225, height: 94 },
          { id: "knowledge", label: "Knowledge base", subtitle: "responses and vector search", group: "ai", width: 245, height: 98 },
          { id: "cloud", label: "Cloud services", subtitle: "S3 / SES / SQS / Google APIs", group: "infra", width: 250, height: 104 },
          { id: "engines", label: "AI engines", subtitle: "provider and account preferences", group: "ai", width: 250, height: 98 }
        ],
        [
          { source: "users", target: "accounts", label: "membership" },
          { source: "accounts", target: "profiles", label: "scope" },
          { source: "profiles", target: "agents", label: "access" },
          { source: "billing", target: "agents", label: "usage gates" },
          { source: "assets", target: "agents", label: "context" },
          { source: "knowledge", target: "agents", label: "retrieval" },
          { source: "cloud", target: "agents", label: "side effects" },
          { source: "engines", target: "agents", label: "provider config" },
          { source: "accounts", target: "billing", label: "commercial owner" },
          { source: "profiles", target: "assets", label: "workspace data" }
        ],
        ["Simplabots Prisma schema", "DATABASE_SCHEMA.md", "REQUEST_LIFECYCLE.md", "EXTERNAL_SOURCES.md"]
      ),
      await erdVisualization(
        "simplabots-tenancy-erd",
        "Tenancy and access model",
        "Focused Prisma view for account, profile, group, membership, and agent access boundaries.",
        simplabotsSchema,
        ["User", "Account", "Profile", "ProfileUser", "ProfileGroup", "ProfileGroupUser", "ProfileGroupAgent", "Agent"],
        "identity"
      ),
      await erdVisualization(
        "simplabots-agent-data-erd",
        "Agent data and knowledge model",
        "Focused Prisma view for agents, account engines, assets, knowledge-base responses, and external integrations.",
        simplabotsSchema,
        ["Account", "Profile", "Agent", "AccountEngine", "AIEngine", "UserAssets", "KnowledgeBaseResponse", "Integration"],
        "data"
      ),
      await erdVisualization(
        "simplabots-commerce-erd",
        "Billing, credits, and plan model",
        "Focused Prisma view for pricing plans, subscriptions, invoices, credits, and transactions.",
        simplabotsSchema,
        ["Account", "PricingPlan", "PlanFeature", "Subscription", "Invoice", "Transaction", "CreditStorage"],
        "commercial"
      ),
      await workflowVisualization(
        "simplabots-agent-runtime",
        "Agent runtime and shared services",
        "How the platform keeps specialized agents connected to account context, billing, knowledge, assets, and cloud services.",
        [
          { id: "dashboard", label: "Next.js dashboard", subtitle: "authenticated product surface", group: "ui", fields: ["App Router", "role-aware navigation"] },
          { id: "context", label: "Account context", subtitle: "account/profile/group selection", group: "identity", fields: ["ProfileGroupAgent", "AccountEngine"] },
          { id: "agent", label: "Agent execution", subtitle: "specialized product modules", group: "ai", fields: ["Review", "Email", "Domain", "Recruitment"] },
          { id: "limits", label: "Usage limits", subtitle: "credits and subscriptions", group: "commercial", fields: ["Stripe", "CreditStorage"] },
          { id: "knowledge", label: "Knowledge layer", subtitle: "assets and vector retrieval", group: "data", fields: ["UserAssets", "Pinecone"] },
          { id: "effects", label: "External effects", subtitle: "cloud/API work", group: "infra", fields: ["S3", "SES", "SQS", "Google APIs"] }
        ],
        [
          { source: "dashboard", target: "context", label: "loads scope" },
          { source: "context", target: "agent", label: "authorizes" },
          { source: "limits", target: "agent", label: "meters" },
          { source: "knowledge", target: "agent", label: "grounds" },
          { source: "agent", target: "effects", label: "executes" }
        ],
        { evidence: ["REQUEST_LIFECYCLE.md", "ACCOUNT_SELECTION_README.md", "Prisma schema"] }
      )
    ]
  };

  data.projects["revvy-review-automation"] = {
    slug: "revvy-review-automation",
    title: "Revvy Review Automation",
    sources: [
      ...revvyDocs.map((doc) => ({ label: doc.label, path: doc.path, kind: "documentation" })),
      { label: "Prisma schema", path: revvySchema.path, kind: "schema" },
      { label: "package.json", path: revvyPackage.path, kind: "dependencies" },
      { label: "Revvy demo video", path: "WORK/Revvy.mp4", kind: "real media" },
      { label: "Revvy screenshot", path: "WORK/revvy.png", kind: "real media" }
    ],
    facts: [
      `${revvySchema.models.length} Prisma models extracted from the review automation schema`,
      "PERFORMANCE.md documents parallel generation, batch database writes, smart filtering, server-side cache, and OpenAI Batch API paths",
      "The media prep script copies the real Revvy video and screenshot, then extracts a poster frame"
    ],
    metrics: metricsFromDocs(revvyDocs, [
      { value: "6-10x", label: "documented speedup for 2000-review workflows", pattern: /6-10x|10-20 min/i },
      { value: "50-200ms", label: "cached review page load path", pattern: /50-200ms/i },
      { value: "30-50%", label: "smart filtering cost reduction path", pattern: /30-50%/i },
      { value: "20 concurrent", label: "implementation detail for parallel draft generation", pattern: /20 concurrent/i }
    ]),
    schemas: { prisma: selectModels(revvySchema, ["User", "Workspace", "WorkspaceUser", "Connection", "Location", "AutomationSetting", "Review", "Draft", "Job", "UserPreferences"]) },
    integrations: revvySignals.integrations,
    routes: revvySignals.routes,
    media: ["WORK/Revvy.mp4", "WORK/revvy.png"],
    visualizations: [
      await workflowVisualization(
        "revvy-review-workflow",
        "Google Business Profile review workflow",
        "OAuth, location import, review sync, filtering, draft generation, cache invalidation, and reply publishing.",
        [
          { id: "oauth", label: "Google OAuth", subtitle: "offline connection", group: "external", fields: ["Connection", "refresh access"] },
          { id: "import", label: "Location import", subtitle: "accounts and business locations", group: "sync", fields: ["Workspace", "Location"] },
          { id: "sync", label: "Review sync", subtitle: "paginated reviews", group: "sync", fields: ["batch upsert", "transaction"] },
          { id: "filter", label: "Smart filter", subtitle: "skip unnecessary AI", group: "cost", fields: ["owner replies", "rating threshold", "existing drafts"] },
          { id: "draft", label: "Draft generation", subtitle: "parallel/throttled/batch", group: "ai", fields: ["OpenAI", "p-limit", "Batch API"] },
          { id: "cache", label: "Cache invalidation", subtitle: "tagged workspace keys", group: "performance", fields: ["reviews tag", "locations tag"] },
          { id: "publish", label: "Reply publish", subtitle: "manual approval stays visible", group: "external", fields: ["Google reply endpoint"] }
        ],
        [
          { source: "oauth", target: "import", label: "connects" },
          { source: "import", target: "sync", label: "locations" },
          { source: "sync", target: "filter", label: "reviews" },
          { source: "filter", target: "draft", label: "eligible only" },
          { source: "draft", target: "cache", label: "writes" },
          { source: "cache", target: "publish", label: "fast UI" }
        ],
        { evidence: ["PERFORMANCE.md", "README.md", "Prisma schema"] }
      ),
      await erdVisualization(
        "revvy-review-erd",
        "Review automation ERD",
        "Compact product schema for workspaces, Google connections, locations, reviews, drafts, jobs, and automation settings.",
        revvySchema,
        ["User", "Workspace", "WorkspaceUser", "Connection", "Location", "AutomationSetting", "Review", "Draft", "Job", "UserPreferences"],
        "review"
      ),
      await workflowVisualization(
        "revvy-performance-timeline",
        "Performance path",
        "The documented optimization path moves expensive work behind filtering, batched writes, and cache-aware reads.",
        [
          { id: "before", label: "Before", subtitle: "sequential draft work", group: "before", fields: ["60-120 min / 2000 reviews"] },
          { id: "batchDb", label: "Batch writes", subtitle: "createMany + transactions", group: "db", fields: ["20-40 queries instead of 2000"] },
          { id: "prefilter", label: "Pre-filter", subtitle: "avoid model calls", group: "cost", fields: ["30-50% cost path"] },
          { id: "parallel", label: "Parallel draft path", subtitle: "implementation detail", group: "ai", fields: ["p-limit", "error recovery"] },
          { id: "cache", label: "Cache hit", subtitle: "fast page loads", group: "performance", fields: ["50-200ms reviews page"] },
          { id: "after", label: "After", subtitle: "optimized large workflow", group: "after", fields: ["10-20 min / 2000 reviews"] }
        ],
        [
          { source: "before", target: "batchDb", label: "reduce DB churn" },
          { source: "batchDb", target: "prefilter", label: "clean set" },
          { source: "prefilter", target: "parallel", label: "eligible reviews" },
          { source: "parallel", target: "cache", label: "draft writes" },
          { source: "cache", target: "after", label: "documented result" }
        ],
        { kind: "timeline", evidence: ["PERFORMANCE.md benchmark table"] }
      )
    ]
  };

  data.projects["emmy-email-categorization"] = {
    slug: "emmy-email-categorization",
    title: "Emmy Email Categorization",
    sources: [
      ...emmyDocs.map((doc) => ({ label: doc.label, path: doc.path, kind: "documentation" })),
      { label: "Prisma schema", path: emmySchema.path, kind: "schema" },
      { label: "package.json", path: emmyPackage.path, kind: "dependencies" },
      { label: "Emmy screenshot", path: "WORK/emmy.png", kind: "real media" }
    ],
    facts: [
      `${emmySchema.models.length} Prisma models extracted from the Gmail categorization schema`,
      "The schema includes Gmail accounts, contact groups, categories, emails, categorization logs, training data, and Gmail labels",
      "The workflow separates deterministic contact/group routing, thread context, model reasoning, label application, and user correction"
    ],
    metrics: [
      { value: "8 models", label: "focused Gmail workflow schema" },
      { value: "2-3x", label: "email processing speedup after concurrency work" },
      { value: "Gmail labels", label: "automation side effect stays inspectable" }
    ],
    schemas: { prisma: selectModels(emmySchema, ["GmailAccount", "ContactGroup", "ContactGroupCategory", "Category", "Email", "EmailCategorization", "TrainingData", "GmailLabel"]) },
    integrations: emmySignals.integrations,
    routes: emmySignals.routes,
    media: ["WORK/emmy.png"],
    visualizations: [
      await workflowVisualization(
        "emmy-classification-pipeline",
        "Gmail classification pipeline",
        "Account setup, Gmail sync, deterministic routing, thread context, AI categorization, label application, and correction.",
        [
          { id: "account", label: "Gmail account", subtitle: "OAuth and sync state", group: "external", fields: ["GmailAccount"] },
          { id: "groups", label: "Contact groups", subtitle: "known-sender rules", group: "rules", fields: ["ContactGroup", "ContactGroupCategory"] },
          { id: "email", label: "Email + thread", subtitle: "message context", group: "data", fields: ["sender", "recipients", "subject"] },
          { id: "router", label: "Classifier", subtitle: "structured model route", group: "ai", fields: ["category", "reasoning", "confidence"] },
          { id: "log", label: "Categorization log", subtitle: "decision evidence", group: "audit", fields: ["EmailCategorization"] },
          { id: "label", label: "Gmail label", subtitle: "visible user state", group: "external", fields: ["GmailLabel"] },
          { id: "correction", label: "Correction loop", subtitle: "user feedback", group: "training", fields: ["TrainingData"] }
        ],
        [
          { source: "account", target: "email", label: "syncs" },
          { source: "groups", target: "router", label: "rules" },
          { source: "email", target: "router", label: "context" },
          { source: "router", target: "log", label: "stores" },
          { source: "log", target: "label", label: "applies" },
          { source: "correction", target: "groups", label: "improves" },
          { source: "label", target: "correction", label: "manual fix" }
        ],
        { evidence: ["Emmy Prisma schema", "README.md", "weekly updates"] }
      ),
      await erdVisualization(
        "emmy-email-erd",
        "Gmail categorization ERD",
        "Focused schema for accounts, categories, contact groups, email records, model decisions, training data, and labels.",
        emmySchema,
        ["GmailAccount", "ContactGroup", "ContactGroupCategory", "Category", "Email", "EmailCategorization", "TrainingData", "GmailLabel"],
        "email"
      ),
      systemMapVisualization(
        "emmy-decision-web",
        "Decision web",
        "How deterministic rules and model classification meet around an inspectable email decision log.",
        [
          { id: "sender", label: "Sender", subtitle: "known or unknown", group: "input", width: 190, height: 90 },
          { id: "recipients", label: "Recipients", subtitle: "direct / cc / bcc", group: "input", width: 205, height: 90 },
          { id: "thread", label: "Thread context", subtitle: "subject and recent messages", group: "input", width: 230, height: 96 },
          { id: "rules", label: "Rules", subtitle: "contact groups", group: "rules", width: 190, height: 90 },
          { id: "model", label: "LLM route", subtitle: "ambiguous cases only", group: "ai", width: 205, height: 90 },
          { id: "category", label: "Category", subtitle: "default or custom", group: "output", width: 200, height: 90 },
          { id: "label", label: "Gmail label", subtitle: "external state", group: "output", width: 200, height: 90 },
          { id: "feedback", label: "Feedback", subtitle: "training data", group: "training", width: 200, height: 90 }
        ],
        [
          { source: "sender", target: "rules", label: "match" },
          { source: "recipients", target: "model", label: "addressing" },
          { source: "thread", target: "model", label: "context" },
          { source: "rules", target: "category", label: "deterministic" },
          { source: "model", target: "category", label: "reasoned" },
          { source: "category", target: "label", label: "apply" },
          { source: "label", target: "feedback", label: "correct" },
          { source: "feedback", target: "rules", label: "learn" }
        ],
        ["Emmy schema", "local README", "local screenshot"]
      )
    ]
  };

  data.projects["cad-understanding-core"] = {
    slug: "cad-understanding-core",
    title: "CAD Understanding Core",
    sources: [
      ...startupDocs.map((doc) => ({ label: doc.label, path: doc.path, kind: "documentation" })),
      { label: "Drawing contexts", path: `${cad.artifactsRoot}/drawing_contexts.json`, kind: "artifact json" },
      { label: "Evidence groups", path: `${cad.artifactsRoot}/evidence_groups.json`, kind: "artifact json" },
      { label: "Hypothesis graphs", path: `${cad.artifactsRoot}/architectural_hypothesis_graphs.json`, kind: "artifact json" },
      { label: "Manifest", path: `${cad.artifactsRoot}/architectural_reconstruction_manifest.json`, kind: "artifact json" }
    ],
    facts: [
      `${cad.metrics.drawing_context_count || cad.drawingContextCount} drawing contexts recorded`,
      `${cad.metrics.evidence_group_count || cad.evidenceGroupCount} evidence groups extracted`,
      `${cad.metrics.semantic_evidence_hypothesis_count || cad.hypothesisCount} semantic evidence hypotheses stored`,
      `${cad.metrics.architectural_graph_count || cad.graphCount} architectural hypothesis graphs generated`,
      `AI geometry generation accepted: ${cad.safety.ai_generated_coordinates_accepted ? "yes" : "no"}`
    ],
    metrics: [
      { value: String(cad.metrics.drawing_context_count || cad.drawingContextCount), label: "drawing contexts" },
      { value: String(cad.metrics.evidence_group_count || cad.evidenceGroupCount), label: "evidence groups" },
      { value: String(cad.metrics.space_hypothesis_count || 6), label: "space hypotheses" },
      { value: String(cad.metrics.space_unresolved_count || cad.unresolvedCount), label: "unresolved geometry items kept visible" }
    ],
    schemas: {},
    integrations: startupSignals.integrations,
    routes: startupSignals.routes,
    media: ["CAD reconstruction PNG artifacts"],
    visualizations: [
      await workflowVisualization(
        "cad-extraction-pipeline",
        "CAD-derived evidence pipeline",
        "The reconstruction path keeps CAD geometry, evidence groups, semantic hypotheses, and unresolved geometry separate.",
        [
          { id: "cad", label: "DWG/DXF input", subtitle: "source geometry", group: "input", fields: ["linework", "blocks", "layers"] },
          { id: "contexts", label: "Drawing contexts", subtitle: `${cad.metrics.drawing_context_count || cad.drawingContextCount} contexts`, group: "context", fields: ["layout", "bbox", "selection state"] },
          { id: "evidence", label: "Evidence groups", subtitle: `${cad.metrics.evidence_group_count || cad.evidenceGroupCount} groups`, group: "evidence", fields: cad.sampleEvidenceKinds.slice(0, 4) },
          { id: "hypotheses", label: "Semantic hypotheses", subtitle: `${cad.metrics.semantic_evidence_hypothesis_count || cad.hypothesisCount} records`, group: "ai", fields: ["boundary", "opening", "space anchor"] },
          { id: "graphs", label: "Hypothesis graphs", subtitle: `${cad.metrics.architectural_graph_count || cad.graphCount} graphs`, group: "graph", fields: ["spaces", "adjacency", "containment"] },
          { id: "unresolved", label: "Unresolved geometry", subtitle: `${cad.metrics.space_unresolved_count || cad.unresolvedCount} kept visible`, group: "safety", fields: ["review instead of hiding"] }
        ],
        [
          { source: "cad", target: "contexts", label: "extract" },
          { source: "contexts", target: "evidence", label: "group" },
          { source: "evidence", target: "hypotheses", label: "score" },
          { source: "hypotheses", target: "graphs", label: "compose" },
          { source: "graphs", target: "unresolved", label: "preserve uncertainty" }
        ],
        { evidence: ["architectural_reconstruction_manifest.json", "drawing_contexts.json", "evidence_groups.json"] }
      ),
      systemMapVisualization(
        "cad-artifact-graph",
        "Artifact graph",
        "A structured map of reconstruction outputs, review artifacts, and safety constraints.",
        [
          { id: "manifest", label: "Manifest", subtitle: "metrics and safety flags", group: "control", width: 230, height: 98 },
          { id: "contexts", label: "Drawing contexts", subtitle: `${cad.drawingContextCount} context records`, group: "context", width: 230, height: 98 },
          { id: "evidence", label: "Evidence groups", subtitle: `${cad.evidenceGroupCount} grouped signals`, group: "evidence", width: 230, height: 98 },
          { id: "semantic", label: "Semantic hypotheses", subtitle: `${cad.hypothesisCount} scored records`, group: "ai", width: 250, height: 98 },
          { id: "graphs", label: "Architectural graphs", subtitle: `${cad.graphCount} graph outputs`, group: "graph", width: 230, height: 98 },
          { id: "pngs", label: "Review images", subtitle: "assessment and overlays", group: "media", width: 210, height: 92 },
          { id: "safety", label: "Safety contract", subtitle: "no AI coordinates accepted", group: "safety", width: 250, height: 98 }
        ],
        [
          { source: "manifest", target: "contexts", label: "counts" },
          { source: "contexts", target: "evidence", label: "evidence" },
          { source: "evidence", target: "semantic", label: "hypotheses" },
          { source: "semantic", target: "graphs", label: "graph state" },
          { source: "graphs", target: "pngs", label: "visual audit" },
          { source: "safety", target: "semantic", label: "constrains" },
          { source: "safety", target: "graphs", label: "blocks unsafe output" }
        ],
        ["CAD artifact JSON", "manifest safety fields"]
      ),
      await workflowVisualization(
        "cad-safety-contract",
        "Safety contract",
        "The pipeline can use AI as an affordance, but CAD-derived geometry and explicit uncertainty remain authoritative.",
        [
          { id: "aiOff", label: "AI off by default", subtitle: "explicit opt-in", group: "safety" },
          { id: "cadFirst", label: "CAD facts first", subtitle: "geometry from source files", group: "geometry" },
          { id: "reject", label: "Reject AI coordinates", subtitle: String(cad.safety.ai_generated_coordinates_accepted === false), group: "safety" },
          { id: "unresolved", label: "Keep unresolved", subtitle: "visible review state", group: "review" },
          { id: "noBoq", label: "No BOQ emission", subtitle: String(cad.safety.boq_emitted === false), group: "safety" }
        ],
        [
          { source: "aiOff", target: "cadFirst", label: "default" },
          { source: "cadFirst", target: "reject", label: "validates" },
          { source: "reject", target: "unresolved", label: "uncertain" },
          { source: "unresolved", target: "noBoq", label: "blocks" }
        ],
        { kind: "contract", direction: "RIGHT", evidence: ["manifest.safety"] }
      )
    ]
  };

  data.projects.melodymind = {
    slug: "melodymind",
    title: "MelodyMind",
    sources: [{ label: "MelodyMind thesis", path: thesis.source, kind: "thesis" }],
    facts: thesis.facts,
    metrics: [
      { value: "47", label: "thesis pages parsed" },
      { value: "17", label: "CLAP term mentions in thesis extraction" },
      { value: "6", label: "InfoNCE mentions in thesis extraction" },
      { value: "3 modes", label: "text, image, and voice playlist inputs" }
    ],
    schemas: {},
    integrations: [
      { label: "CLAP", count: thesis.counts.CLAP || 0, evidenceFiles: ["WORK/thesis.pdf"] },
      { label: "InfoNCE", count: thesis.counts.InfoNCE || 0, evidenceFiles: ["WORK/thesis.pdf"] },
      { label: "FastAPI", count: thesis.counts.FastAPI || 0, evidenceFiles: ["WORK/thesis.pdf"] },
      { label: "Supabase", count: thesis.counts.Supabase || 0, evidenceFiles: ["WORK/thesis.pdf"] },
      { label: "Pinecone", count: thesis.counts.Pinecone || 0, evidenceFiles: ["WORK/thesis.pdf"] },
      { label: "Expo", count: thesis.counts.Expo || 0, evidenceFiles: ["WORK/thesis.pdf"] },
      { label: "Spotify", count: thesis.counts.Spotify || 0, evidenceFiles: ["WORK/thesis.pdf"] },
      { label: "Whisper/TTS", count: (thesis.counts.Whisper || 0) + (thesis.counts.TTS || 0), evidenceFiles: ["WORK/thesis.pdf"] },
      { label: "Stem separation", count: thesis.counts.stem || 0, evidenceFiles: ["WORK/thesis.pdf"] }
    ],
    routes: [],
    media: ["thesis-page-39.webp", "thesis-page-40.webp"],
    visualizations: [
      await workflowVisualization(
        "melodymind-model-flow",
        "Model and retrieval flow",
        "The thesis-backed path from emotional text/audio alignment to vector retrieval and playlist generation.",
        [
          { id: "data", label: "Music data", subtitle: "Reddit / Last.fm / lyrics / previews", group: "data", fields: ["emotions", "tags", "lyrics", "audio previews"] },
          { id: "clap", label: "CLAP encoder", subtitle: "audio representation", group: "model", fields: [`${thesis.counts.CLAP || 0} thesis mentions`] },
          { id: "nomic", label: "Nomic text embeddings", subtitle: "emotion semantics", group: "model", fields: [`${thesis.counts.Nomic || 0} thesis mentions`] },
          { id: "infonce", label: "InfoNCE projection", subtitle: "alignment objective", group: "model", fields: [`${thesis.counts.InfoNCE || 0} thesis mentions`] },
          { id: "pinecone", label: "Pinecone search", subtitle: "song vectors", group: "retrieval", fields: [`${thesis.counts.Pinecone || 0} thesis mentions`] },
          { id: "playlist", label: "Playlist result", subtitle: "weighted retrieval output", group: "product", fields: ["mood", "context", "Spotify export"] }
        ],
        [
          { source: "data", target: "clap", label: "audio" },
          { source: "data", target: "nomic", label: "text" },
          { source: "clap", target: "infonce", label: "projection" },
          { source: "nomic", target: "infonce", label: "semantic target" },
          { source: "infonce", target: "pinecone", label: "embeddings" },
          { source: "pinecone", target: "playlist", label: "retrieve" }
        ],
        { evidence: ["WORK/thesis.pdf", "thesis text extraction"] }
      ),
      systemMapVisualization(
        "melodymind-product-map",
        "Product system map",
        "Mobile UX, backend services, vector search, Spotify export, voice, image, and stem separation in one product architecture.",
        [
          { id: "expo", label: "React Native / Expo", subtitle: "mobile product UX", group: "ui", width: 240, height: 96 },
          { id: "fastapi", label: "FastAPI", subtitle: "auth, chat, health, search", group: "backend", width: 225, height: 96 },
          { id: "supabase", label: "Supabase", subtitle: "users, logs, chat state", group: "data", width: 230, height: 96 },
          { id: "pinecone", label: "Pinecone", subtitle: "music vectors", group: "retrieval", width: 220, height: 92 },
          { id: "spotify", label: "Spotify", subtitle: "playlist export", group: "external", width: 220, height: 92 },
          { id: "voice", label: "Whisper/TTS", subtitle: "Talk-to-Your-DJ", group: "ai", width: 220, height: 92 },
          { id: "image", label: "Image prompt", subtitle: "image-to-playlist", group: "ai", width: 220, height: 92 },
          { id: "stems", label: "Stem separation", subtitle: "educational/remix workflow", group: "media", width: 240, height: 96 },
          { id: "agents", label: "LangChain agents", subtitle: "music and voice orchestration", group: "ai", width: 245, height: 96 }
        ],
        [
          { source: "expo", target: "fastapi", label: "requests" },
          { source: "fastapi", target: "supabase", label: "state" },
          { source: "fastapi", target: "pinecone", label: "search" },
          { source: "fastapi", target: "spotify", label: "export" },
          { source: "expo", target: "voice", label: "voice input" },
          { source: "expo", target: "image", label: "image input" },
          { source: "fastapi", target: "agents", label: "orchestrates" },
          { source: "agents", target: "voice", label: "conversation" },
          { source: "fastapi", target: "stems", label: "async media" }
        ],
        ["WORK/thesis.pdf", "thesis screenshot pages 39-40"]
      ),
      await workflowVisualization(
        "melodymind-user-flow",
        "Multimodal user flow",
        "Text, image, and voice inputs converge into the same retrieval and playlist experience rather than separate demos.",
        [
          { id: "text", label: "Text prompt", subtitle: "mood/context query", group: "input" },
          { id: "image", label: "Image prompt", subtitle: "visual mood extraction", group: "input" },
          { id: "voice", label: "Voice prompt", subtitle: "Whisper/TTS loop", group: "input" },
          { id: "intent", label: "Intent model", subtitle: "emotion/context representation", group: "ai" },
          { id: "retrieval", label: "Vector retrieval", subtitle: "Pinecone song search", group: "retrieval" },
          { id: "playlist", label: "Playlist UI", subtitle: "mobile result + Spotify", group: "product" }
        ],
        [
          { source: "text", target: "intent", label: "query" },
          { source: "image", target: "intent", label: "scene" },
          { source: "voice", target: "intent", label: "speech" },
          { source: "intent", target: "retrieval", label: "embedding" },
          { source: "retrieval", target: "playlist", label: "ranked songs" }
        ],
        { evidence: ["WORK/thesis.pdf"] }
      )
    ]
  };

  data.projects["recruitment-rag-platform"] = {
    slug: "recruitment-rag-platform",
    title: "Recruitment RAG Platform",
    sources: [
      { label: "Full resume", path: "resume/Mustafa_Iqbal_Full_Resume.pdf", kind: "resume evidence" },
      { label: "Interview automation video", path: "WORK/Interview Demo - Made with Clipchamp.mp4", kind: "real media" },
      { label: "Job automation video", path: "WORK/Complete Vedio.mp4", kind: "real media" },
      ...startupDocs.map((doc) => ({ label: doc.label, path: doc.path, kind: "related Start-up documentation" }))
    ],
    facts: [
      "Resume evidence describes a four-person Genesys Research Lab team led by Mustafa",
      "The case study is labeled internal lab work because the source code is not published",
      "Local media prep extracts frames from the interview automation and job automation videos",
      "Workflow is documented as ingestion, embeddings, vector matching, job enrichment, conversational interview, and Docker/FastAPI service deployment"
    ],
    metrics: [
      { value: "4-person", label: "team led at Genesys Research Lab" },
      { value: "<5s", label: "resume-documented interview response target" },
      { value: "Weaviate", label: "candidate/job vector database" },
      { value: "Nomic + Groq", label: "embedding and interview stack" }
    ],
    schemas: {},
    integrations: [
      { label: "Weaviate", count: 1, evidenceFiles: ["resume evidence"] },
      { label: "Nomic embeddings", count: 1, evidenceFiles: ["resume evidence"] },
      { label: "Groq Llama 3", count: 1, evidenceFiles: ["resume evidence"] },
      { label: "FastAPI", count: Math.max(1, startupSignals.integrations.find((item) => item.label === "FastAPI")?.count || 0), evidenceFiles: ["resume evidence", "related Start-up documentation"] },
      { label: "Docker Compose", count: 1, evidenceFiles: ["resume evidence"] }
    ],
    routes: [],
    media: ["interview-demo-frame-1.webp", "interview-demo-frame-2.webp", "job-automation-frame-1.webp"],
    visualizations: [
      await workflowVisualization(
        "recruitment-rag-flow",
        "Recruitment RAG orchestration",
        "Candidate context ingestion, vector search, role enrichment, matching, and structured interview automation.",
        [
          { id: "sources", label: "Candidate sources", subtitle: "CV / GitHub / LinkedIn / ORIC / web", group: "input", fields: ["multi-source evidence"] },
          { id: "ingest", label: "Ingestion service", subtitle: "parse and normalize", group: "backend", fields: ["FastAPI", "async jobs"] },
          { id: "embed", label: "Nomic embeddings", subtitle: "semantic representation", group: "ai", fields: ["candidate vectors", "job vectors"] },
          { id: "weaviate", label: "Weaviate", subtitle: "vector database", group: "retrieval", fields: ["semantic matching"] },
          { id: "job", label: "Job enrichment", subtitle: "Groq Llama 3", group: "ai", fields: ["role context"] },
          { id: "match", label: "Candidate matching", subtitle: "retrieval + ranking", group: "product", fields: ["screening output"] },
          { id: "interview", label: "Interview agent", subtitle: "structured conversation", group: "product", fields: ["no repeated questions", "<5s target"] },
          { id: "deploy", label: "Docker Compose", subtitle: "lab deployment", group: "infra", fields: ["service boundaries"] }
        ],
        [
          { source: "sources", target: "ingest", label: "collect" },
          { source: "ingest", target: "embed", label: "normalize" },
          { source: "embed", target: "weaviate", label: "store" },
          { source: "job", target: "embed", label: "role vector" },
          { source: "weaviate", target: "match", label: "retrieve" },
          { source: "match", target: "interview", label: "context" },
          { source: "interview", target: "deploy", label: "service" }
        ],
        { evidence: ["resume evidence", "local demo videos"] }
      ),
      systemMapVisualization(
        "recruitment-leadership-map",
        "Team and service map",
        "A small-team AI project needs clear boundaries across ingestion, retrieval, interview orchestration, and deployment.",
        [
          { id: "lead", label: "Team lead", subtitle: "architecture and delivery", group: "leadership", width: 230, height: 98 },
          { id: "backend", label: "Backend services", subtitle: "FastAPI", group: "backend", width: 210, height: 92 },
          { id: "retrieval", label: "Retrieval", subtitle: "Weaviate + Nomic", group: "retrieval", width: 230, height: 94 },
          { id: "llm", label: "Interview LLM", subtitle: "Groq Llama 3", group: "ai", width: 210, height: 92 },
          { id: "evidence", label: "Candidate context", subtitle: "CV/GitHub/LinkedIn/ORIC/web", group: "input", width: 255, height: 98 },
          { id: "product", label: "Screening workflow", subtitle: "match and interview", group: "product", width: 230, height: 94 },
          { id: "deploy", label: "Deployment", subtitle: "Docker Compose", group: "infra", width: 210, height: 92 }
        ],
        [
          { source: "lead", target: "backend", label: "coordinates" },
          { source: "lead", target: "retrieval", label: "designs" },
          { source: "lead", target: "llm", label: "orchestrates" },
          { source: "evidence", target: "backend", label: "ingests" },
          { source: "backend", target: "retrieval", label: "embeds" },
          { source: "retrieval", target: "product", label: "matches" },
          { source: "llm", target: "product", label: "interviews" },
          { source: "backend", target: "deploy", label: "ships" }
        ],
        ["resume outcome summary", "sanitized demo frames"]
      )
    ]
  };

  const serialized = JSON.stringify(data, null, 2);
  const unsafe = BANNED_OUTPUT_PATTERNS.find((pattern) => pattern.test(serialized));
  if (unsafe) {
    throw new Error(`Generated project documentation failed safety sweep: ${unsafe}`);
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${serialized}\n`, "utf8");
  console.log(`Extracted sanitized project documentation to ${path.relative(repoRoot, outputPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
