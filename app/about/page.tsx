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
    text: "Before I touch a prompt, I map the user action, the data I own, the external API's state, the failure modes, the retry path, and what the user needs to see. The model is usually the last decision, not the first."
  },
  {
    title: "I reach for the seam where product polish meets backend reliability.",
    text: "The work I keep returning to lives in OAuth, queues, caches, vector search, model cost, and UI states — the small details that make automation feel safe to hand to a real user."
  },
  {
    title: "I present private work through its architecture.",
    text: "When code or customer data can't be public, I don't hand-wave it. I show the domain model, the constraints I worked under, the decisions I made, and approved product media — enough for an engineer to evaluate the real work."
  }
];

const buildLoop = [
  ["Trace", "Map the real workflow and the data that actually moves through it before writing a line."],
  ["Separate", "Deterministic logic handles the obvious cases; AI is reserved for genuine ambiguity. On Emmy, known senders route on rules and only unclear mail reaches the model."],
  ["Instrument", "Add logs, status, cache behavior, retries, and correction surfaces — so the system is inspectable, not a black box."],
  ["Ship", "Keep the interface clear enough that someone who didn't build it can operate and trust it."]
];

const fitSignals = [
  "AI products where full-stack ownership matters more than a clean frontend/backend split — someone who can carry a feature from data model to shipped UI.",
  "Automation work over messy real-world APIs — Gmail, Google Business Profile, Stripe, vector search — where correctness, cost, and recovery all matter at once.",
  "Early teams that need technical breadth, practical judgment, and enough polish to put something in front of customers quickly."
];

export default function AboutPage() {
  return (
    <main id="top">
      <section className="page-hero compact-page-hero about-hero">
        <div className="section-inner about-hero-grid">
          <Reveal className="section-heading wide-heading">
            <p className="eyebrow">About</p>
            <h1>Most AI demos work once. I build the version that runs every day.</h1>
            <p>
              I&apos;m a full-stack engineer who works end to end — product UI, APIs, data models, third-party
              integrations, retrieval, and the queues, caching, and recovery paths underneath. I&apos;ve built private
              automation products around Gmail, Google Business Profile, and Stripe, and led a four-person AI research
              team at Genesys Research Lab. What I care about most is the part of a system that only shows up under real
              load: state, failure, latency, and what the user is allowed to correct.
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
            <h2 id="operating-title">I judge software by how it behaves when something goes wrong.</h2>
            <p>
              Anyone can make a model return text. The parts that decide whether a team can trust and maintain an
              automation system are less visible: state, permissions, latency, failure modes, and whether a user can see
              what happened and undo it. That&apos;s the layer I build for.
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
            <h2 id="build-loop-title">One build loop, whatever the domain.</h2>
            <p>
              Review automation, email triage, a CAD reconstruction engine, a multimodal music app, a recruitment RAG
              platform — different problems, same loop. It&apos;s the loop that produced measurable results, not the
              individual domain.
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
            <h2 id="fit-title">The roles that fit are broad, technical, and close to the product.</h2>
          </Reveal>
          <div className="fit-signal-stack">
            {fitSignals.map((signal, index) => (
              <Reveal as="article" className="fit-signal" key={signal} delay={index * 0.05}>
                <CheckCircle2 size={20} aria-hidden="true" />
                <p>{signal}</p>
              </Reveal>
            ))}
            <Reveal className="fit-invite" delay={0.2}>
              <a className="text-link" href="/contact/">
                If that&apos;s the shape of the role, I&apos;d like to talk
                <ArrowRight size={17} aria-hidden="true" />
              </a>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="section section-muted about-principles-section" aria-labelledby="principles-title">
        <div className="section-inner">
          <Reveal className="section-heading">
            <p className="eyebrow">Engineering principles</p>
            <h2 id="principles-title">The standards I hold when AI touches a real workflow.</h2>
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
