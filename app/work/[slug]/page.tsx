import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { StatBlock } from "@/components/StatBlock";
import { TypedBrand } from "@/components/TypedBrand";
import { featuredProjects, getProject, projectMedia, siteUrl } from "@/data/portfolio";
import "@/app/landing.css";
import "@/app/work.css";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return featuredProjects.map((project) => ({ slug: project.slug }));
}

/* /work/archphi/ renders as a classified file. The case content is not in
   the page at all — the paragraphs are redaction bars, and inspecting them
   finds only "nice try". */
type FileItem = { w?: number; t?: string };
const FILE_BLOCKS: { head: number; lines: FileItem[][] }[] = [
  {
    head: 170,
    lines: [
      [{ w: 120 }, { t: "drawings" }, { w: 180 }, { w: 64 }],
      [{ w: 90 }, { w: 210 }, { t: "the bill of quantities" }, { w: 70 }],
      [{ w: 250 }, { w: 110 }, { w: 60 }]
    ]
  },
  {
    head: 130,
    lines: [
      [{ t: "eight projects" }, { w: 200 }, { w: 90 }],
      [{ w: 160 }, { w: 120 }, { t: "2,668,953" }, { w: 80 }],
      [{ w: 220 }, { w: 140 }, { w: 56 }]
    ]
  },
  {
    head: 210,
    lines: [
      [{ w: 190 }, { t: "guessing" }, { w: 130 }, { w: 74 }],
      [{ w: 110 }, { w: 240 }],
      [{ w: 70 }, { w: 180 }, { w: 90 }, { w: 120 }]
    ]
  },
  {
    head: 150,
    lines: [
      [{ w: 260 }, { w: 100 }],
      [{ t: "766 / 766" }, { w: 200 }, { w: 60 }],
      [{ w: 150 }, { w: 220 }, { w: 84 }]
    ]
  }
];

function ClassifiedFile() {
  return (
    <div className="wrap">
      <div className="wk-file">
        <div className="wk-file__head lv-mono">
          <span>Case file 01 · ArchPHI</span>
          <span>Clearance required</span>
        </div>
        <div className="wk-classified wk-classified--file" aria-hidden="true">
          <span className="wk-classified__stamp">Classified</span>
        </div>
        {FILE_BLOCKS.map((block, bi) => (
          <div className="wk-file__block" key={bi}>
            <span className="wk-redact wk-redact--head" style={{ width: block.head }} aria-hidden="true" />
            <span hidden>nice try</span>
            {block.lines.map((line, li) => (
              <div className="wk-file__line" key={li}>
                {line.map((item, ii) =>
                  item.t ? (
                    <span className="wk-file__word" key={ii}>
                      {item.t}
                    </span>
                  ) : (
                    <span className="wk-redact" style={{ width: item.w }} aria-hidden="true" key={ii} />
                  )
                )}
              </div>
            ))}
          </div>
        ))}
        <div className="wk-file__foot">
          <a className="textlink" href="https://archphi.com" target="_blank" rel="noreferrer">
            archphi.com <ArrowUpRight aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  );
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
            <TypedBrand />
            <span className="lv-topbar__links">
              <a className="lv-topbar__link" href="/music/">
                Music <ArrowUpRight />
              </a>
              <a className="lv-topbar__link" href="/work/">
                All work <ArrowUpRight />
              </a>
            </span>
          </div>
        </div>
        <div className="wrap">
          <p className="eyebrow">{project.category}</p>
          <h1>{project.title}</h1>
          <p className="case-hero__sub">{project.oneLiner}</p>
        </div>
      </section>

      {project.slug === "archphi" ? (
        <ClassifiedFile />
      ) : (
        <>
      {project.featuredMetric || project.metrics.length ? (
        <div className="wrap">
          <div className="case-metrics">
            {project.featuredMetric ? <StatBlock metric={project.featuredMetric} /> : null}
            {project.metrics.map((metric) => (
              <StatBlock key={metric.label} metric={metric} />
            ))}
          </div>
        </div>
      ) : null}

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
            {project.links?.length ? (
              <div className="case-rail__group">
                <span>Links</span>
                <div className="wk-rail-links">
                  {project.links.map((link) => (
                    <a key={link.href} href={link.href} target="_blank" rel="noreferrer">
                      {link.label} <ArrowUpRight aria-hidden="true" />
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </aside>

          <div className="case-narrative">
            <Reveal as="section" className="case-block">
              <h2>The problem</h2>
              <p>{project.problem}</p>
            </Reveal>

            {project.features.length ? (
              <Reveal as="section" className="case-block">
                <h2>What it does</h2>
                <ul className="plain-list">
                  {project.features.map((item) => (
                    <li key={item}>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            ) : null}

            {project.constraints.length ? (
              <Reveal as="section" className="case-block">
                <h2>What made it hard</h2>
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
              <h2>Decisions</h2>
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
                <h2>Results</h2>
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
                    </li>
                  ))}
                </ul>
              </Reveal>
            ) : null}

            {media.length ? (
              <Reveal as="section" className="case-block" style={{ maxWidth: "none" }}>
                <h2>Figures</h2>
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

          </div>
        </div>
      </div>
        </>
      )}

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
