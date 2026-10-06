import { useParams, Link, useNavigate } from "react-router-dom";
import { useEngineeringDNA } from "./useEngineeringDNA";
import { useTimeMachine } from "./TimeMachineContext";
import { LoadingState } from "../../components/states/LoadingState";
import { ErrorState } from "../../components/states/ErrorState";
import {
  ArrowLeft,
  Clock,
  FunctionSquare,
  ListTodo,
  ShieldAlert,
  GitPullRequest,
  Zap,
  BrainCircuit,
  Activity,
  Database,
  ShieldCheck,
  Braces,
  Binary,
  Tag,
  Maximize2,
  Play,
} from "lucide-react";
import { useMemo, useEffect } from "react";
import type { BiographyEntry } from "./types";
import { cn } from "@depradar/ui";
import { usePresentation } from "../../components/presentation/PresentationContext";

// Helper to determine node characteristics
function getNodeStyle(finding: string) {
  if (finding.includes("Function") || finding.includes("Class") || finding.includes("Import")) {
    if (finding.includes("Added") || finding.includes("Created")) {
      return {
        color: "text-emerald-400",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/30",
        dot: "bg-emerald-500 ring-emerald-500/30",
        icon: <Braces className="h-3.5 w-3.5 text-emerald-400" />,
      };
    }
    return {
      color: "text-rose-400",
      bg: "bg-rose-500/10",
      border: "border-rose-500/30",
      dot: "bg-rose-500 ring-rose-500/30",
      icon: <Braces className="h-3.5 w-3.5 text-rose-400" />,
    };
  }
  if (finding.includes("TODO")) {
    return {
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      dot: "bg-amber-500 ring-amber-500/30",
      icon: <ListTodo className="h-3.5 w-3.5 text-amber-400" />,
    };
  }
  if (finding.includes("Refactored") || finding.includes("Renamed")) {
    return {
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/30",
      dot: "bg-cyan-500 ring-cyan-500/30",
      icon: <GitPullRequest className="h-3.5 w-3.5 text-cyan-400" />,
    };
  }
  return {
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
    dot: "bg-purple-500 ring-purple-500/30",
    icon: <ShieldAlert className="h-3.5 w-3.5 text-purple-400" />,
  };
}

export function EngineeringDNAPage() {
  const { projectId, fileId } = useParams();
  const { data, isLoading, isError } = useEngineeringDNA(projectId, fileId);
  const { selectedTime, mode, setMode, setSelectedTime } = useTimeMachine();
  const presentation = usePresentation();

  const { slicedData, stats, highlights } = useMemo(() => {
    if (!data) return { slicedData: null, stats: null, highlights: null };

    // Always map the whole biography for the UI to animate the rewind effect
    // But we need the computed stats up to selectedTime
    const validBiography =
      mode === "LIVE" || !selectedTime
        ? data.biography
        : data.biography.filter((entry) => new Date(entry.timestamp).getTime() <= selectedTime);

    const statsObj = {
      functions_created: 0,
      functions_removed: 0,
      classes_created: 0,
      classes_removed: 0,
      imports_added: 0,
      imports_removed: 0,
      security_findings: 0,
      todos_created: 0,
      todos_resolved: 0,
      major_refactors: 0,
      rename_events: 0,
    };

    validBiography.forEach((entry) => {
      const f = entry.finding;
      if (f.includes("Function Added")) statsObj.functions_created++;
      if (f.includes("Function Removed")) statsObj.functions_removed++;
      if (f.includes("Class Added")) statsObj.classes_created++;
      if (f.includes("Class Removed")) statsObj.classes_removed++;
      if (f.includes("Import Added")) statsObj.imports_added++;
      if (f.includes("Import Removed")) statsObj.imports_removed++;
      if (f.includes("TODO Added")) statsObj.todos_created++;
      if (f.includes("TODO Resolved")) statsObj.todos_resolved++;
      if (f.includes("Refactored")) statsObj.major_refactors++;
      if (f.includes("Renamed")) statsObj.rename_events++;
      if (
        !f.includes("Function") &&
        !f.includes("Class") &&
        !f.includes("Import") &&
        !f.includes("TODO") &&
        !f.includes("Refactored") &&
        !f.includes("Renamed") &&
        !f.includes("File")
      ) {
        statsObj.security_findings++;
      }
    });

    const sessionCounts: Record<string, number> = {};
    validBiography.forEach((e) => {
      sessionCounts[e.session_id] = (sessionCounts[e.session_id] || 0) + 1;
    });
    let mostActiveSession = null;
    let maxEvents = 0;
    for (const [sId, count] of Object.entries(sessionCounts)) {
      if (count > maxEvents) {
        maxEvents = count;
        mostActiveSession = sId;
      }
    }

    const highlightsObj = {
      firstFunction: validBiography.find((e) => e.finding.includes("Function Added")),
      firstSecurity: validBiography.find(
        (e) =>
          !e.finding.includes("Function") &&
          !e.finding.includes("Class") &&
          !e.finding.includes("Import") &&
          !e.finding.includes("TODO") &&
          !e.finding.includes("Refactored") &&
          !e.finding.includes("Renamed") &&
          !e.finding.includes("File"),
      ),
      largestRefactor: validBiography.find((e) => e.finding.includes("Refactored")),
      mostActiveSession: mostActiveSession
        ? validBiography.find((e) => e.session_id === mostActiveSession)
        : undefined,
    };

    return {
      slicedData: {
        ...data,
        biography: data.biography, // keep all for animation
        last_seen:
          validBiography.length > 0
            ? (validBiography[validBiography.length - 1]?.timestamp ?? data.created_at)
            : data.created_at,
      },
      stats: statsObj,
      highlights: highlightsObj,
    };
  }, [data, selectedTime, mode]);

  // Automate DNA reconstruction in Presentation Mode
  useEffect(() => {
    if (
      presentation.running &&
      presentation.currentStep?.id === "engineering-dna" &&
      data?.biography &&
      data.biography.length > 0
    ) {
      setMode("TIME_TRAVEL");
      const firstEntry = new Date(data.biography[0]!.timestamp).getTime();
      const lastEntry = new Date(data.biography[data.biography.length - 1]!.timestamp).getTime();

      // Start slightly before the first event
      let current = firstEntry - 1000;
      setSelectedTime(current);

      let lastFrame = performance.now();
      let reqId: number;
      // Animate over 3 seconds
      const durationMs = 3000;
      const range = lastEntry - current + 1000;
      const speed = range / durationMs;

      const tick = (now: number) => {
        const delta = now - lastFrame;
        lastFrame = now;
        current += speed * delta;

        if (current >= lastEntry + 1000) {
          setSelectedTime(null);
          setMode("LIVE");
        } else {
          setSelectedTime(current);
          reqId = requestAnimationFrame(tick);
        }
      };

      reqId = requestAnimationFrame(tick);

      return () => {
        cancelAnimationFrame(reqId);
        setMode("LIVE");
        setSelectedTime(null);
      };
    }
    return undefined;
  }, [
    presentation.running,
    presentation.currentStep?.id,
    data?.biography,
    setMode,
    setSelectedTime,
  ]);

  if (isLoading) return <LoadingState label="Synthesizing Engineering DNA..." />;
  if (isError || !slicedData || !stats || !highlights)
    return <ErrorState message="Failed to load Engineering DNA." />;

  // Counters for the scorecard
  const ScoreItem = ({
    label,
    value,
    icon: Icon,
    trend,
  }: {
    label: string;
    value: number;
    icon: React.ElementType;
    trend?: "up" | "down";
  }) => (
    <div className="hover:bg-secondary/40 group flex items-center justify-between rounded px-2.5 py-1.5 transition-colors">
      <div className="flex items-center gap-2.5">
        <div className="border-border/80 bg-secondary/30 text-muted-foreground group-hover:text-foreground rounded border p-1 transition-colors">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-muted-foreground group-hover:text-foreground text-xs transition-colors">
          {label}
        </span>
      </div>
      <div className="text-foreground flex items-center gap-1.5 font-mono text-xs tabular-nums">
        {trend === "up" && <span className="text-[10px] text-emerald-400">+</span>}
        {trend === "down" && <span className="text-[10px] text-rose-400">-</span>}
        {value}
      </div>
    </div>
  );

  return (
    <div className="bg-background text-foreground flex h-full overflow-hidden font-sans">
      {/* ───────────────────────────────────────────────────────── */}
      {/* LEFT SIDEBAR: IDENTITY & SCORECARD                        */}
      {/* ───────────────────────────────────────────────────────── */}
      <aside className="border-border/80 bg-card/40 z-10 hidden w-[320px] flex-shrink-0 flex-col overflow-y-auto border-r backdrop-blur-md lg:flex">
        <div className="border-border/80 bg-background/90 sticky top-0 z-20 border-b p-4 backdrop-blur">
          <Link
            to={`/projects/${projectId}`}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-primary group mb-4 flex w-fit items-center gap-1.5 rounded text-xs font-medium transition-all focus:outline-none focus-visible:ring-1"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to Project</span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="border-primary/30 bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border">
              <Binary className="text-primary h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-foreground truncate text-sm font-semibold tracking-tight">
                {slicedData.identity}
              </h1>
              <p
                className="text-muted-foreground truncate font-mono text-[11px]"
                title={slicedData.path}
              >
                {slicedData.path}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6 p-4">
          {/* Identity Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="border-border/80 bg-secondary/20 flex flex-col gap-0.5 rounded-md border p-2.5">
              <span className="text-muted-foreground font-mono text-[10px] uppercase tracking-wider">
                Observed Since
              </span>
              <span className="text-foreground font-mono text-xs tabular-nums">
                {new Date(slicedData.created_at || Date.now()).toLocaleDateString()}
              </span>
            </div>
            <div className="border-border/80 bg-secondary/20 flex flex-col gap-0.5 rounded-md border p-2.5">
              <span className="text-muted-foreground font-mono text-[10px] uppercase tracking-wider">
                File Age
              </span>
              <span className="text-foreground font-mono text-xs tabular-nums">
                {slicedData.age}
              </span>
            </div>
            <div className="border-border/80 bg-secondary/20 flex flex-col gap-0.5 rounded-md border p-2.5">
              <span className="text-muted-foreground font-mono text-[10px] uppercase tracking-wider">
                Sessions
              </span>
              <span className="text-foreground font-mono text-xs tabular-nums">
                {slicedData.observed_sessions}
              </span>
            </div>
            <div className="border-border/80 bg-secondary/20 flex flex-col gap-0.5 rounded-md border p-2.5">
              <span className="text-muted-foreground font-mono text-[10px] uppercase tracking-wider">
                Events
              </span>
              <span className="text-foreground font-mono text-xs tabular-nums">
                {slicedData.observed_events}
              </span>
            </div>
          </div>

          {/* Current State Summary */}
          <div className="space-y-2">
            <h3 className="text-muted-foreground flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider">
              <Activity className="h-3 w-3" /> Current State
            </h3>
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] text-emerald-400">
                {stats.functions_created - stats.functions_removed} Functions Alive
              </span>
              <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[11px] text-cyan-400">
                {stats.imports_added - stats.imports_removed} Imports Alive
              </span>
            </div>
            <p className="text-muted-foreground flex items-center gap-1 font-mono text-[10px]">
              <Clock className="h-3 w-3" /> Latest observation:{" "}
              {slicedData.last_seen ? new Date(slicedData.last_seen).toLocaleString() : "N/A"}
            </p>
          </div>

          {/* File Evolution Scorecard */}
          <div className="space-y-2">
            <h3 className="text-muted-foreground flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider">
              <Database className="h-3 w-3" /> Evolution Scorecard
            </h3>
            <div className="border-border/80 bg-secondary/15 divide-border/40 divide-y rounded-lg border p-1">
              <ScoreItem
                label="Functions Created"
                value={stats.functions_created}
                icon={FunctionSquare}
                trend="up"
              />
              <ScoreItem
                label="Functions Removed"
                value={stats.functions_removed}
                icon={FunctionSquare}
                trend="down"
              />
              <ScoreItem
                label="Classes Created"
                value={stats.classes_created}
                icon={Braces}
                trend="up"
              />
              <ScoreItem
                label="Classes Removed"
                value={stats.classes_removed}
                icon={Braces}
                trend="down"
              />
              <ScoreItem label="Imports Added" value={stats.imports_added} icon={Tag} trend="up" />
              <ScoreItem
                label="Imports Removed"
                value={stats.imports_removed}
                icon={Tag}
                trend="down"
              />
              <ScoreItem
                label="Security Findings"
                value={stats.security_findings}
                icon={ShieldAlert}
              />
              <ScoreItem label="TODOs Resolved" value={stats.todos_resolved} icon={ShieldCheck} />
              <ScoreItem
                label="Major Refactors"
                value={stats.major_refactors}
                icon={GitPullRequest}
              />
            </div>
          </div>
        </div>
      </aside>

      {/* ───────────────────────────────────────────────────────── */}
      {/* MAIN AREA: MEMORY HIGHLIGHTS & DNA STRAND                 */}
      {/* ───────────────────────────────────────────────────────── */}
      <main className="bg-background relative flex flex-1 flex-col overflow-y-auto scroll-smooth">
        {/* Top Memory Highlights */}
        <div className="mx-auto w-full max-w-5xl space-y-4 p-6 pt-8">
          <div className="flex items-center gap-2" data-tour="dna-structural-profile">
            <BrainCircuit className="text-primary h-4 w-4" />
            <h2 className="text-foreground text-sm font-semibold tracking-tight">
              Memory Highlights
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <HighlightCard
              title="First Function"
              entry={highlights.firstFunction}
              fallback="No functions observed"
              icon={FunctionSquare}
              color="text-emerald-400"
            />
            <HighlightCard
              title="First Security Finding"
              entry={highlights.firstSecurity}
              fallback="Clean record"
              icon={ShieldAlert}
              color="text-rose-400"
            />
            <HighlightCard
              title="Major Refactor"
              entry={highlights.largestRefactor}
              fallback="No refactors observed"
              icon={GitPullRequest}
              color="text-amber-400"
            />
            <HighlightCard
              title="Most Active Session"
              entry={highlights.mostActiveSession}
              fallback="No sessions"
              icon={Zap}
              color="text-cyan-400"
            />
          </div>
        </div>

        {/* DNA STRAND VISUALIZATION */}
        <div
          className="mx-auto mt-4 flex w-full max-w-4xl flex-1 flex-col p-6"
          data-tour="dna-biography"
        >
          <div className="mb-10 flex items-center gap-2.5">
            <div className="border-border/80 bg-secondary/30 flex h-7 w-7 items-center justify-center rounded-md border">
              <Activity className="text-muted-foreground h-3.5 w-3.5" />
            </div>
            <h2 className="text-foreground text-base font-semibold tracking-tight">
              Engineering DNA Strand
            </h2>
          </div>

          <div className="relative flex flex-1 flex-col items-center pb-24">
            {/* The Central Spine */}
            <div className="bg-border/80 absolute bottom-0 top-0 z-0 w-[2px]" />

            {slicedData.biography.length === 0 ? (
              <div className="text-muted-foreground mt-8 font-mono text-xs">
                No events observed.
              </div>
            ) : (
              slicedData.biography.map((entry, idx) => {
                const entryTime = new Date(entry.timestamp).getTime();
                const isFuture = mode !== "LIVE" && selectedTime ? entryTime > selectedTime : false;

                return (
                  <DNANode
                    key={`${entry.event_id}-${idx}`}
                    entry={entry}
                    index={idx}
                    isFuture={isFuture}
                  />
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────────────────

function HighlightCard({
  title,
  entry,
  fallback,
  icon: Icon,
  color,
}: {
  title: string;
  entry: BiographyEntry | undefined;
  fallback: string;
  icon: React.ElementType;
  color: string;
}) {
  const navigate = useNavigate();

  if (!entry) {
    return (
      <div className="border-border/60 bg-card/40 flex flex-col gap-1.5 rounded-lg border p-3 opacity-60 backdrop-blur-sm">
        <div className="text-muted-foreground flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5" />
          <span className="font-mono text-[10px] font-medium uppercase tracking-wider">
            {title}
          </span>
        </div>
        <p className="text-muted-foreground font-mono text-xs">{fallback}</p>
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        void navigate(`/sessions/${entry.session_id}/replay?event=${entry.event_id}`);
      }}
      className="border-border/80 bg-card/60 hover:border-border hover:bg-card/90 focus-visible:ring-primary group relative flex flex-col gap-1.5 overflow-hidden rounded-lg border p-3 text-left shadow-sm backdrop-blur-md transition-all focus:outline-none focus-visible:ring-1"
    >
      <div className="absolute right-2 top-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <div className="border-border/60 bg-secondary/80 text-foreground rounded-md border p-1">
          <Play className="h-3 w-3" />
        </div>
      </div>
      <div
        className={cn(
          "text-muted-foreground group-hover:text-foreground flex items-center gap-1.5 transition-colors",
          color,
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        <span className="font-mono text-[10px] font-medium uppercase tracking-wider">{title}</span>
      </div>
      <p className="text-foreground line-clamp-2 text-xs font-medium leading-snug">
        {entry.finding}
      </p>
      <p className="text-muted-foreground mt-auto pt-1 font-mono text-[10px]">
        {new Date(entry.timestamp).toLocaleDateString()}
      </p>
    </button>
  );
}

function DNANode({
  entry,
  index,
  isFuture,
}: {
  entry: BiographyEntry;
  index: number;
  isFuture: boolean;
}) {
  const navigate = useNavigate();
  const isLeft = index % 2 === 0;
  const style = getNodeStyle(entry.finding);
  const time = new Date(entry.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const date = new Date(entry.timestamp).toLocaleDateString();

  // The base pair horizontal line connecting to the center spine
  const lineWidth = 44; // px

  return (
    <div
      className={cn(
        "group relative z-10 flex w-full max-w-[620px] origin-top justify-center transition-all duration-500",
        isFuture
          ? "pointer-events-none mb-0 max-h-0 scale-x-90 scale-y-0 opacity-0"
          : "mb-6 max-h-[300px] scale-100 opacity-100",
      )}
    >
      {/* Connector line from center to node */}
      <div
        className="bg-border/80 group-hover:bg-primary/70 absolute top-1/2 z-0 h-[1px] -translate-y-1/2 transition-colors"
        style={{
          width: `${lineWidth}px`,
          [isLeft ? "right" : "left"]: "50%",
        }}
      />

      <div
        className={cn(
          "relative flex w-1/2",
          isLeft ? "justify-end pr-[44px]" : "absolute left-1/2 justify-start pl-[44px]",
        )}
      >
        {/* Node Base Pair Dot */}
        <div
          className={cn(
            "absolute top-1/2 z-20 flex h-3 w-3 -translate-y-1/2 items-center justify-center rounded-full shadow-sm transition-transform duration-300 group-hover:scale-125",
            style.dot,
          )}
          style={{ [isLeft ? "right" : "left"]: `${lineWidth - 6}px` }}
        >
          <div className="h-1 w-1 rounded-full bg-white opacity-90" />
        </div>

        {/* Content Box */}
        <div
          className={cn(
            "hover:border-border hover:bg-card/90 focus-visible:ring-primary relative z-10 flex w-full max-w-[280px] cursor-pointer flex-col gap-2 rounded-lg border p-3 shadow-sm outline-none backdrop-blur-md transition-all focus-visible:ring-1",
            style.bg,
            style.border,
            isLeft ? "origin-right items-end text-right" : "origin-left items-start text-left",
          )}
          onClick={() => {
            void navigate(`/sessions/${entry.session_id}/replay?event=${entry.event_id}`);
          }}
          role="button"
          tabIndex={isFuture ? -1 : 0}
          aria-label={`Jump to replay for event: ${entry.finding}`}
        >
          {/* Quick action hover overlay */}
          <div className="bg-background/85 absolute inset-0 z-30 flex items-center justify-center gap-1.5 rounded-lg opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100">
            <div className="bg-primary text-primary-foreground flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium shadow-sm">
              <Play className="h-3 w-3" />
              Jump to Replay
            </div>
          </div>

          <div
            className={cn(
              "text-muted-foreground flex items-center gap-2 font-mono text-[10px]",
              isLeft ? "flex-row-reverse" : "",
            )}
          >
            <span className="border-border/60 bg-secondary/40 text-foreground/80 rounded border px-1.5 py-0.5">
              {date}
            </span>
            <span>{time}</span>
          </div>

          <div className={cn("flex w-full items-start gap-2.5", isLeft ? "flex-row-reverse" : "")}>
            <div
              className={cn(
                "border-border/60 bg-secondary/30 mt-0.5 shrink-0 rounded-md border p-1.5",
                style.color,
              )}
            >
              {style.icon}
            </div>
            <div
              className={cn(
                "text-foreground group-hover:text-foreground text-xs font-medium leading-snug transition-colors",
                isLeft ? "text-right" : "text-left",
              )}
            >
              {entry.finding}
            </div>
          </div>

          <div
            className={cn(
              "text-muted-foreground mt-0.5 flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider",
              isLeft ? "flex-row-reverse" : "",
            )}
          >
            <Maximize2 className="h-2.5 w-2.5 opacity-60" />
            Session: {entry.session_id.split("-")[0]}
          </div>
        </div>
      </div>
    </div>
  );
}
