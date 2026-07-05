import { ArrowRight, BriefcaseBusiness, Download, Sparkles } from "lucide-react";
import { CarouselRail } from "@/components/CarouselRail";
import { ContactActions } from "@/components/ContactActions";
import { ProjectCard } from "@/components/ProjectCard";
import { Reveal } from "@/components/Reveal";
import { featuredProjects, focusAreas, principles, profile, proofMetrics } from "@/data/portfolio";

const selectedProjects = featuredProjects.slice(0, 4);

const stackTicker = [
  "Next.js",
  "TypeScript",
  "FastAPI",
  "Python",
  "Prisma",
  "PostgreSQL",
  "Pinecone",
  "Weaviate",
  "OpenAI",
  "LangChain",
  "React Native",
  "Stripe",
  "AWS",
  "Docker",
  "Inngest",
  "CUDA",
  "OpenCL",
  "MPI"
];

export default function Home() {
  return (
    <main id="top">
      <section className="landing-hero" aria-labelledby="hero-title">
        <canvas className="workflow-trace" data-workflow-trace aria-hidden="true" />
        <div className="section-inner hero-stage">
          <p className="hero-status">
            <i aria-hidden="true" />
            Open to remote roles — Rawalpindi, PK — UTC+5
          </p>
          <h1 id="hero-title">
            <span className="hero-line">
              <span>I build AI automation</span>
            </span>
            <span className="hero-line">
              <span>that survives contact</span>
            </span>
            <span className="hero-line">
              <span>with production.</span>
            </span>
          </h1>
          <p className="hero-summary">{profile.elevatorPitch}</p>
          <div className="hero-actions">
            <ContactActions links={profile} />
          </div>
        </div>
        <a className="hero-scroll-cue" href="#telemetry" aria-label="Scroll to measured outcomes">
          Scroll
          <i aria-hidden="true" />
        </a>
      </section>

      <section className="telemetry-band" id="telemetry" aria-label="Measured outcomes">
        <div className="section-inner telemetry-grid">
          {proofMetrics.map((metric) => (
            <div className="telemetry-item" key={metric.label}>
              <strong data-decode suppressHydrationWarning>{metric.value}</strong>
              <span>{metric.label}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="stack-marquee" aria-hidden="true">
        <div className="stack-marquee-track">
          {[...stackTicker, ...stackTicker].map((item, index) => (
            <span key={`${item}-${index}`}>{item}</span>
          ))}
        </div>
      </div>

      <section className="section" aria-labelledby="fit-title">
        <div className="section-inner split-intro">
          <Reveal className="section-heading">
            <p className="eyebrow">Engineering focus</p>
            <h2 id="fit-title">Generalist software engineer for product-heavy AI systems.</h2>
            <p>
              I work across product surfaces, APIs, data models, async jobs, retrieval, cost controls, and UI states
              so automation workflows remain understandable after the first successful run.
            </p>
          </Reveal>
          <Reveal className="focus-grid" delay={0.08}>
            {focusAreas.map((area) => {
              const Icon = area.icon;
              return (
                <article className="focus-card" key={area.title}>
                  <Icon size={24} aria-hidden="true" />
                  <h3>{area.title}</h3>
                  <p>{area.text}</p>
                </article>
              );
            })}
          </Reveal>
        </div>
      </section>

      <section className="section section-muted" aria-labelledby="selected-work-title">
        <div className="section-inner">
          <Reveal className="section-heading wide-heading">
            <p className="eyebrow">Selected work — 04 systems</p>
            <h2 id="selected-work-title">Selected work with role, architecture, and outcomes.</h2>
            <p>
              These projects show shipped automation, research systems, and implementation details across
              integrations, retrieval, product UI, and performance-sensitive code.
            </p>
          </Reveal>
          <CarouselRail label="Selected work" className="project-card-carousel" itemClassName="project-carousel-item" auto>
            {selectedProjects.map((project, index) => (
              <Reveal key={project.slug} delay={index * 0.06}>
                <ProjectCard project={project} priority={index === 0} />
              </Reveal>
            ))}
          </CarouselRail>
          <Reveal className="center-cta">
            <a className="button primary" href="/work/">
              View all work
              <ArrowRight size={18} aria-hidden="true" />
            </a>
          </Reveal>
        </div>
      </section>

      <section className="section" aria-labelledby="resume-preview-title">
        <div className="section-inner resume-preview">
          <Reveal className="resume-preview-copy">
            <p className="eyebrow">Background</p>
            <h2 id="resume-preview-title">Engineering background across automation, research, and systems.</h2>
            <p>
              FAST-NUCES BS CS candidate with production-style automation work, a Genesys Research Lab internship,
              Dean's List recognition, and systems projects in CUDA, OpenCL, MPI, RAG, and compilers.
            </p>
            <div className="button-row">
              <a className="button primary" href="/resume/">
                Resume page
                <BriefcaseBusiness size={18} aria-hidden="true" />
              </a>
              <a className="button ghost" href={profile.resume}>
                PDF resume
                <Download size={18} aria-hidden="true" />
              </a>
            </div>
          </Reveal>
          <Reveal className="principle-panel" delay={0.08}>
            <div className="panel-kicker">
              <Sparkles size={18} aria-hidden="true" />
              How I build
            </div>
            {principles.map((principle) => (
              <div className="principle-row" key={principle}>
                <span aria-hidden="true" />
                <p>{principle}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

    </main>
  );
}
