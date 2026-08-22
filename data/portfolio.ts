import {
  Bot,
  Building2,
  Command,
  Cpu,
  Gauge,
  Globe2,
  Layers3,
  MailCheck,
  Music2,
  Network,
  Sparkles,
  Workflow
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import caseStudies from "./case-studies.json";

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mustafaiqbal2.github.io";

export type ProvenanceTier = "documented" | "self-reported" | "target" | "team" | "thesis" | "private";

export type Metric = {
  value?: string;
  label: string;
  tier: ProvenanceTier;
  source?: string;
};

export type Decision = { decision: string; why: string };

export type MediaItem = {
  src: string;
  darkSrc?: string;
  poster?: string;
  type: "image" | "video";
  caption: string;
  alt: string;
};

export type CaseStudy = {
  slug: string;
  title: string;
  category: string;
  oneLiner: string;
  summary: string;
  status: string;
  role: string;
  dates: string;
  isPrivate: boolean;
  privateNote: string;
  featuredMetric: Metric;
  metrics: Metric[];
  problem: string;
  constraints: string[];
  approach: Decision[];
  implementation: string[];
  outcomes: Metric[];
  stack: string[];
  limitations: string[];
  mediaNotes: string[];
};

export const provenanceLabel: Record<ProvenanceTier, { glyph: string; label: string }> = {
  documented: { glyph: "■", label: "Documented" },
  "self-reported": { glyph: "◧", label: "Self-reported" },
  target: { glyph: "□", label: "Target" },
  team: { glyph: "■", label: "Team lead" },
  thesis: { glyph: "◧", label: "Thesis" },
  private: { glyph: "□", label: "Private" }
};

export const profile = {
  name: "Mustafa Iqbal",
  title: "AI Automation Engineer",
  shortTitle: "AI automation · full-stack",
  email: "therealmustafaiqbal@gmail.com",
  location: "Islamabad, Pakistan",
  availability: "Available for remote roles or relocation",
  github: "https://github.com/Mustafaiqbal2",
  linkedIn: "https://www.linkedin.com/in/mustafa-iqbal-ba42b424b/",
  resume: "/resume/",
  resumePdf: "/resume/Mustafa_Iqbal_Resume.pdf",
  photo: "/images/me.jpeg",
  positioning:
    "AI automation engineer who ships production LLM systems end to end — OAuth integrations, background-job pipelines, and cost-aware generation — with the operational discipline to run them unattended and keep every decision auditable.",
  bioShort:
    "I build production AI automation and the full-stack systems that hold it up — the queues, retrieval, caching, OAuth lifecycles, and human-approval paths that keep automation fast, cheap, and correct once real data and real users arrive."
};

export const navigation = [
  { label: "Work", href: "/work/" },
  { label: "About", href: "/about/" },
  { label: "Résumé", href: "/resume/" },
  { label: "Contact", href: "/contact/" }
];

const iconForSlug: Record<string, LucideIcon> = {
  "revvy-review-automation": Bot,
  "emmy-email-categorization": MailCheck,
  "recruitment-rag-platform": Network,
  "adzee-ad-creative": Sparkles,
  "cad-understanding": Building2,
  melodymind: Music2
};

const mediaForSlug: Record<string, MediaItem[]> = {
  "recruitment-rag-platform": [
    {
      src: "/projects/recruitment-rag/interview-demo-frame-1.webp",
      type: "image",
      alt: "Recruitment platform interview workflow frame",
      caption: "Interview agent flow (sanitized lab artifact — no candidate data shown)."
    },
    {
      src: "/projects/recruitment-rag/job-automation-frame-1.webp",
      type: "image",
      alt: "Recruitment platform candidate-matching workflow frame",
      caption: "Candidate ingestion and semantic matching (sanitized lab artifact)."
    }
  ],
  melodymind: [
    {
      src: "/projects/melodymind/thesis-page-39.webp",
      type: "image",
      alt: "MelodyMind thesis figure: mobile authentication and chat-driven playlist generation",
      caption: "Thesis figure — mobile app: chat-driven playlist generation."
    },
    {
      src: "/projects/melodymind/thesis-page-40.webp",
      type: "image",
      alt: "MelodyMind thesis figure: image query and generated playlist results",
      caption: "Thesis figure — image-to-playlist and text query results."
    }
  ]
};

export const featuredProjects: CaseStudy[] = caseStudies as CaseStudy[];

export function getProject(slug: string): CaseStudy | undefined {
  return featuredProjects.find((project) => project.slug === slug);
}

export function projectIcon(slug: string): LucideIcon {
  return iconForSlug[slug] || Workflow;
}

export function projectMedia(slug: string): MediaItem[] {
  return mediaForSlug[slug] || [];
}

export const pageRoutes = [
  "/",
  "/work/",
  "/about/",
  "/resume/",
  "/contact/",
  ...featuredProjects.map((project) => `/work/${project.slug}/`)
];

/* Home evidence band — real, sourced facts. */
export const evidence: Metric[] = [
  { value: "6–10×", label: "faster large-review syncs", tier: "documented", source: "Revvy PERFORMANCE.md" },
  { value: "50–200ms", label: "cached page loads", tier: "documented", source: "Revvy benchmark" },
  { value: "30–50%", label: "lower generation cost, pre-filtered", tier: "target", source: "design target" },
  { value: "4", label: "engineers led at Genesys Research Lab", tier: "team", source: "Jun–Aug 2025" }
];

export const pillars = [
  {
    icon: Workflow,
    title: "Integrate at the source",
    text: "Real OAuth token lifecycles with refresh buffers and invalid-grant detection; webhooks and Pub/Sub for near-real-time ingestion — not happy-path API calls."
  },
  {
    icon: Gauge,
    title: "Engineer for throughput and cost",
    text: "Rate-limit-safe concurrency, batched database writes, tagged caching, and pre-filtering that skips work before it costs a model call."
  },
  {
    icon: Command,
    title: "Keep humans in control",
    text: "Draft-to-approve pipelines, structured reasoning logs, confidence heuristics, and per-decision auditability — automation you can actually trust to run."
  }
];

export const principles = [
  "I build around workflows, not model calls — mapping the user action, owned data, external API state, failure modes, and recovery path before the model is ever involved.",
  "Deterministic logic handles the obvious cases; the model is reserved for real ambiguity, and the hand-off between them stays inspectable.",
  "I engineer for throughput and cost: the cheapest model call is the one you avoid, so filtering and batching come before generation.",
  "I keep numbers honest — every benchmark cites its source, and I say plainly where a system still degrades."
];

export const experience = [
  {
    role: "Freelance Automation Engineer",
    organization: "Independent",
    dates: "2022 — present",
    location: "Remote",
    bullets: [
      "Architect and ship production SaaS automation end to end — review-response automation, thread-aware email categorization, and AI ad-creative generation — from data model to operator dashboard.",
      "Build real OAuth2 integrations (Gmail, Google Business Profile) with refresh-token lifecycles, invalid-grant detection, and near-real-time ingestion via webhooks and Pub/Sub.",
      "Engineer for throughput and cost: rate-limit-safe concurrency, batched writes, tagged caching, and pre-filtering that skips work before it costs a model call.",
      "Design draft-to-approve pipelines with structured reasoning logs and per-decision auditability, so automation runs unattended without losing control."
    ]
  },
  {
    role: "AI Research Intern & Team Lead",
    organization: "Genesys Research Lab",
    dates: "Jun — Aug 2025",
    location: "Islamabad, Pakistan",
    bullets: [
      "Led a four-person team building an end-to-end recruitment platform with an AI candidate-evaluation pipeline.",
      "Engineered a RAG document-processing system on Weaviate with Nomic embeddings for semantic candidate–job matching across multi-source data.",
      "Built a conversational interview agent on Llama 3 (via Groq) with a multi-agent design for dynamic, non-repeating questioning.",
      "Deployed containerized microservices with Docker Compose on lab infrastructure behind a FastAPI backend and async job processing."
    ]
  }
];

export const education = [
  {
    program: "BS Computer Science",
    institution: "FAST-NUCES, Islamabad",
    dates: "2022 — 2026",
    detail: "CGPA 3.38 / 4.00. Dean's List. Foundations from HPC (CUDA, MPI, OpenMP) through full-stack engineering to applied LLM systems."
  },
  {
    program: "A Levels",
    institution: "Nixor College",
    dates: "2020 — 2022",
    detail: "Computer Science, Economics, Mathematics."
  }
];

export const skillGroups = [
  {
    title: "Languages",
    items: ["TypeScript", "Python", "JavaScript", "C++", "SQL", "CUDA C++"]
  },
  {
    title: "Product & full-stack",
    items: ["Next.js", "React", "React Native (Expo)", "FastAPI", "Node.js", "Tailwind CSS"]
  },
  {
    title: "Data & infrastructure",
    items: ["PostgreSQL", "Prisma", "Supabase", "MongoDB", "Docker", "Vercel", "AWS (S3 · SES · SQS)"]
  },
  {
    title: "AI & retrieval",
    items: ["OpenAI", "Anthropic", "Google models", "RAG", "Pinecone", "Weaviate", "FAISS", "Nomic embeddings"]
  },
  {
    title: "Async & integration",
    items: ["pg-boss", "Inngest", "OAuth2 / JWT", "Webhooks", "Pub/Sub", "Cron / CI-CD"]
  },
  {
    title: "Foundations",
    items: ["CUDA", "MPI", "OpenMP", "Systems programming", "Compiler design"]
  }
];

export type SecondaryProject = {
  title: string;
  signal: string;
  summary: string;
  href?: string;
  icon: LucideIcon;
};

export const secondaryProjects: SecondaryProject[] = [
  {
    title: "Dominic",
    signal: "AI domain-naming agent",
    summary:
      "Turns a company brief into brandable domain candidates, checks real availability over RDAP (Verisign, PIR), and ranks results with a hybrid heuristic-plus-model scorer.",
    icon: Globe2
  },
  {
    title: "Programmatic SEO engine",
    signal: "Content systems · 1,000+ pages",
    summary:
      "A Node.js generation pipeline that scaled a retailer's site from ~65 to 1,000+ static pages from a city × product × guide matrix, each with JSON-LD structured data and automated schema validation.",
    icon: Layers3
  },
  {
    title: "CUDA Canny optimization",
    signal: "~48× reported speedup",
    summary:
      "Optimized CUDA Canny edge detection with kernel fusion, shared memory, and minimized host–device transfers.",
    href: "https://github.com/Mustafaiqbal2/Canny_optimization",
    icon: Cpu
  },
  {
    title: "Neural network acceleration",
    signal: "GPU optimization study",
    summary:
      "Six MNIST classifiers taken from a CPU baseline through CUDA, Tensor Cores, OpenACC, and cuBLAS to compare acceleration paths.",
    href: "https://github.com/Mustafaiqbal2/Neural-Network_Acceleration",
    icon: Cpu
  },
  {
    title: "Offline document RAG",
    signal: "Cloud + fully offline",
    summary:
      "Document summarization that runs in the cloud or fully offline, pairing FAISS retrieval with Groq or a local TinyLlama fallback.",
    href: "https://github.com/Mustafaiqbal2/BIG_Document_RAG",
    icon: Network
  },
  {
    title: "Custom compiler",
    signal: "Compiler internals",
    summary:
      "A Java compiler front end covering lexical analysis, symbol tables, LL(1) parsing, AST construction, and error recovery.",
    href: "https://github.com/Mustafaiqbal2/Custom-Compiler",
    icon: Cpu
  }
];

/* Honest platform-contribution note, shown on About/Work — not a solo case study. */
export const platformContribution = {
  title: "Production multi-tenant agentic AI SaaS",
  role: "Contributing full-stack / AI engineer on a ~20-person team",
  summary:
    "Contributed across a production multi-tenant AI SaaS platform hosting a fleet of purpose-built agents on a shared Next.js / Prisma / AWS backbone — multi-tenant billing and credit accounting, multi-model routing across OpenAI, Anthropic, and Google, an AWS async pipeline (S3 · SES · SQS), and Pinecone vector search. Several of my standalone agent prototypes map to agents on that platform.",
  note: "Team product — described by capability and my role, without naming the private product or its owner."
};
