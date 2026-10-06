import { useQuery } from "@tanstack/react-query";
import { getApiBaseUrl } from "../../lib/api-config";
import { useDemoMode } from "../../demo/config";
import { computeDemoProjectIntelligence } from "../../demo/data";
import type { ProjectIntelligence } from "./types";
import { Activity, Clock, Code, FileText, LayoutTemplate } from "lucide-react";
import { formatRelativeTime } from "../../lib/relative-time";

import { Link } from "react-router-dom";

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatFullTimestamp(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function ProjectPulse({ series }: { series: ProjectIntelligence["activity_series"] }) {
  if (series.length === 0) {
    return (
      <div className="flex h-32 w-full items-center justify-center">
        <span className="text-secondary-text text-sm font-medium">No observed sessions yet.</span>
      </div>
    );
  }

  // Sort series ascending for timeline
  const sorted = [...series].sort(
    (a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime(),
  );

  const maxEvents = Math.max(...sorted.map((s) => s.event_count), 1);
  const minTime = new Date(sorted[0]?.started_at ?? 0).getTime();
  const maxTime = new Date(sorted[sorted.length - 1]?.started_at ?? 0).getTime();
  const timeSpan = maxTime - minTime;

  return (
    <div className="relative mb-4 mt-8 h-32 w-full">
      {/* Temporal Baseline */}
      <div className="bg-border/60 absolute bottom-0 left-0 right-0 h-px" />

      {sorted.map((session) => {
        // Normalization: bounded height preserving dot visibility
        const heightPct = Math.max(10, Math.min(95, (session.event_count / maxEvents) * 95));

        // Temporal distribution
        let leftPct = 50;
        if (timeSpan > 0) {
          leftPct = ((new Date(session.started_at).getTime() - minTime) / timeSpan) * 100;
        }

        const isActive = session.status === "ACTIVE";

        return (
          <Link
            key={session.session_id}
            to={`/sessions/${session.session_id}`}
            className="ring-offset-background focus-visible:ring-ring group absolute bottom-0 z-10 flex flex-col items-center justify-end outline-none hover:z-20 focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{
              left: `calc(${leftPct}% - 6px)`,
              height: `${heightPct}%`,
              width: "12px",
            }}
            aria-label={`Session observed ${formatFullTimestamp(session.started_at)} — ${session.event_count} observed events`}
          >
            {/* Semantic Observation Node */}
            <div
              className={`h-2 w-2 rounded-full transition-all duration-300 ${
                isActive
                  ? "bg-accent-color shadow-[0_0_8px_rgba(var(--accent-color-rgb),0.6)] motion-safe:animate-pulse"
                  : "bg-muted-foreground group-hover:bg-accent-color group-focus-visible:bg-accent-color group-hover:scale-125 group-focus-visible:scale-125"
              }`}
            />

            {/* Temporal Stem */}
            <div
              className={`mt-1 w-[2px] flex-1 rounded-t-sm transition-colors duration-300 ${
                isActive
                  ? "bg-accent-color/60"
                  : "bg-border group-hover:bg-accent-color/40 group-focus-visible:bg-accent-color/40"
              }`}
            />

            {/* Interaction Tooltip */}
            <div className="bg-popover text-popover-foreground pointer-events-none absolute bottom-full left-1/2 mb-3 w-max -translate-x-1/2 rounded-md border px-3 py-2 text-xs opacity-0 shadow-lg transition-all duration-200 group-hover:-translate-y-1 group-hover:opacity-100 group-focus-visible:-translate-y-1 group-focus-visible:opacity-100">
              <div className="mb-1 font-bold">{session.event_count} events</div>
              <div className="text-muted-foreground">{formatRelativeTime(session.started_at)}</div>
              {isActive && (
                <div className="text-accent-color mt-1 text-[10px] font-semibold uppercase tracking-wider">
                  Active
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export function ProjectIntelligencePanel({
  projectId,
  intelligence: providedIntelligence,
}: {
  projectId: string;
  intelligence?: ProjectIntelligence;
}) {
  const { isDemo } = useDemoMode();

  const {
    data: queriedIntelligence,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["project_intelligence", projectId],
    queryFn: async (): Promise<ProjectIntelligence> => {
      if (isDemo) {
        const demoData = computeDemoProjectIntelligence(projectId);
        if (!demoData) throw new Error("Demo Project Intelligence not found");
        return demoData as ProjectIntelligence;
      }

      const response = await fetch(
        new URL(`/api/projects/${projectId}/intelligence`, getApiBaseUrl()).toString(),
      );
      if (!response.ok) {
        throw new Error(`Failed to load intelligence (${response.status})`);
      }
      return response.json();
    },
    enabled: !!projectId && !providedIntelligence,
  });

  if (!providedIntelligence && isLoading) {
    return (
      <div className="border-border bg-card flex h-64 w-full items-center justify-center rounded-xl border p-8 shadow-sm">
        <div className="border-accent-color/30 h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    );
  }

  const intelligence = providedIntelligence || queriedIntelligence;

  if (isError || !intelligence) {
    return null;
  }

  // Derived values for denominators
  const languageEntries = Object.entries(intelligence.language_activity).sort(
    (a, b) => b[1] - a[1],
  );
  const totalLanguageEvents = languageEntries.reduce((acc, [_, count]) => acc + count, 0);

  const eventEntries = Object.entries(intelligence.event_composition).sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex flex-col gap-6">
      <div
        data-tour="project-pulse"
        className="bg-card border-border overflow-hidden rounded-xl border shadow-sm"
      >
        {/* Header Region */}
        <div className="border-border/60 bg-secondary/20 flex flex-wrap items-center justify-between gap-3 border-b p-3.5 sm:p-4">
          <div className="flex items-center gap-2">
            <Activity className="text-primary h-4 w-4" />
            <h2 className="text-foreground text-sm font-semibold tracking-tight">Project Pulse</h2>
          </div>
          <div className="text-muted-foreground flex flex-wrap items-center gap-3 font-mono text-xs font-medium tabular-nums">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              {intelligence.observation_window.first_observed_at
                ? formatTimestamp(intelligence.observation_window.first_observed_at)
                : "Never"}{" "}
              —{" "}
              {intelligence.observation_window.latest_observed_at
                ? formatTimestamp(intelligence.observation_window.latest_observed_at)
                : "Never"}
            </span>
            <span className="border-border/60 border-l pl-3">
              {intelligence.metrics.total_sessions} sessions
            </span>
            <span className="border-border/60 border-l pl-3">
              {intelligence.metrics.total_events} events
            </span>
          </div>
        </div>

        {/* Constellation Region */}
        <div className="p-4 sm:p-5">
          <h3 className="text-muted-foreground font-mono text-[10px] font-semibold uppercase tracking-wider">
            Temporal Activity Constellation
          </h3>
          <ProjectPulse series={intelligence.activity_series} />
        </div>
      </div>

      <div data-tour="project-intelligence" className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {/* Language Activity */}
        <div className="bg-card/60 border-border/80 shadow-xs rounded-lg border p-3.5 sm:p-4">
          <div className="mb-3 flex items-center gap-2">
            <Code className="text-primary h-3.5 w-3.5" />
            <h3 className="text-foreground text-xs font-semibold">Observed Language Activity</h3>
          </div>
          {languageEntries.length === 0 ? (
            <p className="text-muted-foreground text-xs">No language telemetry observed.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {languageEntries.map(([lang, count]) => (
                <div key={lang}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-foreground font-medium">{lang}</span>
                    <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
                      {Math.round((count / totalLanguageEvents) * 100)}%
                    </span>
                  </div>
                  <div className="bg-muted/60 h-1.5 w-full overflow-hidden rounded-full">
                    <div
                      className="bg-primary/80 h-full rounded-full"
                      style={{ width: `${(count / totalLanguageEvents) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Event Composition */}
        <div className="bg-card/60 border-border/80 shadow-xs rounded-lg border p-3.5 sm:p-4">
          <div className="mb-3 flex items-center gap-2">
            <LayoutTemplate className="text-primary h-3.5 w-3.5" />
            <h3 className="text-foreground text-xs font-semibold">Event Composition</h3>
          </div>
          {eventEntries.length === 0 ? (
            <p className="text-muted-foreground text-xs">No specific events observed.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {eventEntries.map(([type, count]) => (
                <div key={type} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/30 rounded-xs h-1.5 w-1.5" />
                    <span className="text-foreground font-medium">{type.replace("FILE_", "")}</span>
                  </div>
                  <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
                    {count} <span className="text-[9px] uppercase">events</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Frequently Observed Files */}
        <div className="bg-card/60 border-border/80 shadow-xs flex flex-col rounded-lg border p-3.5 sm:p-4">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="text-primary h-3.5 w-3.5" />
            <h3 className="text-foreground text-xs font-semibold">Frequently Observed Files</h3>
          </div>
          {intelligence.frequently_observed_files.length === 0 ? (
            <p className="text-muted-foreground text-xs">No file telemetry observed.</p>
          ) : (
            <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
              {intelligence.frequently_observed_files.slice(0, 5).map((file, i) => (
                <div
                  key={i}
                  className="bg-secondary/30 border-border/60 flex items-center justify-between rounded-md border p-2 text-xs"
                >
                  <span
                    className="text-foreground truncate font-mono text-[11px]"
                    title={file.path}
                  >
                    {file.path.split("/").pop()}
                  </span>
                  <span className="text-muted-foreground shrink-0 font-mono text-[10px] tabular-nums">
                    {file.event_count}
                  </span>
                </div>
              ))}
              {intelligence.frequently_observed_files.length > 5 && (
                <div className="text-muted-foreground mt-1 text-center font-mono text-[10px]">
                  + {intelligence.frequently_observed_files.length - 5} more files observed
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
