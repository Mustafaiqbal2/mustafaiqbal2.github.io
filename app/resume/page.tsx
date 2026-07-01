import type { Metadata } from "next";
import { ArrowRight, Download, GraduationCap, MapPin } from "lucide-react";
import { CarouselRail } from "@/components/CarouselRail";
import { Reveal } from "@/components/Reveal";
import { education, experience, featuredProjects, profile, proofMetrics, secondaryProjects, siteUrl, skillGroups } from "@/data/portfolio";

export const metadata: Metadata = {
  title: "Resume",
  description:
    "Resume page for Mustafa Iqbal: AI automation, RAG systems, full-stack product engineering, FAST-NUCES BS CS, Genesys Research Lab, and systems projects.",
  alternates: {
    canonical: `${siteUrl}/resume/`
  }
};

export default function ResumePage() {
  return (
    <main>
      <section className="page-hero resume-hero">
        <div className="section-inner resume-hero-grid">
          <Reveal className="section-heading wide-heading">
            <p className="eyebrow">Resume</p>
            <h1>Software engineer focused on AI automation, full-stack product work, and systems depth.</h1>
            <p>
              I have worked across OAuth-heavy integrations, async workflows, RAG/vector systems, SaaS-style product
              surfaces, and performance-oriented systems projects.
            </p>
            <div className="button-row">
              <a className="button primary" href={profile.resume}>
                Download PDF
                <Download size={18} aria-hidden="true" />
              </a>
              <a className="button ghost" href="/work/">
                Case studies
                <ArrowRight size={18} aria-hidden="true" />
              </a>
            </div>
          </Reveal>
          <Reveal className="resume-fact-panel" delay={0.08}>
            <div>
              <MapPin size={18} aria-hidden="true" />
              <span>Location</span>
              <strong>{profile.location}</strong>
            </div>
            <div>
              <GraduationCap size={18} aria-hidden="true" />
              <span>Education</span>
              <strong>BS Computer Science, FAST-NUCES, 2026</strong>
            </div>
            <div>
              <span className="panel-dot" aria-hidden="true" />
              <span>Focus</span>
              <strong>AI automation, RAG, full-stack systems</strong>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="proof-band resume-proof-band" aria-label="Resume proof metrics">
        <div className="section-inner proof-band-grid">
          {proofMetrics.map((metric) => (
            <div className="metric" key={metric.label}>
              <strong>{metric.value}</strong>
              <span>{metric.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section" aria-labelledby="experience-title">
        <div className="section-inner resume-grid">
          <Reveal className="section-heading sticky-heading">
            <p className="eyebrow">Experience</p>
            <h2 id="experience-title">Work experience that maps to startup engineering.</h2>
            <p>
              My pattern is consistent: define the workflow, integrate the external systems, make background work
              observable, and keep the product usable when AI is uncertain.
            </p>
          </Reveal>
          <div className="timeline">
            {experience.map((item, index) => (
              <Reveal as="article" className="timeline-item" key={`${item.role}-${item.organization}`} delay={index * 0.05}>
                <span className="timeline-date">{item.dates}</span>
                <h3>{item.role}</h3>
                <p>
                  {item.organization} / {item.location}
                </p>
                <ul className="check-list">
                  {item.bullets.map((bullet) => (
                    <li key={bullet}>
                      <span className="check-dot" aria-hidden="true" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-muted resume-achievement-section" aria-labelledby="resume-projects-title">
        <div className="section-inner">
          <Reveal className="section-heading wide-heading">
            <p className="eyebrow">Selected work</p>
            <h2 id="resume-projects-title">Selected project work.</h2>
            <p>
              Selected projects with role, stack, outcome, architecture decisions, and implementation notes.
            </p>
          </Reveal>
          <CarouselRail label="Selected engineering work" className="achievement-carousel" itemClassName="achievement-carousel-item">
            {featuredProjects.map((project, index) => {
              const media = project.thumbnail || project.media[0];

              return (
                <Reveal as="article" className="achievement-card" key={project.slug} delay={index * 0.035}>
                  {media ? (
                    <a className="achievement-media" href={`/work/${project.slug}/`} aria-label={`Open ${project.title} details`}>
                      {media.darkSrc ? (
                        <>
                          <img className="theme-media-light" src={media.src} alt={media.alt} loading="lazy" decoding="async" />
                          <img className="theme-media-dark" src={media.darkSrc} alt="" loading="lazy" decoding="async" />
                        </>
                      ) : (
                        <img src={media.type === "video" ? media.poster || media.src : media.src} alt={media.alt} loading="lazy" decoding="async" />
                      )}
                    </a>
                  ) : null}
                  <div className="achievement-content">
                    <span>{project.category}</span>
                    <h3>{project.title}</h3>
                    <p>{project.summary}</p>
                    <div className="achievement-meta">
                      <strong>{project.featuredMetric.value}</strong>
                      <small>{project.featuredMetric.label}</small>
                    </div>
                    <div className="resume-project-meta">
                      <span>{project.role}</span>
                      <span>{project.stack.slice(0, 4).join(" / ")}</span>
                    </div>
                    <a className="text-link" href={`/work/${project.slug}/`}>
                      Details
                      <ArrowRight size={17} aria-hidden="true" />
                    </a>
                  </div>
                </Reveal>
              );
            })}
          </CarouselRail>
        </div>
      </section>

      <section className="section" aria-labelledby="education-title">
        <div className="section-inner resume-grid">
          <Reveal className="section-heading sticky-heading">
            <p className="eyebrow">Education</p>
            <h2 id="education-title">Computer science foundation with systems-heavy project work.</h2>
            <p>
              My degree supports the product work with fundamentals across operating systems, compilers, databases,
              parallel computing, AI, and software engineering.
            </p>
          </Reveal>
          <div className="education-list">
            {education.map((item) => (
              <Reveal as="article" className="education-card" key={`${item.program}-${item.institution}`}>
                <span className="timeline-date">{item.dates}</span>
                <div>
                  <h3>{item.program}</h3>
                  <p>{item.institution}</p>
                </div>
                <p>{item.detail}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-muted" aria-labelledby="skills-title">
        <div className="section-inner">
          <Reveal className="section-heading">
            <p className="eyebrow">Skills</p>
            <h2 id="skills-title">Technical range.</h2>
          </Reveal>
          <CarouselRail label="Skill groups" className="skills-carousel" itemClassName="skill-carousel-item" auto>
            {skillGroups.map((group, index) => (
              <Reveal as="article" className="skill-card" key={group.title} delay={index * 0.04}>
                <h3>{group.title}</h3>
                <div className="metadata-list">
                  {group.items.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              </Reveal>
            ))}
          </CarouselRail>
        </div>
      </section>

      <section className="section" aria-labelledby="systems-title">
        <div className="section-inner">
          <Reveal className="section-heading">
            <p className="eyebrow">Systems depth</p>
            <h2 id="systems-title">Performance and fundamentals behind the product work.</h2>
            <p>
              Additional projects across performance, distributed compute, compiler construction, and retrieval.
            </p>
          </Reveal>
          <CarouselRail label="Systems depth projects" className="systems-carousel" itemClassName="systems-carousel-item" auto>
            {secondaryProjects.slice(0, 6).map((project) => (
              <article className="compact-row systems-card" key={project.title}>
                <span>{project.signal}</span>
                <strong>{project.title}</strong>
                <p>{project.summary}</p>
              </article>
            ))}
          </CarouselRail>
        </div>
      </section>
    </main>
  );
}
