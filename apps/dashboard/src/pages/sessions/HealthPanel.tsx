/**
 * Reflective, non-evaluative rendering of a Session Health Report: a
 * narrative paragraph, five fixed-order metric cards (never sorted by
 * "best"/"worst"), and a low-stakes guidance list. Labels are rendered as
 * uniformly-styled outline badges — never color-coded by band — so they
 * read as descriptive, not evaluative. See docs/adr/0009-health-engine.md.
 */

import { Badge } from "@vibepulse/ui";
import type { HealthCategory, HealthMetric, HealthReport } from "./health-types";

const CATEGORY_LABEL: Record<HealthCategory, string> = {
  FOCUS: "Focus",
  MOMENTUM: "Momentum",
  FLOW: "Flow",
  STABILITY: "Stability",
  COMPLETION: "Completion",
};

const CATEGORY_ORDER: HealthCategory[] = ["FOCUS", "MOMENTUM", "FLOW", "STABILITY", "COMPLETION"];

function formatMetricValue(value: unknown): string {
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  if (typeof value === "string" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

function MetricCard({ category, metric }: { category: HealthCategory; metric: HealthMetric }) {
  const metricEntries = Object.entries(metric.metrics).filter(
    ([, value]) => typeof value !== "object" || value === null,
  );

  return (
    <div
      role="group"
      aria-label={`${CATEGORY_LABEL[category]}: ${metric.label}`}
      className="border-border bg-background rounded-[12px] border p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
          {CATEGORY_LABEL[category]}
        </h4>
        <Badge variant="outline">{metric.label}</Badge>
      </div>

      <p className="text-foreground mt-2 text-sm font-medium">{metric.headline}</p>

      {metric.evidence && <p className="text-muted-foreground mt-1 text-sm">{metric.evidence}</p>}

      {metricEntries.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {metricEntries.map(([key, value]) => (
            <Badge key={key} variant="outline">
              {key}: {formatMetricValue(value)}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export interface HealthPanelProps {
  health: HealthReport;
}

export function HealthPanel({ health }: HealthPanelProps) {
  const populatedCategories = CATEGORY_ORDER.filter((category) => health.metrics[category] != null);

  if (populatedCategories.length === 0) {
    return (
      <p className="text-muted-foreground p-8 text-center text-sm">
        Not enough activity in this session to assess its health.
      </p>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <p className="text-foreground text-sm">{health.summary.narrative}</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {populatedCategories.map((category) => {
          const metric = health.metrics[category];
          if (!metric) {
            return null;
          }
          return <MetricCard key={category} category={category} metric={metric} />;
        })}
      </div>

      {health.summary.guidance.length > 0 && (
        <div>
          <h3 className="text-foreground mb-2 text-sm font-semibold uppercase tracking-wide">
            Worth noting
          </h3>
          <ul className="text-muted-foreground flex flex-col gap-1 text-sm">
            {health.summary.guidance.map((item) => (
              <li key={item} className="list-disc pl-4">
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
