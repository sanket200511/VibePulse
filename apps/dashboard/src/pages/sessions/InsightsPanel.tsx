/**
 * Narrative-first rendering of a Session Profile: each insight leads with
 * its headline, evidence is secondary supporting detail, and metrics are
 * de-emphasized as small badges at the bottom of the card.
 */

import { Badge } from "@vibepulse/ui";
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

function formatMetricValue(value: unknown): string {
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }
  if (typeof value === "string" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

function InsightCard({ insight }: { insight: DeveloperInsight }) {
  const metricEntries = Object.entries(insight.metrics).filter(
    ([, value]) => typeof value !== "object" || value === null,
  );

  return (
    <li className="border-border bg-background rounded-[12px] border p-4">
      <p className="text-foreground text-sm font-medium">{insight.headline}</p>

      {insight.evidence && <p className="text-muted-foreground mt-1 text-sm">{insight.evidence}</p>}

      {metricEntries.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {metricEntries.map(([key, value]) => (
            <Badge key={key} variant="outline">
              {key}: {formatMetricValue(value)}
            </Badge>
          ))}
        </div>
      )}
    </li>
  );
}

export interface InsightsPanelProps {
  profile: SessionProfile;
}

export function InsightsPanel({ profile }: InsightsPanelProps) {
  const populatedCategories = CATEGORY_ORDER.filter(
    (category) => (profile.categories[category]?.length ?? 0) > 0,
  );

  if (populatedCategories.length === 0) {
    return (
      <p className="text-muted-foreground p-8 text-center text-sm">
        Not enough activity yet to generate insights for this session.
      </p>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      {populatedCategories.map((category) => (
        <div key={category}>
          <h3 className="text-foreground mb-3 text-sm font-semibold uppercase tracking-wide">
            {CATEGORY_LABEL[category]}
          </h3>
          <ul className="flex flex-col gap-2">
            {profile.categories[category]?.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
