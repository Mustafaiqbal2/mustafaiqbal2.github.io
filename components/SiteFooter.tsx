import { featuredProjects, profile } from "@/data/portfolio";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="section-inner footer-wordmark" aria-hidden="true">
        Mustafa Iqbal
      </div>
      <div className="section-inner footer-grid">
        <div className="footer-brand">
          <strong>{profile.name}</strong>
          <p>{profile.summary}</p>
          <div className="footer-meta">
            <span>{profile.location}</span>
            <span>Remote-first</span>
          </div>
        </div>
        <nav aria-label="Footer sitemap">
          <h3>Sitemap</h3>
          <a href="/">Home</a>
          <a href="/work/">Work</a>
          <a href="/resume/">Resume</a>
          <a href="/about/">About</a>
          <a href="/contact/">Contact</a>
        </nav>
        <nav aria-label="Featured project links">
          <h3>Featured Work</h3>
          {featuredProjects.slice(0, 5).map((project) => (
            <a href={`/work/${project.slug}/`} key={project.slug}>
              {project.title}
            </a>
          ))}
        </nav>
        <nav aria-label="Profile links">
          <h3>Links</h3>
          <a href={`mailto:${profile.email}`}>Email</a>
          <a href={profile.linkedIn} target="_blank" rel="noreferrer">
            LinkedIn
          </a>
          <a href={profile.github} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a href={profile.resume}>Resume PDF</a>
        </nav>
      </div>
      <div className="section-inner footer-bottom">
        <span className="footer-status">
          <i aria-hidden="true" />
          Status: open to remote roles
        </span>
        <span>Built by Mustafa Iqbal.</span>
      </div>
    </footer>
  );
}
