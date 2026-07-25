import { Activity, ShieldCheck, Zap } from "lucide-react";
import type { HealthCategory, HealthMetric, HealthReport } from "./health-types";

const CATEGORY_LABEL: Record<HealthCategory, string> = {
  FOCUS: "Activity Density",
  MOMENTUM: "Event Velocity",
  FLOW: "Continuous Work",
  STABILITY: "Test Verification",
  COMPLETION: "Finalization",
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

function SignalCard({ category, metric }: { category: HealthCategory; metric: HealthMetric }) {
  let Icon = Activity;
  if (category === "STABILITY") Icon = ShieldCheck;
  if (category === "FOCUS" || category === "MOMENTUM") Icon = Zap;

  const metricEntries = Object.entries(metric.metrics).filter(
    ([, value]) => typeof value !== "object" || value === null,
  );

  return (
    <div className="bg-card border-border hover:border-accent-color/30 rounded-xl border p-5 transition-colors">
      <div className="flex items-start gap-4">
        <div className="bg-muted-color/20 text-accent-color shrink-0 rounded-lg p-2">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <h4 className="text-secondary-text text-[10px] font-bold uppercase tracking-widest">
            {CATEGORY_LABEL[category] || metric.label}
          </h4>
          <p className="text-primary-text text-sm font-bold">{metric.headline}</p>
          {metric.evidence && (
            <p className="text-secondary-text mt-1 text-xs leading-relaxed">{metric.evidence}</p>
          )}
          {metricEntries.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {metricEntries.map(([key, value]) => (
                <span
                  key={key}
                  className="bg-muted-color/10 border-border text-muted-foreground rounded border px-2 py-1 font-mono text-[10px]"
                >
                  {key}: {formatMetricValue(value)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
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
      <p className="text-muted-foreground border-border rounded-xl border border-dashed p-8 text-center text-sm">
        Not enough activity in this session to extract deterministic signals.
      </p>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="bg-muted-color/10 border-accent-color rounded-r-xl border-l-2 p-4">
        <p className="text-primary-text text-sm font-medium leading-relaxed">
          {health.summary.narrative}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {populatedCategories.map((category) => {
          const metric = health.metrics[category];
          if (!metric) return null;
          return <SignalCard key={category} category={category} metric={metric} />;
        })}
      </div>

      {health.summary.guidance.length > 0 && (
        <div className="mt-2">
          <h3 className="text-secondary-text mb-3 text-xs font-bold uppercase tracking-widest">
            Observed Guidance
          </h3>
          <ul className="flex flex-col gap-2">
            {health.summary.guidance.map((item) => (
              <li
                key={item}
                className="bg-background border-border flex items-start gap-3 rounded-lg border p-3"
              >
                <div className="bg-accent-color mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" />
                <span className="text-secondary-text text-sm">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
