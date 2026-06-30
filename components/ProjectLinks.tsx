import { ArrowUpRight, ExternalLink, Lock } from "lucide-react";
import { FaGithub } from "react-icons/fa6";
import type { Project } from "@/data/portfolio";

export function ProjectLinks({ project }: { project: Project }) {
  if (project.links.length === 0) {
    return (
      <div className="project-link-row">
        <span className="private-link">
          <Lock size={16} aria-hidden="true" />
          {project.confidentiality}
        </span>
      </div>
    );
  }

  return (
    <div className="project-link-row">
      {project.links.map((link) => {
        const Icon = link.type === "github" ? FaGithub : link.type === "live" ? ExternalLink : ArrowUpRight;
        return (
          <a className="button ghost compact-button" href={link.href} target="_blank" rel="noreferrer" key={link.href}>
            <Icon size={17} aria-hidden="true" />
            {link.label}
          </a>
        );
      })}
    </div>
  );
}
