import { ArrowRight } from "lucide-react";
import type { Project } from "@/data/portfolio";
import { ProjectLinks } from "@/components/ProjectLinks";

export function ProjectCard({ project, priority = false }: { project: Project; priority?: boolean }) {
  const Icon = project.icon;
  const leadMedia = project.thumbnail || project.media[0];

  return (
    <article className={priority ? "project-card project-card-featured" : "project-card"}>
      {leadMedia ? (
        <a className="project-card-media" href={`/work/${project.slug}/`} aria-label={`Open ${project.title} details`}>
          {leadMedia.darkSrc ? (
            <>
              <img
                className="theme-media-light"
                src={leadMedia.src}
                alt={leadMedia.alt}
                loading={priority ? "eager" : "lazy"}
                decoding="async"
              />
              <img
                className="theme-media-dark"
                src={leadMedia.darkSrc}
                alt=""
                loading={priority ? "eager" : "lazy"}
                decoding="async"
              />
            </>
          ) : (
            <img
              src={leadMedia.type === "video" ? leadMedia.poster || leadMedia.src : leadMedia.src}
              alt={leadMedia.alt}
              loading={priority ? "eager" : "lazy"}
              decoding="async"
            />
          )}
        </a>
      ) : null}
      <div className="project-card-body">
        <div className="metadata-row">
          <span>{project.category}</span>
          <span>{project.status}</span>
        </div>
        <div className="project-title-row">
          <span className="project-icon">
            <Icon size={22} aria-hidden="true" />
          </span>
          <h3>
            <a href={`/work/${project.slug}/`}>{project.title}</a>
          </h3>
        </div>
        <p>{project.summary}</p>
        <div className="metric-row compact-metrics" aria-label={`${project.title} metrics`}>
          {[project.featuredMetric, ...project.metrics.slice(0, 2)].map((metric) => (
            <span key={`${project.slug}-${metric.value}-${metric.label}`}>
              <strong>{metric.value}</strong>
              {metric.label}
            </span>
          ))}
        </div>
        <div className="project-card-footer">
          <ProjectLinks project={project} />
          <a className="text-link" href={`/work/${project.slug}/`}>
            Details
            <ArrowRight size={17} aria-hidden="true" />
          </a>
        </div>
      </div>
    </article>
  );
}
