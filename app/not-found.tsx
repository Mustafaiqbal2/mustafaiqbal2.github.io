import { ArrowRight } from "lucide-react";

export default function NotFound() {
  return (
    <main id="main">
      <section className="section">
        <div className="wrap prose">
          <p className="eyebrow mono">404</p>
          <h1>This route doesn&apos;t resolve.</h1>
          <p className="lede" style={{ marginTop: 16 }}>
            The page you&apos;re after isn&apos;t here. Head back to the work, or the home page.
          </p>
          <div className="btn-row" style={{ marginTop: 26 }}>
            <a className="btn btn--primary" href="/work/">
              View the work
              <ArrowRight aria-hidden="true" />
            </a>
            <a className="btn btn--ghost" href="/">
              Home
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
