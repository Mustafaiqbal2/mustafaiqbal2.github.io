import { ArrowUpRight } from "lucide-react";
import type { Project } from "@/data/portfolio";

const liveStatuses = new Set(["Private product"]);

export function FeatureIndex({ projects }: { projects: Project[] }) {
  return (
    <ol className="feature-index" aria-label="Selected work">
      {projects.map((project, index) => {
        const Icon = project.icon;
        const live = liveStatuses.has(project.status);
        return (
          <li className="feature-row" data-spotlight key={project.slug}>
            <a className="feature-row-link" href={`/work/${project.slug}/`} aria-label={`${project.title} — open case study`}>
              <span className="feature-folio" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="feature-icon" aria-hidden="true">
                <Icon size={20} />
              </span>
              <span className="feature-main">
                <span className="feature-head">
                  <span className="feature-title">{project.title}</span>
                  <span className="feature-status">
                    {live ? <i className="feature-led" aria-hidden="true" /> : null}
                    {project.status}
                  </span>
                </span>
                <span className="feature-dek">{project.summary}</span>
                <span className="feature-proof">
                  <span className="feature-proof-tag">Proves</span>
                  {project.proof}
                </span>
                <span className="feature-tags" aria-hidden="true">
                  {project.stack.slice(0, 5).map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </span>
              </span>
              <span className={/\d/.test(project.featuredMetric.value) ? "feature-metric" : "feature-metric feature-metric--qual"}>
                <strong>{project.featuredMetric.value}</strong>
                <span>{project.featuredMetric.label}</span>
              </span>
              <ArrowUpRight className="feature-arrow" size={20} aria-hidden="true" />
            </a>
          </li>
        );
      })}
    </ol>
  );
}
