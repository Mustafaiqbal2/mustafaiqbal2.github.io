import type { CSSProperties } from "react";
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Download, Sparkles } from "lucide-react";
import { ContactActions } from "@/components/ContactActions";
import { ProjectCard } from "@/components/ProjectCard";
import { Reveal } from "@/components/Reveal";
import { featuredProjects, focusAreas, principles, profile } from "@/data/portfolio";

const selectedProjects = featuredProjects.slice(0, 4);

export default function Home() {
  return (
    <main id="top">
      <section className="landing-hero" aria-labelledby="hero-title">
        <div className="section-inner landing-grid">
          <div className="hero-copy">
            <p className="eyebrow">AI workflow systems / full-stack product engineering</p>
            <h1 id="hero-title">I turn ambiguous AI automation ideas into reliable product software.</h1>
            <p className="hero-summary">{profile.elevatorPitch}</p>
            <ContactActions links={profile} />
          </div>

          <div className="hero-reel" data-project-carousel>
            <div className="reel-header">
              <span>Recent work</span>
              <a href="/work/">
                Full work index
                <ArrowRight size={16} aria-hidden="true" />
              </a>
            </div>
            <div className="reel-viewport">
              <div className="reel-track" aria-label="Project highlights" data-carousel-track>
                {selectedProjects.map((project, index) => {
                  const media = project.media.find((item) => !item.isGenerated) || project.media[0] || project.thumbnail;
                  return (
                    <a
                      className="reel-card"
                      href={`/work/${project.slug}/`}
                      style={{ "--reel-delay": `${index * 120}ms` } as CSSProperties}
                      key={project.slug}
                      data-carousel-slide
                    >
                      {media ? (
                        media.darkSrc ? (
                          <>
                            <img
                              className="theme-media-light"
                              src={media.src}
                              alt={media.alt}
                              loading={index === 0 ? "eager" : "lazy"}
                              decoding="async"
                            />
                            <img
                              className="theme-media-dark"
                              src={media.darkSrc}
                              alt=""
                              loading={index === 0 ? "eager" : "lazy"}
                              decoding="async"
                            />
                          </>
                        ) : (
                          <img
                            src={media.type === "video" ? media.poster || media.src : media.src}
                            alt={media.alt}
                            loading={index === 0 ? "eager" : "lazy"}
                            decoding="async"
                          />
                        )
                      ) : null}
                      <span>{project.category}</span>
                      <strong>{project.title}</strong>
                      <small>{project.featuredMetric.value} / {project.featuredMetric.label}</small>
                    </a>
                  );
                })}
              </div>
            </div>
            <div className="reel-controls" aria-label="Project carousel controls">
              <button type="button" data-carousel-prev aria-label="Previous project">
                <ArrowLeft size={16} aria-hidden="true" />
              </button>
              <div className="reel-dots" aria-label="Project slides">
                {selectedProjects.map((project, index) => (
                  <button type="button" data-carousel-dot={index} aria-label={`Show ${project.title}`} key={project.slug} />
                ))}
              </div>
              <button type="button" data-carousel-next aria-label="Next project">
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="home-signal-strip" aria-label="Portfolio credibility signals">
        <div className="section-inner home-signal-grid">
          <div>
            <span>Product work</span>
            <strong>Private AI SaaS, review automation, and email intelligence systems.</strong>
          </div>
          <div>
            <span>Research lab</span>
            <strong>Led a four-person team on a recruitment RAG and interview automation platform.</strong>
          </div>
          <div>
            <span>Foundations</span>
            <strong>FAST-NUCES CS with systems projects in CUDA, OpenCL, MPI, and compilers.</strong>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="fit-title">
        <div className="section-inner split-intro">
          <Reveal className="section-heading">
            <p className="eyebrow">Hiring story</p>
            <h2 id="fit-title">Generalist software engineer who can own the path from product idea to working system.</h2>
            <p>
              The strongest work here connects product flows, AI behavior, OAuth, background jobs, cost controls,
              data models, mobile surfaces, and interfaces that make automation usable.
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
            <p className="eyebrow">Selected work</p>
            <h2 id="selected-work-title">Selected systems with clear problem, role, architecture, and outcome.</h2>
            <p>
              Private product work is labeled clearly. Real media is used where safe, and preview visuals are generated
              from local project evidence rather than decorative filler.
            </p>
          </Reveal>
          <div className="project-grid">
            {selectedProjects.map((project, index) => (
              <Reveal key={project.slug} delay={index * 0.06}>
                <ProjectCard project={project} priority={index === 0} />
              </Reveal>
            ))}
          </div>
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
            <p className="eyebrow">Resume signal</p>
            <h2 id="resume-preview-title">A software engineering profile built around shipped AI product work.</h2>
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
