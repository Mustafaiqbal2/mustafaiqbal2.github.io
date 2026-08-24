import type { CSSProperties } from "react";
import { ArrowUpRight } from "lucide-react";
import { Provenance } from "@/components/Evidence";
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
            <span className="status-tag">{project.status}</span>
          </span>
          <span className="work-row__desc">{project.oneLiner}</span>
          <span className="chips">
            {project.stack.slice(0, 5).map((item) => (
              <span className="chip" key={item}>
                {item}
              </span>
            ))}
          </span>
        </span>
        <span className="work-row__aside">
          <span className="work-row__metric">{project.featuredMetric.value}</span>
          <Provenance tier={project.featuredMetric.tier} source={project.featuredMetric.source} />
          <ArrowUpRight className="work-row__arrow" aria-hidden="true" />
        </span>
      </a>
    </article>
  );
}
