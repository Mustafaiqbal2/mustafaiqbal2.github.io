import { provenanceLabel, type Metric } from "@/data/portfolio";

export function Provenance({ tier, source }: { tier: Metric["tier"]; source?: string }) {
  const info = provenanceLabel[tier];
  return (
    <span className="prov" data-tier={tier} title={source ? `${info.label} — ${source}` : info.label}>
      <span className="prov__glyph" aria-hidden="true">
        {info.glyph}
      </span>
      {info.label}
      {source ? ` · ${source}` : ""}
    </span>
  );
}

export function StatBlock({ metric }: { metric: Metric }) {
  return (
    <div className="stat">
      {metric.value ? <div className="stat__value">{metric.value}</div> : null}
      <div className="stat__label">{metric.label}</div>
      <Provenance tier={metric.tier} source={metric.source} />
    </div>
  );
}
