import type { Metadata } from "next";
import { ArrowRight, Lock } from "lucide-react";
import { FaGithub } from "react-icons/fa6";
import { ProjectCard } from "@/components/ProjectCard";
import { Reveal } from "@/components/Reveal";
import { featuredProjects, profile, secondaryProjects, siteUrl } from "@/data/portfolio";

export const metadata: Metadata = {
  title: "Work",
  description:
    "Selected AI automation, RAG, SaaS, CAD understanding, systems, and full-stack engineering projects by Mustafa Iqbal.",
  alternates: {
    canonical: `${siteUrl}/work/`
  }
};

export default function WorkPage() {
  return (
    <main>
      <section className="page-hero compact-page-hero">
        <div className="section-inner">
          <Reveal className="section-heading wide-heading">
            <p className="eyebrow">Work</p>
            <h1>Selected software engineering work with enough detail to evaluate the build.</h1>
            <p>
              The portfolio is intentionally split: featured case studies explain product and architecture decisions;
              secondary projects show public systems depth across RAG, CUDA, OpenCL, MPI, and compiler work.
            </p>
            <div className="button-row">
              <a className="button primary" href={profile.resume}>
                Download resume
              </a>
              <a className="button ghost" href="/contact/">
                Contact
                <ArrowRight size={18} aria-hidden="true" />
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section section-muted" aria-labelledby="featured-projects-title">
        <div className="section-inner">
          <Reveal className="section-heading">
            <p className="eyebrow">Featured case studies</p>
            <h2 id="featured-projects-title">Product work, implementation constraints, and outcomes.</h2>
          </Reveal>
          <div className="project-grid">
            {featuredProjects.map((project, index) => (
              <Reveal key={project.slug} delay={index * 0.04}>
                <ProjectCard project={project} priority={index === 0} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="secondary-projects-title">
        <div className="section-inner">
          <Reveal className="section-heading">
            <p className="eyebrow">Systems depth</p>
            <h2 id="secondary-projects-title">Secondary projects that round out the engineering profile.</h2>
            <p>
              These are compact because the hiring story is AI product engineering, but they matter: they show comfort
              with lower-level performance, distributed compute, compiler construction, and retrieval infrastructure.
            </p>
          </Reveal>
          <div className="secondary-grid">
            {secondaryProjects.map((project, index) => (
              <Reveal as="article" className="secondary-card" key={project.title} delay={index * 0.035}>
                <span className="status-label">{project.signal}</span>
                <h3>{project.title}</h3>
                <p>{project.summary}</p>
                <div className="metadata-list" aria-label={`${project.title} stack`}>
                  {project.stack.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
                {project.href ? (
                  <a className="text-link" href={project.href} target="_blank" rel="noreferrer">
                    <FaGithub aria-hidden="true" />
                    GitHub
                  </a>
                ) : (
                  <span className="private-link">
                    <Lock size={16} aria-hidden="true" />
                    Private or local work
                  </span>
                )}
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
