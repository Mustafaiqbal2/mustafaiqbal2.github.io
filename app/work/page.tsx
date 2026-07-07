import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { WorkRow } from "@/components/WorkRow";
import { featuredProjects, platformContribution, secondaryProjects, siteUrl } from "@/data/portfolio";

export const metadata: Metadata = {
  title: "Work",
  description:
    "Selected AI automation and full-stack projects: review-response automation, thread-aware email categorization, a recruitment RAG platform, AI ad-creative generation, and an evidence-first CAD foundation — each with the architecture decision behind it.",
  alternates: { canonical: `${siteUrl}/work/` }
};

export default function WorkPage() {
  return (
    <main id="main">
      <section className="section" style={{ paddingBottom: "clamp(24px, 4vw, 40px)" }}>
        <div className="wrap prose">
          <Reveal>
            <p className="eyebrow">Selected work</p>
            <h1>Systems I designed, built, or led — and can defend.</h1>
            <p className="lede" style={{ marginTop: 20 }}>
              Each project below started as a real operational problem and became a shipped pipeline. Private and client
              work is described by problem, scale, and my role — customer data and internal detail stay confidential, and
              I&apos;m glad to walk through the architecture on request.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <Reveal className="work-list">
            {featuredProjects.map((project, index) => (
              <WorkRow project={project} index={index} key={project.slug} />
            ))}
          </Reveal>
        </div>
      </section>

      <section className="section section--divided" aria-labelledby="platform-title">
        <div className="wrap prose">
          <Reveal>
            <p className="eyebrow">Team contribution</p>
            <h2 id="platform-title">{platformContribution.title}</h2>
            <p className="lede" style={{ marginTop: 16 }}>
              {platformContribution.role}
            </p>
            <p style={{ marginTop: 16, color: "var(--ink-2)", lineHeight: 1.7 }}>{platformContribution.summary}</p>
            <p className="muted" style={{ marginTop: 12, fontSize: "0.9rem" }}>
              {platformContribution.note}
            </p>
          </Reveal>
        </div>
      </section>

      <section className="section section--divided" aria-labelledby="also-title">
        <div className="wrap">
          <Reveal className="section__head">
            <p className="eyebrow">Also built</p>
            <h2 id="also-title">Agents, systems, and foundations</h2>
            <p>Smaller builds and lower-level work — a domain agent, a content-systems engine, and HPC / compiler projects.</p>
          </Reveal>
          <div className="pillar-grid">
            {secondaryProjects.map((project, index) => {
              const Icon = project.icon;
              const inner = (
                <>
                  <Icon aria-hidden="true" />
                  <span className="status-tag" style={{ marginBottom: 6 }}>
                    {project.signal}
                  </span>
                  <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {project.title}
                    {project.href ? <ArrowUpRight size={16} aria-hidden="true" style={{ color: "var(--muted)" }} /> : null}
                  </h3>
                  <p>{project.summary}</p>
                </>
              );
              return (
                <Reveal as="article" className="pillar" key={project.title} delay={index * 0.04}>
                  {project.href ? (
                    <a href={project.href} target="_blank" rel="noreferrer" style={{ display: "grid", gap: 6 }}>
                      {inner}
                    </a>
                  ) : (
                    inner
                  )}
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
