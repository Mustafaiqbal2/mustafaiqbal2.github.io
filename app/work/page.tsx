import type { Metadata } from "next";
import { ArrowRight, Lock } from "lucide-react";
import { FaGithub } from "react-icons/fa6";
import { CarouselRail } from "@/components/CarouselRail";
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
            <h1>AI automation, product systems, and engineering fundamentals.</h1>
            <p>
              Featured projects cover shipped workflows, architecture decisions, implementation constraints, and
              outcomes. Secondary projects show systems depth across RAG, CUDA, OpenCL, MPI, and compiler work.
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
            <p className="eyebrow">Featured work</p>
            <h2 id="featured-projects-title">Featured product and systems work.</h2>
          </Reveal>
          <CarouselRail label="Featured work" className="project-card-carousel" itemClassName="project-carousel-item" auto>
            {featuredProjects.map((project, index) => (
              <Reveal key={project.slug} delay={index * 0.04}>
                <ProjectCard project={project} priority={index === 0} />
              </Reveal>
            ))}
          </CarouselRail>
        </div>
      </section>

      <section className="section" aria-labelledby="secondary-projects-title">
        <div className="section-inner">
          <Reveal className="section-heading">
            <p className="eyebrow">Systems depth</p>
            <h2 id="secondary-projects-title">Additional systems projects.</h2>
            <p>
              These projects show engineering range across performance, distributed compute, compiler construction,
              document retrieval, and parallel programming.
            </p>
          </Reveal>
          <CarouselRail label="Secondary systems projects" className="secondary-carousel" itemClassName="secondary-carousel-item" auto>
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
                    Not publicly linked
                  </span>
                )}
              </Reveal>
            ))}
          </CarouselRail>
        </div>
      </section>
    </main>
  );
}
