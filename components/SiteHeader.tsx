import { Mail, Menu } from "lucide-react";
import { FaGithub, FaLinkedinIn } from "react-icons/fa6";
import { navigation, profile } from "@/data/portfolio";
import { ThemeToggle } from "@/components/ThemeToggle";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="brand">
        <button className="avatar-button" type="button" data-image-lightbox={profile.photo} aria-label="Open Mustafa Iqbal photo">
          <img className="brand-avatar" src={profile.photo} alt="" width={48} height={48} />
        </button>
        <span className="brand-copy">
          <a href="/">{profile.name}</a>
          <small>{profile.shortTitle}</small>
        </span>
      </div>

      <nav className="nav-links" aria-label="Primary navigation">
        {navigation.map((item) => (
          <a className={item.label === "Home" ? "nav-home" : undefined} href={item.href} key={item.href} data-nav-link>
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
        <details className="mobile-menu">
          <summary aria-label="Open navigation">
            <Menu size={18} aria-hidden="true" />
          </summary>
          <div className="mobile-menu-panel">
            {navigation.map((item) => (
              <a className={item.label === "Home" ? "nav-home" : undefined} href={item.href} key={item.href} data-nav-link>
                {item.label}
              </a>
            ))}
            <a href={`mailto:${profile.email}`}>Email</a>
            <a href={profile.github} target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a href={profile.linkedIn} target="_blank" rel="noreferrer">
              LinkedIn
            </a>
          </div>
        </details>
      </div>
    </header>
  );
}
