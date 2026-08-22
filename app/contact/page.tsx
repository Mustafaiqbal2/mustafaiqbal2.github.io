import type { Metadata } from "next";
import { Copy, Download, Mail } from "lucide-react";
import { FaGithub, FaLinkedinIn } from "react-icons/fa6";
import { ContactForm } from "@/components/ContactForm";
import { Reveal } from "@/components/Reveal";
import { profile, siteUrl } from "@/data/portfolio";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch about AI and full-stack engineering roles, or to discuss any project in detail. Based in Islamabad; open to remote and relocation.",
  alternates: { canonical: `${siteUrl}/contact/` }
};

export default function ContactPage() {
  return (
    <main id="main">
      <section className="section">
        <div className="wrap">
          <div className="about-split">
            <Reveal>
              <p className="eyebrow">Get in touch</p>
              <h1>Let&apos;s talk about the role.</h1>
              <p className="lede" style={{ marginTop: 20 }}>
                I build production AI automation and full-stack systems end to end. If you&apos;re hiring for that —
                or want to talk through any of the projects here in detail — I&apos;d like to hear from you.
              </p>
              <p style={{ marginTop: 16, color: "var(--ink-2)", lineHeight: 1.7 }}>
                Much of my work is private or client-bound; I&apos;m glad to walk through the architecture and my
                specific contribution, and to share more under NDA.
              </p>

              <div className="stack-v" style={{ gap: 12, marginTop: 28 }}>
                <a className="textlink" href={`mailto:${profile.email}`} style={{ fontSize: "1.05rem" }}>
                  <Mail aria-hidden="true" />
                  {profile.email}
                </a>
                <button className="textlink" type="button" data-copy={profile.email} style={{ justifySelf: "start", background: "transparent", border: 0, padding: 0 }}>
                  <Copy aria-hidden="true" />
                  <span data-copy-label>Copy email</span>
                </button>
                <div className="btn-row" style={{ marginTop: 8 }}>
                  <a className="btn btn--ghost" href={profile.github} target="_blank" rel="noreferrer">
                    <FaGithub aria-hidden="true" />
                    GitHub
                  </a>
                  <a className="btn btn--ghost" href={profile.linkedIn} target="_blank" rel="noreferrer">
                    <FaLinkedinIn aria-hidden="true" />
                    LinkedIn
                  </a>
                  <a className="btn btn--ghost" href={profile.resumePdf} download>
                    <Download aria-hidden="true" />
                    Résumé
                  </a>
                </div>
                <p className="muted" style={{ marginTop: 12, fontSize: "0.9rem" }}>
                  Based in {profile.location}. Open to remote and relocation.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <ContactForm />
            </Reveal>
          </div>
        </div>
      </section>
    </main>
  );
}
