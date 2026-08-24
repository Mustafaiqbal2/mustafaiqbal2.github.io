import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, ArrowUpRight, Lock } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { Provenance, StatBlock } from "@/components/Evidence";
import { featuredProjects, getProject, projectMedia, siteUrl } from "@/data/portfolio";
import "@/app/landing.css";
import "@/app/work.css";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return featuredProjects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) {
    return { title: "Project not found" };
  }
  return {
    title: project.title,
    description: project.oneLiner,
    alternates: { canonical: `${siteUrl}/work/${project.slug}/` },
    openGraph: {
      title: `${project.title} — Mustafa Iqbal`,
      description: project.oneLiner,
      url: `${siteUrl}/work/${project.slug}/`
    }
  };
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) {
    notFound();
  }

  const media = projectMedia(project.slug);

  return (
    <main id="main" className="wk">
      <section className="case-hero lv-space">
        <div className="wk-top wk-top--dark">
          <div className="lv-topbar lv-mono">
            <a className="lv-topbar__brand" href="/">
              &gt;Mustafa<i aria-hidden="true" />
            </a>
            <a className="lv-topbar__link" href="/work/">
              All work <ArrowUpRight />
            </a>
          </div>
        </div>
        <div className="wrap">
          <p className="eyebrow">{project.category}</p>
          <h1>{project.title}</h1>
          <p className="case-hero__sub">{project.oneLiner}</p>
        </div>
      </section>

      <div className="wrap">
        <div className="case-metrics">
          <StatBlock metric={project.featuredMetric} />
          {project.metrics.map((metric) => (
            <StatBlock key={metric.label} metric={metric} />
          ))}
        </div>
      </div>

      <div className="wrap">
        <div className="case-layout">
          <aside className="case-rail" aria-label="Project details">
            <div className="case-rail__group">
              <span>Role</span>
              <strong>{project.role}</strong>
            </div>
            <div className="case-rail__group">
              <span>Timeline</span>
              <strong>{project.dates}</strong>
            </div>
            <div className="case-rail__group">
              <span>Status</span>
              <strong>{project.status}</strong>
            </div>
            <div className="case-rail__group">
              <span>Stack</span>
              <div className="chips" style={{ marginTop: 4 }}>
                {project.stack.map((item) => (
                  <span className="chip" key={item}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
            {project.isPrivate && project.privateNote ? (
              <p className="private-note">
                <Lock aria-hidden="true" />
                {project.privateNote}
              </p>
            ) : null}
          </aside>

          <div className="case-narrative">
            <Reveal as="section" className="case-block">
              <h2>The problem</h2>
              <p>{project.problem}</p>
            </Reveal>

            {project.constraints.length ? (
              <Reveal as="section" className="case-block">
                <h2>Constraints</h2>
                <ul className="plain-list">
                  {project.constraints.map((item) => (
                    <li key={item}>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            ) : null}

            <Reveal as="section" className="case-block">
              <h2>Approach &amp; key decisions</h2>
              <ul className="decision-list">
                {project.approach.map((decision) => (
                  <li className="decision" key={decision.decision}>
                    <h3>{decision.decision}</h3>
                    <p>{decision.why}</p>
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal as="section" className="case-block">
              <h2>What I built</h2>
              <ul className="plain-list">
                {project.implementation.map((item) => (
                  <li key={item}>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Reveal>

            {project.outcomes.length ? (
              <Reveal as="section" className="case-block">
                <h2>Outcomes</h2>
                <ul className="stack-v" style={{ margin: 0, padding: 0, listStyle: "none", gap: 18 }}>
                  {project.outcomes.map((metric) => (
                    <li key={metric.label} style={{ display: "grid", gap: 6 }}>
                      <span style={{ color: "var(--ink)", lineHeight: 1.55 }}>
                        {metric.value ? (
                          <strong className="mono" style={{ fontWeight: 500 }}>
                            {metric.value}{" "}
                          </strong>
                        ) : null}
                        {metric.label}
                      </span>
                      <Provenance tier={metric.tier} source={metric.source} />
                    </li>
                  ))}
                </ul>
              </Reveal>
            ) : null}

            {media.length ? (
              <Reveal as="section" className="case-block" style={{ maxWidth: "none" }}>
                <h2>Selected media</h2>
                <div className="stack-v" style={{ gap: 20 }}>
                  {media.map((item) => (
                    <figure className="figure" key={item.src}>
                      <button type="button" data-lightbox-open={item.src} data-lightbox-alt={item.alt}>
                        <img src={item.src} alt={item.alt} loading="lazy" decoding="async" width={1200} height={750} />
                      </button>
                      <figcaption>{item.caption}</figcaption>
                    </figure>
                  ))}
                </div>
              </Reveal>
            ) : null}

            {project.limitations.length ? (
              <Reveal as="section" className="case-block">
                <h2>Limitations &amp; what&apos;s next</h2>
                <ul className="plain-list">
                  {project.limitations.map((item) => (
                    <li key={item}>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            ) : null}
          </div>
        </div>
      </div>

      <section className="section section--divided">
        <div className="wrap">
          <a className="textlink" href="/work/">
            More work
            <ArrowRight aria-hidden="true" />
          </a>
        </div>
      </section>
    </main>
  );
}
