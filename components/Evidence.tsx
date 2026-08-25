import type { Metric } from "@/data/portfolio";

export function StatBlock({ metric }: { metric: Metric }) {
  return (
    <div className="stat">
      {metric.value ? <div className="stat__value">{metric.value}</div> : null}
      <div className="stat__label">{metric.label}</div>
    </div>
  );
}
