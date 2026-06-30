import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { FaGithub, FaLinkedinIn } from "react-icons/fa6";
import { ContactActions } from "@/components/ContactActions";
import { Reveal } from "@/components/Reveal";
import { profile, siteUrl } from "@/data/portfolio";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact Mustafa Iqbal for AI automation, LLM, RAG, backend, and full-stack software engineering roles.",
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
    <main>
      <section className="page-hero contact-page-hero">
        <div className="section-inner contact-page-grid">
          <Reveal className="section-heading wide-heading">
            <p className="eyebrow">Contact</p>
            <h1>Send the role, product problem, and timeline.</h1>
            <p>
              I am open to remote roles where a generalist software engineer can build across AI, product, frontend, backend,
              mobile, and automation. Email is the most reliable path, and the form below posts through Web3Forms.
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
