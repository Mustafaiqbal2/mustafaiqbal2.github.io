"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps
} from "@xyflow/react";
import { Maximize2, X } from "lucide-react";
import { CarouselRail } from "@/components/CarouselRail";
import type {
  DocumentationEdge,
  DocumentationField,
  DocumentationNode as SourceNode,
  DocumentationVisualization,
  ProjectDocumentation as ProjectDocumentationType
} from "@/data/project-docs";

type ProjectDocumentationProps = {
  documentation?: ProjectDocumentationType;
};

type GraphNodeData = {
  label: string;
  group: string;
  subtitle?: string;
  detail?: string;
  fields?: DocumentationField[];
  nodeType?: string;
  summary?: string;
  metrics?: string[];
  inspectDetails?: string[];
  cluster?: string;
  faded?: boolean;
  preview?: boolean;
  mobile?: boolean;
};

type GraphNode = Node<GraphNodeData, "documentation">;
type GraphEdge = Edge<{ label?: string; faded?: boolean }>;

const groupLabels: Record<string, string> = {
  ai: "AI",
  audit: "Audit",
  backend: "Backend",
  before: "Before",
  commercial: "Commercial",
  context: "Context",
  control: "Control",
  cost: "Cost",
  data: "Data",
  db: "Database",
  evidence: "Evidence",
  external: "External",
  geometry: "Geometry",
  graph: "Graph",
  identity: "Identity",
  infra: "Infra",
  input: "Input",
  leadership: "Leadership",
  media: "Media",
  model: "Model",
  output: "Output",
  performance: "Performance",
  platform: "Platform",
  product: "Product",
  retrieval: "Retrieval",
  review: "Review",
  rules: "Rules",
  safety: "Safety",
  sync: "Sync",
  training: "Training",
  ui: "UI",
  workflow: "Workflow"
};

const groupColorNames = [
  "teal",
  "violet",
  "sky",
  "amber",
  "rose",
  "slate",
  "green",
  "indigo",
  "cyan",
  "orange"
];

type ExplorerCopy = {
  eyebrow: string;
  title: string;
  description: string;
  insights: string[];
};

const defaultExplorerCopy: ExplorerCopy = {
  eyebrow: "Architecture explorer",
  title: "Architecture maps for the implementation.",
  description:
    "Use these views to inspect the product surface, system boundaries, data flow, integrations, and tradeoffs behind the case study.",
  insights: [
    "How the user workflow moves through the system.",
    "Where data is owned, transformed, and persisted.",
    "Which integrations and operational controls make the product reliable."
  ]
};

const explorerCopyBySlug: Record<string, ExplorerCopy> = {
  "simplabots-agentic-saas": {
    eyebrow: "Platform explorer",
    title: "A multi-tenant AI SaaS control plane.",
    description:
      "The maps show how tenancy, agents, billing, credits, assets, vector knowledge, and cloud services fit into one private product platform.",
    insights: [
      "Account, profile, role, and agent access boundaries are modeled as first-class product infrastructure.",
      "Specialized agents share billing, knowledge, assets, usage tracking, and cloud services instead of living as disconnected demos.",
      "Stripe, Pinecone, S3, SES, SQS, and provider APIs sit behind product workflows that need permissions and operational recovery."
    ]
  },
  "revvy-review-automation": {
    eyebrow: "Workflow explorer",
    title: "A review automation workflow built around control and speed.",
    description:
      "Follow the path from Google Business Profile OAuth to review sync, filtering, draft generation, cache invalidation, and reply publishing.",
    insights: [
      "The speedup comes from avoiding unnecessary model work before generation starts.",
      "OAuth, location import, review sync, drafts, and publishing are separated so failures can be handled cleanly.",
      "Manual approval remains visible even when drafts are generated in bulk."
    ]
  },
  "emmy-email-categorization": {
    eyebrow: "Decision explorer",
    title: "An email classification system with inspectable decisions.",
    description:
      "The views connect Gmail sync, contact groups, thread context, structured AI output, labels, logs, and correction loops.",
    insights: [
      "Known senders route through deterministic contact rules before the model is used.",
      "Thread context and categorization logs make ambiguous classifications reviewable.",
      "User corrections feed the product loop through labels, categories, and training records."
    ]
  },
  "cad-understanding-core": {
    eyebrow: "Reconstruction explorer",
    title: "A CAD-first reconstruction system with explicit uncertainty.",
    description:
      "The maps separate geometry extraction, drawing contexts, evidence groups, semantic affordances, safety rules, and review artifacts.",
    insights: [
      "Accepted geometry stays CAD-derived; AI can help interpret affordances but cannot create final coordinates.",
      "Drawing contexts, evidence groups, and unresolved geometry remain visible for review.",
      "The system is designed to preserve uncertainty instead of hiding it behind a confident answer."
    ]
  },
  melodymind: {
    eyebrow: "Product and model explorer",
    title: "A multimodal music product built from a thesis-backed model path.",
    description:
      "The views connect CLAP-InfoNCE alignment, FastAPI services, Pinecone retrieval, Expo mobile UX, voice/image input, Spotify export, and stem separation.",
    insights: [
      "The model work moved from naive lyric/audio experiments toward CLAP audio and emotional text alignment.",
      "Text, image, and voice inputs converge into one playlist-generation workflow.",
      "The product surface includes auth, chat, retrieval, Spotify export, voice, image handling, and analytics."
    ]
  },
  "recruitment-rag-platform": {
    eyebrow: "RAG workflow explorer",
    title: "A recruitment automation workflow with retrieval and interviews.",
    description:
      "The maps show candidate ingestion, embeddings, vector retrieval, job enrichment, interview orchestration, and deployment boundaries.",
    insights: [
      "Candidate data from CV, GitHub, LinkedIn, ORIC, and web sources feeds semantic matching.",
      "Weaviate, Nomic embeddings, Groq Llama 3, FastAPI, and Docker Compose are separated into clear service responsibilities.",
      "The project demonstrates both AI workflow design and small-team technical leadership."
    ]
  }
};

const nodeTypes = {
  documentation: DocumentationFlowNode
};

function readableKind(kind: DocumentationVisualization["kind"]) {
  if (kind === "erd") return "Entity model";
  if (kind === "system-map") return "System map";
  if (kind === "timeline") return "Performance path";
  if (kind === "contract") return "Safety contract";
  return "Workflow";
}

function getExplorerCopy(documentation: ProjectDocumentationType) {
  return explorerCopyBySlug[documentation.slug] || defaultExplorerCopy;
}

function visualizationStats(visualization: DocumentationVisualization) {
  return `${visualization.nodes.length} components / ${visualization.edges.length} relationships`;
}

function insightFor(copy: ExplorerCopy, index: number) {
  return copy.insights[index % copy.insights.length] || "Open the workspace to inspect the implementation.";
}

function normalizeInspectorText(value?: string) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function groupLabel(group?: string) {
  return groupLabels[group || ""] || group || "System";
}

function colorIndex(group?: string) {
  const seed = String(group || "default")
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return seed % groupColorNames.length;
}

function nodeSize(node: SourceNode, preview: boolean, mobile = false) {
  if (preview) {
    return {
      width: node.fields?.length ? 174 : 160,
      height: node.fields?.length ? 92 : 82
    };
  }

  if (mobile) {
    return {
      width: 260,
      height: node.fields?.length ? Math.min(152, Math.max(108, 78 + Math.min(node.fields.length, 3) * 16)) : 102
    };
  }

  if (node.fields?.length) {
    return {
      width: Math.max(node.width || 248, 260),
      height: Math.min(196, Math.max(122, 92 + Math.min(node.fields.length, 4) * 18))
    };
  }

  return {
    width: Math.max(node.width || 220, 220),
    height: Math.max(node.height || 96, 104)
  };
}

function orderedNodes(visualization: DocumentationVisualization) {
  if (visualization.kind === "workflow" || visualization.kind === "timeline" || visualization.kind === "contract") {
    return [...visualization.nodes].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.x - b.x || a.y - b.y);
  }

  if (visualization.kind === "erd") {
    return [...visualization.nodes].sort((a, b) => {
      const groupCompare = (a.cluster || a.group || "").localeCompare(b.cluster || b.group || "");
      return groupCompare || a.label.localeCompare(b.label);
    });
  }

  return [...visualization.nodes].sort((a, b) => a.x - b.x || a.y - b.y);
}

function layoutVisualization(visualization: DocumentationVisualization, preview: boolean, mobile = false) {
  const nodes = orderedNodes(visualization);
  const positioned = new Map<string, SourceNode>();

  if (mobile && !preview) {
    const gapY = 32;
    const marginX = 28;
    const marginY = 30;
    nodes.forEach((node, index) => {
      const size = nodeSize(node, preview, mobile);
      positioned.set(node.id, {
        ...node,
        x: marginX,
        y: marginY + index * (size.height + gapY),
        width: size.width,
        height: size.height
      });
    });
  } else if (visualization.kind === "workflow" || visualization.kind === "timeline" || visualization.kind === "contract") {
    const columns = preview ? Math.min(3, Math.max(2, Math.ceil(nodes.length / 2))) : Math.min(3, Math.max(2, Math.ceil(nodes.length / 2)));
    const gapX = preview ? 44 : 48;
    const gapY = preview ? 54 : 76;
    const marginX = preview ? 28 : 52;
    const marginY = preview ? 28 : 48;
    nodes.forEach((node, index) => {
      const row = Math.floor(index / columns);
      const column = row % 2 === 0 ? index % columns : columns - 1 - (index % columns);
      const size = nodeSize(node, preview, mobile);
      positioned.set(node.id, {
        ...node,
        x: marginX + column * (size.width + gapX),
        y: marginY + row * (size.height + gapY),
        width: size.width,
        height: size.height
      });
    });
  } else if (visualization.kind === "erd") {
    const columns = preview ? 2 : nodes.length > 12 ? 4 : nodes.length > 6 ? 3 : 2;
    const gapX = preview ? 34 : 48;
    const gapY = preview ? 30 : 36;
    const marginX = preview ? 26 : 52;
    const marginY = preview ? 26 : 46;
    nodes.forEach((node, index) => {
      const row = Math.floor(index / columns);
      const column = index % columns;
      const size = nodeSize(node, preview, mobile);
      positioned.set(node.id, {
        ...node,
        x: marginX + column * (size.width + gapX),
        y: marginY + row * (size.height + gapY),
        width: size.width,
        height: size.height
      });
    });
  } else {
    const sourceBounds = graphBounds(visualization.nodes);
    const scale = preview ? 0.58 : 0.94;
    const offsetX = preview ? 18 : 60;
    const offsetY = preview ? 18 : 56;
    visualization.nodes.forEach((node) => {
      const size = nodeSize(node, preview, mobile);
      positioned.set(node.id, {
        ...node,
        x: offsetX + (node.x - sourceBounds.minX) * scale,
        y: offsetY + (node.y - sourceBounds.minY) * scale,
        width: size.width,
        height: size.height
      });
    });
  }

  return visualization.nodes.map((node) => positioned.get(node.id) || node);
}

function graphBounds(nodes: SourceNode[]) {
  if (!nodes.length) {
    return { minX: 0, minY: 0, maxX: 800, maxY: 500 };
  }

  return nodes.reduce(
    (bounds, node) => {
      const size = nodeSize(node, false);
      return {
        minX: Math.min(bounds.minX, node.x),
        minY: Math.min(bounds.minY, node.y),
        maxX: Math.max(bounds.maxX, node.x + size.width),
        maxY: Math.max(bounds.maxY, node.y + size.height)
      };
    },
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
  );
}

function connectedNodeIds(selectedNodeId: string | null, edges: DocumentationEdge[]) {
  if (!selectedNodeId) return new Set<string>();
  const connected = new Set<string>([selectedNodeId]);
  edges.forEach((edge) => {
    if (edge.source === selectedNodeId) connected.add(edge.target);
    if (edge.target === selectedNodeId) connected.add(edge.source);
  });
  return connected;
}

function buildFlowElements(
  visualization: DocumentationVisualization,
  options: {
    preview?: boolean;
    selectedNodeId?: string | null;
    visibleGroups?: Set<string>;
    reducedMotion?: boolean;
    mobile?: boolean;
  } = {}
) {
  const preview = Boolean(options.preview);
  const mobile = Boolean(options.mobile);
  const laidOutNodes = layoutVisualization(visualization, preview, mobile);
  const visibleGroups = options.visibleGroups;
  const visibleNodeIds = new Set(
    laidOutNodes.filter((node) => !visibleGroups || visibleGroups.has(node.group || "other")).map((node) => node.id)
  );
  const connected = connectedNodeIds(options.selectedNodeId || null, visualization.edges);

  const nodes: GraphNode[] = laidOutNodes
    .filter((node) => visibleNodeIds.has(node.id))
    .map((node) => {
      const size = nodeSize(node, preview, mobile);
      const group = node.group || "other";
      const faded = Boolean(options.selectedNodeId && !connected.has(node.id));
      return {
        id: node.id,
        type: "documentation",
        position: { x: node.x, y: node.y },
        width: size.width,
        height: size.height,
        data: {
          label: node.label,
          group,
          subtitle: node.subtitle,
          detail: node.detail,
          fields: node.fields,
          nodeType: node.nodeType || groupLabel(group),
          summary: node.summary || node.detail || node.subtitle,
          metrics: node.metrics || [],
          inspectDetails: node.inspectDetails || [],
          cluster: node.cluster || group,
          faded,
          preview,
          mobile
        },
        draggable: !preview && !mobile,
        selectable: !preview,
        className: faded ? "is-faded" : "",
        style: {
          width: size.width,
          height: size.height,
          ["--node-tone" as string]: `var(--graph-${groupColorNames[colorIndex(group)]})`
        }
      };
    });

  const nodeIdSet = new Set(nodes.map((node) => node.id));
  const edges: GraphEdge[] = visualization.edges
    .filter((edge) => nodeIdSet.has(edge.source) && nodeIdSet.has(edge.target))
    .map((edge, index) => {
      const faded = Boolean(options.selectedNodeId && (!connected.has(edge.source) || !connected.has(edge.target)));
      return {
        id: `${visualization.id}-${edge.source}-${edge.target}-${index}`,
        source: edge.source,
        target: edge.target,
        label: preview ? undefined : edge.label,
        type: visualization.kind === "workflow" || visualization.kind === "timeline" ? "smoothstep" : "default",
        animated: !preview && !options.reducedMotion && !faded,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 16,
          height: 16
        },
        data: { label: edge.label, faded },
        className: faded ? "documentation-edge is-faded" : "documentation-edge",
        style: {
          strokeWidth: preview ? 1.4 : 2,
          opacity: faded ? 0.28 : preview ? 0.42 : 0.74
        }
      };
    });

  return { nodes, edges };
}

function DocumentationFlowNode({ data, selected }: NodeProps<GraphNode>) {
  const fieldCount = data.fields?.length || 0;
  const visibleFields = data.preview || data.mobile ? [] : data.fields?.slice(0, 4) || [];

  return (
    <div className={`documentation-node ${selected ? "is-selected" : ""} ${data.faded ? "is-faded" : ""} ${data.preview ? "is-preview" : ""}`}>
      <Handle type="target" position={data.mobile ? Position.Top : Position.Left} />
      <Handle type="source" position={data.mobile ? Position.Bottom : Position.Right} />
      <div className="documentation-node-topline">
        <span>{groupLabel(data.group)}</span>
        {fieldCount ? <em>{fieldCount} fields</em> : null}
      </div>
      <strong>{data.label}</strong>
      {data.subtitle ? <small>{data.subtitle}</small> : null}
      {visibleFields.length ? (
        <ul>
          {visibleFields.map((field) => (
            <li key={`${field.name}-${field.type}`}>
              <b>{field.name}</b>
              {field.type ? <i>{field.type}</i> : null}
            </li>
          ))}
        </ul>
      ) : null}
      {!data.preview && fieldCount > visibleFields.length ? <p>+{fieldCount - visibleFields.length} more in inspector</p> : null}
    </div>
  );
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
}

function useIsMobileViewport() {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 680px), (pointer: coarse)");
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return mobile;
}

function FitOnChange({ activeKey, mobile = false }: { activeKey: string; mobile?: boolean }) {
  const { fitView } = useReactFlow();

  useEffect(() => {
    if (mobile) return;
    const timer = window.setTimeout(() => {
      fitView({ padding: 0.1, duration: 520, maxZoom: 1.62 });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [activeKey, fitView, mobile]);

  return null;
}

function DocumentationFlowCanvas({
  visualization,
  preview = false,
  selectedNodeId,
  visibleGroups,
  reducedMotion,
  mobile = false,
  onSelectNode
}: {
  visualization: DocumentationVisualization;
  preview?: boolean;
  selectedNodeId?: string | null;
  visibleGroups?: Set<string>;
  reducedMotion?: boolean;
  mobile?: boolean;
  onSelectNode?: (nodeId: string | null) => void;
}) {
  const { nodes, edges } = useMemo(
    () => buildFlowElements(visualization, { preview, selectedNodeId, visibleGroups, reducedMotion, mobile }),
    [mobile, preview, reducedMotion, selectedNodeId, visibleGroups, visualization]
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView={!mobile}
      defaultViewport={mobile ? { x: 18, y: 18, zoom: 0.82 } : undefined}
      fitViewOptions={{ padding: preview ? 0.14 : 0.1, maxZoom: preview ? 1.08 : 1.62 }}
      nodesDraggable={!preview && !mobile}
      nodesConnectable={false}
      elementsSelectable={!preview}
      panOnDrag={!preview}
      zoomOnScroll={!preview && !mobile}
      zoomOnPinch={!preview}
      zoomOnDoubleClick={!preview}
      preventScrolling={!preview}
      proOptions={{ hideAttribution: true }}
      minZoom={mobile ? 0.34 : 0.22}
      maxZoom={mobile ? 1.28 : 1.35}
      onNodeClick={(_, node) => onSelectNode?.(node.id)}
      onPaneClick={() => onSelectNode?.(null)}
      className={preview ? "documentation-flow is-preview" : "documentation-flow"}
    >
      <Background gap={preview ? 26 : 34} size={1} />
      {!preview ? (
        <>
          <Controls position={mobile ? "top-right" : "bottom-left"} showInteractive={false} />
          {!mobile ? (
            <MiniMap
              position="bottom-right"
              pannable
              zoomable
              nodeStrokeWidth={2}
              nodeColor={(node) => String(node.style?.["--node-tone" as keyof typeof node.style] || "var(--primary)")}
            />
          ) : null}
          <FitOnChange activeKey={`${visualization.id}-${Array.from(visibleGroups || []).join(",")}-${selectedNodeId || "none"}`} mobile={mobile} />
        </>
      ) : null}
    </ReactFlow>
  );
}

function VisualizationPreviewCard({
  visualization,
  index,
  insight,
  onOpen
}: {
  visualization: DocumentationVisualization;
  index: number;
  insight: string;
  onOpen: (index: number) => void;
}) {
  const stats = visualizationStats(visualization);

  return (
    <article className="documentation-preview-card">
      <button type="button" className="documentation-preview-button" onClick={() => onOpen(index)} aria-label={`Open ${visualization.title} explorer`}>
        <div className="documentation-preview-meta">
          <span>{readableKind(visualization.kind)}</span>
          <em>{stats}</em>
        </div>
        <h3>{visualization.title}</h3>
        <p>{visualization.description}</p>
        <div className="documentation-preview-canvas" aria-hidden="true">
          <ReactFlowProvider>
            <DocumentationFlowCanvas visualization={visualization} preview />
          </ReactFlowProvider>
        </div>
        <div className="documentation-preview-footer">
          <span>{insight}</span>
          <strong>
            Explore <Maximize2 size={14} aria-hidden="true" />
          </strong>
        </div>
      </button>
    </article>
  );
}

function DocumentationExplorer({
  documentation,
  copy,
  activeIndex,
  onClose,
  onChangeIndex
}: {
  documentation: ProjectDocumentationType;
  copy: ExplorerCopy;
  activeIndex: number;
  onClose: () => void;
  onChangeIndex: (index: number) => void;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const mobileViewport = useIsMobileViewport();
  const visualization = documentation.visualizations[activeIndex];
  const groups = useMemo(() => Array.from(new Set(visualization.nodes.map((node) => node.group || "other"))), [visualization]);
  const [enabledGroups, setEnabledGroups] = useState<Set<string>>(() => new Set(groups));
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    setEnabledGroups(new Set(groups));
    setSelectedNodeId(null);
  }, [groups, visualization]);

  useEffect(() => {
    document.body.classList.add("documentation-explorer-open");
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("documentation-explorer-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const selectedNode = visualization.nodes.find((node) => node.id === selectedNodeId) || null;
  const selectedSummary =
    selectedNode?.summary && selectedNode.summary !== selectedNode.subtitle && selectedNode.summary !== selectedNode.detail
      ? selectedNode.summary
      : null;
  const selectedDetail =
    selectedNode?.detail && selectedNode.detail !== selectedNode.subtitle && selectedNode.detail !== selectedNode.summary
      ? selectedNode.detail
      : null;
  const selectedNoteDenylist = new Set(
    [selectedNode?.subtitle, selectedNode?.summary, selectedNode?.detail].map(normalizeInspectorText).filter(Boolean)
  );
  const selectedNotes =
    selectedNode?.inspectDetails?.filter((item) => !selectedNoteDenylist.has(normalizeInspectorText(item))).slice(0, 5) || [];
  const connectedIds = connectedNodeIds(selectedNode?.id || null, visualization.edges);
  const connectedNodes = selectedNode
    ? visualization.nodes.filter((node) => node.id !== selectedNode.id && connectedIds.has(node.id))
    : [];

  const toggleGroup = useCallback((group: string) => {
    setEnabledGroups((current) => {
      const next = new Set(current);
      if (next.has(group) && next.size > 1) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  }, []);

  return (
    <div className="documentation-explorer-shell" role="dialog" aria-modal="true" aria-label={`${documentation.title} architecture explorer`}>
      <div className="documentation-explorer-backdrop" onClick={onClose} />
      <section className="documentation-explorer-panel">
        <header className="documentation-explorer-header">
          <div>
            <p className="eyebrow">{copy.eyebrow}</p>
            <h2>{copy.title}</h2>
          </div>
          <button type="button" className="documentation-explorer-close" onClick={onClose} aria-label="Close architecture explorer">
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="documentation-explorer-grid">
          <aside className="documentation-explorer-nav" aria-label="Visualization controls">
            <div>
              <span className="documentation-panel-label">Workbook views</span>
              <div className="documentation-view-list">
                {documentation.visualizations.map((item, index) => (
                  <button
                    type="button"
                    key={item.id}
                    className={index === activeIndex ? "is-active" : ""}
                    onClick={() => onChangeIndex(index)}
                  >
                    <span>{readableKind(item.kind)}</span>
                    <strong>{item.title}</strong>
                    <em>
                      {visualizationStats(item)}
                    </em>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="documentation-panel-label">Layers</span>
              <div className="documentation-filter-list">
                {groups.map((group) => (
                  <button
                    type="button"
                    key={group}
                    className={enabledGroups.has(group) ? "is-active" : ""}
                    onClick={() => toggleGroup(group)}
                    style={{ ["--node-tone" as string]: `var(--graph-${groupColorNames[colorIndex(group)]})` }}
                  >
                    <i />
                    {groupLabel(group)}
                  </button>
                ))}
              </div>
            </div>

            <div className="documentation-evidence-list">
              <span className="documentation-panel-label">What to evaluate</span>
              {copy.insights.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </aside>

          <main className="documentation-explorer-canvas">
            <div className="documentation-canvas-title">
              <div>
                <span>{readableKind(visualization.kind)}</span>
                <h3>{visualization.title}</h3>
              </div>
              <p>{visualization.description}</p>
            </div>
            <ReactFlowProvider>
              <DocumentationFlowCanvas
                visualization={visualization}
                selectedNodeId={selectedNodeId}
                visibleGroups={enabledGroups}
                reducedMotion={reducedMotion}
                mobile={mobileViewport}
                onSelectNode={setSelectedNodeId}
              />
            </ReactFlowProvider>
          </main>

          <aside className="documentation-inspector" aria-label="Selected node details">
            {selectedNode ? (
              <>
                <span className="documentation-panel-label">System detail</span>
                <div className="documentation-inspector-card" style={{ ["--node-tone" as string]: `var(--graph-${groupColorNames[colorIndex(selectedNode.group)]})` }}>
                  <span>{selectedNode.nodeType || groupLabel(selectedNode.group)}</span>
                  <h3>{selectedNode.label}</h3>
                  {selectedNode.subtitle ? <p>{selectedNode.subtitle}</p> : null}
                  {selectedSummary ? <p>{selectedSummary}</p> : null}
                  {selectedDetail ? <p>{selectedDetail}</p> : null}
                </div>

                {selectedNode.metrics?.length ? (
                  <div className="documentation-inspector-section">
                    <span className="documentation-panel-label">System signals</span>
                    <div className="documentation-metric-list">
                      {selectedNode.metrics.map((item) => (
                        <span key={item}>{item}</span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {selectedNode.fields?.length ? (
                  <div className="documentation-inspector-section">
                    <span className="documentation-panel-label">Technical signals</span>
                    <ul className="documentation-field-list">
                      {selectedNode.fields.map((field) => (
                        <li key={`${field.name}-${field.type}`}>
                          <b>{field.name}</b>
                          {field.type ? <em>{field.type}</em> : null}
                          {field.flags?.length ? <small>{field.flags.join(", ")}</small> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {selectedNotes.length ? (
                  <div className="documentation-inspector-section">
                    <span className="documentation-panel-label">Implementation notes</span>
                    {selectedNotes.map((item) => (
                      <p key={item}>{item}</p>
                    ))}
                  </div>
                ) : null}

                {connectedNodes.length ? (
                  <div className="documentation-inspector-section">
                    <span className="documentation-panel-label">Connected components</span>
                    <div className="documentation-connected-list">
                      {connectedNodes.slice(0, 8).map((node) => (
                        <button type="button" key={node.id} onClick={() => setSelectedNodeId(node.id)}>
                          {node.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <span className="documentation-panel-label">System detail</span>
                <div className="documentation-inspector-card">
                  <span>{readableKind(visualization.kind)}</span>
                  <h3>Pick a component</h3>
                  <p>Select any entity, workflow step, integration, or control surface to inspect its role, implementation signals, and connected components.</p>
                </div>
                <div className="documentation-inspector-section">
                  <span className="documentation-panel-label">Map summary</span>
                  <p>
                    {visualization.nodes.length} components and {visualization.edges.length} relationships are visible before filtering.
                  </p>
                </div>
              </>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}

export function ProjectDocumentation({ documentation }: ProjectDocumentationProps) {
  const [activeExplorerIndex, setActiveExplorerIndex] = useState<number | null>(null);

  if (!documentation || !documentation.visualizations.length) {
    return null;
  }

  const copy = getExplorerCopy(documentation);

  return (
    <div className="project-documentation-block" data-project-documentation>
      <div className="documentation-summary">
        <div>
          <p className="eyebrow">{copy.eyebrow}</p>
          <h2>{copy.title}</h2>
          <p>{copy.description}</p>
        </div>
        <div className="documentation-facts" aria-label={`${documentation.title} evaluation notes`}>
          {copy.insights.map((fact) => (
            <span key={fact}>{fact}</span>
          ))}
        </div>
      </div>

      <CarouselRail label={`${documentation.title} architecture views`} className="documentation-carousel" itemClassName="documentation-carousel-item">
        {documentation.visualizations.map((visualization, index) => (
          <VisualizationPreviewCard
            visualization={visualization}
            index={index}
            insight={insightFor(copy, index)}
            onOpen={setActiveExplorerIndex}
            key={visualization.id}
          />
        ))}
      </CarouselRail>

      {activeExplorerIndex !== null ? (
        <DocumentationExplorer
          documentation={documentation}
          copy={copy}
          activeIndex={activeExplorerIndex}
          onChangeIndex={setActiveExplorerIndex}
          onClose={() => setActiveExplorerIndex(null)}
        />
      ) : null}
    </div>
  );
}
