import projectDocsJson from "@/data/generated/project-docs.json";

export type DocumentationField = {
  name: string;
  type: string;
  flags?: string[];
};

export type DocumentationNode = {
  id: string;
  label: string;
  subtitle?: string;
  group?: string;
  detail?: string;
  fields?: DocumentationField[];
  nodeType?: string;
  priority?: number;
  lane?: string;
  cluster?: string;
  summary?: string;
  metrics?: string[];
  inspectDetails?: string[];
  x: number;
  y: number;
  width?: number;
  height?: number;
  order?: number;
};

export type DocumentationEdge = {
  source: string;
  target: string;
  label?: string;
  kind?: string;
};

export type DocumentationVisualization = {
  id: string;
  kind: "erd" | "workflow" | "system-map" | "timeline" | "contract";
  title: string;
  description: string;
  layoutPreset?: "layered" | "schema-grid" | "force-map" | "timeline" | "contract";
  width: number;
  height: number;
  nodes: DocumentationNode[];
  edges: DocumentationEdge[];
  evidence: string[];
};

export type ProjectDocumentation = {
  slug: string;
  title: string;
  sources: Array<{ label: string; path: string; kind: string }>;
  facts: string[];
  metrics: Array<{ value: string; label: string }>;
  integrations: Array<{ label: string; count: number; evidenceFiles: string[] }>;
  routes: string[];
  media: string[];
  visualizations: DocumentationVisualization[];
};

export type ProjectDocs = {
  generatedAt: string;
  version: number;
  extractionPolicy: {
    roots: string[];
    allowlistedFilesOnly: boolean;
    sanitized: boolean;
    denied: string[];
  };
  projects: Record<string, ProjectDocumentation>;
};

export const projectDocs = projectDocsJson as ProjectDocs;

export function getProjectDocumentation(slug: string) {
  return projectDocs.projects[slug];
}
