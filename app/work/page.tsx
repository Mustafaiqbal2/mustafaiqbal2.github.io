import type { Metadata } from "next";
import { ArrowRight, Lock } from "lucide-react";
import { FaGithub } from "react-icons/fa6";
import { CarouselRail } from "@/components/CarouselRail";
import { FeatureIndex } from "@/components/FeatureIndex";
import { Reveal } from "@/components/Reveal";
import { featuredProjects, profile, secondaryProjects, siteUrl } from "@/data/portfolio";

export const metadata: Metadata = {
  title: "Work",
  description:
    "AI automation, RAG, and full-stack engineering by Mustafa Iqbal — with the architecture, constraints, and outcomes behind each, from SaaS platforms to CUDA.",
  alternates: {
    canonical: `${siteUrl}/work/`
  }
};

export default function WorkPage() {
  return (
    <main id="top">
      <section className="page-hero compact-page-hero">
        <div className="section-inner">
          <Reveal className="section-heading wide-heading">
            <p className="eyebrow">Work</p>
            <h1>Six systems I designed, built, or led — and measured.</h1>
            <p>
              Each one had a real bottleneck, the architecture I chose to fix it, and an outcome I can defend. Some are
              private products, so I show them through approved architecture and media instead of customer data. The
              additional projects go down to the metal: RAG, CUDA, OpenCL, MPI, and compiler work.
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
            <p className="eyebrow">Featured work — 06 systems</p>
            <h2 id="featured-projects-title">Built, measured, and ready to walk through.</h2>
          </Reveal>
          <Reveal delay={0.06}>
            <FeatureIndex projects={featuredProjects} />
          </Reveal>
        </div>
      </section>

      <section className="section" aria-labelledby="secondary-projects-title">
        <div className="section-inner">
          <Reveal className="section-heading">
            <p className="eyebrow">Systems depth</p>
            <h2 id="secondary-projects-title">Where the fundamentals show.</h2>
            <p>
              The low-level work behind the product engineering: a ~48x CUDA Canny speedup, GPU-accelerated neural nets,
              OpenCL convolution, MPI sequence matching, and a hand-built compiler.
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
