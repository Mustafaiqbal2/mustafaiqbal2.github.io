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

export type Metric = {
  value?: string;
  label: string;
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
  features: string[];
  status: string;
  role: string;
  dates: string;
  isPrivate: boolean;
  privateNote: string;
  featuredMetric?: Metric;
  metrics: Metric[];
  problem: string;
  constraints: string[];
  approach: Decision[];
  implementation: string[];
  outcomes: Metric[];
  stack: string[];
  mediaNotes: string[];
};

export const profile = {
  name: "Mustafa Iqbal",
  title: "Software Engineer & Founder",
  shortTitle: "Engineer · founder",
  email: "therealmustafaiqbal@gmail.com",
  location: "Islamabad, Pakistan",
  availability: "",
  github: "https://github.com/Mustafaiqbal2",
  linkedIn: "https://www.linkedin.com/in/mustafa-iqbal-ba42b424b/",
  resume: "/resume/",
  resumePdf: "/resume/Mustafa_Iqbal_CV.pdf",
  photo: "/images/me.jpeg",
  positioning:
    "I build things end to end — ArchPHI, production AI agents, and a factory site on page one.",
  bioShort:
    "Software engineer and founder. Building ArchPHI — the operating system for architectural drawings — with production agents and a factory website that ranks on Google behind it."
};

export const navigation = [{ label: "Work", href: "/work/" }];

const iconForSlug: Record<string, LucideIcon> = {
  archphi: Building2,
  pilonecables: Globe2,
  "revvy-review-automation": Bot,
  "emmy-email-categorization": MailCheck,
  "recruitment-rag-platform": Network,
  melodymind: Music2
};

const mediaForSlug: Record<string, MediaItem[]> = {
  "recruitment-rag-platform": [
    {
      src: "/projects/recruitment-rag/interview-demo-frame-1.webp",
      type: "image",
      alt: "Recruitment platform interview workflow frame",
      caption: "Interview agent flow."
    },
    {
      src: "/projects/recruitment-rag/job-automation-frame-1.webp",
      type: "image",
      alt: "Recruitment platform candidate-matching workflow frame",
      caption: "Candidate ingestion and matching."
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
  ...featuredProjects.map((project) => `/work/${project.slug}/`)
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
    title: "Adzee",
    signal: "Ad-making agent",
    summary:
      "Give it a brand and a one-line idea, and it makes a full ad set: a plan, ten ranked headlines, the text, and the images. Weak images are redone automatically. Runs on Simplabots as Adsy.",
    href: "https://simplabots.com/agents/adsy/",
    icon: Sparkles
  },
  {
    title: "Dominic",
    signal: "Domain-finding agent",
    summary:
      "Give it a company description and it suggests domain names, checks which ones are really available, and ranks them.",
    href: "https://simplabots.com/agents/dominic/",
    icon: Globe2
  },
  {
    title: "ResearchAI",
    signal: "Research assistant",
    summary:
      "Built for a hiring test. Two AI agents work through fixed steps, search the web, and turn the findings into a PDF report.",
    href: "https://github.com/Mustafaiqbal2/CA-TASK",
    icon: Layers3
  },
  {
    title: "Offline document summarizer",
    signal: "Works without internet",
    summary:
      "Summarizes large documents. Runs in the cloud, or fully offline on a laptop with a small local model.",
    href: "https://github.com/Mustafaiqbal2/BIG_Document_RAG",
    icon: Network
  },
  {
    title: "Neural network acceleration",
    signal: "GPU speed study",
    summary:
      "Six versions of the same digit-recognition network, from plain C code up through GPU libraries.",
    href: "https://github.com/Mustafaiqbal2/Neural-Network_Acceleration",
    icon: Cpu
  },
  {
    title: "CUDA Canny optimization",
    signal: "GPU image filter",
    summary:
      "Made an edge-detection filter run much faster on a GPU by merging steps and moving less data around.",
    href: "https://github.com/Mustafaiqbal2/Canny_optimization",
    icon: Cpu
  },
  {
    title: "Custom compiler",
    signal: "Compiler internals",
    summary:
      "The front half of a compiler, in Java: it reads source code, checks it, and builds the structure a compiler works on.",
    href: "https://github.com/Mustafaiqbal2/Custom-Compiler",
    icon: Cpu
  }
];

