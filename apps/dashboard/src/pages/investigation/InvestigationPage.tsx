import { useState } from "react";
import { useParams } from "react-router-dom";
import { useInvestigation } from "./useInvestigation";
import { LoadingState } from "../../components/states";
import { Search, Filter, AlertCircle } from "lucide-react";
import { TimelineCard } from "../../components/timeline";
import { mapInvestigationResultToViewModel } from "../../lib/events/mappers";

export function InvestigationPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [query, setQuery] = useState("");

  const { data, isLoading, isError } = useInvestigation(projectId, query);

  // No full-page crash — keep the search UI always visible

  return (
    <div className="flex h-full flex-col bg-zinc-950 text-zinc-50">
      {/* Search Header */}
      <div className="border-b border-zinc-800 bg-zinc-950/80 p-6 backdrop-blur-md">
        <div className="mx-auto max-w-5xl">
          <div
            className="mb-4 flex items-center gap-4"
            id="investigation"
            data-tour="investigation"
          >
            <Search className="h-6 w-6 text-indigo-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Investigation Engine</h1>
          </div>

          <div className="group relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search engineering history... (e.g. file:auth.py severity:HIGH authentication)"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-12 py-4 text-lg text-white shadow-xl transition-all placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              autoFocus
            />
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500 transition-colors group-focus-within:text-indigo-400" />
            <div className="absolute right-4 top-1/2 flex -translate-y-1/2 items-center gap-2">
              <span className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 font-mono text-xs text-zinc-500">
                ⌘K
              </span>
            </div>
          </div>
          <div className="scrollbar-none mt-3 flex gap-2 overflow-x-auto pb-2">
            <span className="mr-2 self-center text-xs font-medium text-zinc-500">Suggestions:</span>
            {[
              "severity:HIGH",
              "file:main.py",
              "architecture:added",
              "ai.provider:Cursor",
              "event:FUNCTION_ADDED",
            ].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setQuery(suggestion)}
                className="whitespace-nowrap rounded-full border border-zinc-700/50 bg-zinc-800/50 px-3 py-1 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Filters Sidebar */}
        <div className="hidden w-64 overflow-y-auto border-r border-zinc-800 bg-zinc-950/50 p-6 md:block">
          <h3 className="mb-6 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-500">
            <Filter className="h-4 w-4" /> Filters
          </h3>

          <div className="space-y-6">
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase text-zinc-400">Analysis</h4>
              <button
                onClick={() => setQuery((q) => q + " severity:HIGH")}
                className="block text-sm text-zinc-500 hover:text-indigo-400"
              >
                High Severity
              </button>
              <button
                onClick={() => setQuery((q) => q + " architecture:FUNCTION_ADDED")}
                className="block text-sm text-zinc-500 hover:text-indigo-400"
              >
                Functions Added
              </button>
            </div>
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase text-zinc-400">AI Provenance</h4>
              <button
                onClick={() => setQuery((q) => q + " ai.provider:Cursor")}
                className="block text-sm text-zinc-500 hover:text-indigo-400"
              >
                Cursor
              </button>
              <button
                onClick={() => setQuery((q) => q + " ai.provider:Claude")}
                className="block text-sm text-zinc-500 hover:text-indigo-400"
              >
                Claude
              </button>
            </div>
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase text-zinc-400">Events</h4>
              <button
                onClick={() => setQuery((q) => q + " event:FILE_MODIFIED")}
                className="block text-sm text-zinc-500 hover:text-indigo-400"
              >
                File Modifications
              </button>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-10">
          <div className="mx-auto max-w-4xl">
            {isLoading ? (
              <LoadingState label="Searching..." />
            ) : isError ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-800 py-24 text-center text-zinc-500">
                <AlertCircle className="h-10 w-10 text-zinc-700" />
                <p className="text-base font-medium">Investigation Engine Unavailable</p>
                <p className="max-w-sm text-sm text-zinc-600">
                  Could not reach the API. Make sure the backend is running and try again.
                </p>
              </div>
            ) : !data || data.results.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-24 text-center text-zinc-500">
                <Search className="mb-4 h-12 w-12 text-zinc-700" />
                <p className="text-lg">No observations match your investigation.</p>
                <p className="mt-2 text-sm text-zinc-600">
                  Try adjusting your filters or search terms.
                </p>
              </div>
            ) : (
              <div className="relative space-y-8 before:absolute before:inset-y-0 before:left-[27px] before:w-px before:bg-zinc-800">
                <div className="mb-8 pl-14 text-sm text-zinc-500">
                  Found <span className="font-bold text-white">{data.total_count}</span>{" "}
                  observations.
                </div>

                {data.results.map((result) => (
                  <TimelineCard key={result.id} event={mapInvestigationResultToViewModel(result)} />
                ))}

                {data.has_more && (
                  <div className="pt-8 text-center">
                    <button className="rounded-full bg-zinc-800 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700">
                      Load More Observations
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
