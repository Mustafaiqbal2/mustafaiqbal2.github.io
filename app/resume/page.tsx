import type { Metadata } from "next";
import { ArrowRight, Mail } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { education, experience, profile, siteUrl, skillGroups } from "@/data/portfolio";

export const metadata: Metadata = {
  title: "Résumé",
  description:
    "Experience, projects, and technical foundation. Freelance automation engineer since 2022, team lead at Genesys Research Lab, graduating FAST-NUCES 2026.",
  alternates: { canonical: `${siteUrl}/resume/` }
};

export default function ResumePage() {
  return (
    <main id="main">
      <section className="section page-hero">
        <div className="wrap">
          <Reveal>
            <p className="eyebrow">Résumé</p>
            <h1>Experience, projects, and foundation.</h1>
            <p className="lede" style={{ marginTop: 20 }}>
              Final-year CS student at FAST-NUCES Islamabad (graduating 2026), building production AI automation as a
              freelancer since 2022, and team lead of a four-person AI research group at Genesys Research Lab in 2025.
            </p>
            <div className="btn-row" style={{ marginTop: 26 }}>
              <a className="btn btn--primary" href="/work/">
                View case studies
                <ArrowRight aria-hidden="true" />
              </a>
              <a className="btn btn--ghost" href={`mailto:${profile.email}`}>
                <Mail aria-hidden="true" />
                Request a PDF
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section section--divided">
        <div className="wrap editorial">
          <Reveal className="editorial__aside">
            <p className="eyebrow">Experience</p>
            <h2>Work history</h2>
          </Reveal>
          <div className="editorial__body stack-v" style={{ gap: 28 }}>
            {experience.map((item, index) => (
              <Reveal as="article" key={item.role} delay={index * 0.05} className="decision" style={{ borderColor: "var(--line-strong)" }}>
                <span className="status-tag">{item.dates}</span>
                <h3 style={{ marginTop: 6 }}>
                  {item.role} · {item.organization}
                </h3>
                <p className="muted" style={{ fontSize: "0.88rem", marginTop: 2 }}>
                  {item.location}
                </p>
                <ul className="plain-list" style={{ marginTop: 14 }}>
                  {item.bullets.map((bullet) => (
                    <li key={bullet}>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--divided">
        <div className="wrap editorial">
          <Reveal className="editorial__aside">
            <p className="eyebrow">Skills</p>
            <h2>Technical foundation</h2>
          </Reveal>
          <div className="editorial__body stack-v" style={{ gap: 24 }}>
            {skillGroups.map((group) => (
              <div key={group.title} style={{ display: "grid", gap: 10 }}>
                <span className="status-tag">{group.title}</span>
                <div className="chips">
                  {group.items.map((item) => (
                    <span className="chip" key={item}>
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--divided">
        <div className="wrap editorial">
          <Reveal className="editorial__aside">
            <p className="eyebrow">Education</p>
            <h2>Education</h2>
          </Reveal>
          <div className="editorial__body stack-v" style={{ gap: 20 }}>
            {education.map((item) => (
              <div key={item.program} style={{ display: "grid", gap: 6 }}>
                <span className="status-tag">{item.dates}</span>
                <h3>
                  {item.program} · {item.institution}
                </h3>
                <p className="muted" style={{ lineHeight: 1.6 }}>
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
