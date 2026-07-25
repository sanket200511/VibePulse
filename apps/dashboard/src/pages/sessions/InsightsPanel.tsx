import { Brain, FileSearch, LineChart } from "lucide-react";
import type { DeveloperInsight, InsightCategory, SessionProfile } from "./insights-types";

const CATEGORY_LABEL: Record<InsightCategory, string> = {
  ACTIVITY: "Activity",
  DEVELOPMENT_PATTERNS: "Development Patterns",
  CONTEXT_SWITCHING: "Context Switching",
  IDLE_BEHAVIOUR: "Idle Behaviour",
  FILES: "Files",
  DIRECTORIES: "Directories",
  LANGUAGES: "Languages",
  SESSION_STATISTICS: "Session Statistics",
};

const CATEGORY_ORDER: InsightCategory[] = [
  "ACTIVITY",
  "DEVELOPMENT_PATTERNS",
  "CONTEXT_SWITCHING",
  "IDLE_BEHAVIOUR",
  "FILES",
  "DIRECTORIES",
  "LANGUAGES",
  "SESSION_STATISTICS",
];

function InsightCard({ insight }: { insight: DeveloperInsight }) {
  const isObservation =
    insight.category === "FILES" ||
    insight.category === "LANGUAGES" ||
    insight.category === "SESSION_STATISTICS";
  const isPattern = insight.category === "DEVELOPMENT_PATTERNS" || insight.category === "ACTIVITY";

  let label = "REFLECTION";
  let Icon = Brain;
  let colorClass = "text-secondary-text";
  let bgClass = "bg-muted-color/10";

  if (isObservation) {
    label = "OBSERVATION";
    Icon = FileSearch;
    colorClass = "text-accent-color";
    bgClass = "bg-accent-color/5";
  } else if (isPattern) {
    label = "PATTERN";
    Icon = LineChart;
    colorClass = "text-warning-color";
    bgClass = "bg-warning-color/5";
  }

  return (
    <div
      className={`border-border rounded-xl border p-5 ${bgClass} flex flex-col items-start gap-5 md:flex-row`}
    >
      <div className={`mt-0.5 shrink-0 ${colorClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-widest ${colorClass}`}>
            {label}
          </span>
          <span className="text-secondary-text border-border border-l pl-2 text-xs uppercase tracking-wide">
            {CATEGORY_LABEL[insight.category]}
          </span>
        </div>
        <h4 className="text-primary-text text-base font-bold">{insight.headline}</h4>
        {insight.evidence && (
          <p className="text-secondary-text mt-1 text-sm leading-relaxed">{insight.evidence}</p>
        )}

        {Object.keys(insight.metrics).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(insight.metrics).map(([key, value]) => (
              <span
                key={key}
                className="bg-background border-border text-muted-foreground rounded-md border px-2.5 py-1 font-mono text-xs"
              >
                {key}: {typeof value === "object" ? JSON.stringify(value) : String(value)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export interface InsightsPanelProps {
  profile: SessionProfile;
}

export function InsightsPanel({ profile }: InsightsPanelProps) {
  const allInsights = CATEGORY_ORDER.flatMap((category) => profile.categories[category] || []);

  if (allInsights.length === 0) {
    return (
      <p className="text-muted-foreground border-border rounded-xl border border-dashed p-8 text-center text-sm">
        Not enough activity yet to generate reliable patterns for this session.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {allInsights.map((insight) => (
        <InsightCard key={insight.id} insight={insight} />
      ))}
    </div>
  );
}
