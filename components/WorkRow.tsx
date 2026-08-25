import type { CSSProperties } from "react";
import { ArrowUpRight } from "lucide-react";
import type { CaseStudy } from "@/data/portfolio";

export function WorkRow({ project, index }: { project: CaseStudy; index: number }) {
  return (
    <article
      className="work-row reveal"
      data-reveal="left"
      style={{ "--reveal-delay": `${index * 60}ms` } as CSSProperties}
      suppressHydrationWarning
    >
      <a href={`/work/${project.slug}/`}>
        <span className="work-row__index">{String(index + 1).padStart(2, "0")}</span>
        <span className="work-row__main">
          <span className="work-row__titlerow">
            <span className="work-row__title">{project.title}</span>
          </span>
          <span className="work-row__desc">{project.oneLiner}</span>
        </span>
        <span className="work-row__aside">
          {project.featuredMetric ? (
            <span className="work-row__metric">{project.featuredMetric.value}</span>
          ) : null}
          <ArrowUpRight className="work-row__arrow" aria-hidden="true" />
        </span>
      </a>
    </article>
  );
}
