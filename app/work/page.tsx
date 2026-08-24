import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { WorkRow } from "@/components/WorkRow";
import { featuredProjects, platformContribution, profile, secondaryProjects, siteUrl } from "@/data/portfolio";
import "@/app/landing.css";
import "@/app/work.css";

export const metadata: Metadata = {
  title: "Work",
  description:
    "Six projects in depth — ArchPHI, PiloneCables, TalentFlow, Revvy, Emmy, and MelodyMind — plus the smaller builds around them.",
  alternates: { canonical: `${siteUrl}/work/` }
};

export default function WorkPage() {
  return (
    <main id="main" className="wk">
      <div className="wk-top">
        <div className="lv-topbar lv-mono">
          <a className="lv-topbar__brand" href="/">
            &gt;Mustafa<i aria-hidden="true" />
          </a>
          <a className="lv-topbar__link" href={`mailto:${profile.email}`}>
            Talk to me <ArrowUpRight />
          </a>
        </div>
      </div>

      <section className="section wk-hero">
        <div className="wrap">
          <Reveal>
            <p className="eyebrow">Selected work</p>
            <h1>
              Work<b>.</b>
            </h1>
            <p className="lede">
              Companies, client systems, and a thesis — each with the decisions behind it. Client work is described by
              problem, scale, and role; customer data stays out.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="work-list" data-stagger>
            {featuredProjects.map((project, index) => (
              <WorkRow project={project} index={index} key={project.slug} />
            ))}
          </div>
        </div>
      </section>

      <section className="section section--divided" aria-labelledby="platform-title">
        <div className="wrap editorial">
          <Reveal className="editorial__aside">
            <p className="eyebrow">Team contribution</p>
            <h2 id="platform-title">{platformContribution.title}</h2>
          </Reveal>
          <Reveal className="editorial__body" delay={0.06}>
            <p className="lede">{platformContribution.role}</p>
            <p className="editorial__text">{platformContribution.summary}</p>
            <p className="muted">{platformContribution.note}</p>
          </Reveal>
        </div>
      </section>

      <section className="section section--divided" aria-labelledby="also-title">
        <div className="wrap">
          <Reveal className="section__head">
            <p className="eyebrow">Also built</p>
            <h2 id="also-title">Smaller builds.</h2>
          </Reveal>
          <div className="pillar-grid">
            {secondaryProjects.map((project, index) => {
              const Icon = project.icon;
              const inner = (
                <>
                  <Icon aria-hidden="true" />
                  <span className="status-tag">{project.signal}</span>
                  <h3>
                    {project.title}
                    {project.href ? <ArrowUpRight size={15} aria-hidden="true" /> : null}
                  </h3>
                  <p>{project.summary}</p>
                </>
              );
              return (
                <Reveal as="article" className="pillar" key={project.title} delay={index * 0.04}>
                  {project.href ? (
                    <a href={project.href} target="_blank" rel="noreferrer">
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
