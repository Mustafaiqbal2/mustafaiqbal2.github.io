import { ArrowRight, Command, Download } from "lucide-react";
import { FeatureIndex } from "@/components/FeatureIndex";
import { PipelineMonitor } from "@/components/PipelineMonitor";
import { Reveal } from "@/components/Reveal";
import { featuredProjects, focusAreas, principles, profile, proofMetrics } from "@/data/portfolio";

const heroLines = [
  ["I", "build", "AI", "automation"],
  ["that", "survives", "contact"],
  ["with", "production."]
];

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
          <div className="hero-copy">
            <p className="hero-status">
              <i aria-hidden="true" />
              Open to remote roles — Rawalpindi, PK — UTC+5
            </p>
            <h1 id="hero-title" data-kinetic>
              {heroLines.map((line, lineIndex) => (
                <span className="hero-line" key={lineIndex}>
                  <span className="hero-line-inner">
                    {line.map((word, wordIndex) => (
                      <span className="kw" data-kw key={`${lineIndex}-${wordIndex}`}>
                        {word}
                      </span>
                    ))}
                  </span>
                </span>
              ))}
            </h1>
            <p className="hero-summary">{profile.elevatorPitch}</p>
            <div className="hero-actions">
              <a className="button primary" href="/work/">
                See the work
                <ArrowRight size={18} aria-hidden="true" />
              </a>
              <button className="button ghost" type="button" data-console-open>
                <Command size={17} aria-hidden="true" />
                Console
                <kbd className="button-key">⌘K</kbd>
              </button>
              <a className="button ghost" href={profile.resume}>
                <Download size={17} aria-hidden="true" />
                Résumé
              </a>
            </div>
          </div>

          <Reveal className="hero-monitor" delay={0.1}>
            <PipelineMonitor />
          </Reveal>
        </div>
        <a className="hero-scroll-cue" href="#telemetry" aria-label="Scroll to measured outcomes">
          Scroll
          <i aria-hidden="true" />
        </a>
      </section>

      <section className="telemetry-band" id="telemetry" aria-label="Measured outcomes">
        <div className="section-inner telemetry-grid">
          {proofMetrics.map((metric) => (
            <div className="telemetry-item" data-ignite={metric.stage} key={metric.label}>
              <strong data-decode suppressHydrationWarning>
                {metric.value}
              </strong>
              <span>{metric.label}</span>
              <i className="telemetry-spark" aria-hidden="true" />
            </div>
          ))}
        </div>
      </section>

      <div className="stack-log" aria-hidden="true">
        <div className="section-inner stack-log-inner">
          <span className="stack-log-prompt">
            stack ~ tail -f
            <i className="stack-cursor" />
          </span>
          <div className="stack-log-viewport">
            <div className="stack-log-track">
              {[...stackTicker, ...stackTicker].map((item, index) => (
                <span key={`${item}-${index}`}>{item}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <section className="section" aria-labelledby="focus-title">
        <div className="section-inner split-intro">
          <Reveal className="section-heading">
            <p className="eyebrow">Engineering focus</p>
            <h2 id="focus-title">A product-heavy generalist, not a prompt jockey.</h2>
            <p>
              I work across product surfaces, APIs, data models, async jobs, retrieval, cost controls, and UI states so
              automation workflows stay understandable long after the first successful run.
            </p>
          </Reveal>
          <Reveal className="focus-grid" delay={0.08}>
            {focusAreas.map((area) => {
              const Icon = area.icon;
              return (
                <article className="focus-card" data-spotlight key={area.title}>
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
            <p className="eyebrow">Selected work — 06 systems</p>
            <h2 id="selected-work-title">Six systems I designed, built, or led — and measured.</h2>
            <p>
              Each one had a real bottleneck, an architecture I chose to fix it, and an outcome I can defend. Open any
              row for the full case study — or press{" "}
              <button className="inline-key" type="button" data-console-open aria-label="Open command console">
                ⌘K
              </button>{" "}
              to jump straight to one.
            </p>
          </Reveal>
          <Reveal delay={0.06}>
            <FeatureIndex projects={featuredProjects} />
          </Reveal>
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
            <h2 id="resume-preview-title">Judgment over output — what CTOs screen for.</h2>
            <p>
              FAST-NUCES BS CS candidate with production-style automation work, a Genesys Research Lab internship,
              Dean&apos;s List recognition three times, and systems projects in CUDA, OpenCL, MPI, RAG, and compilers.
            </p>
            <div className="button-row">
              <a className="button primary" href="/resume/">
                Resume page
                <ArrowRight size={18} aria-hidden="true" />
              </a>
              <a className="button ghost" href={profile.resume}>
                <Download size={18} aria-hidden="true" />
                PDF résumé
              </a>
            </div>
          </Reveal>
          <Reveal className="principle-panel" delay={0.08}>
            <div className="panel-kicker">
              <span className="panel-dot" aria-hidden="true" />
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
