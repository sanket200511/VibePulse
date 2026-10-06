import { useParams, Link } from "react-router-dom";
import { useProjectAIProvenance } from "./useAIProvenance";
import { LoadingState } from "../../components/states/LoadingState";
import { ErrorState } from "../../components/states/ErrorState";
import { ArrowLeft, Bot, Sparkles } from "lucide-react";
import { Badge } from "@depradar/ui";
import { TimelineCard } from "../../components/timeline";
import { mapAIProvenanceToViewModel } from "../../lib/events/mappers";

import { Breadcrumbs } from "../../components/layout/Breadcrumbs";

export function AIProvenancePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data, isLoading, isError } = useProjectAIProvenance(projectId);

  if (isLoading) return <LoadingState label="Analyzing AI Provenance..." />;
  if (isError || !data) return <ErrorState message="Failed to load AI Provenance." />;

  return (
    <div className="animate-fade-in-up text-foreground mx-auto flex w-full max-w-[1400px] flex-1 flex-col space-y-6 px-4 py-4 sm:px-6 md:py-6">
      {/* ── BREADCRUMB HEADER ── */}
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Breadcrumbs
            items={[
              { label: "Projects", to: "/projects" },
              { label: "Project Story", to: `/projects/${projectId}` },
              { label: "AI Provenance" },
            ]}
          />
          <Link
            to={`/projects/${projectId}`}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Project Story</span>
          </Link>
        </div>

        <div
          className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"
          id="ai-provenance"
          data-tour="ai-provenance"
        >
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-foreground flex items-center gap-2 text-xl font-bold tracking-tight">
                <Bot className="text-primary h-5 w-5" /> AI Provenance
              </h1>
              <Badge
                variant="outline"
                className="border-border/80 bg-secondary/30 text-muted-foreground font-mono text-[10px]"
              >
                DETERMINISTIC EVIDENCE
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Deterministic observation of AI interactions and the codebase evolution that followed.
            </p>
          </div>
        </div>
      </div>

      {/* ── STATS GRID ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border-border/80 bg-card/60 rounded-lg border p-3.5">
          <div className="text-muted-foreground font-mono text-[10px] font-semibold uppercase tracking-wider">
            Total Interactions
          </div>
          <p className="text-foreground mt-1 font-mono text-2xl font-bold tabular-nums">
            {data.stats.total_interactions}
          </p>
        </div>
        <div className="border-border/80 bg-card/60 rounded-lg border p-3.5">
          <div className="text-muted-foreground font-mono text-[10px] font-semibold uppercase tracking-wider">
            Tools Executed
          </div>
          <p className="text-foreground mt-1 font-mono text-2xl font-bold tabular-nums">
            {data.stats.total_tools_executed}
          </p>
        </div>
        <div className="border-border/80 bg-card/60 rounded-lg border p-3.5">
          <div className="text-muted-foreground font-mono text-[10px] font-semibold uppercase tracking-wider">
            Providers
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {data.stats.providers_used.length === 0 ? (
              <span className="text-muted-foreground text-xs italic">None observed</span>
            ) : (
              data.stats.providers_used.map((p) => (
                <span
                  key={p}
                  className="border-primary/30 bg-primary/10 text-primary rounded border px-1.5 py-0.5 font-mono text-[10px]"
                >
                  {p}
                </span>
              ))
            )}
          </div>
        </div>
        <div className="border-border/80 bg-card/60 rounded-lg border p-3.5">
          <div className="text-muted-foreground font-mono text-[10px] font-semibold uppercase tracking-wider">
            Models
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {data.stats.models_used.length === 0 ? (
              <span className="text-muted-foreground text-xs italic">None observed</span>
            ) : (
              data.stats.models_used.map((m) => (
                <span
                  key={m}
                  className="rounded border border-purple-500/30 bg-purple-500/10 px-1.5 py-0.5 font-mono text-[10px] text-purple-300"
                >
                  {m}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── TIMELINE ── */}
      <div className="space-y-4">
        <h2 className="text-foreground text-sm font-semibold uppercase tracking-wider">
          Interaction Timeline
        </h2>
        {data.timeline.length === 0 ? (
          <div className="border-border/80 bg-card/40 flex flex-col items-center justify-center rounded-lg border p-10 text-center">
            <Sparkles className="text-muted-foreground/60 mb-2 h-6 w-6" />
            <h3 className="text-foreground text-xs font-semibold">No AI Interactions Observed</h3>
            <p className="text-muted-foreground mt-1 max-w-md text-xs">
              AI code modifications and assistant tool executions recorded by the daemon will appear
              here with evidence links.
            </p>
          </div>
        ) : (
          <div className="before:bg-border/80 relative space-y-4 before:absolute before:inset-y-0 before:left-[19px] before:w-px">
            {data.timeline.map((entry) => (
              <TimelineCard
                key={entry.event_id}
                event={mapAIProvenanceToViewModel(entry, projectId)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
