import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  Search,
  ShieldAlert,
  Clock,
  X,
  FolderGit2,
  Flame,
  Activity,
  Layers,
  CheckCircle2,
  ChevronRight,
  AlertCircle,
  FileText,
  FileCode,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@vibepulse/ui";
import { useInvestigation, type InvestigationResult, type EvidenceNode } from "./useInvestigation";
import { LoadingState } from "../../components/states";

const SEVERITY_RANK: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

export function InvestigationPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [query, setQuery] = useState("");
  const [activeFinding, setActiveFinding] = useState<InvestigationResult | null>(null);
  const [selectedNode, setSelectedNode] = useState<EvidenceNode | null>(null);
  const [reviewedIncidents, setReviewedIncidents] = useState<Set<string>>(new Set());

  const { data, isLoading, isError } = useInvestigation(projectId, query);

  const rawResults = useMemo(() => data?.results || [], [data?.results]);

  // Filtered by query and sorted by severity (CRITICAL -> HIGH -> MEDIUM -> LOW), then newest first
  const filteredResults = useMemo(() => {
    let list = rawResults;
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (r) =>
          r.summary.toLowerCase().includes(q) ||
          (r.file_path || "").toLowerCase().includes(q) ||
          (r.project_name || "").toLowerCase().includes(q) ||
          (r.risk_level || "").toLowerCase().includes(q) ||
          r.security_findings?.some(
            (f) => f.message.toLowerCase().includes(q) || f.rule_id.toLowerCase().includes(q),
          ),
      );
    }
    return [...list].sort((a, b) => {
      const rankA = SEVERITY_RANK[(a.risk_level || "LOW").toUpperCase()] ?? 4;
      const rankB = SEVERITY_RANK[(b.risk_level || "LOW").toUpperCase()] ?? 4;
      if (rankA !== rankB) return rankA - rankB;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [rawResults, query]);

  // Derived real intelligence counts from PostgreSQL
  const stats = useMemo(() => {
    const total = data?.total_count ?? rawResults.length;
    const securityFindings =
      data?.security_findings_count ??
      rawResults.filter((r) => r.security_findings && r.security_findings.length > 0).length;
    const critical =
      data?.critical_count ??
      rawResults.filter(
        (r) => r.risk_score >= 80 || (r.risk_level || "").toUpperCase() === "CRITICAL",
      ).length;
    const sessions = data?.sessions_count ?? new Set(rawResults.map((r) => r.session_id)).size;
    const projects = data?.projects_count ?? new Set(rawResults.map((r) => r.project_root)).size;
    return { total, securityFindings, critical, sessions, projects };
  }, [
    data?.total_count,
    data?.security_findings_count,
    data?.critical_count,
    data?.sessions_count,
    data?.projects_count,
    rawResults,
  ]);

  const activeResult = activeFinding || (filteredResults.length > 0 ? filteredResults[0] : null);
  const isReviewed = activeResult ? reviewedIncidents.has(activeResult.id) : false;

  const handleMarkReviewed = (id: string) => {
    setReviewedIncidents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      {/* 1. TOP INVESTIGATION COMMAND CENTER HEADER */}
      <div className="border-b border-border bg-card/70 px-6 py-3.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-2 text-indigo-500 dark:text-indigo-400">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold tracking-tight text-foreground">
                    Investigation Command Center
                  </h1>
                  <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                    Live Observation
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Detect</span> →{" "}
                  <span className="font-semibold text-foreground">Correlate</span> →{" "}
                  <span className="font-semibold text-foreground">Explain</span> →{" "}
                  <span className="font-semibold text-foreground">Resolve</span>
                </p>
              </div>
            </div>

            {/* Quick Search */}
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search development activity (e.g. secret, auth.py)..."
                className="w-full rounded-md border border-border bg-card pl-8 pr-8 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 2. REAL INTELLIGENCE METRIC STRIP */}
          <div className="grid grid-cols-5 gap-3 pt-1">
            <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3.5 py-2 shadow-sm">
              <Activity className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Observed Events
                </p>
                <p className="font-mono text-sm font-bold text-foreground">{stats.total}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3.5 py-2 shadow-sm">
              <AlertCircle className="h-4 w-4 text-amber-500 dark:text-amber-400" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Security Findings
                </p>
                <p className="font-mono text-sm font-bold text-amber-600 dark:text-amber-300">
                  {stats.securityFindings}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3.5 py-2 shadow-sm">
              <Flame className="h-4 w-4 text-rose-500 dark:text-rose-400" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Critical Incidents
                </p>
                <p className="font-mono text-sm font-bold text-rose-600 dark:text-rose-400">
                  {stats.critical}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3.5 py-2 shadow-sm">
              <Layers className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Sessions
                </p>
                <p className="font-mono text-sm font-bold text-foreground">{stats.sessions}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3.5 py-2 shadow-sm">
              <FolderGit2 className="h-4 w-4 text-purple-500 dark:text-purple-400" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Observed Projects
                </p>
                <p className="font-mono text-sm font-bold text-foreground">{stats.projects}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE: ACTIVE INCIDENTS & EVIDENCE INVESTIGATOR */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column: Active Investigations & Live Stream */}
        <div className="w-[380px] shrink-0 overflow-y-auto border-r border-border p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Active Investigations ({filteredResults.length})
            </h3>
            {query && (
              <button
                onClick={() => setQuery("")}
                className="text-[11px] text-indigo-500 dark:text-indigo-400 hover:underline"
              >
                Clear search
              </button>
            )}
          </div>

          {isLoading ? (
            <LoadingState label="Reconstructing investigation incidents..." />
          ) : isError ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-12 text-center text-muted-foreground">
              <ShieldAlert className="h-6 w-6 text-amber-500" />
              <p className="text-xs font-semibold text-foreground">Investigation Engine Initializing</p>
              <p className="max-w-xs text-[11px] text-muted-foreground">
                Awaiting telemetry events from local daemon.
              </p>
            </div>
          ) : filteredResults.length === 0 ? (
            /* 10. SYSTEM CLEAR / NO DATA OPERATIONAL STATE */
            <div className="rounded-xl border border-dashed border-border bg-card/50 p-5 text-center shadow-sm">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                System Clear
              </h4>
              <p className="mt-1 text-xs text-muted-foreground">
                VibePulse is actively observing development activity.
              </p>
              <div className="my-3 border-t border-border pt-3 text-left">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Actively Monitoring:
                </p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    File modifications & creations
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                    Development sessions & context
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                    Configuration & auth changes
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                    Credential & secret patterns (SEC001)
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredResults.map((result) => {
                const isSelected = activeResult?.id === result.id;
                const isItemReviewed = reviewedIncidents.has(result.id);
                const sev = (result.risk_level || "LOW").toUpperCase();

                return (
                  <div
                    key={result.id}
                    onClick={() => {
                      setActiveFinding(result);
                      setSelectedNode(null);
                    }}
                    className={`cursor-pointer rounded-lg border p-3.5 transition-all ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-500/10 dark:bg-indigo-950/30 shadow-md ring-1 ring-indigo-500/40"
                        : "border-border bg-card hover:border-indigo-500/40 hover:bg-muted/50 shadow-sm"
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            sev === "CRITICAL" || sev === "HIGH"
                              ? "danger"
                              : sev === "MEDIUM"
                                ? "warning"
                                : "default"
                          }
                        >
                          {String(sev)} RISK
                        </Badge>
                        <span className="font-mono text-xs font-bold text-foreground">
                          {result.risk_score} / 100
                        </span>
                      </div>
                      {isItemReviewed ? (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" /> Reviewed
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {new Date(result.timestamp).toLocaleTimeString()}
                        </span>
                      )}
                    </div>

                    <h4 className="mb-1 text-xs font-semibold text-foreground">
                      {result.summary}
                    </h4>

                    <div className="mb-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="truncate font-mono">
                        {result.file_name || result.file_path || "Project Root"}
                      </span>
                      <span>•</span>
                      <span className="truncate">{result.project_name || "Project"}</span>
                    </div>

                    <div className="flex items-center justify-between border-t border-border pt-2 text-[10px] text-muted-foreground">
                      <span>{result.correlated_events_count || 4} correlated events</span>
                      <span className="flex items-center gap-1 font-semibold text-indigo-500 dark:text-indigo-400 hover:underline">
                        Investigate <ChevronRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: THE WOW FEATURE — INTERACTIVE INCIDENT INVESTIGATION */}
        <div className="flex-1 overflow-y-auto bg-background/50 p-6">
          {activeResult ? (
            <div className="mx-auto max-w-3xl space-y-6">
              {/* SECTION 1: INCIDENT OVERVIEW CARD */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Badge
                      variant={
                        activeResult.risk_level === "HIGH" || activeResult.risk_level === "CRITICAL"
                          ? "danger"
                          : activeResult.risk_level === "MEDIUM"
                            ? "warning"
                            : "default"
                      }
                    >
                      {activeResult.risk_level} RISK
                    </Badge>
                    <span className="font-mono text-sm font-bold text-foreground">
                      RISK SCORE: {activeResult.risk_score} / 100
                    </span>
                    {isReviewed && (
                      <span className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" /> Reviewed
                      </span>
                    )}
                  </div>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(activeResult.timestamp).toLocaleString()}
                  </span>
                </div>

                <h2 className="text-lg font-bold text-foreground">{activeResult.summary}</h2>

                <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Project:</span>
                    <p className="truncate font-mono font-semibold text-foreground">
                      {activeResult.project_name || "Project"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Primary File:</span>
                    <p className="truncate font-mono font-semibold text-indigo-500 dark:text-indigo-400">
                      {activeResult.file_name || activeResult.file_path || "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Session ID:</span>
                    <p className="truncate font-mono text-muted-foreground">
                      {activeResult.session_id.slice(0, 12)}...
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION 3: THE WOW FEATURE — INTERACTIVE INCIDENT EVIDENCE GRAPH */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Incident Evidence Graph
                    </h3>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Click any node to inspect raw evidence
                  </span>
                </div>

                {/* The Directed Graph Visualization */}
                <div className="space-y-3">
                  {(activeResult.evidence_nodes || []).map((node, idx, arr) => {
                    const isNodeSelected = selectedNode?.id === node.id;
                    const isSecretNode = node.kind === "PATTERN_MATCH";
                    const isEscalationNode = node.kind === "RISK_ESCALATION";

                    return (
                      <div key={node.id} className="flex flex-col items-center">
                        {/* Node Card */}
                        <div
                          onClick={() => setSelectedNode(isNodeSelected ? null : node)}
                          className={`w-full max-w-lg cursor-pointer rounded-lg border p-3.5 transition-all ${
                            isSecretNode
                              ? "border-rose-500/70 bg-rose-500/10 dark:bg-rose-950/30 shadow-md ring-1 ring-rose-500/60"
                              : isEscalationNode
                                ? "border-rose-500/50 bg-rose-500/5 dark:bg-red-950/20"
                                : isNodeSelected
                                  ? "border-indigo-500 bg-indigo-500/10 dark:bg-indigo-950/30 ring-1 ring-indigo-500"
                                  : "border-border bg-card hover:border-indigo-500/30 hover:bg-muted/40 shadow-sm"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${
                                  isSecretNode
                                    ? "bg-rose-500 animate-pulse"
                                    : isEscalationNode
                                      ? "bg-red-500"
                                      : "bg-indigo-600"
                                }`}
                              >
                                {node.step_number}
                              </span>
                              <div>
                                <h4 className="text-xs font-bold text-foreground">{node.title}</h4>
                                <p className="text-[11px] text-muted-foreground">{node.subtitle}</p>
                              </div>
                            </div>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {new Date(node.timestamp).toLocaleTimeString()}
                            </span>
                          </div>

                          {/* Redacted snippet preview on secret node */}
                          {isSecretNode && (
                            <div className="mt-2.5 rounded border border-rose-500/30 bg-rose-500/5 dark:bg-black/40 p-2 font-mono text-[11px] text-rose-600 dark:text-rose-300">
                              <span className="text-muted-foreground">Evidence: </span>
                              {node.details?.redacted_evidence
                                ? String(node.details.redacted_evidence)
                                : 'API_KEY = "********REDACTED********"'}
                            </div>
                          )}
                        </div>

                        {/* Connecting Line Down to Next Node */}
                        {idx < arr.length - 1 && (
                          <div className="my-1 flex flex-col items-center">
                            <div className="h-4 w-0.5 bg-gradient-to-b from-indigo-500 to-border" />
                            <div className="h-1 w-1 rounded-full bg-indigo-500" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Selected Node Detail Drawer */}
                {selectedNode && (
                  <div className="mt-4 rounded-lg border border-indigo-500/40 bg-indigo-500/5 dark:bg-indigo-950/30 p-4 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-600 dark:text-indigo-300">
                        Node Detail: {selectedNode.title}
                      </span>
                      <button
                        onClick={() => setSelectedNode(null)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <pre className="mt-2 overflow-x-auto rounded bg-muted/60 dark:bg-black/50 p-2.5 font-mono text-[11px] text-foreground border border-border">
                      {JSON.stringify(
                        {
                          step: selectedNode.step_number,
                          kind: selectedNode.kind,
                          timestamp: selectedNode.timestamp,
                          file: selectedNode.file,
                          severity: selectedNode.severity,
                          details: selectedNode.details,
                        },
                        null,
                        2,
                      )}
                    </pre>
                  </div>
                )}
              </div>

              {/* SECTION 4: "WHY THIS WAS FLAGGED" (EXPLAINABLE RISK BREAKDOWN) */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-rose-500 dark:text-rose-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Why This Was Flagged (Risk Calculation)
                    </h3>
                  </div>
                  <span className="font-mono text-sm font-bold text-rose-600 dark:text-rose-400">
                    Final Score: {activeResult.risk_score} / 100
                  </span>
                </div>

                <div className="space-y-1.5">
                  {(activeResult.risk_factors || []).map((factor, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-md border border-border bg-muted/30 dark:bg-zinc-950/60 px-3 py-2 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                        <span className="text-foreground">{factor.label}</span>
                      </div>
                      <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                        +{factor.score}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t border-border pt-2 text-xs font-bold">
                    <span className="text-muted-foreground uppercase text-[11px]">
                      Composite Risk Level
                    </span>
                    <span className="font-mono text-rose-600 dark:text-rose-400 uppercase">
                      {activeResult.risk_level}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION: DETECTION METHOD & ANALYSIS PROVENANCE */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Detection Method & Analysis Provenance
                    </h3>
                  </div>
                  <span className="rounded border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-indigo-600 dark:text-indigo-300">
                    Deterministic Engine
                  </span>
                </div>

                {(() => {
                  const firstSec = activeResult.security_findings?.[0];
                  return (
                    <>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="rounded-lg border border-border bg-muted/20 dark:bg-zinc-950/60 p-3">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Primary Detection Rule
                          </span>
                          <p className="mt-1 font-mono font-semibold text-foreground">
                            {firstSec
                              ? `${firstSec.rule_id} — Credential & API Key Exposure`
                              : "AST001 — Structural Baseline Monitoring"}
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {firstSec
                              ? firstSec.message
                              : "Continuous observation across project files and sessions."}
                          </p>
                        </div>

                        <div className="rounded-lg border border-border bg-muted/20 dark:bg-zinc-950/60 p-3">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Analyzer Pipeline
                          </span>
                          <p className="mt-1 font-semibold text-emerald-600 dark:text-emerald-400">
                            Security Guardian (Tree-Sitter AST & Regex)
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            Machine Learning: Standby (Zero synthetic confidence; rule-based ground truth)
                          </p>
                        </div>
                      </div>

                      {firstSec?.redacted_evidence && (
                        <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/20 p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                              Verified Redacted Evidence
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              Line {firstSec.line_number || 1}
                            </span>
                          </div>
                          <pre className="mt-1.5 overflow-x-auto rounded bg-muted/60 dark:bg-black/60 p-2 font-mono text-[11px] text-rose-600 dark:text-rose-200 border border-rose-500/20">
                            {firstSec.redacted_evidence}
                          </pre>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* SECTION 5 & 6: INCIDENT TIMELINE & AFFECTED SURFACE */}
              <div className="grid grid-cols-2 gap-4">
                {/* Incident Timeline */}
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                    <Clock className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                    Incident Timeline
                  </h3>
                  <div className="space-y-3">
                    {(activeResult.evidence_chain || []).map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs">
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {new Date(step.timestamp).toLocaleTimeString()}
                        </span>
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">{step.title}</p>
                          <p className="text-[11px] text-muted-foreground">{step.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Affected Surface */}
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                    <FileCode className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                    Affected Surface
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        Affected Files:
                      </span>
                      <div className="mt-1 space-y-1">
                        {(activeResult.affected_files.length > 0
                          ? activeResult.affected_files
                          : activeResult.file_path
                            ? [activeResult.file_path]
                            : ["Observed Target"]
                        ).map((file, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-1.5 rounded bg-muted/40 dark:bg-zinc-950/80 px-2 py-1 font-mono text-[11px] text-indigo-600 dark:text-indigo-300 border border-border"
                          >
                            <FileText className="h-3 w-3 text-muted-foreground" />
                            {file}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="border-t border-border pt-2 text-[11px]">
                      <span className="text-muted-foreground">Session Context: </span>
                      <span className="font-mono text-foreground">{activeResult.session_id}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 8: RECOMMENDED ACTION & RESOLUTION */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/10 p-5 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    Recommended Remediation Action
                  </span>
                  <button
                    onClick={() => handleMarkReviewed(activeResult.id)}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                      isReviewed
                        ? "border border-emerald-500/40 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                        : "bg-emerald-600 text-white hover:bg-emerald-500"
                    }`}
                  >
                    {isReviewed ? "✓ Marked as Reviewed" : "Mark as Reviewed"}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {activeResult.recommendation ||
                    "Move credentials and connection strings to environment variables (.env) or managed secret storage (e.g. AWS Secrets Manager, HashiCorp Vault) before committing changes."}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Select an investigation incident from the active list to inspect its complete evidence graph.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
