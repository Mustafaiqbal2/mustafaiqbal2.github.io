import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Database,
  FileText,
  Gauge,
  GitBranch,
  Layers3,
  Route,
  ShieldCheck,
  Sparkles,
  Workflow
} from "lucide-react";
import { ProjectLinks } from "@/components/ProjectLinks";
import { ProjectMedia } from "@/components/ProjectMedia";
import { Reveal } from "@/components/Reveal";
import { featuredProjects, getProject, siteUrl, type Project } from "@/data/portfolio";

type ProjectPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return featuredProjects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);

  if (!project) {
    return {
      title: "Project not found"
    };
  }

  return {
    title: project.title,
    description: project.pitch,
    alternates: {
      canonical: `${siteUrl}/work/${project.slug}/`
    },
    openGraph: {
      title: `${project.title} | Mustafa Iqbal`,
      description: project.pitch,
      url: `${siteUrl}/work/${project.slug}/`,
      images: project.media[0]?.type === "image" ? [project.media[0].src] : [project.media[0]?.poster || "/og-image.png"]
    }
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = getProject(slug);

  if (!project) {
    notFound();
  }

  const Icon = project.icon;

  return (
    <main className={`project-page project-page-${project.slug} case-layout-${project.caseStudy.layoutKind}`}>
      <section className="project-hero">
        <div className="section-inner project-hero-grid">
          <Reveal className="project-hero-copy">
            <a className="text-link back-link" href="/work/">
              <ArrowLeft size={17} aria-hidden="true" />
              Work index
            </a>
            <div className="metadata-row">
              <span>{project.category}</span>
              <span>{project.status}</span>
              <span>{project.confidentiality}</span>
            </div>
            <h1>{project.title}</h1>
            <p>{project.pitch}</p>
            <div className="role-grid">
              <div>
                <BriefcaseBusiness size={18} aria-hidden="true" />
                <span>Role</span>
                <strong>{project.role}</strong>
              </div>
              <div>
                <CalendarDays size={18} aria-hidden="true" />
                <span>Period</span>
                <strong>{project.dates}</strong>
              </div>
              <div>
                <Icon size={18} aria-hidden="true" />
                <span>Domain</span>
                <strong>{project.category}</strong>
              </div>
            </div>
            <ProjectLinks project={project} />
          </Reveal>

          <Reveal className="project-hero-media" delay={0.08}>
            <ProjectMedia media={project.media.slice(0, 1)} featured />
          </Reveal>
        </div>
      </section>

      <section className="proof-band project-proof-band" aria-label={`${project.title} proof metrics`}>
        <div className="section-inner proof-band-grid">
          <div className="metric featured-metric">
            <strong>{project.featuredMetric.value}</strong>
            <span>{project.featuredMetric.label}</span>
          </div>
          {project.metrics.map((metric) => (
            <div className="metric" key={`${metric.value}-${metric.label}`}>
              <strong>{metric.value}</strong>
              <span>{metric.label}</span>
            </div>
          ))}
        </div>
      </section>

      <CaseStudyBody project={project} />

      <section className="next-work-strip" aria-label="More work">
        <div className="section-inner next-work-inner">
          <a className="text-link" href="/work/">
            More projects
            <ArrowRight size={17} aria-hidden="true" />
          </a>
        </div>
      </section>
    </main>
  );
}

function CaseStudyBody({ project }: { project: Project }) {
  switch (project.caseStudy.layoutKind) {
    case "platform":
      return <PlatformCase project={project} />;
    case "performance":
      return <PerformanceCase project={project} />;
    case "classification":
      return <ClassificationCase project={project} />;
    case "cad":
      return <CadCase project={project} />;
    case "music":
      return <MusicCase project={project} />;
    case "rag":
      return <RagCase project={project} />;
    default:
      return null;
  }
}

function EvidenceSources({ project }: { project: Project }) {
  return (
    <Reveal as="aside" className="evidence-sources">
      <span className="status-label">Evidence used</span>
      <h2>What this page is grounded in.</h2>
      <ul>
        {project.caseStudy.evidenceSources.map((source) => (
          <li key={source}>
            <FileText size={17} aria-hidden="true" />
            <span>{source}</span>
          </li>
        ))}
      </ul>
    </Reveal>
  );
}

function TechnicalPanels({ project, className = "" }: { project: Project; className?: string }) {
  return (
    <div className={`technical-panels ${className}`}>
      {project.caseStudy.technicalPanels.map((panel, index) => (
        <Reveal as="article" className="tech-panel" key={panel.title} delay={index * 0.04}>
          <span>{panel.eyebrow}</span>
          <h3>{panel.title}</h3>
          <p>{panel.text}</p>
          <ul>
            {panel.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Reveal>
      ))}
    </div>
  );
}

function CaseIntro({ project, label }: { project: Project; label: string }) {
  return (
    <Reveal className="case-intro">
      <p className="eyebrow">{label}</p>
      <h2>{project.summary}</h2>
      <p>{project.problem}</p>
    </Reveal>
  );
}

function StackStrip({ project }: { project: Project }) {
  return (
    <Reveal className="case-stack-strip">
      {project.stack.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </Reveal>
  );
}

function PlatformCase({ project }: { project: Project }) {
  const domains = [
    ["Users", "accounts, profiles, profile groups, roles"],
    ["Agents", "Chattie, Revvy, Dominic, Hunter, Pixie, Audra"],
    ["Commercial", "Stripe, subscriptions, credits, invoices"],
    ["Knowledge", "assets, Pinecone, questions, responses"],
    ["Operations", "S3, SES, SQS, notifications, integrations"]
  ];

  return (
    <>
      <section className="section case-platform-overview" aria-labelledby="platform-title">
        <div className="section-inner platform-grid">
          <CaseIntro project={project} label="Platform evidence" />
          <Reveal className="platform-domain-map" delay={0.08}>
            {domains.map(([title, text], index) => (
              <div key={title} style={{ "--domain-index": index } as CSSProperties}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{title}</strong>
                <p>{text}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="section section-muted" aria-labelledby="platform-technical-title">
        <div className="section-inner platform-deep-dive">
          <Reveal className="section-heading">
            <p className="eyebrow">Technical read</p>
            <h2 id="platform-technical-title">A SaaS control plane around agent workflows.</h2>
            <p>{project.caseStudy.visualSpec}</p>
          </Reveal>
          <TechnicalPanels project={project} />
        </div>
      </section>

      <section className="section case-media-section" aria-labelledby="platform-media-title">
        <div className="section-inner case-media-grid">
          <div>
            <Reveal className="section-heading">
              <p className="eyebrow">Sanitized visuals</p>
              <h2 id="platform-media-title">Architecture without private customer data.</h2>
              <p>These visuals are generated from the local docs and schema so the product structure is clear without exposing source code.</p>
            </Reveal>
            <EvidenceSources project={project} />
          </div>
          <ProjectMedia media={project.media.slice(1)} />
        </div>
      </section>
    </>
  );
}

function PerformanceCase({ project }: { project: Project }) {
  const stages = [
    ["OAuth", "offline Google Business Profile connection"],
    ["Import", "accounts and business locations"],
    ["Sync", "paginated reviews and batch upserts"],
    ["Filter", "skip replied, low-priority, existing drafts"],
    ["Draft", "parallel, throttled, or Batch API"],
    ["Publish", "manual approval and reply endpoint"]
  ];

  return (
    <>
      <section className="section case-performance" aria-labelledby="performance-title">
        <div className="section-inner performance-grid">
          <div>
            <CaseIntro project={project} label="Performance case study" />
            <StackStrip project={project} />
          </div>
          <Reveal className="performance-meter" delay={0.08}>
            <span>Before</span>
            <strong>60-120 min</strong>
            <em>2000-review workflow</em>
            <span>After</span>
            <strong>10-20 min</strong>
            <em>documented optimized path</em>
          </Reveal>
        </div>
      </section>

      <section className="section section-muted" aria-labelledby="workflow-title">
        <div className="section-inner">
          <Reveal className="section-heading">
            <p className="eyebrow">Workflow compression</p>
            <h2 id="workflow-title">The important work happens before the model call.</h2>
          </Reveal>
          <div className="performance-timeline">
            {stages.map(([title, text], index) => (
              <Reveal as="article" className="perf-stage" key={title} delay={index * 0.035}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="performance-implementation-title">
        <div className="section-inner split-case">
          <TechnicalPanels project={project} className="vertical-panels" />
          <Reveal className="implementation-ledger" delay={0.08}>
            <p className="eyebrow">Implementation ledger</p>
            <h2 id="performance-implementation-title">What changed technically.</h2>
            <ul>
              {[...project.implementation, ...project.outcomes].map((item) => (
                <li key={item}>
                  <CheckCircle2 size={18} aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      <section className="section section-muted case-media-section" aria-labelledby="revvy-media-title">
        <div className="section-inner case-media-grid">
          <EvidenceSources project={project} />
          <ProjectMedia media={project.media.slice(1)} />
        </div>
      </section>
    </>
  );
}

function ClassificationCase({ project }: { project: Project }) {
  const loop = ["Gmail sync", "Contact groups", "Thread context", "LLM JSON log", "Gmail labels", "User correction"];
  const categories = ["Priority", "Financial", "Scheduling", "Team", "Orders", "Newsletters", "FYI/CC", "Uncategorized"];

  return (
    <>
      <section className="section case-classification" aria-labelledby="classification-title">
        <div className="section-inner classification-grid">
          <CaseIntro project={project} label="Email classification loop" />
          <Reveal className="classification-loop" delay={0.08}>
            {loop.map((item, index) => (
              <div key={item}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{item}</strong>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="section section-muted" aria-labelledby="taxonomy-title">
        <div className="section-inner email-taxonomy-grid">
          <Reveal className="section-heading">
            <p className="eyebrow">Product model</p>
            <h2 id="taxonomy-title">Rules, context, and logs instead of blind classification.</h2>
            <p>Emmy works because the system has places for deterministic routing, model reasoning, and user correction.</p>
          </Reveal>
          <Reveal className="category-board" delay={0.08}>
            {categories.map((category) => (
              <span key={category}>{category}</span>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="section" aria-labelledby="classification-panels-title">
        <div className="section-inner split-case">
          <TechnicalPanels project={project} className="vertical-panels" />
          <Reveal className="json-log-panel" delay={0.08}>
            <p className="eyebrow">Inspectable output</p>
            <h2 id="classification-panels-title">The AI decision is stored as structured evidence.</h2>
            <pre>{`{
  "Sender Email": "...",
  "Subject": "...",
  "AddressedTo": "Direct | CC | BCC | Other",
  "Category": "Priority Inbox",
  "Reasoning": "..."
}`}</pre>
          </Reveal>
        </div>
      </section>

      <section className="section section-muted case-media-section" aria-labelledby="emmy-media-title">
        <div className="section-inner case-media-grid">
          <EvidenceSources project={project} />
          <ProjectMedia media={project.media} />
        </div>
      </section>
    </>
  );
}

function CadCase({ project }: { project: Project }) {
  const contract = [
    "AI is off by default",
    "External calls require explicit permission",
    "AI-generated coordinates are never accepted",
    "Malformed output is rejected",
    "Uncertain geometry remains visible",
    "No BOQ output until geometry is validated"
  ];

  return (
    <>
      <section className="section case-cad-contract" aria-labelledby="cad-title">
        <div className="section-inner cad-contract-grid">
          <CaseIntro project={project} label="CAD safety contract" />
          <Reveal className="contract-panel" delay={0.08}>
            {contract.map((item) => (
              <div key={item}>
                <ShieldCheck size={18} aria-hidden="true" />
                <span>{item}</span>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="section section-muted" aria-labelledby="cad-pipeline-title">
        <div className="section-inner cad-pipeline">
          <Reveal className="section-heading">
            <p className="eyebrow">Pipeline</p>
            <h2 id="cad-pipeline-title">Geometry first, intelligence second, review always.</h2>
          </Reveal>
          <TechnicalPanels project={project} />
        </div>
      </section>

      <section className="section case-media-section" aria-labelledby="cad-artifacts-title">
        <div className="section-inner">
          <Reveal className="section-heading">
            <p className="eyebrow">Real artifacts</p>
            <h2 id="cad-artifacts-title">The page uses reconstruction outputs, not fake screenshots.</h2>
          </Reveal>
          <ProjectMedia media={project.media} />
          <EvidenceSources project={project} />
        </div>
      </section>
    </>
  );
}

function MusicCase({ project }: { project: Project }) {
  const modelSteps = [
    ["Data", "Reddit emotions, Last.fm tags, Genius lyrics, Deezer previews"],
    ["Baseline", "Lyrics/audio prototypes exposed feature collapse"],
    ["CLAP", "Zero-shot model handled basic emotion but missed abstract context"],
    ["InfoNCE", "Projection aligned CLAP audio with Nomic text embeddings"],
    ["Product", "FastAPI, Pinecone, Expo, voice, image, Spotify, stem separation"]
  ];

  return (
    <>
      <section className="section case-music" aria-labelledby="music-title">
        <div className="section-inner music-grid">
          <CaseIntro project={project} label="Thesis-backed product" />
          <Reveal className="music-model-journey" delay={0.08}>
            {modelSteps.map(([title, text], index) => (
              <div key={title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{title}</strong>
                <p>{text}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="section section-muted" aria-labelledby="music-implementation-title">
        <div className="section-inner split-case">
          <TechnicalPanels project={project} className="vertical-panels" />
          <Reveal className="music-module-card" delay={0.08}>
            <p className="eyebrow">Delivered modules</p>
            <h2 id="music-implementation-title">The thesis describes a full product surface.</h2>
            <ul>
              <li>Sentiment and context analysis</li>
              <li>Interactive playlist generation</li>
              <li>Talk-to-Your-DJ voice updates</li>
              <li>Spotify playlist export</li>
              <li>Stem separation and waveform support</li>
              <li>User analytics and system logs</li>
            </ul>
          </Reveal>
        </div>
      </section>

      <section className="section case-media-section" aria-labelledby="music-media-title">
        <div className="section-inner case-media-grid">
          <EvidenceSources project={project} />
          <ProjectMedia media={project.media} />
        </div>
      </section>
    </>
  );
}

function RagCase({ project }: { project: Project }) {
  const lanes = [
    { icon: Database, title: "Ingest", text: "CVs, GitHub, LinkedIn, ORIC, personal websites" },
    { icon: GitBranch, title: "Embed", text: "Nomic vectors over candidate and role evidence" },
    { icon: Gauge, title: "Retrieve", text: "Weaviate semantic candidate-job matching" },
    { icon: Route, title: "Interview", text: "Groq Llama 3 agent with structured question flow" },
    { icon: Layers3, title: "Deploy", text: "FastAPI services with Docker Compose" }
  ];

  return (
    <>
      <section className="section case-rag" aria-labelledby="rag-title">
        <div className="section-inner rag-grid">
          <CaseIntro project={project} label="Research lab case study" />
          <Reveal className="leadership-card" delay={0.08}>
            <span>Team lead</span>
            <strong>4-person AI research team</strong>
            <p>I led architecture and delivery across ingestion, retrieval, interview flow, and service deployment.</p>
          </Reveal>
        </div>
      </section>

      <section className="section section-muted" aria-labelledby="rag-flow-title">
        <div className="section-inner">
          <Reveal className="section-heading">
            <p className="eyebrow">System flow</p>
            <h2 id="rag-flow-title">A recruitment workflow, not a standalone chatbot.</h2>
          </Reveal>
          <div className="rag-lanes">
            {lanes.map((lane, index) => {
              const LaneIcon = lane.icon;
              return (
                <Reveal as="article" className="rag-lane" key={lane.title} delay={index * 0.04}>
                  <LaneIcon size={24} aria-hidden="true" />
                  <h3>{lane.title}</h3>
                  <p>{lane.text}</p>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="rag-panels-title">
        <div className="section-inner split-case">
          <TechnicalPanels project={project} className="vertical-panels" />
          <Reveal className="implementation-ledger" delay={0.08}>
            <p className="eyebrow">Resume-backed outcomes</p>
            <h2 id="rag-panels-title">What I can say publicly.</h2>
            <ul>
              {project.outcomes.map((item) => (
                <li key={item}>
                  <CheckCircle2 size={18} aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      <section className="section section-muted case-media-section" aria-labelledby="rag-media-title">
        <div className="section-inner case-media-grid">
          <EvidenceSources project={project} />
          <ProjectMedia media={project.media} />
        </div>
      </section>
    </>
  );
}
