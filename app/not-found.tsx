import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <main id="top">
      <section className="page-hero compact-page-hero">
        <div className="section-inner">
          <div className="section-heading wide-heading">
            <p className="eyebrow">404</p>
            <h1>That page is not in this portfolio.</h1>
            <p>Use the work index to get back to the project case studies and engineering work.</p>
            <a className="button primary" href="/work/">
              <ArrowLeft size={18} aria-hidden="true" />
              Back to work
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
