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
        dot: "bg-emerald-400 ring-emerald-500/20",
        icon: <Braces className="h-4 w-4 text-emerald-400" />,
      };
    }
    return {
      color: "text-rose-400",
      bg: "bg-rose-500/10",
      border: "border-rose-500/30",
      dot: "bg-rose-500 ring-rose-500/20",
      icon: <Braces className="h-4 w-4 text-rose-400" />,
    };
  }
  if (finding.includes("TODO")) {
    return {
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      dot: "bg-amber-400 ring-amber-500/20",
      icon: <ListTodo className="h-4 w-4 text-amber-400" />,
    };
  }
  if (finding.includes("Refactored") || finding.includes("Renamed")) {
    return {
      color: "text-indigo-400",
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/30",
      dot: "bg-indigo-400 ring-indigo-500/20",
      icon: <GitPullRequest className="h-4 w-4 text-indigo-400" />,
    };
  }
  return {
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
    dot: "bg-purple-500 ring-purple-500/20",
    icon: <ShieldAlert className="h-4 w-4 text-purple-400" />,
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
    <div className="group flex items-center justify-between rounded-lg border-b border-zinc-800/50 px-3 py-2.5 transition-colors hover:bg-zinc-800/20">
      <div className="flex items-center gap-3">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-1.5 text-zinc-400 transition-colors group-hover:text-white">
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-sm font-medium text-zinc-400 transition-colors group-hover:text-zinc-300">
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2 font-mono text-sm text-white">
        {trend === "up" && <span className="text-xs text-emerald-400">+</span>}
        {trend === "down" && <span className="text-xs text-rose-400">-</span>}
        {value}
      </div>
    </div>
  );

  return (
    <div className="flex h-full overflow-hidden bg-zinc-950 font-sans text-zinc-50 selection:bg-indigo-500/30">
      {/* ───────────────────────────────────────────────────────── */}
      {/* LEFT SIDEBAR: IDENTITY & SCORECARD                        */}
      {/* ───────────────────────────────────────────────────────── */}
      <aside className="z-10 hidden w-[340px] flex-shrink-0 flex-col overflow-y-auto border-r border-zinc-800/60 bg-zinc-900/20 shadow-2xl backdrop-blur-xl lg:flex">
        <div className="sticky top-0 z-20 border-b border-zinc-800/60 bg-zinc-950/80 p-6 backdrop-blur">
          <Link
            to={`/projects/${projectId}`}
            className="group mb-6 flex w-fit items-center gap-2 rounded-md text-sm font-medium text-zinc-500 transition-all hover:text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <span>Back to Project</span>
          </Link>

          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 shadow-[0_0_30px_rgba(99,102,241,0.1)]">
              <Binary className="h-7 w-7 text-indigo-400" />
            </div>
            <div className="flex-1 overflow-hidden">
              <h1 className="truncate text-xl font-bold tracking-tight text-white">
                {slicedData.identity}
              </h1>
              <p className="mt-1 truncate font-mono text-xs text-zinc-500" title={slicedData.path}>
                {slicedData.path}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8 p-6">
          {/* Identity Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1 rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-3 transition-colors hover:border-zinc-700">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Observed Since
              </span>
              <span className="font-mono text-sm text-white">
                {new Date(slicedData.created_at || Date.now()).toLocaleDateString()}
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-3 transition-colors hover:border-zinc-700">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                File Age
              </span>
              <span className="text-sm font-medium text-white">{slicedData.age}</span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-3 transition-colors hover:border-zinc-700">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Sessions
              </span>
              <span className="font-mono text-sm text-white">{slicedData.observed_sessions}</span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-3 transition-colors hover:border-zinc-700">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Events
              </span>
              <span className="font-mono text-sm text-white">{slicedData.observed_events}</span>
            </div>
          </div>

          {/* Current State Summary */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
              <Activity className="h-3 w-3" /> Current State
            </h3>
            <div className="flex gap-2">
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 shadow-sm">
                {stats.functions_created - stats.functions_removed} Functions Alive
              </span>
              <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400 shadow-sm">
                {stats.imports_added - stats.imports_removed} Imports Alive
              </span>
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500">
              <Clock className="h-3 w-3" /> Latest observation:{" "}
              {slicedData.last_seen ? new Date(slicedData.last_seen).toLocaleString() : "N/A"}
            </p>
          </div>

          {/* File Evolution Scorecard */}
          <div className="space-y-1">
            <h3 className="flex items-center gap-2 pb-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
              <Database className="h-3 w-3" /> Evolution Scorecard
            </h3>
            <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-1">
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
      <main className="relative flex flex-1 flex-col overflow-y-auto scroll-smooth bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/20 via-zinc-950 to-zinc-950">
        {/* Top Memory Highlights */}
        <div className="mx-auto w-full max-w-5xl space-y-6 p-8 pt-12">
          <div className="mb-4 flex items-center gap-3" data-tour="dna-structural-profile">
            <BrainCircuit className="h-6 w-6 text-indigo-400 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
            <h2 className="text-xl font-semibold tracking-tight text-white">Memory Highlights</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              color="text-blue-400"
            />
          </div>
        </div>

        {/* DNA STRAND VISUALIZATION */}
        <div
          className="mx-auto mt-8 flex w-full max-w-4xl flex-1 flex-col p-8"
          data-tour="dna-biography"
        >
          <div className="mb-16 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 shadow-[0_0_20px_rgba(255,255,255,0.05)]">
              <Activity className="h-5 w-5 text-zinc-400" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              Engineering DNA Strand
            </h2>
          </div>

          <div className="relative flex flex-1 flex-col items-center pb-32">
            {/* The Central Spine of the Double Helix */}
            <div className="absolute bottom-0 top-0 z-0 w-[2px] bg-gradient-to-b from-indigo-500/40 via-purple-500/20 to-transparent shadow-[0_0_20px_rgba(99,102,241,0.3)]" />

            {slicedData.biography.length === 0 ? (
              <div className="mt-10 text-sm text-zinc-500">No events observed.</div>
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
      <div className="flex flex-col gap-2 rounded-2xl border border-zinc-800/40 bg-zinc-900/20 p-5 opacity-50 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-zinc-500">
          <Icon className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-widest">{title}</span>
        </div>
        <p className="mt-1 text-sm font-medium text-zinc-600">{fallback}</p>
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        void navigate(`/sessions/${entry.session_id}/replay?event=${entry.event_id}`);
      }}
      className="group relative flex flex-col gap-2 overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 text-left backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-zinc-500 hover:bg-zinc-800/60 hover:shadow-[0_8px_30px_rgb(0,0,0,0.4)] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      <div className="absolute right-0 top-0 translate-x-2 p-4 opacity-0 transition-opacity duration-300 group-hover:translate-x-0 group-hover:opacity-100">
        <div className="rounded-full bg-white/10 p-2 backdrop-blur-md">
          <Play className="h-3.5 w-3.5 text-white" />
        </div>
      </div>
      <div
        className={cn(
          "flex items-center gap-2 text-zinc-400 transition-colors group-hover:text-zinc-200",
          color,
        )}
      >
        <Icon className="h-4 w-4" />
        <span className="text-xs font-bold uppercase tracking-widest">{title}</span>
      </div>
      <p className="mt-1 line-clamp-2 text-sm font-medium leading-relaxed text-white group-hover:text-white">
        {entry.finding}
      </p>
      <p className="mt-auto pt-2 font-mono text-xs text-zinc-500">
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
  const lineWidth = 50; // px

  return (
    <div
      className={cn(
        "group relative z-10 flex w-full max-w-[640px] origin-top justify-center transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
        isFuture
          ? "pointer-events-none mb-0 max-h-0 scale-x-90 scale-y-0 opacity-0"
          : "mb-8 max-h-[300px] scale-100 opacity-100",
      )}
    >
      {/* Connector line from center to node */}
      <div
        className="absolute top-1/2 z-0 h-[2px] -translate-y-1/2 bg-gradient-to-r from-zinc-800 to-zinc-600 transition-all duration-500 group-hover:from-indigo-600 group-hover:to-indigo-400 group-hover:shadow-[0_0_10px_rgba(99,102,241,0.5)]"
        style={{
          width: `${lineWidth}px`,
          [isLeft ? "right" : "left"]: "50%",
        }}
      />

      <div
        className={cn(
          "relative flex w-1/2",
          isLeft ? "justify-end pr-[50px]" : "absolute left-1/2 justify-start pl-[50px]",
        )}
      >
        {/* Node Base Pair Dot */}
        <div
          className={cn(
            "absolute top-1/2 z-20 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-all duration-500 group-hover:scale-150",
            style.dot,
          )}
          style={{ [isLeft ? "right" : "left"]: `${lineWidth - 8}px` }}
        >
          <div className="h-1.5 w-1.5 rounded-full bg-white opacity-90 shadow-sm" />
        </div>

        {/* Content Box */}
        <div
          className={cn(
            "relative z-10 flex w-full max-w-[270px] cursor-pointer flex-col gap-2.5 rounded-2xl border p-4 shadow-lg outline-none backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-indigo-500 group-hover:border-zinc-500/80 group-hover:shadow-2xl group-hover:shadow-indigo-500/10",
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
          <div
            className={cn(
              "absolute inset-0 z-30 flex items-center justify-center gap-2 rounded-2xl bg-black/60 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100",
            )}
          >
            <div className="flex translate-y-2 transform items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black shadow-xl transition-all duration-300 group-hover:translate-y-0">
              <Play className="h-4 w-4" />
              Jump to Replay
            </div>
          </div>

          <div
            className={cn(
              "flex items-center gap-2 font-mono text-xs text-zinc-500",
              isLeft ? "flex-row-reverse" : "",
            )}
          >
            <span className="rounded-md border border-zinc-800/50 bg-zinc-950/80 px-2 py-0.5 text-zinc-400">
              {date}
            </span>
            <span className="text-zinc-500">{time}</span>
          </div>

          <div className={cn("flex w-full items-start gap-3", isLeft ? "flex-row-reverse" : "")}>
            <div
              className={cn(
                "mt-0.5 shrink-0 rounded-xl border border-white/5 bg-zinc-950/50 p-2 shadow-inner",
                style.color,
              )}
            >
              {style.icon}
            </div>
            <div
              className={cn(
                "text-[15px] font-semibold leading-snug text-zinc-200 transition-colors group-hover:text-white",
                style.color,
                isLeft ? "text-right" : "text-left",
              )}
            >
              {entry.finding}
            </div>
          </div>

          <div
            className={cn(
              "mt-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500",
              isLeft ? "flex-row-reverse" : "",
            )}
          >
            <Maximize2 className="h-3 w-3 opacity-40" />
            Session: {entry.session_id.split("-")[0]}
          </div>
        </div>
      </div>
    </div>
  );
}
