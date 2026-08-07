import { useParams, Link } from "react-router-dom";
import { useProjectAIProvenance } from "./useAIProvenance";
import { LoadingState } from "../../components/states/LoadingState";
import { ErrorState } from "../../components/states/ErrorState";
import { ArrowLeft, Bot } from "lucide-react";
import { TimelineCard } from "../../components/timeline";
import { mapAIProvenanceToViewModel } from "../../lib/events/mappers";

export function AIProvenancePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data, isLoading, isError } = useProjectAIProvenance(projectId);

  if (isLoading) return <LoadingState label="Analyzing AI Provenance..." />;
  if (isError || !data) return <ErrorState message="Failed to load AI Provenance." />;

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-zinc-950 p-8 text-zinc-50 selection:bg-indigo-500/30">
      <Link
        to={`/projects/${projectId}`}
        className="group mb-8 flex w-fit items-center gap-2 rounded-md text-sm font-medium text-zinc-500 transition-all hover:text-zinc-200"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        <span>Back to Project</span>
      </Link>

      <div className="mb-12" id="ai-provenance" data-tour="ai-provenance">
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-white">
          <Bot className="h-8 w-8 text-indigo-500" /> AI Provenance
        </h1>
        <p className="mt-2 text-zinc-400">
          Deterministic observation of AI interactions and the codebase evolution that followed.
        </p>
      </div>

      <div className="mb-12 grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-6 shadow-xl">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500">
            Total Interactions
          </h3>
          <p className="mt-2 font-mono text-4xl text-white">{data.stats.total_interactions}</p>
        </div>
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-6 shadow-xl">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500">
            Tools Executed
          </h3>
          <p className="mt-2 font-mono text-4xl text-white">{data.stats.total_tools_executed}</p>
        </div>
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-6 shadow-xl">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500">Providers</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {data.stats.providers_used.map((p) => (
              <span
                key={p}
                className="rounded-md border border-indigo-500/20 bg-indigo-500/10 px-2 py-1 text-xs font-medium text-indigo-400"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-6 shadow-xl">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500">Models</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {data.stats.models_used.map((m) => (
              <span
                key={m}
                className="rounded-md border border-purple-500/20 bg-purple-500/10 px-2 py-1 text-xs font-medium text-purple-400"
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <h2 className="text-xl font-bold text-white">Interaction Timeline</h2>
        {data.timeline.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-zinc-500">
            No AI interactions observed for this project.
          </div>
        ) : (
          <div className="relative space-y-6 before:absolute before:inset-y-0 before:left-[19px] before:w-px before:bg-zinc-800">
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
