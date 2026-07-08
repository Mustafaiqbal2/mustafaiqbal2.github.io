import { ArrowRight, FileText } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { StatBlock } from "@/components/Evidence";
import { WorkRow } from "@/components/WorkRow";
import { evidence, featuredProjects, pillars, profile } from "@/data/portfolio";

const homeProjects = featuredProjects.slice(0, 4);

const coreStack = [
  "Next.js",
  "TypeScript",
  "Python · FastAPI",
  "PostgreSQL · Prisma",
  "OpenAI · Anthropic · Google",
  "Pinecone · Weaviate",
  "AWS",
  "Docker",
  "pg-boss · Inngest"
];

export default function Home() {
  return (
    <main id="main">
      <section className="hero" aria-labelledby="hero-title">
        <div className="wrap hero-grid hero-grid--split">
          <div>
            <p className="hero__avail">
              <i aria-hidden="true" />
              Open to new-grad &amp; junior roles · Islamabad, PK · graduating 2026
            </p>
            <h1 className="hero__statement" id="hero-title">
              I build AI automation that runs in <em>production</em> — not demos.
            </h1>
            <p className="hero__sub">
              I turn high-volume operational work — inbox triage, review response, candidate evaluation, creative
              generation — into autonomous, event-driven systems. Full-stack, end to end: OAuth and API integrations,
              background-job pipelines, cost-aware LLM generation, and the operator dashboards that keep humans in
              control.
            </p>
            <div className="btn-row hero__cta">
              <a className="btn btn--primary" href="/work/">
                View the work
                <ArrowRight aria-hidden="true" />
              </a>
              <a className="btn btn--ghost" href={profile.resumePdf} download>
                <FileText aria-hidden="true" />
                Download résumé
              </a>
            </div>
          </div>

          <Reveal className="card" delay={0.06}>
            <div style={{ padding: "24px" }}>
              <p className="eyebrow" style={{ marginBottom: 20 }}>
                Selected evidence
              </p>
              <div className="stack-v">
                {evidence.map((metric) => (
                  <StatBlock key={metric.label} metric={metric} />
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <div className="stackstrip section--alt" aria-label="Core stack">
        <div className="wrap stackstrip__inner">
          <span className="stackstrip__label">Core stack</span>
          <div className="stackstrip__items">
            {coreStack.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
      </div>

      <section className="section section--divided" aria-labelledby="work-title">
        <div className="wrap">
          <Reveal className="section__head">
            <p className="eyebrow">
              <b>01</b> — Selected work
            </p>
            <h2 id="work-title">Systems built to run unattended</h2>
            <p>
              A focused set of projects, each with a clear problem, an architecture decision worth defending, and an
              honest account of what shipped. Private and client work is described by domain, scale, and role — never by
              customer data.
            </p>
          </Reveal>
          <Reveal className="work-list" delay={0.05}>
            {homeProjects.map((project, index) => (
              <WorkRow project={project} index={index} key={project.slug} />
            ))}
          </Reveal>
          <div style={{ marginTop: 32 }}>
            <a className="textlink" href="/work/">
              See all work
              <ArrowRight aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      <section className="section section--alt" aria-labelledby="how-title">
        <div className="wrap">
          <Reveal className="section__head">
            <p className="eyebrow">
              <b>02</b> — How I work
            </p>
            <h2 id="how-title">Production thinking, not just prompts</h2>
            <p>The model is usually the last decision, not the first. Most of the engineering is everything around it.</p>
          </Reveal>
          <div className="pillar-grid">
            {pillars.map((pillar, index) => {
              const Icon = pillar.icon;
              return (
                <Reveal as="article" className="pillar" key={pillar.title} delay={index * 0.05}>
                  <Icon aria-hidden="true" />
                  <h3>{pillar.title}</h3>
                  <p>{pillar.text}</p>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section section--divided" aria-labelledby="lead-title">
        <div className="wrap">
          <div className="about-split">
            <Reveal>
              <p className="eyebrow">
                <b>03</b> — Beyond solo builds
              </p>
              <h2 id="lead-title">Team leadership and research depth</h2>
            </Reveal>
            <Reveal className="stack-v" delay={0.06}>
              <p style={{ color: "var(--ink-2)", lineHeight: 1.7 }}>
                I led a four-person AI research team at Genesys Research Lab, delivering a RAG-based recruitment
                evaluation platform on lab infrastructure.
              </p>
              <p style={{ color: "var(--ink-2)", lineHeight: 1.7 }}>
                Separately, I contributed across a production multi-tenant agentic AI SaaS platform — multi-tenant
                billing, multi-model routing, an AWS pipeline, and vector search — as one engineer on a larger team.
              </p>
              <p style={{ color: "var(--ink-2)", lineHeight: 1.7 }}>
                I co-built a multimodal music-recommendation system as a final-year thesis, and I&apos;m the technical
                founder of an early-stage startup building evidence-grounded CAD intelligence — with the discipline to
                know when not to build.
              </p>
              <div className="btn-row" style={{ marginTop: 8 }}>
                <a className="textlink" href="/about/">
                  More about how I work
                  <ArrowRight aria-hidden="true" />
                </a>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </main>
  );
}
