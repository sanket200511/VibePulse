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
    if (!count) return "bg-secondary/40";
    const ratio = count / maxHeatmapVal;
    if (ratio < 0.25) return "bg-primary/25";
    if (ratio < 0.5) return "bg-primary/50";
    if (ratio < 0.75) return "bg-primary/75";
    return "bg-primary";
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 1. HEADER & MEMORY PROVENANCE STRIP */}
      <div className="border-border/80 bg-card/60 overflow-hidden rounded-lg border shadow-sm">
        <div className="border-border/80 bg-secondary/15 flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <div className="flex items-center gap-2.5">
            <div className="border-primary/30 bg-primary/10 text-primary rounded-md border p-1.5">
              <Brain className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-foreground text-sm font-semibold tracking-tight">
                  Project Intelligence & Context
                </h2>
                <span className="border-primary/30 bg-primary/10 text-primary inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider">
                  <Sparkles className="h-2.5 w-2.5" />
                  Evidence-Backed Projection
                </span>
              </div>
              <p className="text-muted-foreground text-xs">
                Derived directly from PostgreSQL event telemetry, session history, and inspected
                project manifests.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="hidden text-right text-xs sm:block">
              <p className="text-muted-foreground font-mono text-[10px]">
                Last analyzed:{" "}
                {context.last_analyzed_at
                  ? formatRelativeTime(context.last_analyzed_at)
                  : "Just now"}
              </p>
              <p className="text-muted-foreground/80 font-mono text-[10px]">
                {context.activity_summary?.total_events || 0} events across{" "}
                {context.activity_summary?.total_sessions || 0} sessions
              </p>
            </div>

            <button
              onClick={() => refreshContext()}
              disabled={isRefreshing || isExporting}
              className="border-border/80 bg-secondary/30 text-foreground hover:bg-secondary/50 inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium shadow-sm transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? "text-primary animate-spin" : ""}`} />
              {isRefreshing ? "Re-projecting..." : "Refresh Intelligence"}
            </button>

            <button
              onClick={() => exportContext()}
              disabled={isExporting || isRefreshing}
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium shadow-sm transition-colors disabled:opacity-50"
            >
              <FileDown className={`h-3 w-3 ${isExporting ? "animate-bounce" : ""}`} />
              {isExporting ? "Generating..." : "Generate PROJECT_CONTEXT.md"}
            </button>
          </div>
        </div>

        {/* Export Banner */}
        {isExportSuccess && (
          <div className="flex items-center justify-between border-b border-emerald-500/30 bg-emerald-500/10 px-4 py-2 font-mono text-xs text-emerald-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>
                <strong>Project context generated</strong> — Exported as{" "}
                <code className="rounded bg-emerald-500/20 px-1 py-0.5 font-mono text-[10px]">
                  PROJECT_CONTEXT.md
                </code>
              </span>
            </div>
            <button
              onClick={() => exportContext()}
              className="font-medium text-emerald-400 hover:underline"
            >
              Download Again
            </button>
          </div>
        )}

        {!hasActivity ? (
          <div className="text-muted-foreground p-6 text-center font-mono text-xs">
            Not enough project activity yet. DepRadar will progressively project context as files
            are modified.
          </div>
        ) : (
          <div className="space-y-4 p-4">
            {/* 2. DEVELOPMENT FOCUS & ENGINEERING DNA HERO */}
            {context.development_focus && (
              <div className="border-border/80 bg-secondary/20 rounded-lg border p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <Compass className="text-primary h-4 w-4" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground font-mono text-[10px] font-bold uppercase tracking-wider">
                          Current Engineering Focus
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase ${
                            context.development_focus.classification === "OBSERVED"
                              ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                              : context.development_focus.classification === "INFERRED"
                                ? "border border-cyan-500/30 bg-cyan-500/10 text-cyan-400"
                                : "border border-amber-500/30 bg-amber-500/10 text-amber-400"
                          }`}
                        >
                          {context.development_focus.classification}
                        </span>
                      </div>
                      <h3 className="text-foreground text-sm font-semibold">
                        {context.development_focus.focus}
                      </h3>
                    </div>
                  </div>
                  <span className="text-muted-foreground font-mono text-[10px]">
                    {context.development_focus.active_window}
                  </span>
                </div>
                <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
                  {context.development_focus.confidence_reason}
                </p>
                {context.development_focus.evidence_summary &&
                  context.development_focus.evidence_summary.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {context.development_focus.evidence_summary.map((ev, idx) => (
                        <span
                          key={idx}
                          className="border-border/60 bg-secondary/40 text-foreground rounded border px-1.5 py-0.5 font-mono text-[10px]"
                        >
                          {ev}
                        </span>
                      ))}
                    </div>
                  )}
              </div>
            )}

            {/* 3. LANGUAGES & DETECTED TECH WITH PROVENANCE BADGES */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Language Distribution */}
              <div className="border-border/80 bg-card/60 rounded-lg border p-3.5 shadow-sm">
                <div className="mb-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Code className="text-primary h-3.5 w-3.5" />
                    <h3 className="text-muted-foreground font-mono text-[10px] font-bold uppercase tracking-wider">
                      Language Distribution
                    </h3>
                  </div>
                  <span className="text-muted-foreground font-mono text-[10px]">
                    {totalLangEvents} Observed Files
                  </span>
                </div>

                <div className="space-y-2">
                  {langEntries.map(([lang, dist]) => (
                    <div key={lang}>
                      <div className="mb-0.5 flex items-center justify-between text-xs">
                        <span className="text-foreground font-medium">{lang}</span>
                        <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
                          {dist.percentage}% ({dist.count} files)
                        </span>
                      </div>
                      <div className="bg-secondary/60 h-1.5 w-full overflow-hidden rounded-full">
                        <div
                          className="bg-primary h-full rounded-full transition-all duration-300"
                          style={{ width: `${dist.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detected Frameworks & Tools */}
              <div className="border-border/80 bg-card/60 rounded-lg border p-3.5 shadow-sm">
                <div className="mb-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Cpu className="text-primary h-3.5 w-3.5" />
                    <h3 className="text-muted-foreground font-mono text-[10px] font-bold uppercase tracking-wider">
                      Detected Frameworks & Tools
                    </h3>
                  </div>
                  <span className="text-muted-foreground font-mono text-[10px]">
                    Click item for evidence
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
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
                        className="border-border/80 bg-secondary/30 text-foreground hover:border-border hover:bg-secondary/50 flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-xs transition-all"
                      >
                        <span className="font-medium">{item.name}</span>
                        <span
                          className={`rounded px-1 text-[8px] font-bold uppercase ${
                            cls === "OBSERVED"
                              ? "bg-emerald-500/15 text-emerald-400"
                              : "bg-cyan-500/15 text-cyan-400"
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
              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <FolderGit2 className="text-primary h-3.5 w-3.5" />
                  <h3 className="text-muted-foreground font-mono text-[10px] font-bold uppercase tracking-wider">
                    Architecture Signals
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
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
                        className="border-border/80 bg-card/60 hover:border-border hover:bg-card/80 cursor-pointer rounded-lg border p-3 shadow-sm transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-foreground font-mono text-xs font-semibold">
                            {sig.signal}
                          </h4>
                          <span
                            className={`rounded px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase ${
                              sig.classification === "OBSERVED"
                                ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                : "border border-cyan-500/30 bg-cyan-500/10 text-cyan-400"
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
                                className="border-border/60 bg-secondary/40 text-muted-foreground rounded border px-1.5 py-0.5 font-mono text-[9px]"
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
            <div className="border-border/80 bg-card/60 rounded-lg border p-3.5 shadow-sm">
              <div className="mb-2.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Calendar className="text-primary h-3.5 w-3.5" />
                  <h3 className="text-muted-foreground font-mono text-[10px] font-bold uppercase tracking-wider">
                    Activity Heatmap (Day × Hour)
                  </h3>
                </div>
                <span className="text-muted-foreground font-mono text-[10px]">
                  Aggregated from PostgreSQL telemetry
                </span>
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[500px]">
                  <div className="text-muted-foreground grid grid-cols-[40px_repeat(24,1fr)] gap-1 text-center font-mono text-[9px]">
                    <div></div>
                    {Array.from({ length: 24 }).map((_, h) => (
                      <div key={h}>{h % 3 === 0 ? `${h}h` : ""}</div>
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
                            className={`rounded-xs h-3.5 transition-colors ${getHeatmapColor(count)}`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 6. MOST ACTIVE FILES & SECURITY POSTURE */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Most Active Files List */}
              <div className="border-border/80 bg-card/60 rounded-lg border p-3.5 shadow-sm lg:col-span-2">
                <div className="mb-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <FileCode className="text-primary h-3.5 w-3.5" />
                    <h3 className="text-muted-foreground font-mono text-[10px] font-bold uppercase tracking-wider">
                      Most Active Project Files
                    </h3>
                  </div>
                  <span className="text-muted-foreground font-mono text-[10px]">
                    Ranked by mutation frequency
                  </span>
                </div>

                <div className="space-y-1.5">
                  {displayedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="border-border/60 bg-secondary/20 hover:bg-secondary/40 flex items-center justify-between rounded border p-2 text-xs transition-colors"
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <p
                          className="text-foreground truncate font-mono text-xs font-medium"
                          title={file.path}
                        >
                          {file.path}
                        </p>
                        <p className="text-muted-foreground font-mono text-[10px]">{file.reason}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="border-border/60 bg-secondary/40 text-foreground rounded border px-1.5 py-0.5 font-mono text-[10px] tabular-nums">
                          {file.activity_count} events
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {context.important_files.length > 6 && (
                  <button
                    onClick={() => setShowAllFiles(!showAllFiles)}
                    className="text-primary hover:text-primary/80 mt-2.5 inline-flex items-center gap-1 font-mono text-xs font-medium transition-colors"
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
                <div className="border-border/80 bg-card/60 rounded-lg border p-3.5 shadow-sm">
                  <div className="mb-2 flex items-center gap-1.5">
                    <GitBranch className="h-3.5 w-3.5 text-cyan-400" />
                    <h3 className="text-muted-foreground font-mono text-[10px] font-bold uppercase tracking-wider">
                      Git Intelligence
                    </h3>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Repository:</span>
                      <span className="text-foreground font-medium">
                        {context.git_intelligence?.is_git_repository ? "Verified (.git)" : "No"}
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
                        <span className="text-muted-foreground">Commit:</span>
                        <span className="text-foreground font-mono text-[10px]">
                          {context.git_intelligence.latest_commit_hash.slice(0, 7)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Security Posture Card */}
                <div className="border-border/80 bg-card/60 rounded-lg border p-3.5 shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                      <h3 className="text-muted-foreground font-mono text-[10px] font-bold uppercase tracking-wider">
                        Security Posture
                      </h3>
                    </div>
                    {context.security_summary?.critical > 0 ? (
                      <span className="flex items-center gap-1 rounded border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-rose-400">
                        <Flame className="h-3 w-3" /> {context.security_summary.critical} Critical
                      </span>
                    ) : (
                      <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-400">
                        Secure Baseline
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Total Findings:</span>
                      <span className="text-foreground font-mono tabular-nums">
                        {context.security_summary?.total_findings || 0}
                      </span>
                    </div>
                    {context.security_summary?.top_rules &&
                      context.security_summary.top_rules.length > 0 && (
                        <div>
                          <span className="text-muted-foreground font-mono text-[10px]">
                            Primary Rules:
                          </span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {context.security_summary.top_rules.map((rule, i) => (
                              <span
                                key={i}
                                className="border-border/60 bg-secondary/40 text-foreground rounded border px-1.5 py-0.5 font-mono text-[9px]"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="border-border/80 bg-background/95 w-full max-w-lg rounded-lg border p-4 shadow-2xl backdrop-blur-md">
            <div className="border-border/80 flex items-center justify-between border-b pb-2.5">
              <div className="flex items-center gap-2">
                <Info className="text-primary h-3.5 w-3.5" />
                <h3 className="text-foreground text-xs font-semibold">
                  Why DepRadar Believes This
                </h3>
              </div>
              <button
                onClick={() => setActiveEvidenceModal(null)}
                className="text-muted-foreground hover:bg-secondary/40 hover:text-foreground rounded p-1 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-3 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-foreground font-semibold">{activeEvidenceModal.title}</span>
                {activeEvidenceModal.classification && (
                  <span
                    className={`rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase ${
                      activeEvidenceModal.classification === "OBSERVED"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border-cyan-500/30 bg-cyan-500/10 text-cyan-400"
                    }`}
                  >
                    {activeEvidenceModal.classification}
                  </span>
                )}
              </div>

              {activeEvidenceModal.category && (
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground font-mono text-[10px]">Category: </span>
                  <span className="text-foreground font-medium">
                    {activeEvidenceModal.category}
                  </span>
                </div>
              )}

              {activeEvidenceModal.source && (
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground font-mono text-[10px]">Detected In: </span>
                  <code className="border-border/60 bg-secondary/40 text-foreground rounded border px-1.5 py-0.5 font-mono text-[10px]">
                    {activeEvidenceModal.source}
                  </code>
                </div>
              )}

              {activeEvidenceModal.evidence && (
                <div>
                  <span className="text-muted-foreground font-mono text-[10px]">
                    Evidence String:{" "}
                  </span>
                  <p className="border-border/60 bg-secondary/30 text-foreground mt-1 rounded border p-2 font-mono text-[11px]">
                    {activeEvidenceModal.evidence}
                  </p>
                </div>
              )}

              {activeEvidenceModal.reason && (
                <div>
                  <span className="text-muted-foreground font-mono text-[10px]">
                    Confidence Rationale:{" "}
                  </span>
                  <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                    {activeEvidenceModal.reason}
                  </p>
                </div>
              )}

              {activeEvidenceModal.files && activeEvidenceModal.files.length > 0 && (
                <div>
                  <span className="text-muted-foreground font-mono text-[10px]">
                    Supporting Files:{" "}
                  </span>
                  <div className="mt-1 space-y-1">
                    {activeEvidenceModal.files.map((f, i) => (
                      <div
                        key={i}
                        className="border-border/60 bg-secondary/30 text-foreground rounded border px-2 py-1 font-mono text-[10px]"
                      >
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setActiveEvidenceModal(null)}
                className="bg-secondary/60 text-foreground hover:bg-secondary rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors"
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
