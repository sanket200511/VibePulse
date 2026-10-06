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
  let colorClass = "text-muted-foreground";
  let bgClass = "bg-secondary/30";

  if (isObservation) {
    label = "OBSERVATION";
    Icon = FileSearch;
    colorClass = "text-primary";
    bgClass = "bg-primary/5";
  } else if (isPattern) {
    label = "PATTERN";
    Icon = LineChart;
    colorClass = "text-amber-500";
    bgClass = "bg-amber-500/5";
  }

  return (
    <div
      className={`border-border/80 rounded-lg border p-4 ${bgClass} shadow-xs flex flex-col items-start gap-4 md:flex-row`}
    >
      <div className={`mt-0.5 shrink-0 ${colorClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span
            className={`font-mono text-[10px] font-bold uppercase tracking-wider ${colorClass}`}
          >
            {label}
          </span>
          <span className="border-border/60 text-muted-foreground border-l pl-2 font-mono text-[10px] uppercase tracking-wider">
            {CATEGORY_LABEL[insight.category]}
          </span>
        </div>
        <h4 className="text-foreground text-xs font-semibold">{insight.headline}</h4>
        {insight.evidence && (
          <p className="text-muted-foreground text-xs leading-relaxed">{insight.evidence}</p>
        )}

        {Object.keys(insight.metrics).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {Object.entries(insight.metrics).map(([key, value]) => (
              <span
                key={key}
                className="border-border/70 bg-card/60 text-foreground rounded-md border px-2 py-0.5 font-mono text-[10px] tabular-nums"
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
      <p className="border-border/80 text-muted-foreground rounded-lg border border-dashed p-6 text-center font-mono text-xs">
        Not enough activity yet to generate reliable patterns for this session.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {allInsights.map((insight) => (
        <InsightCard key={insight.id} insight={insight} />
      ))}
    </div>
  );
}
