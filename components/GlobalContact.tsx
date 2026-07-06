import { ContactActions } from "@/components/ContactActions";
import { ContactForm } from "@/components/ContactForm";
import { profile } from "@/data/portfolio";

export function GlobalContact({ accessKey }: { accessKey: string }) {
  return (
    <section className="global-contact" aria-labelledby="global-contact-title">
      <div className="section-inner global-contact-grid">
        <div className="section-heading reveal">
          <p className="eyebrow">Contact</p>
          <h2 id="global-contact-title">Have a role or a problem in mind? Send it over.</h2>
          <p>
            I&apos;m open to remote software engineering roles across AI automation, product engineering, integrations,
            retrieval systems, and full-stack delivery. Email is fastest — I read and reply to every message.
          </p>
          <ContactActions links={profile} />
        </div>
        <div className="reveal">
          <ContactForm accessKey={accessKey} />
        </div>
      </div>
    </section>
  );
}
