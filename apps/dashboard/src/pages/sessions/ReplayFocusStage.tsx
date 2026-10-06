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
        <div className="border-border/80 bg-card/60 shadow-xs relative flex flex-col items-center justify-center overflow-hidden rounded-lg border px-6 py-10 text-center">
          <div
            className={`relative z-10 mb-4 rounded-lg p-3 ${iconColor} bg-secondary/50 shadow-xs`}
          >
            <MainIcon className="h-8 w-8" />
          </div>
          <h2 className="text-foreground relative z-10 font-mono text-base font-bold uppercase tracking-wider sm:text-lg">
            {metadata.marker_kind?.replace(/_/g, " ")}
          </h2>
          {metadata.marker_detail && (
            <p className="text-muted-foreground relative z-10 mt-2 max-w-lg font-mono text-xs leading-relaxed">
              {metadata.marker_detail}
            </p>
          )}

          <div className="border-border/60 relative z-10 mt-6 flex w-full max-w-sm items-center justify-center gap-6 border-t pt-4">
            {metadata.timestamp && (
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-muted-foreground font-mono text-[10px] font-bold uppercase tracking-wider">
                  Time
                </span>
                <span className="text-foreground font-mono text-xs tabular-nums">
                  {formatReplayTime(metadata.timestamp)}
                </span>
              </div>
            )}
            {metadata.git_branch && (
              <div className="border-border/60 flex flex-col items-center gap-0.5 border-l pl-6">
                <span className="text-muted-foreground font-mono text-[10px] font-bold uppercase tracking-wider">
                  Branch
                </span>
                <span className="text-foreground flex items-center gap-1.5 font-mono text-xs">
                  <GitBranch className="text-primary h-3 w-3" />
                  {metadata.git_branch}
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* 2. FILE / EVENT & CONTEXT */}
          <div className="border-border/80 bg-card/60 shadow-xs flex flex-col gap-3 rounded-lg border p-4">
            {dirPath && (
              <div className="text-muted-foreground flex flex-wrap items-center gap-1 font-mono text-[11px]">
                <FolderOpen className="text-primary/70 h-3.5 w-3.5 shrink-0" />
                {pathParts.map((part, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <span className="hover:text-foreground transition-colors">{part}</span>
                    {i < pathParts.length - 1 && <span className="opacity-40">/</span>}
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-start gap-3.5">
              <div
                className={`border-border/80 bg-secondary/40 shadow-xs mt-1 rounded-md border p-2.5 ${iconColor}`}
              >
                <MainIcon className="h-6 w-6" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-primary mb-1 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider">
                  {metadata.event_type ? metadata.event_type.replace(/_/g, " ") : "ACTIVITY"}
                </span>
                <h2 className="text-foreground break-all font-mono text-base font-bold tracking-tight sm:text-lg">
                  {fileName}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[10px]">
                  {metadata.language && (
                    <span className="border-border/70 bg-secondary/40 text-foreground rounded-md border px-2 py-0.5 font-semibold">
                      {metadata.language}
                    </span>
                  )}
                  {kind === "GROUP" && (
                    <span className="rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 font-bold text-amber-400">
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
          <div className="border-border/80 bg-card/60 shadow-xs grid grid-cols-1 gap-4 rounded-lg border p-4 md:grid-cols-4">
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground font-mono text-[10px] font-bold uppercase tracking-wider">
                Branch
              </span>
              <span className="text-foreground flex items-center gap-1.5 font-mono text-xs font-medium">
                <GitBranch className="text-primary h-3.5 w-3.5" />
                <span className="truncate">{metadata.git_branch || "unknown"}</span>
              </span>
            </div>

            {hasInsights && (
              <div className="flex flex-col gap-1.5 md:col-span-3">
                <span className="text-muted-foreground font-mono text-[10px] font-bold uppercase tracking-wider">
                  Analyzer Findings
                </span>
                <div className="flex flex-wrap gap-1.5">
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
                        className="border-border/70 bg-secondary/30 text-foreground flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[11px]"
                      >
                        <span className="text-primary font-semibold capitalize">{key}:</span>
                        <span className="text-muted-foreground">{displayValue}</span>
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
