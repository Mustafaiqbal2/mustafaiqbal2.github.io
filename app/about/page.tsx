import type { Metadata } from "next";
import { ArrowRight, CheckCircle2, Gauge, GitBranch, Layers3, Workflow } from "lucide-react";
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
    title: "I build around workflows, not model demos.",
    text: "Before touching prompts, I map the user action, owned data, external API state, failure modes, retry path, and what the user needs to inspect."
  },
  {
    title: "I like systems where product polish and backend reliability meet.",
    text: "The work I keep returning to involves OAuth, queues, caches, vector search, model cost, UI states, and the small details that make automation feel safe."
  },
  {
    title: "I present private work through architecture and evidence.",
    text: "If code or customer data cannot be public, I still show the domain model, constraints, source-backed media, and what changed technically."
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
            <h1>I own the path from ambiguous product problem to working system.</h1>
            <p>
              My best work is not tied to one layer of the stack. I move across product UI, APIs, data models,
              integrations, AI workflows, mobile surfaces, deployment, and debugging until the workflow is real.
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
            <h2 id="operating-title">Useful software is measured by behavior, evidence, and recovery paths.</h2>
            <p>
              The portfolio is intentionally specific because I want the work to be evaluated on product behavior,
              architecture, constraints, and implementation details. If a claim cannot be tied to a repo, thesis, resume,
              local artifact, or documented outcome, it does not deserve prominent space.
            </p>
          </Reveal>
          <div className="about-note-row">
            {operatingNotes.map((note, index) => (
              <Reveal as="article" className="about-note" key={note.title} delay={index * 0.05}>
                <span>{String(index + 1).padStart(2, "0")}</span>
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
            <h2 id="build-loop-title">The same debugging loop shows up across my projects.</h2>
            <p>
              Revvy, Emmy, MelodyMind, the CAD project, and the recruitment RAG platform are different domains, but the
              engineering loop is similar.
            </p>
          </Reveal>
          <Reveal className="build-loop" delay={0.08}>
            {buildLoop.map(([title, text], index) => {
              const icons = [Workflow, GitBranch, Gauge, Layers3];
              const Icon = icons[index];
              return (
                <div key={title}>
                  <Icon size={22} aria-hidden="true" />
                  <strong>{title}</strong>
                  <span>{text}</span>
                </div>
              );
            })}
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
          <div className="principles-grid">
            {principles.map((principle, index) => (
              <Reveal as="article" className="principle-card" key={principle} delay={index * 0.04}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{principle}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
