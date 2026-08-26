import { Cpu, Globe2, Layers3, Network, Sparkles } from "lucide-react";
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
  links?: { label: string; href: string }[];
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
  email: "therealmustafaiqbal@gmail.com",
  location: "Islamabad, Pakistan",
  github: "https://github.com/Mustafaiqbal2",
  linkedIn: "https://www.linkedin.com/in/mustafa-iqbal-ba42b424b/",
  resumePdf: "/resume/Mustafa_Iqbal_CV.pdf",
  photo: "/images/me.jpeg",
  bioShort:
    "Software engineer and founder. Building ArchPHI — the operating system for architectural drawings — with production agents and a factory website that ranks on Google behind it."
};

export const navigation = [
  { label: "Work", href: "/work/" },
  { label: "Music", href: "/music/" }
];

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

export function projectMedia(slug: string): MediaItem[] {
  return mediaForSlug[slug] || [];
}

export const pageRoutes = [
  "/",
  "/work/",
  "/music/",
  ...featuredProjects.map((project) => `/work/${project.slug}/`)
];

export type SecondaryProject = {
  title: string;
  summary: string;
  href?: string;
  icon: LucideIcon;
};

export const secondaryProjects: SecondaryProject[] = [
  {
    title: "Adzee",
    summary:
      "Give it a brand and a one-line idea, and it makes a full ad set: a plan, ten ranked headlines, the text, and the images. Weak images are redone automatically. Runs on Simplabots as Adsy.",
    href: "https://simplabots.com/agents/adsy/",
    icon: Sparkles
  },
  {
    title: "Dominic",
    summary:
      "Give it a company description and it suggests domain names, checks which ones are really available, and ranks them.",
    href: "https://simplabots.com/agents/dominic/",
    icon: Globe2
  },
  {
    title: "ResearchAI",
    summary:
      "Built for a hiring test. Two AI agents work through fixed steps, search the web, and turn the findings into a PDF report.",
    href: "https://github.com/Mustafaiqbal2/CA-TASK",
    icon: Layers3
  },
  {
    title: "Offline document summarizer",
    summary:
      "Summarizes large documents. Runs in the cloud, or fully offline on a laptop with a small local model.",
    href: "https://github.com/Mustafaiqbal2/BIG_Document_RAG",
    icon: Network
  },
  {
    title: "Neural network acceleration",
    summary:
      "Six versions of the same digit-recognition network, from plain C code up through GPU libraries.",
    href: "https://github.com/Mustafaiqbal2/Neural-Network_Acceleration",
    icon: Cpu
  },
  {
    title: "CUDA Canny optimization",
    summary:
      "Made an edge-detection filter run much faster on a GPU by merging steps and moving less data around.",
    href: "https://github.com/Mustafaiqbal2/Canny_optimization",
    icon: Cpu
  },
  {
    title: "Custom compiler",
    summary:
      "The front half of a compiler, in Java: it reads source code, checks it, and builds the structure a compiler works on.",
    href: "https://github.com/Mustafaiqbal2/Custom-Compiler",
    icon: Cpu
  }
];

