import type { Metadata } from "next";
import { ArrowRight, CheckCircle2, Gauge, GitBranch, Layers3, Workflow } from "lucide-react";
import { CarouselRail } from "@/components/CarouselRail";
import { Reveal } from "@/components/Reveal";
import { focusAreas, principles, siteUrl } from "@/data/portfolio";

export const metadata: Metadata = {
  title: "About",
  description:
    "About Mustafa Iqbal, a software engineer focused on AI automation, full-stack product work, RAG systems, integrations, and startup delivery.",
  alternates: {
    canonical: `${siteUrl}/about/`
  }
};

const operatingNotes = [
  {
    title: "I build around workflows, not isolated model calls.",
    text: "Before touching prompts, I map the user action, owned data, external API state, failure modes, retry path, and what the user needs to inspect."
  },
  {
    title: "I focus on systems where product polish and backend reliability meet.",
    text: "The work I keep returning to involves OAuth, queues, caches, vector search, model cost, UI states, and the small details that make automation feel safe."
  },
  {
    title: "I present private work through architecture.",
    text: "If code or customer data cannot be public, I show the domain model, constraints, technical decisions, and approved product media."
  }
];

const buildLoop = [
  ["Trace", "Understand the current workflow and the data that actually moves."],
  ["Separate", "Use deterministic logic for clear cases and AI only where ambiguity is real."],
  ["Instrument", "Add logs, status, cache behavior, retries, and correction surfaces."],
  ["Ship", "Keep the UI understandable enough for someone else to operate the system."]
];

const fitSignals = [
  "AI products where full-stack ownership matters more than a narrow frontend/backend split.",
  "Automation workflows involving Gmail, Google Business Profile, Stripe, vector search, or messy third-party APIs.",
  "Early teams that need technical breadth, practical judgment, and enough polish to show customers quickly."
];

export default function AboutPage() {
  return (
    <main>
      <section className="page-hero compact-page-hero about-hero">
        <div className="section-inner about-hero-grid">
          <Reveal className="section-heading wide-heading">
            <p className="eyebrow">About</p>
            <h1>I work best where product, AI, and systems meet.</h1>
            <p>
              I move across product UI, APIs, data models, integrations, AI workflows, mobile surfaces, deployment,
              and debugging until the workflow is usable.
            </p>
            <div className="button-row">
              <a className="button primary" href="/work/">
                View work
                <ArrowRight size={18} aria-hidden="true" />
              </a>
              <a className="button ghost" href="/resume/">
                Resume page
              </a>
            </div>
          </Reveal>
          <Reveal className="about-range-panel" delay={0.08}>
            {focusAreas.map((area) => {
              const Icon = area.icon;
              return (
                <div key={area.title}>
                  <Icon size={22} aria-hidden="true" />
                  <strong>{area.title}</strong>
                  <span>{area.text}</span>
                </div>
              );
            })}
          </Reveal>
        </div>
      </section>

      <section className="section about-editorial-section" aria-labelledby="operating-title">
        <div className="section-inner">
          <Reveal className="editorial-statement">
            <p className="eyebrow">Operating mode</p>
            <h2 id="operating-title">Useful software is measured by behavior, observability, and recovery paths.</h2>
            <p>
              The details around state, failure, permissions, latency, and recovery determine whether an automation
              system can be trusted by users and maintained by a team.
            </p>
          </Reveal>
          <div className="about-note-row">
            {operatingNotes.map((note, index) => (
              <Reveal as="article" className="about-note" key={note.title} delay={index * 0.05}>
                <h3>{note.title}</h3>
                <p>{note.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-muted about-build-loop-section" aria-labelledby="build-loop-title">
        <div className="section-inner build-loop-grid">
          <Reveal className="section-heading">
            <p className="eyebrow">How I build</p>
            <h2 id="build-loop-title">A consistent build loop across different domains.</h2>
            <p>
              Revvy, Emmy, MelodyMind, the CAD project, and the recruitment RAG platform are different domains, but the
              engineering loop is similar.
            </p>
          </Reveal>
          <Reveal className="build-loop-shell" delay={0.08}>
            <CarouselRail label="Build loop" className="build-loop-carousel" itemClassName="build-loop-item">
              {buildLoop.map(([title, text], index) => {
                const icons = [Workflow, GitBranch, Gauge, Layers3];
                const Icon = icons[index];
                return (
                  <article className="build-step" key={title}>
                    <Icon size={22} aria-hidden="true" />
                    <strong>{title}</strong>
                    <span>{text}</span>
                  </article>
                );
              })}
            </CarouselRail>
          </Reveal>
        </div>
      </section>

      <section className="section about-fit-section-v2" aria-labelledby="fit-title">
        <div className="section-inner fit-editorial-grid">
          <Reveal className="fit-callout">
            <p className="eyebrow">Role fit</p>
            <h2 id="fit-title">The roles that make sense are broad, technical, and close to product.</h2>
          </Reveal>
          <div className="fit-signal-stack">
            {fitSignals.map((signal, index) => (
              <Reveal as="article" className="fit-signal" key={signal} delay={index * 0.05}>
                <CheckCircle2 size={20} aria-hidden="true" />
                <p>{signal}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-muted about-principles-section" aria-labelledby="principles-title">
        <div className="section-inner">
          <Reveal className="section-heading">
            <p className="eyebrow">Engineering principles</p>
            <h2 id="principles-title">The standards I use when AI touches real workflows.</h2>
          </Reveal>
          <CarouselRail label="Engineering principles" className="principles-carousel" itemClassName="principle-carousel-item">
            {principles.map((principle, index) => (
              <Reveal as="article" className="principle-card" key={principle} delay={index * 0.04}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{principle}</p>
              </Reveal>
            ))}
          </CarouselRail>
        </div>
      </section>
    </main>
  );
}
