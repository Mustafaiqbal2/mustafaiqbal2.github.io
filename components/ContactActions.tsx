import { Check, Copy, Download, Mail } from "lucide-react";
import { FaGithub, FaLinkedinIn } from "react-icons/fa6";

type ContactLinks = {
  email: string;
  resume: string;
  github: string;
  linkedIn: string;
};

export function ContactActions({
  compact = false,
  links
}: {
  compact?: boolean;
  links: ContactLinks;
}) {
  return (
    <div className={compact ? "contact-actions compact" : "contact-actions"}>
      <a className="button primary" href={`mailto:${links.email}`}>
        <Mail size={18} aria-hidden="true" />
        Email Mustafa
      </a>
      <button className="button ghost copy-email-button" type="button" data-copy-email={links.email}>
        <span className="copy-icon-default" aria-hidden="true">
          <Copy size={18} />
        </span>
        <span className="copy-icon-success" aria-hidden="true">
          <Check size={18} />
        </span>
        <span data-copy-label>Copy email</span>
      </button>
      <a className="icon-button" href={links.resume} aria-label="Download resume">
        <Download size={19} aria-hidden="true" />
      </a>
      <a className="icon-button" href={links.github} aria-label="Open GitHub profile" target="_blank" rel="noreferrer">
        <FaGithub aria-hidden="true" />
      </a>
      <a className="icon-button" href={links.linkedIn} aria-label="Open LinkedIn profile" target="_blank" rel="noreferrer">
        <FaLinkedinIn aria-hidden="true" />
      </a>
    </div>
  );
}
