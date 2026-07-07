import type { Metadata } from "next";
import { Reveal } from "@/components/Reveal";
import { education, experience, principles, profile, siteUrl } from "@/data/portfolio";

export const metadata: Metadata = {
  title: "About",
  description:
    "AI automation engineer and final-year CS student. I turn high-volume manual workflows into autonomous, event-driven systems — with the production discipline and judgment to run them.",
  alternates: { canonical: `${siteUrl}/about/` }
};

export default function AboutPage() {
  return (
    <main id="main">
      <section className="section" style={{ paddingBottom: "clamp(24px, 4vw, 40px)" }}>
        <div className="wrap">
          <div className="about-split">
            <Reveal>
              <p className="eyebrow">About</p>
              <h1>I build production AI automation — and the systems that keep it honest.</h1>
              <p className="lede" style={{ marginTop: 20 }}>
                I&apos;m Mustafa Iqbal, an AI automation engineer. I take a manual, high-volume workflow and turn it into
                a system that runs itself — reliably, cheaply, and with a human able to step in whenever it matters.
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <img
                src={profile.photo}
                alt="Mustafa Iqbal"
                className="card"
                width={640}
                height={640}
                style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", objectPosition: "50% 30%" }}
              />
            </Reveal>
          </div>
        </div>
      </section>

      <section className="section section--divided">
        <div className="wrap prose case-body" style={{ paddingBlock: 0, maxWidth: "var(--prose)" }}>
          <div className="case-block">
            <h2>What I do</h2>
            <p>
              Most of my work follows the same shape. Start with a repetitive operational task a team is doing by hand —
              sorting a Gmail inbox, responding to Google reviews, screening candidates, producing ad creative. Design
              the pipeline that automates it end to end: the integration at the source, the background jobs that process
              work asynchronously, the LLM layer that makes the judgment calls, and the dashboard that keeps an operator
              in the loop. Then do the unglamorous engineering that decides whether it survives in production — token
              refresh, rate-limit-safe concurrency, cost pre-filtering, batched writes, structured logging.
            </p>
            <p>
              I build full-stack: TypeScript/Next.js and Python on the front, Postgres/Prisma and background-job queues
              underneath, and OpenAI, Anthropic, or Google models in the pipeline depending on the job. I care more about
              the architecture decisions than the framework names — why a Postgres-backed queue instead of a separate
              broker, when to run parallel versus throttled versus batch generation, where a deterministic rule should
              short-circuit the model entirely.
            </p>
          </div>

          <div className="case-block">
            <h2>How I think about the work</h2>
            <p>
              The habit I trust most is restraint. On my CAD-intelligence startup, I deleted a working but
              more-sophisticated deterministic pipeline once I could show it didn&apos;t generalize — a system I can
              defend beats one that only looks finished. On an email classifier, I evaluated the cheaper batch API and
              rejected it because 24-hour latency was wrong for near-real-time inbox sorting. Documenting those
              trade-offs, and admitting where a system still degrades, is the part of the job I take most seriously.
            </p>
            <p>
              I also keep numbers honest. Where I cite a benchmark, it&apos;s a documented internal figure, and I say so.
              I don&apos;t publish metrics I can&apos;t stand behind.
            </p>
          </div>

          <div className="case-block">
            <h2>How I build</h2>
            <ul className="plain-list">
              {principles.map((principle) => (
                <li key={principle}>
                  <span>{principle}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="section section--divided">
        <div className="wrap prose">
          <Reveal className="section__head">
            <p className="eyebrow">Experience</p>
            <h2>Where I&apos;ve worked</h2>
          </Reveal>
          <div className="stack-v" style={{ gap: 28 }}>
            {experience.map((item, index) => (
              <Reveal as="article" key={item.role} delay={index * 0.05} className="decision" style={{ borderColor: "var(--line-strong)" }}>
                <span className="status-tag">{item.dates}</span>
                <h3 style={{ marginTop: 6 }}>
                  {item.role} · {item.organization}
                </h3>
                <p className="muted" style={{ fontSize: "0.88rem", marginTop: 2 }}>
                  {item.location}
                </p>
                <ul className="plain-list" style={{ marginTop: 14 }}>
                  {item.bullets.map((bullet) => (
                    <li key={bullet}>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--divided">
        <div className="wrap prose">
          <Reveal className="section__head">
            <p className="eyebrow">Education</p>
            <h2>Foundation</h2>
          </Reveal>
          <div className="stack-v" style={{ gap: 20 }}>
            {education.map((item) => (
              <div key={item.program} style={{ display: "grid", gap: 6 }}>
                <span className="status-tag">{item.dates}</span>
                <h3>
                  {item.program} · {item.institution}
                </h3>
                <p className="muted" style={{ lineHeight: 1.6 }}>
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
