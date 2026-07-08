import { ArrowUpRight, FileText, Mail, Menu, X } from "lucide-react";
import { navigation, profile } from "@/data/portfolio";
import { ThemeToggle } from "@/components/ThemeToggle";

export function SiteHeader() {
  return (
    <header className="site-header" data-header>
      <div className="wrap site-header__inner">
        <a className="brand" href="/">
          <span className="brand__name">{profile.name}</span>
          <span className="brand__role">{profile.shortTitle}</span>
        </a>

        <nav className="nav-desktop" aria-label="Primary">
          {navigation.map((item) => (
            <a href={item.href} key={item.href} data-nav-link>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="header-actions">
          <ThemeToggle />
          <button className="nav-toggle" type="button" data-nav-toggle aria-expanded="false" aria-controls="mobile-nav">
            <Menu aria-hidden="true" />
            Menu
          </button>
        </div>
      </div>

      <div className="nav-mobile" id="mobile-nav" data-mobile-nav hidden>
        <button className="nav-mobile__backdrop" type="button" data-nav-backdrop aria-label="Close menu" />
        <div className="nav-mobile__panel" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="nav-mobile__top">
            <span className="brand__name">{profile.name}</span>
            <button className="nav-mobile__close" type="button" data-nav-close>
              <X aria-hidden="true" />
              Close
            </button>
          </div>

          <nav className="nav-mobile__links" aria-label="Primary">
            {navigation.map((item) => (
              <a href={item.href} key={item.href} data-nav-link>
                {item.label}
                <ArrowUpRight aria-hidden="true" />
              </a>
            ))}
          </nav>

          <div className="nav-mobile__actions">
            <a className="btn btn--primary" href={`mailto:${profile.email}`}>
              <Mail aria-hidden="true" />
              Email me
            </a>
            <a className="btn btn--ghost" href={profile.resume}>
              <FileText aria-hidden="true" />
              Résumé
            </a>
          </div>

          <div className="nav-mobile__theme">
            <span>Theme</span>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
