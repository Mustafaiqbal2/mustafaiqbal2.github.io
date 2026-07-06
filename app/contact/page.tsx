import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { FaGithub, FaLinkedinIn } from "react-icons/fa6";
import { ContactActions } from "@/components/ContactActions";
import { Reveal } from "@/components/Reveal";
import { profile, siteUrl } from "@/data/portfolio";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Reach Mustafa Iqbal about remote software engineering roles in AI automation, LLM and RAG systems, and full-stack product work. Email gets a fast reply.",
  alternates: {
    canonical: `${siteUrl}/contact/`
  }
};

const contactOptions = [
  {
    label: "Email",
    value: profile.email,
    href: `mailto:${profile.email}`,
    icon: Mail
  },
  {
    label: "LinkedIn",
    value: "linkedin.com/in/mustafa-iqbal-ba42b424b",
    href: profile.linkedIn,
    icon: FaLinkedinIn
  },
  {
    label: "GitHub",
    value: "github.com/Mustafaiqbal2",
    href: profile.github,
    icon: FaGithub
  }
];

export default function ContactPage() {
  return (
    <main id="top">
      <section className="page-hero contact-page-hero">
        <div className="section-inner contact-page-grid">
          <Reveal className="section-heading wide-heading">
            <p className="eyebrow">Contact</p>
            <h1>Let&apos;s talk about the role.</h1>
            <p>
              Email me directly, or use the form — I reply from my own inbox, usually within a day. If you can, include
              the role or product area and a rough timeline, and I&apos;ll come back with specifics on how I&apos;d
              approach it. I&apos;m open to remote software engineering roles across AI automation, product engineering,
              and full-stack delivery.
            </p>
            <ContactActions links={profile} />
          </Reveal>
          <Reveal className="contact-options-panel" delay={0.08}>
            {contactOptions.map((option) => {
              const Icon = option.icon;
              return (
                <a href={option.href} target={option.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" key={option.label}>
                  <Icon size={22} aria-hidden="true" />
                  <span>{option.label}</span>
                  <strong>{option.value}</strong>
                </a>
              );
            })}
          </Reveal>
        </div>
      </section>

    </main>
  );
}
