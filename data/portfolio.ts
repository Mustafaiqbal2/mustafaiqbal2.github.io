import {
  Blocks,
  Bot,
  BrainCircuit,
  Building2,
  Code2,
  Database,
  Gauge,
  GitBranch,
  Globe2,
  Layers3,
  MailCheck,
  Music2,
  Network,
  Rocket,
  ShieldCheck,
  Sparkles,
  Workflow,
  Zap
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ContactProfile = {
  name: string;
  title: string;
  shortTitle: string;
  email: string;
  location: string;
  availability: string;
  github: string;
  linkedIn: string;
  resume: string;
  photo: string;
  elevatorPitch: string;
  positioning: string;
  summary: string;
};

export type ProjectLink = {
  label: string;
  href: string;
  type: "github" | "live" | "paper" | "resume";
};

export type MediaAsset = {
  src: string;
  darkSrc?: string;
  alt: string;
  type: "image" | "video";
  caption: string;
  sourceKind: "real-product-media" | "repo-derived-visualization" | "thesis-evidence" | "sanitized-artifact";
  isGenerated?: boolean;
  isSanitized?: boolean;
  poster?: string;
};

export type CaseStudyPanel = {
  eyebrow: string;
  title: string;
  text: string;
  items: string[];
};

export type CaseStudy = {
  layoutKind: "platform" | "performance" | "classification" | "cad" | "music" | "rag";
  evidenceSources: string[];
  technicalPanels: CaseStudyPanel[];
  visualSpec: string;
};

export type Project = {
  slug: string;
  title: string;
  category: string;
  status: string;
  confidentiality: "Public" | "Private product" | "Internal lab" | "Academic" | "Research prototype";
  summary: string;
  proof: string;
  pitch: string;
  role: string;
  dates: string;
  icon: LucideIcon;
  links: ProjectLink[];
  thumbnail?: MediaAsset;
  media: MediaAsset[];
  featuredMetric: { value: string; label: string };
  metrics: Array<{ value: string; label: string }>;
  problem: string;
  constraints: string[];
  architecture: string[];
  implementation: string[];
  outcomes: string[];
  stack: string[];
  lessons: string[];
  caseStudy: CaseStudy;
};

export type Experience = {
  role: string;
  organization: string;
  dates: string;
  location: string;
  bullets: string[];
};

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mustafaiqbal2.github.io";

export const profile: ContactProfile = {
  name: "Mustafa Iqbal",
  title: "Software Engineer, AI Automation and Product Systems",
  shortTitle: "Software Engineer",
  email: "mustafa_rao@hotmail.com",
  location: "Rawalpindi / Islamabad, Pakistan",
  availability: "Open to remote software engineering roles",
  github: "https://github.com/Mustafaiqbal2",
  linkedIn: "https://www.linkedin.com/in/mustafa-iqbal-ba42b424b/",
  resume: "/resume/Mustafa_Iqbal_Full_Resume.pdf",
  photo: "/images/me.jpeg",
  elevatorPitch:
    "Full-stack software engineer. I build the queues, retrieval, caching, and approval paths around AI models so automation stays fast, cheap, and correct once real users arrive — like the review workflow I made 6–10× faster.",
  positioning:
    "Full-stack software engineer who builds AI automation that holds up in production — the queues, retrieval, caching, and recovery paths around the model, with a documented 6–10× workflow speedup and a four-person AI team led.",
  summary:
    "I build AI automation, retrieval workflows, external API integrations, full-stack product surfaces, and systems projects."
};

export const proofMetrics = [
  { value: "6-10x", label: "faster review response (documented)", stage: "DRAFT" },
  { value: "30-50%", label: "lower AI cost, filtered before the model", stage: "FILTER" },
  { value: "50-200ms", label: "cached review page loads", stage: "PUBLISH" },
  { value: "4-person", label: "AI team led at Genesys Research Lab", stage: "APPROVE" },
  { value: "3x", label: "Dean's List, FAST-NUCES CS", stage: "SYNC" }
];

export const focusAreas = [
  {
    title: "Automation products",
    text: "Gmail, Google Business Profile, Stripe, worker queues, OAuth, labels, drafts, cache invalidation, and user correction paths.",
    icon: Workflow
  },
  {
    title: "AI and retrieval workflows",
    text: "RAG, embeddings, vector search, multimodal inputs, structured outputs, confidence routing, and model-cost control.",
    icon: BrainCircuit
  },
  {
    title: "Full-stack range",
    text: "Next.js, FastAPI, React Native, Prisma, PostgreSQL, Docker, CUDA/OpenCL/MPI projects, and product UI execution.",
    icon: Layers3
  }
];

export const featuredProjects: Project[] = [
  {
    slug: "simplabots-agentic-saas",
    title: "Simplabots Agentic AI SaaS",
    category: "Agentic AI platform",
    status: "Private product",
    confidentiality: "Private product",
    summary:
      "Worked across a private multi-tenant AI SaaS where specialized agents share one spine — tenancy, billing, credits, file assets, vector knowledge, and cloud services — instead of shipping as separate apps.",
    proof:
      "I work across the whole platform an AI product actually needs — account hierarchy, Stripe billing, usage metering, and AWS + Pinecone infra — not just a model wrapper.",
    pitch:
      "Built across the Simplabots platform layer so specialized agents could share tenancy, billing, assets, knowledge, usage tracking, and cloud integrations.",
    role: "Full-stack product and AI engineer",
    dates: "2025",
    icon: Sparkles,
    links: [],
    thumbnail: {
      src: "/projects/simplabots/thumb-light.webp",
      darkSrc: "/projects/simplabots/thumb-dark.webp",
      alt: "Simplabots private AI SaaS platform preview artwork",
      type: "image",
      caption: "Architecture-style preview of the private Simplabots platform.",
      sourceKind: "repo-derived-visualization",
      isGenerated: true,
      isSanitized: true
    },
    media: [],
    featuredMetric: { value: "4-tier", label: "account, profile, role, and agent access model" },
    metrics: [
      { value: "Next.js 15", label: "App Router product surface" },
      { value: "Prisma/Postgres", label: "account, agent, billing, asset data model" },
      { value: "Stripe", label: "subscriptions, credits, usage tracking" },
      { value: "Pinecone + AWS", label: "knowledge base, files, email, queues" }
    ],
    problem:
      "The platform went beyond a model wrapper: it needed tenancy, permissions, credits, billing, cloud assets, knowledge retrieval, and operational controls.",
    constraints: [
      "Because the product is private, I present it through approved architecture summaries and media rather than raw records or customer data.",
      "Multiple agent modules needed to share account state, usage rules, billing, and cloud services.",
      "AI workflows had to coexist with Stripe, S3, SES, SQS, Pinecone, OAuth, notifications, and admin operations."
    ],
    architecture: [
      "Next.js 15 App Router with authenticated routes for dashboard, agents, billing, admin, and operations surfaces.",
      "Prisma/PostgreSQL models for users, accounts, profile groups, profiles, agents, account engines, transactions, invoices, subscriptions, assets, knowledge-base responses, and integrations.",
      "Multi-provider AI layer spanning OpenAI, Anthropic, Gemini, Bedrock-ready paths, and Pinecone-backed semantic search.",
      "Cloud layer covering S3 assets, SES email, SQS queues, Stripe webhooks, Google APIs, and account/profile context selection."
    ],
    implementation: [
      "Worked across product surfaces that connect account hierarchy, user assets, AI agents, and billing state.",
      "Supported specialized agent modules including review management, email-style automation, domain research, and knowledge tools.",
      "Used internal docs and schema-driven reasoning to keep product, data, and operations decisions aligned."
    ],
    outcomes: [
      "Worked inside a larger proprietary AI SaaS codebase with shared platform, billing, and agent infrastructure.",
      "Connected platform context behind Revvy, Emmy, Dominic, Hunter, and other specialized automation agents.",
      "Covered tenancy, billing, AI orchestration, retrieval, cloud services, and admin workflows in one platform context."
    ],
    stack: ["Next.js", "React", "TypeScript", "Prisma", "PostgreSQL", "Stripe", "AWS S3/SES/SQS", "Pinecone", "OpenAI"],
    lessons: [
      "Agent products need tenancy, billing, assets, usage control, and recovery paths around model calls.",
      "Private product work still needs clear architecture, constraints, and implementation boundaries."
    ],
    caseStudy: {
      layoutKind: "platform",
      evidenceSources: [
        "Simplabots README and internal architecture flowchart",
        "Simplabots Prisma schema",
        "Database schema documentation",
        "Revvy integration documentation"
      ],
      visualSpec:
        "Layered SaaS control-plane visualization: users/accounts/profiles, agent modules, billing/credits, assets/knowledge, cloud integrations, and operations.",
      technicalPanels: [
        {
          eyebrow: "Tenancy",
          title: "Account hierarchy is the product spine.",
          text: "The schema separates users, accounts, profile groups, profiles, profile-group membership, and agent access so tools can be shared without losing ownership boundaries.",
          items: ["User -> Account -> ProfileGroup -> Profile", "ProfileGroupAgent access control", "AccountEngine preferences", "Account/profile context persistence"]
        },
        {
          eyebrow: "Commercial layer",
          title: "Billing and usage are first-class engineering surfaces.",
          text: "Stripe subscriptions, invoices, payment methods, transactions, credit storage, account engines, and usage records make AI consumption measurable instead of invisible.",
          items: ["Stripe subscriptions and invoices", "CreditStorage and transactions", "PlanFeature/PricingPlan models", "Agent-specific transaction attribution"]
        },
        {
          eyebrow: "AI operations",
          title: "Agents share infrastructure instead of becoming separate apps.",
          text: "Chattie, Revvy, Dominic, Hunter, Pixie, Audra, and other agents rely on shared assets, AI engines, vector knowledge, integrations, notifications, and cloud services.",
          items: ["Pinecone-backed knowledge", "S3-backed assets", "SQS-style async work", "Google Business Profile integration paths"]
        }
      ]
    }
  },
  {
    slug: "revvy-review-automation",
    title: "Revvy Review Automation",
    category: "Google Business Profile automation",
    status: "Private product",
    confidentiality: "Private product",
    summary:
      "Google Business Profile review automation that syncs, filters, drafts, and publishes replies — engineered to skip unnecessary AI work and cut large-review-workflow time 6–10x.",
    proof:
      "Performance and cost judgment on real workflows: the cheapest model call is the one you avoid. Batching, tagged cache invalidation, and pre-generation filtering took 1000-review syncs from 30–60 min to 5–10 min.",
    pitch:
      "Reduced slow review-response workflows by filtering unnecessary AI work, batching database writes, using cache invalidation, and keeping manual approval visible.",
    role: "Full-stack automation and product engineer",
    dates: "2025",
    icon: Bot,
    links: [],
    thumbnail: {
      src: "/projects/revvy/revvy-poster.webp",
      alt: "Revvy review automation product workflow frame",
      type: "image",
      caption: "Revvy review automation workflow frame.",
      sourceKind: "real-product-media",
      isSanitized: true
    },
    media: [
      {
        src: "/projects/revvy/revvy-demo.mp4",
        alt: "Revvy product workflow recording",
        type: "video",
        poster: "/projects/revvy/revvy-poster.webp",
        caption: "Revvy product recording showing review workflow automation.",
        sourceKind: "real-product-media",
        isSanitized: true
      },
      {
        src: "/projects/revvy/revvy-screenshot.webp",
        alt: "Revvy product interface screenshot",
        type: "image",
        caption: "Revvy interface screenshot from the review automation workflow.",
        sourceKind: "real-product-media",
        isSanitized: true
      }
    ],
    featuredMetric: { value: "6-10x", label: "documented speedup for large review workflows" },
    metrics: [
      { value: "50-200ms", label: "cached review page loads" },
      { value: "30-50%", label: "cost reduction path from smart filtering" },
      { value: "Google GBP", label: "OAuth, locations, reviews, replies" }
    ],
    problem:
      "Revvy was built around the bottleneck: review response workflows get slow and expensive when every review is synced, queried, and sent through AI sequentially, even when many reviews do not need a draft.",
    constraints: [
      "Google Business Profile requires OAuth offline tokens, account/location import, review sync, and reply posting without breaking user trust.",
      "Draft generation must skip replied reviews, avoid duplicate drafts, respect rating thresholds, and handle rate limits.",
      "I had to support manual review, semi-automation, and positive-review automation rather than one unsafe auto-reply mode."
    ],
    architecture: [
      "Next.js/Prisma/PostgreSQL app with Google Business Profile OAuth, connections, workspaces, locations, reviews, automation settings, and drafts.",
      "Review sync imports paginated Google reviews, batch-upserts rows with Prisma transactions, and invalidates tagged caches after writes.",
      "Draft generation filters out owner-replied, low-priority, and already-drafted reviews before using AI.",
      "OpenAI draft generation supports parallel real-time batches, throttled generation, and OpenAI Batch API for non-urgent bulk jobs."
    ],
    implementation: [
      "Replaced sequential per-review processing with p-limit-backed parallel draft generation while keeping a throttled path for rate-limit safety.",
      "Added `createMany`, transaction-wrapped upserts, tagged `unstable_cache` reads, and `revalidateTag` after sync/import operations.",
      "Implemented publish flows that preserve manual approval and add human-like delay before posting replies."
    ],
    outcomes: [
      "Improved 1000-review sync from 30-60 minutes to 5-10 minutes in the documented path.",
      "Improved 2000-review workflows from 60-120 minutes to 10-20 minutes.",
      "Documented cache-hit review pages at roughly 50-200ms."
    ],
    stack: ["Next.js", "Prisma", "PostgreSQL", "Google Business Profile API", "OpenAI", "p-limit", "pg-boss", "Next cache"],
    lessons: [
      "I found that the best AI optimization is avoiding unnecessary model calls before the queue starts.",
      "Automation products need modes, logs, approval states, and failure recovery, not just generated text."
    ],
    caseStudy: {
      layoutKind: "performance",
      evidenceSources: [
        "Revvy README",
        "Revvy PERFORMANCE.md",
        "Revvy Prisma schema",
        "Revvy inbox and Google Business Profile integration source"
      ],
      visualSpec:
        "Video-first performance story with sync/import/filter/draft/cache/reply timeline and before-after benchmark panels.",
      technicalPanels: [
        {
          eyebrow: "Sync path",
          title: "Import reviews once, write them efficiently, invalidate precisely.",
          text: "The sync path pulls reviews from Google, persists them through batch database operations, and invalidates workspace-specific review/location cache tags.",
          items: ["Google Business Profile OAuth", "Location/account import", "Prisma transactions", "Tagged cache invalidation"]
        },
        {
          eyebrow: "AI spend",
          title: "Filtering happens before generation.",
          text: "The system skips reviews that already have owner replies, reviews below the automation threshold, and reviews that already have drafts.",
          items: ["Owner reply skip", "positiveMinStars threshold", "Existing draft skip", "Batch API option for non-urgent work"]
        },
        {
          eyebrow: "Control",
          title: "Users keep the final publishing decision.",
          text: "I built the interface around manual, draft-first, and positive-only automation modes, with location-level settings and reply posting through Google APIs.",
          items: ["Manual/semi/full modes", "Edit draft before posting", "Reply endpoint", "Human-like delay before publish"]
        }
      ]
    }
  },
  {
    slug: "emmy-email-categorization",
    title: "Emmy Email Categorization",
    category: "Gmail automation",
    status: "Private product",
    confidentiality: "Private product",
    summary:
      "Gmail automation that routes known senders by deterministic rule and classifies ambiguous email with thread-aware AI — every decision logged, labeled, and correctable.",
    proof:
      "I design hybrid rule + AI systems and treat model output as inspectable and correctable, not a black box — the reliability discipline production ML products need.",
    pitch:
      "Built Emmy around deterministic sender rules, thread-aware AI classification, categorization logs, Gmail labels, and user correction paths.",
    role: "Full-stack AI automation engineer",
    dates: "2025",
    icon: MailCheck,
    links: [],
    thumbnail: {
      src: "/projects/emmy/emmy-screenshot.webp",
      alt: "Emmy email categorization interface screenshot",
      type: "image",
      caption: "Emmy email categorization interface.",
      sourceKind: "real-product-media",
      isSanitized: true
    },
    media: [
      {
        src: "/projects/emmy/emmy-screenshot.webp",
        alt: "Emmy email categorization product screenshot",
        type: "image",
        caption: "Emmy interface showing the categorization product surface.",
        sourceKind: "real-product-media",
        isSanitized: true
      }
    ],
    featuredMetric: { value: "2-3x", label: "email processing speedup after concurrency work" },
    metrics: [
      { value: "12", label: "default onboarding categories" },
      { value: "100-1000", label: "initial processing range selectable during setup" },
      { value: "Hybrid", label: "contact rules plus AI classification" }
    ],
    problem:
      "I designed Emmy for the parts simple filters miss: keeping conversations together, routing known senders cheaply, and still understanding ambiguous new email.",
    constraints: [
      "Subject-line filters break easily and create high maintenance work.",
      "Blindly following old thread categories can miss urgency changes or topic drift.",
      "Running multiple AI passes per email would increase latency and cost."
    ],
    architecture: [
      "Gmail OAuth and synchronization persist Gmail accounts, email metadata, categories, contact groups, labels, training data, and categorization rows.",
      "Contact groups define known sender rules and category constraints before AI is used.",
      "Thread manager builds conversation context so classification is not based on a single isolated message.",
      "LLM categorizer returns structured JSON logs with sender, subject, addressing, chosen category, and reasoning."
    ],
    implementation: [
      "Added 12 default categories so new users start with a complete routing taxonomy instead of an empty dashboard.",
      "Implemented configurable initial processing from 100 to 1000 emails during setup.",
      "Added categorization logs, log modal UI, contact group CRUD, category relations, and Gmail label synchronization.",
      "Increased concurrent processing while preserving cost limits and background processing through Inngest."
    ],
    outcomes: [
      "Made email processing 2-3x faster in the documented update.",
      "Made categorization inspectable so users can see why an email was routed instead of treating the model as a black box.",
      "Balanced deterministic routing, thread context, AI flexibility, and user correction."
    ],
    stack: ["Next.js", "TypeScript", "Prisma", "Gmail API", "OpenAI", "Inngest", "p-limit", "Zod"],
    lessons: [
      "Reliable AI classification usually starts with deterministic routing for obvious cases.",
      "Logs and correction loops are part of the product, not debugging extras."
    ],
    caseStudy: {
      layoutKind: "classification",
      evidenceSources: [
        "Emmy README",
        "Emmy weekly update notes",
        "Emmy Prisma schema",
        "LLM categorizer, email processor, thread manager, and Gmail label source"
      ],
      visualSpec:
        "Thread-aware email loop: Gmail sync, contact groups, category constraints, AI decision, structured log, label update, and user correction.",
      technicalPanels: [
        {
          eyebrow: "Setup",
          title: "Onboarding creates the taxonomy before processing starts.",
          text: "Users can choose initial processing depth and start with default categories, Gmail labels, and contact groups instead of configuring everything from scratch.",
          items: ["100/300/500/1000 email options", "12 default categories", "Contact group CRUD", "Gmail label creation"]
        },
        {
          eyebrow: "Decision path",
          title: "I use rules first, then context-aware AI.",
          text: "Contact groups constrain category choices for known senders; unknown or ambiguous messages are classified with thread context and structured JSON output.",
          items: ["Known sender routing", "Thread context builder", "JSON categorization logs", "Category confidence/reasoning"]
        },
        {
          eyebrow: "Correction",
          title: "Manual moves become training signals.",
          text: "When users move emails, Emmy updates labels, synchronizes thread categories, and stores training data for future behavior.",
          items: ["TrainingData model", "Thread synchronization", "Label removal/application", "Categorization log inspection"]
        }
      ]
    }
  },
  {
    slug: "cad-understanding-core",
    title: "CAD Understanding Core",
    category: "AI-assisted architectural reconstruction",
    status: "Research prototype",
    confidentiality: "Research prototype",
    summary:
      "A DWG/DXF reconstruction engine that treats extracted CAD geometry as ground truth and uses capped AI only to interpret evidence — never to invent coordinates, labels, or quantities.",
    proof:
      "I can put hard safety contracts around AI in a high-stakes domain — keeping 28 exact drawing contexts CAD-derived and reversible, and leaving unresolved geometry visible instead of faking confidence.",
    pitch:
      "Built around a strict constraint: AI can interpret evidence, but accepted geometry must stay CAD-derived, reversible, and explicit about uncertainty.",
    role: "Research and product prototyping engineer",
    dates: "2026",
    icon: Building2,
    links: [],
    thumbnail: {
      src: "/projects/cad-understanding/drawing-contexts.webp",
      alt: "Exact CAD drawing contexts extracted from architectural drawings",
      type: "image",
      caption: "Real CAD artifact showing extracted drawing contexts.",
      sourceKind: "sanitized-artifact",
      isSanitized: true
    },
    media: [
      {
        src: "/projects/cad-understanding/drawing-contexts.webp",
        alt: "Exact CAD drawing contexts extracted from architectural drawings",
        type: "image",
        caption: "Real artifact: exact CAD drawing contexts isolated from layouts and viewports.",
        sourceKind: "sanitized-artifact",
        isSanitized: true
      },
      {
        src: "/projects/cad-understanding/space-hypotheses.webp",
        alt: "CAD-derived space hypotheses with unresolved geometry markers",
        type: "image",
        caption: "Real artifact: CAD-derived space hypotheses with unresolved geometry visible.",
        sourceKind: "sanitized-artifact",
        isSanitized: true
      },
      {
        src: "/projects/cad-understanding/boundary-graph.webp",
        alt: "Weighted boundary and opening graph over architectural linework",
        type: "image",
        caption: "Real artifact: weighted boundary/opening graph and anchors.",
        sourceKind: "sanitized-artifact",
        isSanitized: true
      }
    ],
    featuredMetric: { value: "28", label: "exact drawing contexts discovered in current artifact" },
    metrics: [
      { value: "283", label: "evidence groups" },
      { value: "51", label: "reused semantic evidence hypotheses" },
      { value: "AI off", label: "external calls require explicit capped permission" }
    ],
    problem:
      "Started from the CAD file because architectural drawings contain exact geometry and metadata, while generic vision models, candidate boxes, and layer-name heuristics fail on real CAD exports.",
    constraints: [
      "AI cannot generate accepted coordinates, polygons, final labels, or BOQ quantities.",
      "External AI is off by default, capped by call count and cost, and never retried automatically.",
      "Uncertain geometry must stay unresolved and reviewable rather than being hidden behind false confidence."
    ],
    architecture: [
      "Lossless DXF extraction captures entities, metadata, geometry, blocks, layouts, transforms, and bounds.",
      "Nested block and MINSERT expansion produce exact world-space primitives with source ancestry.",
      "Paper-space viewport and model-space context isolation separates real drawing contexts from sheets.",
      "Evidence groups are interpreted into continuous operational affordances, then constrained by geometry-compatible graph construction."
    ],
    implementation: [
      "Moved the active product path away from generic focus boxes toward architectural reconstruction.",
      "Built review artifacts with contexts, evidence layers, weighted graphs, space polygons, crops, unresolved geometry, provenance, and audits.",
      "Documented failure analysis across SAM, GDINO, VLM, and layer heuristic experiments."
    ],
    outcomes: [
      "Produced an artifact that discovers 28 exact drawing contexts and selects GF-WORKING/FF-WORKING for reconstruction.",
      "Grouped 283 pieces of evidence and reused 51 semantic evidence hypotheses.",
      "The decoder reconstructs small CAD-aligned spaces while keeping large unresolved spaces explicit."
    ],
    stack: ["Python", "DXF/DWG", "OpenAI optional", "Geometry", "Graph reconstruction", "Visual QA", "Unittest"],
    lessons: [
      "Geometry should measure and constrain; intelligence should interpret evidence under a strict contract.",
      "A useful CAD product must show unresolved states honestly because false certainty is worse than incomplete output."
    ],
    caseStudy: {
      layoutKind: "cad",
      evidenceSources: [
        "Start-up README",
        "CAD project CLAUDE.md",
        "architectural_reconstruction_final artifacts",
        "CAD unittest and lessons documents"
      ],
      visualSpec:
        "Blueprint artifact gallery with safety-contract panel, exact context isolation, evidence graph, space hypotheses, and unresolved geometry.",
      technicalPanels: [
        {
          eyebrow: "Extraction",
          title: "CAD facts are extracted before meaning is assigned.",
          text: "The pipeline reads DXF geometry, metadata, blocks, layouts, transforms, and bounds without asking AI to guess geometry.",
          items: ["read_dxf_scene", "Nested insert expansion", "World-space primitives", "Source ancestry"]
        },
        {
          eyebrow: "Interpretation",
          title: "AI can score affordances, not draw the building.",
          text: "Capped AI interpretation produces continuous affordance scores such as boundary support, opening support, space anchors, documentation likelihood, and task relevance.",
          items: ["External AI off by default", "Cost/call caps", "Malformed output rejected", "No AI-generated coordinates accepted"]
        },
        {
          eyebrow: "Review",
          title: "The artifact is a review surface, not a black box.",
          text: "The reconstruction output shows contexts, evidence, weighted graph state, CAD-derived spaces, unresolved geometry, and provenance for technical review.",
          items: ["architectural_reconstruction_delta.html", "Space crops", "Unresolved geometry", "Secondary evidence audit"]
        }
      ]
    }
  },
  {
    slug: "melodymind",
    title: "MelodyMind",
    category: "Multimodal AI music product",
    status: "Academic product",
    confidentiality: "Academic",
    summary:
      "Co-built an academic multimodal music companion that turns text, image, or voice into playlists — carried from CLAP-InfoNCE embedding alignment through a FastAPI backend to a React Native / Expo app.",
    proof:
      "Rare research-to-product range: I worked on the embedding alignment (stabilized after 17 epochs) and the FastAPI backend, Pinecone search, and mobile UX around it — model and product as one system.",
    pitch:
      "Connected model work with product delivery in MelodyMind: emotion-aware audio/text embeddings became a mobile app for text, image, and voice-driven playlist generation.",
    role: "Co-builder, full-stack and AI systems",
    dates: "2025-2026",
    icon: Music2,
    links: [],
    thumbnail: {
      src: "/projects/melodymind/thesis-page-40.webp",
      alt: "MelodyMind thesis screenshot showing image query and playlist results",
      type: "image",
      caption: "Thesis screenshot showing the product flow.",
      sourceKind: "thesis-evidence",
      isSanitized: true
    },
    media: [
      {
        src: "/projects/melodymind/thesis-page-39.webp",
        alt: "MelodyMind thesis page with mobile login and chat playlist screenshots",
        type: "image",
        caption: "Thesis figure showing mobile authentication and chat-driven playlist generation.",
        sourceKind: "thesis-evidence",
        isSanitized: true
      },
      {
        src: "/projects/melodymind/thesis-page-40.webp",
        alt: "MelodyMind thesis page with image query, text query, and playlist result screenshots",
        type: "image",
        caption: "Thesis figure showing image-based query and generated playlist results.",
        sourceKind: "thesis-evidence",
        isSanitized: true
      }
    ],
    featuredMetric: { value: "17 epochs", label: "CLAP-InfoNCE training stabilized after projection alignment" },
    metrics: [
      { value: "CLAP-InfoNCE", label: "audio and emotion embedding alignment" },
      { value: "3 modes", label: "text, image, and voice playlist input" },
      { value: "FastAPI + Expo", label: "backend and mobile product implementation" },
      { value: "Spotify", label: "OAuth and playlist export path" }
    ],
    problem:
      "MelodyMind was built around how people actually describe music intent: emotion, context, images, and voice instead of only popularity or static mood labels.",
    constraints: [
      "Naive text/audio models collapsed or failed to capture abstract cues like focus, nostalgia, celebration, and social context.",
      "The app needed to connect the model path to a complete product workflow.",
      "Stem separation, voice interaction, Spotify export, embeddings, persistence, and mobile UX had to fit into one coherent system."
    ],
    architecture: [
      "CLAP audio features are projected toward Nomic emotional text embeddings using an InfoNCE objective.",
      "FastAPI backend exposes auth, chat, voice, image, Spotify, health, embedding, and search routes.",
      "Supabase/PostgreSQL persists users, refresh tokens, chats, playlist logs, and image metadata through SQLAlchemy/Alembic.",
      "Pinecone stores song embeddings for similarity search, mood filtering, and weighted-centroid playlist construction."
    ],
    implementation: [
      "Integrated text, image, and voice flows into playlist generation rather than treating them as separate experiments.",
      "Built mobile screens for login, register, chat interface, Talk-to-DJ, API services, auth context, and chat context.",
      "Implemented health endpoints, JWT/refresh-token auth, image analysis, Whisper/Groq speech-to-text, streamed TTS, and Spotify playlist scaffolding.",
      "Included stem separation as an asynchronous educational/remix workflow with waveform visualization support."
    ],
    outcomes: [
      "Moved the project from naive prototypes to a multimodal product implementation.",
      "Delivered FastAPI services, Pinecone vector search, React Native/Expo UX, voice interaction, image-to-playlist, and database migrations in the second implementation path.",
      "Aligned CLAP audio representations with emotional text semantics after 17 epochs."
    ],
    stack: ["FastAPI", "React Native", "Expo", "Supabase", "Pinecone", "LangChain", "Spotify API", "CLAP", "Nomic", "Whisper/TTS"],
    lessons: [
      "The model path, UX, persistence, and operational endpoints need to be designed as one product system.",
      "Multimodal products need clear orchestration so text, image, voice, and retrieval feel like one experience."
    ],
    caseStudy: {
      layoutKind: "music",
      evidenceSources: [
        "MelodyMind thesis PDF",
        "Iteration 1 model retrospective",
        "Iteration 2 implementation chapter",
        "Thesis UI screenshots"
      ],
      visualSpec:
        "Music product page mixing thesis screenshots, model journey timeline, waveform/retrieval visual, mobile flow, and stem-separation module.",
      technicalPanels: [
        {
          eyebrow: "Model path",
          title: "The model evolved after naive approaches failed.",
          text: "Worked through early lyric/audio experiments, CLAP zero-shot evaluation, and a final CLAP-InfoNCE alignment path.",
          items: ["Reddit and Last.fm data", "Genius lyrics integration", "Deezer MP3 previews", "Frozen CLAP audio encoder + Nomic text embeddings"]
        },
        {
          eyebrow: "Backend",
          title: "I put the research model behind product services.",
          text: "FastAPI services handle auth, embeddings, search, agents, voice, image storage, Spotify, health checks, and migrations.",
          items: ["/api/health/live/ready", "SQLAlchemy + Alembic", "Pinecone vector search", "LangChain music and voice agents"]
        },
        {
          eyebrow: "Mobile UX",
          title: "I covered the core user flows in the app.",
          text: "React Native/Expo screens cover authentication, chat playlist generation, image upload, voice input, Talk-to-Your-DJ, and playlist results.",
          items: ["Login/register", "Chat interface", "Expo ImagePicker", "Waveform animation", "Spotify playlist export"]
        }
      ]
    }
  },
  {
    slug: "recruitment-rag-platform",
    title: "Recruitment RAG Platform",
    category: "RAG and interview automation",
    status: "Internal lab",
    confidentiality: "Internal lab",
    summary:
      "Led a 4-person lab team building end-to-end recruitment automation — candidate ingestion, semantic matching, and grounded AI interviews on Weaviate, Nomic, and Groq Llama 3.",
    proof:
      "Technical leadership plus real RAG delivery: I set service boundaries and architecture for a team and shipped retrieval-backed matching and a conversational interview agent built to a sub-5-second response target.",
    pitch:
      "I led a four-person group building an end-to-end recruitment workflow that connected candidate context, semantic matching, and structured AI interviews.",
    role: "AI research intern, team lead",
    dates: "Jun 2025 - Aug 2025",
    icon: Network,
    links: [],
    thumbnail: {
      src: "/projects/recruitment-rag/job-automation-frame-1.webp",
      alt: "Job automation workflow frame from the recruitment platform",
      type: "image",
      caption: "Recruitment automation workflow frame.",
      sourceKind: "sanitized-artifact",
      isSanitized: true
    },
    media: [
      {
        src: "/projects/recruitment-rag/interview-demo-frame-1.webp",
        alt: "Recruitment interview automation workflow frame",
        type: "image",
        caption: "Interview automation workflow frame.",
        sourceKind: "sanitized-artifact",
        isSanitized: true
      },
      {
        src: "/projects/recruitment-rag/interview-demo-frame-2.webp",
        alt: "Recruitment platform workflow frame showing the interview workflow",
        type: "image",
        caption: "Second interview automation workflow frame.",
        sourceKind: "sanitized-artifact",
        isSanitized: true
      },
      {
        src: "/projects/recruitment-rag/job-automation-frame-1.webp",
        alt: "Job automation workflow frame",
        type: "image",
        caption: "Job automation workflow frame.",
        sourceKind: "sanitized-artifact",
        isSanitized: true
      },
      {
        src: "/projects/recruitment-rag/job-automation-frame-2.webp",
        alt: "Second job automation workflow frame",
        type: "image",
        caption: "Second job automation workflow frame.",
        sourceKind: "sanitized-artifact",
        isSanitized: true
      }
    ],
    featuredMetric: { value: "4-person", label: "team led during Genesys Research Lab internship" },
    metrics: [
      { value: "Weaviate", label: "candidate and job vector database" },
      { value: "Nomic", label: "semantic embeddings for matching" },
      { value: "Llama 3", label: "Groq-powered interview agent" },
      { value: "<5s", label: "interview response target" }
    ],
    problem:
      "The workflow was built around the screening problem: resumes, GitHub, LinkedIn, ORIC, personal websites, and job descriptions live in disconnected places.",
    constraints: [
      "The system needed semantic matching rather than keyword-only filtering.",
      "Interview questions had to avoid repetition and stay grounded in candidate/job context.",
      "A four-person intern team needed clear service boundaries and delivery coordination."
    ],
    architecture: [
      "Candidate data was scraped and embedded from CVs, GitHub, LinkedIn, ORIC, and personal websites.",
      "Weaviate stored candidate/job vectors with Nomic embeddings for semantic retrieval.",
      "Groq-hosted Llama 3 enhanced job descriptions and powered conversational interview flows.",
      "FastAPI services and Docker Compose deployment supported modular lab infrastructure."
    ],
    implementation: [
      "Led architecture and execution across ingestion, retrieval, matching, interview, and deployment work.",
      "Built RAG-style matching over candidate and role context rather than relying on basic keyword filters.",
      "Coordinated service boundaries for backend, vector search, interview flow, and deployment."
    ],
    outcomes: [
      "Reduced manual screening work by automating candidate evaluation and matching pipelines.",
      "Created a structured interview agent with multi-agent behavior and no repeated questions in the documented path.",
      "Led architecture and delivery across a small AI engineering team."
    ],
    stack: ["FastAPI", "Weaviate", "Nomic", "Groq", "Llama 3", "Docker Compose", "RAG", "Async jobs"],
    lessons: [
      "RAG products need ingestion quality, retrieval design, prompt structure, evaluation, and operational deployment together.",
      "Leading a small AI team requires architecture clarity and communication as much as implementation."
    ],
    caseStudy: {
      layoutKind: "rag",
      evidenceSources: [
        "Full resume LaTeX source",
        "Genesys Research Lab internship bullets",
        "Recruitment platform project description in resume",
        "Simplabots Hunter recruitment product context"
      ],
      visualSpec:
        "Recruitment workflow with candidate context ingestion, Weaviate/Nomic retrieval, job enrichment, Llama interviews, and FastAPI/Docker deployment lanes.",
      technicalPanels: [
        {
          eyebrow: "Ingestion",
          title: "Candidate context came from multiple public and internal sources.",
          text: "Led ingestion of CV, GitHub, LinkedIn, ORIC, and personal website context into a semantic candidate store.",
          items: ["CV parsing", "GitHub profile signals", "LinkedIn/ORIC/web signals", "Candidate-job context objects"]
        },
        {
          eyebrow: "Retrieval",
          title: "Matching used semantic search rather than static keyword filters.",
          text: "Nomic embeddings and Weaviate made candidate-job matching flexible enough for role context and resume language.",
          items: ["Nomic embeddings", "Weaviate vector DB", "Enhanced job descriptions", "Semantic candidate ranking"]
        },
        {
          eyebrow: "Interview flow",
          title: "I designed the interview agent for structure and speed.",
          text: "Groq-hosted Llama 3 supported dynamic questioning with a sub-5-second response path and no repeated questions.",
          items: ["Llama 3 8B via Groq", "Conversational interview agent", "No question repetition", "FastAPI + Docker Compose deployment"]
        }
      ]
    }
  }
];

export const secondaryProjects = [
  {
    title: "Document RAG Summarizer",
    summary: "Document summarization that runs both in the cloud and fully offline, pairing FAISS retrieval with Groq or a local TinyLlama fallback.",
    stack: ["Python", "FAISS", "Groq", "TinyLlama"],
    href: "https://github.com/Mustafaiqbal2/BIG_Document_RAG",
    signal: "Offline-capable RAG"
  },
  {
    title: "CUDA Canny Optimization",
    summary: "Optimized CUDA Canny edge detection with kernel fusion, shared memory, and minimized host-device transfers for a ~48x reported speedup.",
    stack: ["CUDA", "C++", "Image processing"],
    href: "https://github.com/Mustafaiqbal2/Canny_optimization",
    signal: "~48x CUDA speedup"
  },
  {
    title: "Neural Network Acceleration",
    summary: "Six MNIST classifiers taken from a CPU baseline through CUDA, Tensor Cores, OpenACC, and cuBLAS to compare acceleration paths head to head.",
    stack: ["CUDA", "cuBLAS", "OpenACC"],
    href: "https://github.com/Mustafaiqbal2/Neural-Network_Acceleration",
    signal: "GPU optimization"
  },
  {
    title: "OpenCL Image Convolution",
    summary: "Cross-platform image convolution benchmarking naive against local-memory-tuned OpenCL kernels.",
    stack: ["OpenCL", "C++", "CMake"],
    href: "https://github.com/Mustafaiqbal2/opencl-image-convolution",
    signal: "Cross-platform GPU kernels"
  },
  {
    title: "Custom Compiler",
    summary: "A Java compiler front end covering lexical analysis, symbol tables, LL(1) parsing, AST construction, and error recovery.",
    stack: ["Java", "Compiler design", "DFA"],
    href: "https://github.com/Mustafaiqbal2/Custom-Compiler",
    signal: "Compiler internals"
  },
  {
    title: "DNA Matching with MPI",
    summary: "Parallel DNA sequence matching using an MPI master-worker split to scale across larger sequence workloads.",
    stack: ["C++", "MPI", "Distributed systems"],
    href: "https://github.com/Mustafaiqbal2/DNA-Matching-MPI",
    signal: "Distributed compute"
  },
  {
    title: "Programmatic SEO Factory",
    summary: "A programmatic SEO system that planned and generated 1,053 pages across city, product, guide, calculator, and long-tail templates.",
    stack: ["Programmatic SEO", "Schema", "Sitemaps", "Content systems"],
    href: "",
    signal: "Content systems at scale"
  }
];

export const experience: Experience[] = [
  {
    role: "Freelance Automation Engineer",
    organization: "Independent / private product work",
    dates: "2022 - Present",
    location: "Remote",
    bullets: [
      "Architected and deployed SaaS-style automation systems for email categorization, review management, domain research, CAD understanding, and agentic business tools.",
      "Implemented Next.js, Prisma, Inngest, worker, caching, batch-processing, webhook, OAuth2, and API synchronization workflows.",
      "Integrated Gmail, Google Business Profile, Stripe, Pinecone, cloud storage/email/queue services, and multiple LLM providers.",
      "Improved production-style workflows with documented speedups, smart filtering, confidence-aware routing, and cost-conscious model usage."
    ]
  },
  {
    role: "AI Research Intern, Team Lead",
    organization: "Genesys Research Lab",
    dates: "Jun 2025 - Aug 2025",
    location: "Islamabad, Pakistan",
    bullets: [
      "Led a four-person team developing an automated recruitment platform with candidate evaluation, matching, and conversational interview workflows.",
      "Engineered RAG-style document processing with Weaviate vector search and Nomic embeddings for semantic candidate-job matching.",
      "Integrated FastAPI services, asynchronous processing, Docker Compose deployment, and Groq/Llama interview flows on lab infrastructure."
    ]
  }
];

export const education = [
  {
    program: "BS Computer Science",
    institution: "National University of Computer and Emerging Sciences (FAST-NUCES), Islamabad",
    dates: "2022 - 2026",
    detail: "CGPA 3.38/4.00. Dean's List: Spring 2024, Fall 2024, and Fall 2025."
  },
  {
    program: "A Levels",
    institution: "Nixor College",
    dates: "2020 - 2022",
    detail: "Computer Science, Economics, Mathematics."
  },
  {
    program: "O Levels",
    institution: "Beaconhouse",
    dates: "2018 - 2020",
    detail: "Commerce and Computer Science."
  }
];

export const skillGroups = [
  {
    title: "AI, ML and vector search",
    items: ["LLM integration", "RAG pipelines", "OpenAI", "Llama 3 via Groq", "Nomic embeddings", "Weaviate", "FAISS", "Pinecone", "Semantic search", "Hybrid retrieval"]
  },
  {
    title: "Automation and orchestration",
    items: ["Event-driven architecture", "Inngest", "Async jobs", "Webhooks", "Cron jobs", "Batch processing", "Real-time sync", "Rate-limit-aware workflows"]
  },
  {
    title: "Backend and deployment",
    items: ["Python", "FastAPI", "Flask", "Node.js", "Next.js API routes", "Docker", "Docker Compose", "OAuth2", "JWT", "REST APIs", "Vercel", "Render"]
  },
  {
    title: "Frontend and product",
    items: ["TypeScript", "React", "Next.js", "React Native", "Expo", "Responsive UI", "Motion design", "Product debugging"]
  },
  {
    title: "Data and infrastructure",
    items: ["PostgreSQL", "Supabase", "MongoDB", "Prisma", "SQLAlchemy", "Alembic", "Connection pooling", "Query optimization", "Stripe", "AWS services"]
  },
  {
    title: "Systems fundamentals",
    items: ["CUDA", "OpenCL", "MPI", "OpenMP", "cuBLAS", "Kernel fusion", "Compiler design", "C++", "Java"]
  }
];

export const principles = [
  "I start with workflow, data ownership, failure modes, and user control before choosing the AI layer.",
  "I use deterministic logic for obvious cases and models for ambiguity, then make the handoff inspectable.",
  "I prefer measurable product behavior over examples that only work with clean data and unlimited API calls.",
  "I document implementation decisions clearly enough that founders, engineers, and future maintainers can reason about them."
];

export const navigation = [
  { label: "Home", href: "/" },
  { label: "Work", href: "/work/" },
  { label: "Resume", href: "/resume/" },
  { label: "About", href: "/about/" },
  { label: "Contact", href: "/contact/" }
];

export const pageRoutes = ["/", "/work/", "/resume/", "/about/", "/contact/", ...featuredProjects.map((project) => `/work/${project.slug}/`)];

export function getProject(slug: string) {
  return featuredProjects.find((project) => project.slug === slug);
}

export const iconMap = {
  Blocks,
  Code2,
  Gauge,
  GitBranch,
  Globe2,
  Rocket,
  ShieldCheck,
  Workflow,
  Zap
};
