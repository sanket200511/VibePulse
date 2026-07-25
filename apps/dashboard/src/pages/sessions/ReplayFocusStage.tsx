import { FileCode, GitBranch, FolderOpen, Terminal, Activity, FileText } from "lucide-react";
import type { UseReplayControllerResult } from "./useReplayController";
import { formatReplayTime } from "./replay-time-utils";

interface ReplayFocusStageProps {
  controller: UseReplayControllerResult;
}

export function ReplayFocusStage({ controller }: ReplayFocusStageProps) {
  const { currentFrame } = controller;
  if (!currentFrame) return null;

  const { metadata, kind } = currentFrame;
  const isMarker = kind === "MARKER";

  const pathParts = metadata.file_path ? metadata.file_path.split("/") : [];
  const fileName = pathParts.length > 0 ? pathParts.pop() : "Unknown Context";
  const dirPath = pathParts.join("/");

  // Choose icon based on kind or language
  let MainIcon = Terminal;
  let iconColor = "text-muted-foreground";
  if (!isMarker) {
    const lang = metadata.language?.toLowerCase();
    if (lang === "typescript" || lang === "javascript" || lang === "ts" || lang === "js") {
      MainIcon = FileCode;
      iconColor = "text-accent-color";
    } else if (lang === "markdown" || lang === "md") {
      MainIcon = FileText;
      iconColor = "text-accent-color";
    } else {
      MainIcon = FileCode;
      iconColor = "text-accent-color";
    }
  } else {
    MainIcon = Activity;
    iconColor = "text-success-color";
  }

  const hasInsights =
    currentFrame.insights?.analyzer_findings &&
    Object.keys(currentFrame.insights.analyzer_findings).length > 0;

  return (
    <div className="animate-fade-in-up flex w-full flex-col gap-6 motion-reduce:animate-none">
      {/* 1. CURRENT ACTIVITY */}
      <div className="flex items-center gap-3">
        <span className="text-secondary-text text-[10px] font-bold uppercase tracking-wider">
          Current Focus
        </span>
        <div className="bg-border h-px flex-1 opacity-50" />
      </div>

      {isMarker ? (
        <div className="border-border/40 bg-card relative flex flex-col items-center justify-center overflow-hidden rounded-[24px] border px-8 py-24 text-center shadow-sm">
          <div className="from-accent-color/5 pointer-events-none absolute inset-0 bg-gradient-to-b to-transparent" />
          <div
            className={`bg-muted-color/30 rounded-2xl p-4 ${iconColor} relative z-10 mb-8 shadow-sm`}
          >
            <MainIcon className="h-12 w-12" />
          </div>
          <h2 className="text-primary-text relative z-10 text-3xl font-black uppercase tracking-tight md:text-5xl">
            {metadata.marker_kind?.replace(/_/g, " ")}
          </h2>
          {metadata.marker_detail && (
            <p className="text-secondary-text relative z-10 mt-4 max-w-lg text-sm leading-relaxed md:text-base">
              {metadata.marker_detail}
            </p>
          )}

          <div className="border-border/50 relative z-10 mt-12 flex w-full max-w-md items-center justify-center gap-6 border-t pt-8">
            {metadata.timestamp && (
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
                  Time
                </span>
                <span className="text-primary-text font-mono text-sm">
                  {formatReplayTime(metadata.timestamp)}
                </span>
              </div>
            )}
            {metadata.git_branch && (
              <div className="border-border/50 flex flex-col items-center gap-1.5 border-l pl-6">
                <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
                  Branch
                </span>
                <span className="text-primary-text flex items-center gap-1.5 font-mono text-sm">
                  <GitBranch className="h-3 w-3" />
                  {metadata.git_branch}
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* 2. FILE / EVENT & CONTEXT */}
          <div className="flex flex-col gap-5">
            {dirPath && (
              <div className="text-secondary-text flex flex-wrap items-center gap-2 font-mono text-sm">
                <FolderOpen className="h-4 w-4 shrink-0 opacity-70" />
                {pathParts.map((part, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="hover:text-primary-text cursor-default transition-colors">
                      {part}
                    </span>
                    {i < pathParts.length - 1 && <span className="opacity-40">/</span>}
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-start gap-6">
              <div
                className={`bg-card border-border mt-2 rounded-xl border p-4 shadow-sm ${iconColor}`}
              >
                <MainIcon className="h-8 w-8 md:h-10 md:w-10" />
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="text-accent-color mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                  {metadata.event_type ? metadata.event_type.replace(/_/g, " ") : "ACTIVITY"}
                </span>
                <h2 className="text-primary-text selection:bg-selection-color break-all text-3xl font-extrabold tracking-tight md:text-4xl lg:text-5xl">
                  {fileName}
                </h2>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {metadata.language && (
                    <span className="bg-muted-color/30 border-border text-primary-text rounded-full border px-3 py-1 text-xs font-semibold">
                      {metadata.language}
                    </span>
                  )}
                  {kind === "GROUP" && (
                    <span className="bg-warning-color/10 border-warning-color/20 text-warning-color rounded-full border px-3 py-1 text-xs font-semibold">
                      {metadata.group_size} Events over{" "}
                      {metadata.group_span_seconds
                        ? Math.round(metadata.group_span_seconds) + "s"
                        : "short span"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 3. METADATA & INSIGHTS */}
          <div className="border-border/50 grid grid-cols-1 gap-6 border-t pt-6 md:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-secondary-text text-[9px] font-bold uppercase tracking-wider">
                Branch
              </span>
              <span className="text-primary-text flex items-center gap-2 text-sm font-medium">
                <GitBranch className="text-muted-foreground h-3.5 w-3.5" />
                <span className="truncate">{metadata.git_branch || "unknown"}</span>
              </span>
            </div>

            {hasInsights && (
              <div className="flex flex-col gap-2 md:col-span-3">
                <span className="text-secondary-text text-[9px] font-bold uppercase tracking-wider">
                  Analyzer Findings
                </span>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(currentFrame.insights.analyzer_findings).map(([key, value]) => {
                    const displayValue =
                      value && typeof value === "object"
                        ? "message" in value
                          ? String(value.message)
                          : JSON.stringify(value)
                        : String(value);
                    return (
                      <div
                        key={key}
                        className="bg-muted-color/30 border-border text-primary-text flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs"
                      >
                        <span className="text-accent-color font-semibold capitalize">{key}:</span>
                        <span>{displayValue}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
