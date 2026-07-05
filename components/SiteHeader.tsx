import { FileText, Mail, Menu, X } from "lucide-react";
import { FaGithub, FaLinkedinIn } from "react-icons/fa6";
import { navigation, profile } from "@/data/portfolio";
import { ThemeToggle } from "@/components/ThemeToggle";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="brand">
        <button
          className="avatar-button"
          type="button"
          data-image-lightbox={profile.photo}
          data-image-alt="Mustafa Iqbal"
          aria-label="Open Mustafa Iqbal photo"
        >
          <img className="brand-avatar" src={profile.photo} alt="" width={48} height={48} />
        </button>
        <span className="brand-copy">
          <a href="/">{profile.name}</a>
          <small>{profile.shortTitle}</small>
        </span>
      </div>

      <nav className="nav-links" aria-label="Primary navigation">
        {navigation.map((item) => (
          <a href={item.href} key={item.href} data-nav-link>
            {item.label}
          </a>
        ))}
      </nav>

      <div className="header-actions" aria-label="Profile links">
        <ThemeToggle />
        <a className="desktop-link" href={`mailto:${profile.email}`} aria-label="Email Mustafa">
          <Mail size={18} aria-hidden="true" />
        </a>
        <a className="desktop-link" href={profile.github} aria-label="Open GitHub" target="_blank" rel="noreferrer">
          <FaGithub aria-hidden="true" />
        </a>
        <a className="desktop-link" href={profile.linkedIn} aria-label="Open LinkedIn" target="_blank" rel="noreferrer">
          <FaLinkedinIn aria-hidden="true" />
        </a>
        <details className="mobile-menu" data-mobile-menu>
          <summary aria-label="Open navigation">
            <Menu size={18} aria-hidden="true" />
          </summary>
          <button className="mobile-menu-backdrop" type="button" data-mobile-menu-close aria-label="Close navigation" />
          <div className="mobile-menu-panel">
            <div className="mobile-menu-head">
              <div>
                <strong>{profile.name}</strong>
                <span>{profile.shortTitle}</span>
              </div>
              <button type="button" data-mobile-menu-close aria-label="Close navigation">
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="mobile-theme-row">
              <span>Theme</span>
              <ThemeToggle />
            </div>
            <nav className="mobile-menu-nav" aria-label="Mobile primary navigation">
              {navigation.map((item) => (
                <a href={item.href} key={item.href} data-nav-link>
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="mobile-menu-actions" aria-label="Contact and profile links">
              <a href={`mailto:${profile.email}`}>
                <Mail size={18} aria-hidden="true" />
                Email
              </a>
              <a href={profile.github} target="_blank" rel="noreferrer">
                <FaGithub aria-hidden="true" />
                GitHub
              </a>
              <a href={profile.linkedIn} target="_blank" rel="noreferrer">
                <FaLinkedinIn aria-hidden="true" />
                LinkedIn
              </a>
              <a href={profile.resume}>
                <FileText size={18} aria-hidden="true" />
                Resume
              </a>
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}
