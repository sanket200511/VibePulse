import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  Search,
  Filter,
  ShieldAlert,
  Lock,
  Clock,
  X,
  AlertTriangle,
  FolderGit2,
  Flame,
} from "lucide-react";
import { Badge } from "@vibepulse/ui";
import { useInvestigation, type InvestigationResult } from "./useInvestigation";
import { LoadingState } from "../../components/states";

const SEVERITY_COLORS = {
  CRITICAL: {
    badge: "danger" as const,
    border: "border-rose-500/50",
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    bar: "bg-rose-500",
  },
  HIGH: {
    badge: "danger" as const,
    border: "border-red-500/40",
    bg: "bg-red-500/10",
    text: "text-red-400",
    bar: "bg-red-500",
  },
  MEDIUM: {
    badge: "warning" as const,
    border: "border-amber-500/30",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    bar: "bg-amber-500",
  },
  LOW: {
    badge: "default" as const,
    border: "border-zinc-700/50",
    bg: "bg-zinc-800/30",
    text: "text-zinc-400",
    bar: "bg-zinc-500",
  },
} as const;

export function InvestigationPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [query, setQuery] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [activeFinding, setActiveFinding] = useState<InvestigationResult | null>(null);

  const { data, isLoading, isError } = useInvestigation(projectId, query);

  // Dynamic filter stats derived from real data
  const { severityCounts, projectCounts, typeCounts, filteredResults } = useMemo(() => {
    const rawResults = data?.results || [];

    const sCounts: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    const pCounts: Record<string, number> = {};
    const tCounts: Record<string, number> = {
      Secrets: 0,
      "Config Changes": 0,
      "File Modifications": 0,
      "File Creations": 0,
    };

    for (const r of rawResults) {
      // Severity count
      const lev = (r.risk_level || "LOW").toUpperCase();
      sCounts[lev] = (sCounts[lev] || 0) + 1;

      // Project count
      const pName = r.project_name || "Unknown";
      pCounts[pName] = (pCounts[pName] || 0) + 1;

      // Type count
      if (r.security_findings && r.security_findings.length > 0) {
        tCounts["Secrets"] = (tCounts["Secrets"] || 0) + 1;
      }
      const fPath = (r.file_path || "").toLowerCase();
      if (fPath.includes("config") || fPath.includes("settings") || fPath.includes(".env")) {
        tCounts["Config Changes"] = (tCounts["Config Changes"] || 0) + 1;
      }
      if (r.event_type === "FILE_MODIFIED") {
        tCounts["File Modifications"] = (tCounts["File Modifications"] || 0) + 1;
      } else if (r.event_type === "FILE_CREATED") {
        tCounts["File Creations"] = (tCounts["File Creations"] || 0) + 1;
      }
    }

    // Filter results based on sidebar selections
    const filtered = rawResults.filter((r) => {
      if (selectedSeverity && (r.risk_level || "LOW").toUpperCase() !== selectedSeverity) {
        return false;
      }
      if (selectedProject && (r.project_name || "Unknown") !== selectedProject) {
        return false;
      }
      if (selectedType) {
        if (selectedType === "Secrets" && (!r.security_findings || r.security_findings.length === 0)) return false;
        if (selectedType === "Config Changes") {
          const fPath = (r.file_path || "").toLowerCase();
          if (!fPath.includes("config") && !fPath.includes("settings") && !fPath.includes(".env")) {
            return false;
          }
        }
        if (selectedType === "File Modifications" && r.event_type !== "FILE_MODIFIED") return false;
        if (selectedType === "File Creations" && r.event_type !== "FILE_CREATED") return false;
      }
      return true;
    });

    return {
      severityCounts: sCounts,
      projectCounts: pCounts,
      typeCounts: tCounts,
      filteredResults: filtered,
    };
  }, [data, selectedSeverity, selectedProject, selectedType]);

  const activeResult = activeFinding || (filteredResults.length > 0 ? filteredResults[0] : null);
  const totalHighRisk = (severityCounts["HIGH"] ?? 0) + (severityCounts["CRITICAL"] ?? 0);

  return (
    <div className="flex h-full flex-col bg-zinc-950 text-zinc-100">
      {/* Investigation Top Navigation / Search Header */}
      <div className="border-b border-zinc-800/80 bg-zinc-950/90 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-2 text-indigo-400">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-white">Investigation Workspace</h1>
                  <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                    Live
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Real-time security correlation, risk escalation, and developmental evidence chain.
                </p>
              </div>
            </div>
            {data && (
              <div className="flex items-center gap-3 text-xs text-zinc-400">
                <span>
                  Observed Events: <strong className="text-white">{data.total_count}</strong>
                </span>
                {totalHighRisk > 0 && (
                  <span className="flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-1 font-semibold text-rose-400">
                    <Flame className="h-3.5 w-3.5" />
                    {totalHighRisk} High Risk
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Search Input Bar */}
          <div className="relative flex items-center">
            <Search className="absolute left-4 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by keyword or token (e.g. severity:HIGH, secret, auth.py, settings.py, config)..."
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900/90 pl-11 pr-24 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-12 text-xs text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <div className="absolute right-3 hidden items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400 sm:flex">
              ⌘K
            </div>
          </div>

          {/* Quick Query Filters */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
            <span className="text-zinc-500">Quick Filters:</span>
            {[
              { label: "High Risk Only", val: "severity:HIGH" },
              { label: "Credentials & Secrets", val: "secret" },
              { label: "Configuration", val: "config" },
              { label: "Authentication", val: "auth" },
            ].map((chip) => (
              <button
                key={chip.val}
                onClick={() => setQuery(query === chip.val ? "" : chip.val)}
                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all ${
                  query.includes(chip.val)
                    ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                    : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Workspace: Filters Sidebar + Results + Incident Detail Inspector */}
      <div className="flex flex-1 overflow-hidden">
        {/* Dynamic Filters Sidebar */}
        <aside className="w-64 shrink-0 overflow-y-auto border-r border-zinc-800/80 bg-zinc-950/60 p-4">
          <div className="space-y-6">
            {/* Risk Level Filter */}
            <div>
              <h3 className="mb-2.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5 text-indigo-400" />
                  Risk Level
                </span>
                {selectedSeverity && (
                  <button
                    onClick={() => setSelectedSeverity(null)}
                    className="text-[10px] lowercase text-indigo-400 hover:underline"
                  >
                    clear
                  </button>
                )}
              </h3>
              <div className="space-y-1">
                {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((sev) => {
                  const count = severityCounts[sev] || 0;
                  const isSelected = selectedSeverity === sev;
                  const color = SEVERITY_COLORS[sev];
                  return (
                    <button
                      key={sev}
                      onClick={() => setSelectedSeverity(isSelected ? null : sev)}
                      className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs transition-all ${
                        isSelected
                          ? `${color.bg} ${color.border} font-semibold ${color.text} border`
                          : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${color.bar}`} />
                        {sev}
                      </span>
                      <span className="font-mono text-[11px] opacity-70">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Event Category Filter */}
            <div>
              <h3 className="mb-2.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-zinc-400">
                <span>Category</span>
                {selectedType && (
                  <button
                    onClick={() => setSelectedType(null)}
                    className="text-[10px] lowercase text-indigo-400 hover:underline"
                  >
                    clear
                  </button>
                )}
              </h3>
              <div className="space-y-1">
                {Object.entries(typeCounts).map(([cat, count]) => {
                  const isSelected = selectedType === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedType(isSelected ? null : cat)}
                      className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs transition-all ${
                        isSelected
                          ? "border border-indigo-500/40 bg-indigo-500/10 font-semibold text-indigo-300"
                          : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                      }`}
                    >
                      <span className="truncate">{cat}</span>
                      <span className="font-mono text-[11px] opacity-70">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Observed Projects Filter */}
            <div>
              <h3 className="mb-2.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <FolderGit2 className="h-3.5 w-3.5 text-indigo-400" />
                  Projects
                </span>
                {selectedProject && (
                  <button
                    onClick={() => setSelectedProject(null)}
                    className="text-[10px] lowercase text-indigo-400 hover:underline"
                  >
                    clear
                  </button>
                )}
              </h3>
              <div className="space-y-1">
                {Object.entries(projectCounts).map(([pName, count]) => {
                  const isSelected = selectedProject === pName;
                  return (
                    <button
                      key={pName}
                      onClick={() => setSelectedProject(isSelected ? null : pName)}
                      className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs transition-all ${
                        isSelected
                          ? "border border-indigo-500/40 bg-indigo-500/10 font-semibold text-indigo-300"
                          : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                      }`}
                    >
                      <span className="truncate font-mono">{pName}</span>
                      <span className="font-mono text-[11px] opacity-70">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        {/* Results List Column */}
        <div className="w-1/2 overflow-y-auto border-r border-zinc-800/80 p-4">
          <div className="mb-3 flex items-center justify-between text-xs text-zinc-400">
            <span>
              Showing <strong className="text-white">{filteredResults.length}</strong> findings & events
            </span>
            {(selectedSeverity || selectedProject || selectedType) && (
              <button
                onClick={() => {
                  setSelectedSeverity(null);
                  setSelectedProject(null);
                  setSelectedType(null);
                }}
                className="text-xs text-indigo-400 hover:underline"
              >
                Reset filters
              </button>
            )}
          </div>

          {isLoading ? (
            <LoadingState label="Analyzing telemetry & reconstructing incidents..." />
          ) : isError ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-800 py-16 text-center text-zinc-400">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
              <p className="text-sm font-medium text-zinc-200">Investigation Engine Initializing</p>
              <p className="max-w-xs text-xs text-zinc-500">
                Awaiting telemetry events from daemon.
              </p>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800/80 py-16 text-center">
              <Search className="mb-3 h-10 w-10 text-zinc-600" />
              <p className="text-sm font-semibold text-zinc-300">No Investigations Yet</p>
              <p className="mt-1 max-w-sm text-xs text-zinc-500">
                VibePulse is observing your development activity. Security findings, credential leaks, and risk escalations will appear here in real time.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredResults.map((result) => {
                const isSelected = activeResult?.id === result.id;
                const sev = (result.risk_level || "LOW").toUpperCase() as keyof typeof SEVERITY_COLORS;
                const hasSecurity = result.security_findings && result.security_findings.length > 0;

                return (
                  <div
                    key={result.id}
                    onClick={() => setActiveFinding(result)}
                    className={`cursor-pointer rounded-lg border p-4 transition-all ${
                      isSelected
                        ? "border-indigo-500/80 bg-indigo-950/20 shadow-lg shadow-indigo-500/5 ring-1 ring-indigo-500/50"
                        : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70"
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
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
                          {sev}
                        </Badge>
                        <span className="font-mono text-xs font-semibold text-zinc-200">
                          Risk: {result.risk_score}/100
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-zinc-400">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <h4 className="mb-1 text-sm font-semibold text-white">
                      {result.summary}
                    </h4>

                    <div className="mb-3 flex items-center gap-3 text-xs text-zinc-400">
                      <span className="truncate font-mono">{result.file_name || result.file_path || "Project Root"}</span>
                      <span>•</span>
                      <span className="truncate">{result.project_name || "Project"}</span>
                    </div>

                    {/* Redacted evidence snippet for secrets */}
                    {hasSecurity && (
                      <div className="rounded-md border border-rose-500/20 bg-rose-950/20 p-2.5">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-400">
                          <Lock className="h-3.5 w-3.5" />
                          <span>Redacted Finding:</span>
                        </div>
                        <p className="mt-1 font-mono text-[11px] text-zinc-300">
                          {result.security_findings[0]?.redacted_evidence || 'API_KEY = "********REDACTED********"'}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Detailed Incident Investigation Console */}
        <div className="flex-1 overflow-y-auto bg-zinc-950/90 p-6">
          {activeResult ? (
            <div className="mx-auto max-w-2xl space-y-6">
              {/* Incident Header */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
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
                    <span className="text-xs text-zinc-400">
                      Incident ID: <span className="font-mono text-zinc-300">{activeResult.id.slice(0, 8)}</span>
                    </span>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-zinc-400">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(activeResult.timestamp).toLocaleString()}
                  </span>
                </div>

                <h2 className="text-lg font-bold text-white">{activeResult.summary}</h2>

                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-zinc-800/80 pt-3 text-xs text-zinc-400">
                  <div>
                    <span className="text-zinc-500">Target Project:</span>{" "}
                    <strong className="text-zinc-200 font-mono">{activeResult.project_name || "Project"}</strong>
                  </div>
                  <div>
                    <span className="text-zinc-500">File Involved:</span>{" "}
                    <strong className="text-zinc-200 font-mono">{activeResult.file_name || activeResult.file_path || "—"}</strong>
                  </div>
                </div>
              </div>

              {/* Explainable Risk Scoring Bar */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Explainable Risk Score
                  </span>
                  <span className="font-mono text-sm font-bold text-white">
                    {activeResult.risk_score} / 100 ({activeResult.risk_level})
                  </span>
                </div>

                {/* Score Progress Bar */}
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      activeResult.risk_score >= 80
                        ? "bg-rose-500"
                        : activeResult.risk_score >= 60
                          ? "bg-red-500"
                          : activeResult.risk_score >= 30
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.max(activeResult.risk_score, 8)}%` }}
                  />
                </div>

                {/* Contributing Risk Factors */}
                <div className="mt-4 space-y-2">
                  <span className="text-[11px] font-semibold text-zinc-400">Contributing Evidence Factors:</span>
                  <div className="space-y-1.5">
                    {(activeResult.risk_factors || []).map((factor, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-md bg-zinc-950/60 px-3 py-1.5 text-xs"
                      >
                        <span className="text-zinc-300">{factor.label}</span>
                        <span className="font-mono font-bold text-rose-400">+{factor.score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Evidence Chain — Chronological Visual Audit Trail */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
                <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                  <ShieldAlert className="h-4 w-4 text-indigo-400" />
                  Development Evidence Chain
                </h3>

                <div className="relative space-y-4 before:absolute before:inset-y-0 before:left-[11px] before:w-0.5 before:bg-zinc-800">
                  {(activeResult.evidence_chain || []).map((step, idx) => (
                    <div key={idx} className="relative flex items-start gap-3 pl-6">
                      <div
                        className={`absolute left-0 top-1 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-zinc-950 p-0.5 text-center ${
                          step.kind === "PATTERN_MATCH" || step.kind === "RISK_ESCALATION"
                            ? "bg-rose-500 text-white"
                            : "bg-indigo-500 text-white"
                        }`}
                      >
                        <div className="h-full w-full rounded-full bg-white/20" />
                      </div>
                      <div className="flex-1 rounded-lg border border-zinc-800/60 bg-zinc-950/40 p-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-zinc-200">{step.title}</span>
                          <span className="font-mono text-[10px] text-zinc-500">
                            {new Date(step.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="mt-1 text-zinc-400">{step.description}</p>
                        {step.file && (
                          <span className="mt-1.5 inline-block font-mono text-[10px] text-indigo-400">
                            {step.file}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Security Finding Details & Redaction */}
              {activeResult.security_findings && activeResult.security_findings.length > 0 && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-950/10 p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-400">
                      <Lock className="h-4 w-4" />
                      Detected Security Violation
                    </span>
                    <Badge variant="danger">{activeResult.security_findings[0]?.rule_id || "SEC001"}</Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-300">
                      <span className="text-zinc-500"># Masked Evidence:</span>
                      <pre className="mt-1 overflow-x-auto text-rose-300">
                        {activeResult.security_findings[0]?.redacted_evidence || 'API_KEY = "********REDACTED********"'}
                      </pre>
                    </div>

                    <div className="rounded-md border border-emerald-500/20 bg-emerald-950/20 p-3 text-xs">
                      <span className="font-semibold text-emerald-400">Actionable Remediation:</span>
                      <p className="mt-1 text-zinc-300">
                        {activeResult.recommendation ||
                          activeResult.security_findings[0]?.recommendation ||
                          "Move secrets to environment variables or secret management vaults."}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-zinc-500 text-sm">
              Select an observation from the list to view its complete investigation evidence.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
