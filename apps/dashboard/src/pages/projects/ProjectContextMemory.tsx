import { useState } from "react";
import {
  Brain,
  Code,
  Cpu,
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
  Compass,
  GitBranch,
  Calendar,
  Info,
  X,
} from "lucide-react";
import { useProjectContext } from "./useProjectContext";
import { formatRelativeTime } from "../../lib/relative-time";
import type { TechnologyDetail, ArchitectureSignalDetail } from "./types";

interface ProjectContextMemoryProps {
  projectId: string;
}

interface EvidenceModalState {
  title: string;
  category?: string | undefined;
  classification?: string | undefined;
  source?: string | undefined;
  evidence?: string | undefined;
  reason?: string | undefined;
  files?: string[] | undefined;
}

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
  const [activeEvidenceModal, setActiveEvidenceModal] = useState<EvidenceModalState | null>(null);

  if (isLoading) {
    return (
      <div className="bg-card border-border flex h-64 w-full flex-col items-center justify-center gap-3 rounded-xl border p-8 shadow-sm">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-500" />
        <span className="text-muted-foreground text-xs font-medium">
          Retrieving Project Context & Intelligence...
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
    context.important_files.length > 0 ||
    (context.activity_summary?.total_events || 0) > 0;

  // Build heatmap lookup map: `${day}_${hour}` -> count
  const heatmapMap: Record<string, number> = {};
  let maxHeatmapVal = 1;
  (context.activity_heatmap || []).forEach((c) => {
    heatmapMap[`${c.day_of_week}_${c.hour_of_day}`] = c.event_count;
    if (c.event_count > maxHeatmapVal) {
      maxHeatmapVal = c.event_count;
    }
  });

  const getHeatmapColor = (count: number) => {
    if (!count) return "bg-muted/30";
    const ratio = count / maxHeatmapVal;
    if (ratio < 0.25) return "bg-indigo-500/25";
    if (ratio < 0.5) return "bg-indigo-500/50";
    if (ratio < 0.75) return "bg-indigo-500/75";
    return "bg-indigo-600 dark:bg-indigo-400";
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 1. HEADER & MEMORY PROVENANCE STRIP */}
      <div className="bg-card border-border overflow-hidden rounded-xl border shadow-sm">
        <div className="border-border bg-muted/20 flex flex-wrap items-center justify-between gap-4 border-b p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-2 text-indigo-600 dark:text-indigo-400">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-foreground text-lg font-bold tracking-tight">
                  Project Intelligence & Context
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="h-3 w-3" />
                  Evidence-Backed Projection
                </span>
              </div>
              <p className="text-muted-foreground text-xs">
                Derived directly from PostgreSQL event telemetry, session history, and inspected
                project manifests.
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
              <RefreshCw
                className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-indigo-500" : ""}`}
              />
              {isRefreshing ? "Re-projecting..." : "Refresh Intelligence"}
            </button>

            <button
              onClick={() => exportContext()}
              disabled={isExporting || isRefreshing}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              <FileDown className={`h-3.5 w-3.5 ${isExporting ? "animate-bounce" : ""}`} />
              {isExporting ? "Generating..." : "Generate PROJECT_CONTEXT.md"}
            </button>
          </div>
        </div>

        {/* Export Banner */}
        {isExportSuccess && (
          <div className="flex items-center justify-between border-b border-emerald-500/30 bg-emerald-500/10 px-5 py-2.5 text-xs text-emerald-700 dark:text-emerald-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>
                <strong>Project context generated</strong> — Exported as{" "}
                <code className="rounded bg-emerald-500/20 px-1 py-0.5 font-mono text-[11px]">
                  PROJECT_CONTEXT.md
                </code>
              </span>
            </div>
            <button
              onClick={() => exportContext()}
              className="font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
            >
              Download Again
            </button>
          </div>
        )}

        {!hasActivity ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground text-xs">
              Not enough project activity yet. VibePulse will progressively project context as files
              are modified.
            </p>
          </div>
        ) : (
          <div className="space-y-6 p-6">
            {/* 2. DEVELOPMENT FOCUS & ENGINEERING DNA HERO */}
            {context.development_focus && (
              <div className="border-border rounded-lg border bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-transparent p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Compass className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
                          Current Engineering Focus
                        </span>
                        <span
                          className={`py-0.2 rounded px-1.5 text-[9px] font-bold uppercase ${
                            context.development_focus.classification === "OBSERVED"
                              ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : context.development_focus.classification === "INFERRED"
                                ? "border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                : "border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {context.development_focus.classification}
                        </span>
                      </div>
                      <h3 className="text-foreground text-base font-bold">
                        {context.development_focus.focus}
                      </h3>
                    </div>
                  </div>
                  <span className="text-muted-foreground font-mono text-[11px]">
                    {context.development_focus.active_window}
                  </span>
                </div>
                <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
                  {context.development_focus.confidence_reason}
                </p>
                {context.development_focus.evidence_summary &&
                  context.development_focus.evidence_summary.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {context.development_focus.evidence_summary.map((ev, idx) => (
                        <span
                          key={idx}
                          className="border-border bg-card text-foreground rounded border px-2 py-0.5 font-mono text-[10px]"
                        >
                          {ev}
                        </span>
                      ))}
                    </div>
                  )}
              </div>
            )}

            {/* 3. LANGUAGES & DETECTED TECH WITH PROVENANCE BADGES */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Language Distribution */}
              <div className="border-border bg-card rounded-lg border p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                    <h3 className="text-foreground text-xs font-bold uppercase tracking-wider">
                      Language Distribution
                    </h3>
                  </div>
                  <span className="text-muted-foreground font-mono text-[11px]">
                    {totalLangEvents} Observed Files
                  </span>
                </div>

                <div className="space-y-2.5">
                  {langEntries.map(([lang, dist]) => (
                    <div key={lang}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-foreground font-semibold">{lang}</span>
                        <span className="text-muted-foreground font-mono text-[11px]">
                          {dist.percentage}% ({dist.count} files)
                        </span>
                      </div>
                      <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                        <div
                          className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                          style={{ width: `${dist.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detected Frameworks & Tools */}
              <div className="border-border bg-card rounded-lg border p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                    <h3 className="text-foreground text-xs font-bold uppercase tracking-wider">
                      Detected Frameworks & Tools
                    </h3>
                  </div>
                  <span className="text-muted-foreground text-[10px]">
                    Click item for provenance evidence
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    ...context.frameworks,
                    ...context.technologies,
                    ...context.package_managers,
                  ].map((item: TechnologyDetail, idx: number) => {
                    const cls = item.provenance?.classification || "OBSERVED";
                    return (
                      <button
                        key={idx}
                        onClick={() =>
                          setActiveEvidenceModal({
                            title: item.name,
                            category: item.category,
                            classification: cls,
                            source: item.provenance?.source,
                            evidence: item.provenance?.evidence,
                            reason: item.provenance?.confidence_reason,
                          })
                        }
                        className="border-border bg-card hover:bg-muted/30 text-foreground shadow-xs flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-all hover:border-indigo-500/50"
                      >
                        <span className="font-semibold">{item.name}</span>
                        <span
                          className={`py-0.2 rounded px-1 text-[8px] font-bold uppercase ${
                            cls === "OBSERVED"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                          }`}
                        >
                          {cls}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 4. ARCHITECTURE SIGNALS */}
            {context.architecture_signals && context.architecture_signals.length > 0 && (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <FolderGit2 className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                  <h3 className="text-foreground text-xs font-bold uppercase tracking-wider">
                    Architecture Signals
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {context.architecture_signals.map(
                    (sig: ArchitectureSignalDetail, idx: number) => (
                      <div
                        key={idx}
                        onClick={() =>
                          setActiveEvidenceModal({
                            title: sig.signal,
                            classification: sig.classification,
                            reason: sig.description,
                            files: sig.evidence_files,
                          })
                        }
                        className="border-border bg-card cursor-pointer rounded-lg border p-3.5 shadow-sm transition-all hover:border-indigo-500/50"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-foreground text-xs font-bold">{sig.signal}</h4>
                          <span
                            className={`py-0.2 rounded px-1.5 text-[8px] font-bold uppercase ${
                              sig.classification === "OBSERVED"
                                ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            }`}
                          >
                            {sig.classification}
                          </span>
                        </div>
                        <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
                          {sig.description}
                        </p>
                        {sig.evidence_files && sig.evidence_files.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {sig.evidence_files.slice(0, 3).map((f, fIdx) => (
                              <span
                                key={fIdx}
                                className="border-border bg-muted/40 text-foreground rounded border px-1.5 py-0.5 font-mono text-[9px]"
                              >
                                {f.split("/").pop()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}

            {/* 5. ACTIVITY HEATMAP (DAY × HOUR) */}
            <div className="border-border bg-card rounded-lg border p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                  <h3 className="text-foreground text-xs font-bold uppercase tracking-wider">
                    Activity Heatmap (Day × Hour)
                  </h3>
                </div>
                <span className="text-muted-foreground font-mono text-[10px]">
                  Aggregated from PostgreSQL telemetry
                </span>
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[500px]">
                  <div className="text-muted-foreground grid grid-cols-[40px_repeat(24,1fr)] gap-1 text-center text-[9px]">
                    <div></div>
                    {Array.from({ length: 24 }).map((_, h) => (
                      <div key={h} className="font-mono">
                        {h % 3 === 0 ? `${h}h` : ""}
                      </div>
                    ))}
                  </div>
                  {DAYS_OF_WEEK.map((dayName, dayIdx) => (
                    <div
                      key={dayIdx}
                      className="mt-1 grid grid-cols-[40px_repeat(24,1fr)] items-center gap-1"
                    >
                      <span className="text-muted-foreground font-mono text-[10px]">{dayName}</span>
                      {Array.from({ length: 24 }).map((_, hour) => {
                        const count = heatmapMap[`${dayIdx}_${hour}`] || 0;
                        return (
                          <div
                            key={hour}
                            title={`${dayName} ${hour}:00 — ${count} events`}
                            className={`rounded-xs h-4 transition-colors ${getHeatmapColor(count)}`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 6. MOST ACTIVE FILES & SECURITY POSTURE */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Most Active Files List */}
              <div className="border-border bg-card rounded-lg border p-4 shadow-sm lg:col-span-2">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCode className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                    <h3 className="text-foreground text-xs font-bold uppercase tracking-wider">
                      Most Active Project Files
                    </h3>
                  </div>
                  <span className="text-muted-foreground text-[11px]">
                    Ranked by mutation frequency
                  </span>
                </div>

                <div className="space-y-2">
                  {displayedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="border-border bg-muted/20 hover:bg-muted/40 flex items-center justify-between rounded-md border p-2 text-xs transition-colors"
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <p
                          className="text-foreground truncate font-mono font-semibold"
                          title={file.path}
                        >
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
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
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

              {/* Security & Git Context */}
              <div className="flex flex-col gap-4">
                {/* Git Context Card */}
                <div className="border-border bg-card rounded-lg border p-4 shadow-sm">
                  <div className="mb-2 flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-purple-500 dark:text-purple-400" />
                    <h3 className="text-foreground text-xs font-bold uppercase tracking-wider">
                      Git Intelligence
                    </h3>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Git Repository:</span>
                      <span className="text-foreground font-semibold">
                        {context.git_intelligence?.is_git_repository ? "Yes (.git verified)" : "No"}
                      </span>
                    </div>
                    {context.git_intelligence?.branch && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Branch:</span>
                        <span className="text-foreground font-mono">
                          {context.git_intelligence.branch}
                        </span>
                      </div>
                    )}
                    {context.git_intelligence?.latest_commit_hash && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Latest Commit:</span>
                        <span className="text-foreground font-mono text-[10px]">
                          {context.git_intelligence.latest_commit_hash.slice(0, 7)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Security Posture Card */}
                <div className="border-border bg-card rounded-lg border p-4 shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                      <h3 className="text-foreground text-xs font-bold uppercase tracking-wider">
                        Security Posture
                      </h3>
                    </div>
                    {context.security_summary?.critical > 0 ? (
                      <span className="flex items-center gap-1 rounded border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                        <Flame className="h-3 w-3" /> {context.security_summary.critical} Critical
                      </span>
                    ) : (
                      <span className="rounded border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
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

      {/* PROVENANCE EVIDENCE MODAL */}
      {activeEvidenceModal && (
        <div className="backdrop-blur-xs fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card border-border animate-in fade-in zoom-in-95 w-full max-w-lg rounded-xl border p-5 shadow-xl">
            <div className="border-border flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-indigo-500" />
                <h3 className="text-foreground text-sm font-bold">Why VibePulse Believes This</h3>
              </div>
              <button
                onClick={() => setActiveEvidenceModal(null)}
                className="text-muted-foreground hover:text-foreground rounded p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-foreground text-sm font-bold">
                  {activeEvidenceModal.title}
                </span>
                {activeEvidenceModal.classification && (
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                      activeEvidenceModal.classification === "OBSERVED"
                        ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    }`}
                  >
                    {activeEvidenceModal.classification}
                  </span>
                )}
              </div>

              {activeEvidenceModal.category && (
                <div>
                  <span className="text-muted-foreground font-medium">Category: </span>
                  <span className="text-foreground font-semibold">
                    {activeEvidenceModal.category}
                  </span>
                </div>
              )}

              {activeEvidenceModal.source && (
                <div>
                  <span className="text-muted-foreground font-medium">Detected In: </span>
                  <code className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-[11px]">
                    {activeEvidenceModal.source}
                  </code>
                </div>
              )}

              {activeEvidenceModal.evidence && (
                <div>
                  <span className="text-muted-foreground font-medium">Evidence String: </span>
                  <p className="bg-muted/50 border-border text-foreground mt-1 rounded border p-2 font-mono text-[11px]">
                    {activeEvidenceModal.evidence}
                  </p>
                </div>
              )}

              {activeEvidenceModal.reason && (
                <div>
                  <span className="text-muted-foreground font-medium">Confidence Rationale: </span>
                  <p className="text-muted-foreground mt-0.5 leading-relaxed">
                    {activeEvidenceModal.reason}
                  </p>
                </div>
              )}

              {activeEvidenceModal.files && activeEvidenceModal.files.length > 0 && (
                <div>
                  <span className="text-muted-foreground font-medium">Supporting Files: </span>
                  <div className="mt-1 space-y-1">
                    {activeEvidenceModal.files.map((f, i) => (
                      <div key={i} className="bg-muted/40 rounded px-2 py-1 font-mono text-[10px]">
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setActiveEvidenceModal(null)}
                className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
