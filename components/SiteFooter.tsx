import { ArrowRight } from "lucide-react";
import { FaGithub, FaLinkedinIn } from "react-icons/fa6";
import { navigation, profile } from "@/data/portfolio";

export function SiteFooter() {
  return (
    <>
      <section className="cta-band lv-space" aria-labelledby="cta-title">
        <div className="wrap reveal" data-reveal="scale" suppressHydrationWarning>
          <p className="eyebrow">Get in touch</p>
          <h2 id="cta-title">
            Talk to me<em>.</em>
          </h2>
          <a className="btn btn--primary" href={`mailto:${profile.email}`}>
            {profile.email}
            <ArrowRight aria-hidden="true" />
          </a>
        </div>
      </section>

      <footer className="site-footer">
        <div className="wrap">
          <div className="footer-grid" data-stagger>
            <div className="footer-brand reveal" suppressHydrationWarning>
              <strong>{profile.name}</strong>
              <p>{profile.bioShort}</p>
            </div>
            <nav className="footer-col reveal" aria-label="Sitemap" suppressHydrationWarning>
              <h3>Sitemap</h3>
              <a href="/">Home</a>
              {navigation.map((item) => (
                <a href={item.href} key={item.href}>
                  {item.label}
                </a>
              ))}
            </nav>
            <nav className="footer-col reveal" aria-label="Elsewhere" suppressHydrationWarning>
              <h3>Elsewhere</h3>
              <a href={`mailto:${profile.email}`}>Email</a>
              <a href={profile.github} target="_blank" rel="noreferrer">
                <FaGithub aria-hidden="true" style={{ display: "inline", marginRight: 8, verticalAlign: "-2px" }} />
                GitHub
              </a>
              <a href={profile.linkedIn} target="_blank" rel="noreferrer">
                <FaLinkedinIn aria-hidden="true" style={{ display: "inline", marginRight: 8, verticalAlign: "-2px" }} />
                LinkedIn
              </a>
              <a href={profile.resumePdf} download>Résumé</a>
            </nav>
          </div>
          <div className="footer-bottom">
            <span className="footer-sign">
              <b aria-hidden="true">◆</b> Built &amp; verified by {profile.name}
            </span>
            <span>© 2026 · {profile.location} · Next.js</span>
          </div>
        </div>
      </footer>
    </>
  );
}
