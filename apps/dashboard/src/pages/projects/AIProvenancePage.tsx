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
    <div className="animate-fade-in-up bg-background text-foreground flex flex-1 flex-col p-6 md:p-8">
      {/* ── BREADCRUMB HEADER ── */}
      <div className="mb-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Breadcrumbs
            items={[
              { label: "Projects", to: "/projects" },
              { label: "Project Story", to: `/projects/${projectId}` },
              { label: "AI Provenance" },
            ]}
          />
          <Link
            to={`/projects/${projectId}`}
            className="text-secondary-text hover:text-primary-text inline-flex items-center gap-1.5 text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Project Story</span>
          </Link>
        </div>

        <div
          className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"
          id="ai-provenance"
          data-tour="ai-provenance"
        >
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-primary-text flex items-center gap-2.5 text-2xl font-extrabold tracking-tight md:text-3xl">
                <Bot className="h-7 w-7 text-indigo-400" /> AI Provenance
              </h1>
              <Badge
                variant="outline"
                className="border-indigo-500/40 font-mono text-xs text-indigo-300"
              >
                DETERMINISTIC EVIDENCE
              </Badge>
            </div>
            <p className="text-secondary-text mt-1 text-xs md:text-sm">
              Deterministic observation of AI interactions and the codebase evolution that followed.
            </p>
          </div>
        </div>
      </div>

      {/* ── STATS GRID ── */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-card border-border rounded-xl border p-5 shadow-sm">
          <div className="text-secondary-text text-xs font-bold uppercase tracking-wider">
            Total Interactions
          </div>
          <p className="text-primary-text mt-2 font-mono text-3xl font-extrabold">
            {data.stats.total_interactions}
          </p>
        </div>
        <div className="bg-card border-border rounded-xl border p-5 shadow-sm">
          <div className="text-secondary-text text-xs font-bold uppercase tracking-wider">
            Tools Executed
          </div>
          <p className="text-primary-text mt-2 font-mono text-3xl font-extrabold">
            {data.stats.total_tools_executed}
          </p>
        </div>
        <div className="bg-card border-border rounded-xl border p-5 shadow-sm">
          <div className="text-secondary-text text-xs font-bold uppercase tracking-wider">
            Providers
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {data.stats.providers_used.length === 0 ? (
              <span className="text-muted-foreground text-xs italic">None observed</span>
            ) : (
              data.stats.providers_used.map((p) => (
                <span
                  key={p}
                  className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-300"
                >
                  {p}
                </span>
              ))
            )}
          </div>
        </div>
        <div className="bg-card border-border rounded-xl border p-5 shadow-sm">
          <div className="text-secondary-text text-xs font-bold uppercase tracking-wider">
            Models
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {data.stats.models_used.length === 0 ? (
              <span className="text-muted-foreground text-xs italic">None observed</span>
            ) : (
              data.stats.models_used.map((m) => (
                <span
                  key={m}
                  className="rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-300"
                >
                  {m}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── TIMELINE ── */}
      <div className="space-y-6">
        <h2 className="text-primary-text text-lg font-bold tracking-tight">Interaction Timeline</h2>
        {data.timeline.length === 0 ? (
          <div className="bg-card border-border flex flex-col items-center justify-center rounded-xl border p-12 text-center">
            <Sparkles className="text-muted-foreground mb-2 h-8 w-8" />
            <h3 className="text-primary-text text-sm font-bold">No AI Interactions Observed</h3>
            <p className="text-secondary-text mt-1 max-w-md text-xs">
              AI code modifications and assistant tool executions recorded by the daemon will appear
              here with evidence links.
            </p>
          </div>
        ) : (
          <div className="before:bg-border relative space-y-6 before:absolute before:inset-y-0 before:left-[19px] before:w-px">
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
