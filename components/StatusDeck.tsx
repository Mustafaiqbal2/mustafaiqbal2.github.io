import { Command } from "lucide-react";

const stages = ["SYNC", "FILTER", "DRAFT", "APPROVE", "PUBLISH"];

export function StatusDeck() {
  return (
    <div className="status-deck" data-status-deck>
      <span className="deck-live">
        <i aria-hidden="true" />
        <span className="deck-live-label">Live</span>
        <span className="deck-live-sub">Open to remote</span>
      </span>

      <ol className="deck-breadcrumb" aria-hidden="true">
        {stages.map((stage, index) => (
          <li data-deck-stage={index} key={stage}>
            {stage}
          </li>
        ))}
      </ol>

      <span className="deck-clock" data-deck-clock aria-hidden="true" suppressHydrationWarning>
        PKT --:--:--
      </span>

      <button className="deck-console" type="button" data-console-open aria-haspopup="dialog">
        <Command size={15} aria-hidden="true" />
        <span className="deck-console-key">K</span>
        <span className="deck-console-label">Console</span>
      </button>
    </div>
  );
}
