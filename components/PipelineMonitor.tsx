const stages = [
  { key: "SYNC", label: "Sync", readout: "batch upsert", capacity: 0.9, measured: false },
  { key: "FILTER", label: "Filter", readout: "−30–50% cost", capacity: 0.55, measured: true },
  { key: "DRAFT", label: "Draft", readout: "6–10× faster", capacity: 0.75, measured: true },
  { key: "APPROVE", label: "Approve", readout: "human-in-loop", capacity: 0.4, measured: false },
  { key: "PUBLISH", label: "Publish", readout: "50–200ms", capacity: 0.85, measured: true }
];

export function PipelineMonitor() {
  return (
    <aside className="pipeline-monitor" data-pipeline aria-label="Review automation pipeline, live readout">
      <header className="pipeline-head">
        <span className="pipeline-title">Pipeline</span>
        <span className="pipeline-state">
          <i aria-hidden="true" />
          nominal
        </span>
      </header>
      <ol className="pipeline-track" data-pipeline-track>
        {stages.map((stage) => (
          <li className="pipeline-row" data-pipeline-row data-ignite={stage.key} key={stage.key}>
            <span className="pipeline-led" aria-hidden="true" />
            <span className="pipeline-label">{stage.label}</span>
            <span className="pipeline-bar" aria-hidden="true">
              <i style={{ width: `${Math.round(stage.capacity * 100)}%` }} />
            </span>
            <span className={stage.measured ? "pipeline-readout is-measured" : "pipeline-readout"}>{stage.readout}</span>
          </li>
        ))}
      </ol>
      <div className="pipeline-dots" aria-hidden="true">
        {stages.map((stage, index) => (
          <span data-pipeline-dot aria-current={index === 0 ? "true" : "false"} key={stage.key} />
        ))}
      </div>
      <footer className="pipeline-foot">
        <span>Revvy · Google Business Profile</span>
        <span className="pipeline-foot-metric">1000 reviews · 30–60 min → 5–10 min</span>
      </footer>
    </aside>
  );
}
