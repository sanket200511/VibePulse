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
    <div className="border-border/80 bg-card/60 shadow-xs hover:border-primary/40 rounded-lg border p-4 transition-colors">
      <div className="flex items-start gap-3">
        <div className="bg-primary/10 text-primary shrink-0 rounded-md p-2">
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <h4 className="text-muted-foreground font-mono text-[10px] font-bold uppercase tracking-wider">
            {CATEGORY_LABEL[category] || metric.label}
          </h4>
          <p className="text-foreground text-xs font-semibold">{metric.headline}</p>
          {metric.evidence && (
            <p className="text-muted-foreground text-xs leading-relaxed">{metric.evidence}</p>
          )}
          {metricEntries.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {metricEntries.map(([key, value]) => (
                <span
                  key={key}
                  className="border-border/70 bg-secondary/30 text-foreground rounded-md border px-1.5 py-0.5 font-mono text-[10px] tabular-nums"
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
      <p className="border-border/80 text-muted-foreground rounded-lg border border-dashed p-6 text-center font-mono text-xs">
        Not enough activity in this session to extract deterministic signals.
      </p>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="border-primary bg-primary/5 rounded-r-lg border-l-2 p-3.5">
        <p className="text-foreground text-xs font-medium leading-relaxed">
          {health.summary.narrative}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {populatedCategories.map((category) => {
          const metric = health.metrics[category];
          if (!metric) return null;
          return <SignalCard key={category} category={category} metric={metric} />;
        })}
      </div>

      {health.summary.guidance.length > 0 && (
        <div className="mt-1">
          <h3 className="text-muted-foreground mb-2 font-mono text-[10px] font-bold uppercase tracking-wider">
            Observed Guidance
          </h3>
          <ul className="flex flex-col gap-1.5">
            {health.summary.guidance.map((item) => (
              <li
                key={item}
                className="border-border/70 bg-secondary/20 flex items-start gap-2.5 rounded-md border p-2.5"
              >
                <div className="bg-primary mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" />
                <span className="text-muted-foreground text-xs">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
