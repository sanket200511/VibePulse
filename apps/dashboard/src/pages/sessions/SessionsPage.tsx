import { useState, useMemo } from "react";
import { Badge } from "@depradar/ui";
import { SessionCard } from "./SessionRow";
import { useSessionsData } from "./useSessionsData";
import { PageHeader } from "../../components/layout/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../../components/states";
import type { Session } from "./types";
import { Search, Activity, Layers, Calendar } from "lucide-react";

const STATUS_BADGE = {
  open: { variant: "success" as const, label: "Live" },
  connecting: { variant: "warning" as const, label: "Connecting…" },
  closed: { variant: "danger" as const, label: "Disconnected" },
};

function getGroupLabel(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();

  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return "TODAY";

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  if (isYesterday) return "YESTERDAY";

  return date
    .toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    })
    .toUpperCase();
}

/**
 * Session History — engineering observability monitoring console view.
 * Displays past and active development sessions in a structured, dense table format with date grouping.
 */
export function SessionsPage() {
  const { sessions, connectionStatus, isLoading, isError } = useSessionsData();
  const status = STATUS_BADGE[connectionStatus];

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<"ALL" | "ACTIVE" | "IDLE" | "COMPLETED">(
    "ALL",
  );

  // Summary counts
  const activeCount = useMemo(
    () => sessions.filter((s) => s.status === "ACTIVE").length,
    [sessions],
  );
  const idleCount = useMemo(() => sessions.filter((s) => s.status === "IDLE").length, [sessions]);
  const completedCount = useMemo(
    () => sessions.filter((s) => s.status === "COMPLETED").length,
    [sessions],
  );
  const totalEvents = useMemo(
    () => sessions.reduce((acc, s) => acc + s.event_count, 0),
    [sessions],
  );

  // Client-side filtering
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const matchesStatus = selectedStatus === "ALL" || s.status === selectedStatus;
      const query = searchQuery.trim().toLowerCase();
      if (!query) return matchesStatus;

      const projectName = (s.project_root.split(/[\\/]/).pop() || s.project_root).toLowerCase();
      const matchesSearch =
        projectName.includes(query) ||
        s.project_root.toLowerCase().includes(query) ||
        (s.git_branch && s.git_branch.toLowerCase().includes(query)) ||
        (s.primary_language && s.primary_language.toLowerCase().includes(query)) ||
        (s.summary?.headline && s.summary.headline.toLowerCase().includes(query));

      return matchesStatus && matchesSearch;
    });
  }, [sessions, selectedStatus, searchQuery]);

  // Date grouping
  const groupedSessions = useMemo(() => {
    const groups: { label: string; items: Session[] }[] = [];
    const groupMap = new Map<string, Session[]>();

    filteredSessions.forEach((session) => {
      const label = getGroupLabel(session.started_at);
      if (!groupMap.has(label)) {
        groupMap.set(label, []);
      }
      groupMap.get(label)!.push(session);
    });

    groupMap.forEach((items, label) => {
      groups.push({ label, items });
    });

    return groups;
  }, [filteredSessions]);

  return (
    <div className="animate-fade-in-up mx-auto flex w-full max-w-[1400px] flex-1 flex-col space-y-4 px-4 py-4 sm:px-6 md:py-6">
      <PageHeader
        title="History"
        description="Development sessions observed across your projects."
        meta={<Badge variant={status.variant}>{status.label}</Badge>}
      />

      {isLoading && <LoadingState label="Preparing your session history…" />}

      {isError && <ErrorState message="We couldn't reach the API. Retrying in the background…" />}

      {!isLoading && !isError && sessions.length === 0 && (
        <EmptyState
          title="No engineering sessions observed yet"
          description="DepRadar registers sessions automatically once you begin writing code in a project folder. To get started, verify the DepRadar daemon is running in your terminal, open an observed workspace, and make edits to a file."
          action={
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href="https://github.com/sanket200511/Vortex-DepRadar"
                target="_blank"
                rel="noreferrer"
                className="text-primary font-mono text-xs font-medium hover:underline"
              >
                Read the Docs
              </a>
            </div>
          }
          footer="Keyboard shortcut: Ctrl + K to open command menu"
        />
      )}

      {!isLoading && !isError && sessions.length > 0 && (
        <div className="space-y-4">
          {/* Summary & Filter Control Row */}
          <div className="border-border/80 bg-card/60 shadow-xs flex flex-col gap-3 rounded-lg border p-3">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              {/* Search Filter */}
              <div className="relative max-w-md flex-1">
                <Search className="text-muted-foreground/60 absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by project, path, branch, or language..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-border/80 bg-background/80 text-foreground placeholder:text-muted-foreground/50 focus:border-primary/60 w-full rounded-md border py-1.5 pl-8 pr-3 font-mono text-xs focus:outline-none"
                />
              </div>

              {/* Status Filter Tabs */}
              <div className="border-border/80 bg-background/60 flex shrink-0 items-center gap-1 rounded-md border p-1 font-mono text-xs">
                {(["ALL", "ACTIVE", "IDLE", "COMPLETED"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setSelectedStatus(st)}
                    className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      selectedStatus === st
                        ? "bg-secondary text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {st === "ALL" ? "All" : st.charAt(0) + st.slice(1).toLowerCase()}
                    <span className="text-muted-foreground/70 ml-1 text-[10px]">
                      (
                      {st === "ALL"
                        ? sessions.length
                        : st === "ACTIVE"
                          ? activeCount
                          : st === "IDLE"
                            ? idleCount
                            : completedCount}
                      )
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Summary Metrics Bar */}
            <div className="border-border/40 text-muted-foreground flex flex-wrap items-center gap-4 border-t pt-2.5 font-mono text-xs">
              <div className="flex items-center gap-1.5">
                <Activity className="text-primary/70 h-3.5 w-3.5" />
                <span className="text-foreground font-semibold tabular-nums">
                  {sessions.length}
                </span>
                <span>Total Sessions</span>
              </div>
              <span className="text-border/60">•</span>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-foreground font-semibold tabular-nums">{activeCount}</span>
                <span>Active</span>
              </div>
              <span className="text-border/60">•</span>
              <div className="flex items-center gap-1.5">
                <Layers className="text-primary/70 h-3.5 w-3.5" />
                <span className="text-foreground font-semibold tabular-nums">{totalEvents}</span>
                <span>Events Observed</span>
              </div>
            </div>
          </div>

          {/* Sessions Table Container */}
          <div className="border-border/80 bg-card/40 shadow-xs rounded-lg border p-2">
            {/* Table Header Columns */}
            <div className="text-muted-foreground/70 border-border/60 bg-muted/20 mb-2 hidden grid-cols-12 gap-2 rounded-t-md border-b px-3.5 py-2 pl-5 pr-8 font-mono text-[10px] font-semibold uppercase tracking-wider sm:grid sm:gap-4">
              <div className="col-span-2">Status</div>
              <div className="col-span-3">Project / Path</div>
              <div className="col-span-2">Started At</div>
              <div className="col-span-2 hidden md:block">Events</div>
              <div className="col-span-2 hidden lg:block">Duration</div>
              <div className="col-span-1 text-right sm:text-left">Language</div>
            </div>

            {filteredSessions.length === 0 ? (
              <div className="text-muted-foreground p-8 text-center font-mono text-xs">
                No sessions match your filter query: &ldquo;{searchQuery}&rdquo;
              </div>
            ) : (
              <div className="space-y-4">
                {groupedSessions.map((group) => (
                  <div key={group.label} className="space-y-1">
                    {/* Subtle Date Group Header */}
                    <div className="text-muted-foreground/80 border-border/30 flex items-center gap-2 border-b px-2 pb-1 pt-2 font-mono text-[10px] font-bold uppercase tracking-wider">
                      <Calendar className="text-primary/60 h-3 w-3" />
                      <span>{group.label}</span>
                      <span className="text-muted-foreground/40 font-normal">
                        ({group.items.length})
                      </span>
                    </div>

                    {/* Session Rows */}
                    <div className="divide-border/20 divide-y">
                      {group.items.map((session) => (
                        <SessionCard key={session.id} session={session} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
