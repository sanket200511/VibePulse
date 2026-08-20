import { useState } from "react";
import {
  Brain,
  Code,
  Cpu,
  Layers,
  FolderGit2,
  RefreshCw,
  ShieldCheck,
  FileCode,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Flame,
  FileDown,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@vibepulse/ui";
import { useProjectContext } from "./useProjectContext";
import { formatRelativeTime } from "../../lib/relative-time";

interface ProjectContextMemoryProps {
  projectId: string;
}

export function ProjectContextMemory({ projectId }: ProjectContextMemoryProps) {
  const {
    context,
    isLoading,
    isError,
    refreshContext,
    isRefreshing,
    exportContext,
    isExporting,
    isExportSuccess,
  } = useProjectContext(projectId);
  const [showAllFiles, setShowAllFiles] = useState(false);
  const [selectedTech, setSelectedTech] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="bg-card border-border flex h-64 w-full flex-col items-center justify-center gap-3 rounded-xl border p-8 shadow-sm">
        <div className="border-indigo-500/30 h-8 w-8 animate-spin rounded-full border-2 border-t-indigo-500" />
        <span className="text-muted-foreground text-xs font-medium">
          Retrieving Project Context Memory...
        </span>
      </div>
    );
  }

  if (isError || !context) {
    return (
      <div className="bg-card border-border rounded-xl border p-6 text-center shadow-sm">
        <Brain className="text-muted-foreground mx-auto mb-2 h-6 w-6" />
        <h4 className="text-foreground text-sm font-semibold">Project Context Unavailable</h4>
        <p className="text-muted-foreground mt-1 text-xs">
          Awaiting telemetry evidence from observed development sessions.
        </p>
      </div>
    );
  }

  const langEntries = Object.entries(context.languages || {}).sort(
    (a, b) => b[1].count - a[1].count,
  );
  const totalLangEvents = langEntries.reduce((acc, [_, v]) => acc + v.count, 0);

  const displayedFiles = showAllFiles
    ? context.important_files
    : context.important_files.slice(0, 6);

  const hasActivity =
    langEntries.length > 0 ||
    context.frameworks.length > 0 ||
    context.important_files.length > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* 1. HEADER & MEMORY PROVENANCE STRIP */}
      <div className="bg-card border-border overflow-hidden rounded-xl border shadow-sm">
        <div className="border-border bg-muted/20 flex flex-wrap items-center justify-between gap-4 border-b p-5">
          <div className="flex items-center gap-3">
            <div className="border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg border p-2">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-foreground text-lg font-bold tracking-tight">
                  Project Context Memory
                </h2>
                <span className="border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                  <Sparkles className="h-3 w-3" />
                  Durable Intelligence
                </span>
              </div>
              <p className="text-muted-foreground text-xs">
                Progressively synthesized from observed telemetry, file mutations, and security
                analyses.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="text-muted-foreground hidden text-right text-xs sm:block">
              <p className="font-mono text-[10px]">
                Last analyzed:{" "}
                {context.last_analyzed_at
                  ? formatRelativeTime(context.last_analyzed_at)
                  : "Just now"}
              </p>
              <p className="text-muted-foreground/80 text-[10px]">
                {context.activity_summary?.total_events || 0} events across{" "}
                {context.activity_summary?.total_sessions || 0} sessions
              </p>
            </div>

            <button
              onClick={() => refreshContext()}
              disabled={isRefreshing || isExporting}
              className="border-border bg-card hover:bg-muted text-foreground inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-indigo-500" : ""}`} />
              {isRefreshing ? "Analyzing..." : "Refresh Memory"}
            </button>

            <button
              onClick={() => exportContext()}
              disabled={isExporting || isRefreshing}
              className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
            >
              <FileDown className={`h-3.5 w-3.5 ${isExporting ? "animate-bounce" : ""}`} />
              {isExporting ? "Generating..." : "Generate Project Context"}
            </button>
          </div>
        </div>

        {/* Export Success Notification Banner */}
        {isExportSuccess && (
          <div className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 flex items-center justify-between border-b px-5 py-2.5 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>
                <strong>Project context generated</strong> — Downloaded as{" "}
                <code className="bg-emerald-500/20 rounded px-1 py-0.5 font-mono text-[11px]">
                  PROJECT_CONTEXT.md
                </code>
              </span>
            </div>
            <button
              onClick={() => exportContext()}
              className="text-emerald-700 dark:text-emerald-300 hover:underline font-semibold"
            >
              Download Again
            </button>
          </div>
        )}

        {!hasActivity ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground text-xs">
              Not enough project activity yet. VibePulse will progressively synthesize context as
              files are modified.
            </p>
          </div>
        ) : (
          <div className="p-6">
            {/* 2. PRIMARY TECHNOLOGY STACK & LANGUAGES */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Languages Breakdown */}
              <div className="border-border bg-muted/10 rounded-lg border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code className="text-indigo-500 dark:text-indigo-400 h-4 w-4" />
                    <h3 className="text-foreground text-xs font-bold uppercase tracking-wider">
                      Language Distribution
                    </h3>
                  </div>
                  <span className="text-muted-foreground font-mono text-[11px]">
                    {totalLangEvents} Attributed Events
                  </span>
                </div>

                {langEntries.length === 0 ? (
                  <p className="text-muted-foreground text-xs">No language telemetry recorded.</p>
                ) : (
                  <div className="space-y-2.5">
                    {langEntries.map(([lang, dist]) => (
                      <div key={lang}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="text-foreground font-semibold">{lang}</span>
                          <span className="text-muted-foreground font-mono text-[11px]">
                            {dist.percentage}% ({dist.count} events)
                          </span>
                        </div>
                        <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                          <div
                            className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${dist.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Frameworks & Technologies */}
              <div className="border-border bg-muted/10 rounded-lg border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="text-indigo-500 dark:text-indigo-400 h-4 w-4" />
                    <h3 className="text-foreground text-xs font-bold uppercase tracking-wider">
                      Detected Frameworks & Tools
                    </h3>
                  </div>
                  <span className="border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold">
                    Deterministic AST
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    ...context.frameworks,
                    ...context.technologies,
                    ...context.package_managers,
                  ].map((item, idx) => {
                    const isSelected = selectedTech === item.name;
                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedTech(isSelected ? null : item.name)}
                        className={`cursor-pointer rounded-md border px-2.5 py-1 text-xs transition-all ${
                          isSelected
                            ? "border-indigo-500 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500/40"
                            : "border-border bg-card hover:border-indigo-500/40 text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold">{item.name}</span>
                          <span className="text-muted-foreground text-[10px]">
                            • {item.category}
                          </span>
                        </div>
                        {isSelected && item.provenance && (
                          <div className="border-border mt-1.5 border-t pt-1 text-[10px] text-muted-foreground">
                            <span className="font-semibold text-foreground">Evidence: </span>
                            {item.provenance.evidence}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 3. DEVELOPMENT FOCUS & PATTERNS */}
            {context.development_patterns.length > 0 && (
              <div className="mt-6">
                <div className="mb-3 flex items-center gap-2">
                  <Layers className="text-indigo-500 dark:text-indigo-400 h-4 w-4" />
                  <h3 className="text-foreground text-xs font-bold uppercase tracking-wider">
                    Observed Development Focus
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {context.development_patterns.map((pat, idx) => (
                    <div
                      key={idx}
                      className="border-border bg-card hover:border-indigo-500/40 rounded-lg border p-3.5 shadow-sm transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-foreground text-xs font-bold">{pat.name}</h4>
                        <Badge variant="default">{pat.evidence_count} files</Badge>
                      </div>
                      <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
                        {pat.description}
                      </p>
                      {pat.sample_files.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {pat.sample_files.map((file, fIdx) => (
                            <span
                              key={fIdx}
                              className="border-border bg-muted/40 text-foreground rounded border px-1.5 py-0.5 font-mono text-[10px]"
                            >
                              {file.split("/").pop()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. IMPORTANT PROJECT FILES & STRUCTURE */}
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Important Files List */}
              <div className="border-border bg-card lg:col-span-2 rounded-lg border p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCode className="text-indigo-500 dark:text-indigo-400 h-4 w-4" />
                    <h3 className="text-foreground text-xs font-bold uppercase tracking-wider">
                      Key Project Artifacts & Files
                    </h3>
                  </div>
                  <span className="text-muted-foreground text-[11px]">
                    Ranked by frequency & structural role
                  </span>
                </div>

                <div className="space-y-2">
                  {displayedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="border-border bg-muted/20 hover:bg-muted/40 flex items-center justify-between rounded-md border p-2 text-xs transition-colors"
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <p className="text-foreground truncate font-mono font-semibold" title={file.path}>
                          {file.path}
                        </p>
                        <p className="text-muted-foreground text-[10px]">{file.reason}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="border-border bg-card text-foreground rounded border px-2 py-0.5 font-mono text-[10px]">
                          {file.activity_count} events
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {context.important_files.length > 6 && (
                  <button
                    onClick={() => setShowAllFiles(!showAllFiles)}
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 mt-3 inline-flex items-center gap-1 text-xs font-semibold"
                  >
                    {showAllFiles ? (
                      <>
                        Show less <ChevronUp className="h-3 w-3" />
                      </>
                    ) : (
                      <>
                        Show all ({context.important_files.length}) files{" "}
                        <ChevronDown className="h-3 w-3" />
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Architecture & Security Summary */}
              <div className="flex flex-col gap-4">
                {/* Architecture Card */}
                <div className="border-border bg-card rounded-lg border p-4 shadow-sm">
                  <div className="mb-2 flex items-center gap-2">
                    <FolderGit2 className="text-purple-500 dark:text-purple-400 h-4 w-4" />
                    <h3 className="text-foreground text-xs font-bold uppercase tracking-wider">
                      Architecture Overview
                    </h3>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="text-foreground font-semibold">
                        {context.architecture_summary?.project_type || "Standard Project"}
                      </span>
                    </div>
                    {context.git_context?.branch && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Git Branch:</span>
                        <span className="text-foreground font-mono">
                          {context.git_context.branch}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground text-[11px]">Source Roots:</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {(context.architecture_summary?.source_roots || []).map((root, i) => (
                          <span
                            key={i}
                            className="border-border bg-muted/40 text-foreground rounded border px-1.5 py-0.5 font-mono text-[10px]"
                          >
                            {root}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Security Posture Card */}
                <div className="border-border bg-card rounded-lg border p-4 shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="text-emerald-500 dark:text-emerald-400 h-4 w-4" />
                      <h3 className="text-foreground text-xs font-bold uppercase tracking-wider">
                        Security Posture
                      </h3>
                    </div>
                    {context.security_summary?.critical > 0 ? (
                      <span className="border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold">
                        <Flame className="h-3 w-3" /> {context.security_summary.critical} Critical
                      </span>
                    ) : (
                      <span className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded px-1.5 py-0.5 text-[10px] font-semibold">
                        Secure Baseline
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Total Findings:</span>
                      <span className="text-foreground font-mono font-semibold">
                        {context.security_summary?.total_findings || 0}
                      </span>
                    </div>
                    {context.security_summary?.top_rules &&
                      context.security_summary.top_rules.length > 0 && (
                        <div>
                          <span className="text-muted-foreground text-[11px]">Primary Rules:</span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {context.security_summary.top_rules.map((rule, i) => (
                              <span
                                key={i}
                                className="border-border bg-muted/40 text-foreground rounded border px-1.5 py-0.5 font-mono text-[10px]"
                              >
                                {rule}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
