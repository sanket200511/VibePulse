import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  FileCode,
  Package,
  Activity,
  RefreshCw,
  ArrowLeft,
  ExternalLink,
  CheckCircle2,
  X,
  Info,
} from "lucide-react";
import { useSecurityIntelligence } from "./useSecurityIntelligence";
import type { SecurityFinding } from "./types";
import { formatRelativeTime } from "../../lib/relative-time";

export function SecurityCommandCenter() {
  const { projectId } = useParams<{ projectId: string }>();
  const { security, isLoading, isError, refresh, isRefreshing } =
    useSecurityIntelligence(projectId);
  const [selectedFinding, setSelectedFinding] = useState<SecurityFinding | null>(null);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-12">
        <div className="border-accent-color/30 h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    );
  }

  if (isError || !security) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-red-400">
          <h2 className="text-base font-bold">Failed to load Security Intelligence</h2>
          <p className="mt-1 text-sm">Please verify the project is registered and active.</p>
        </div>
      </div>
    );
  }

  const {
    security_posture: posture,
    security_findings: findings,
    sensitive_files: sensitiveFiles,
    dependency_inventory: dependencies,
    security_activity: activity,
    security_trend: trend,
    correlated_incidents: incidents,
    risk_explanation: risk,
  } = security;

  return (
    <div className="animate-fade-in-up flex flex-1 flex-col p-8">
      {/* ── HEADER ── */}
      <div className="mb-8">
        <Link
          to={`/projects/${projectId}`}
          className="text-secondary-text hover:text-primary-text mb-4 inline-flex items-center gap-2 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Project Story
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-primary-text text-3xl font-extrabold tracking-tight">
                Security Intelligence 2.0
              </h1>
              <span className="bg-accent-color/10 text-accent-color border-accent-color/20 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider">
                Explainable Risk Engine
              </span>
            </div>
            <p className="text-secondary-text mt-1 font-mono text-xs">
              {security.project_root_path}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => refresh()}
              disabled={isRefreshing}
              className="bg-card hover:bg-card-subtle border-border text-primary-text inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Reprojecting..." : "Refresh Intelligence"}
            </button>
            <Link
              to={`/projects/${projectId}/investigation`}
              className="bg-accent-color hover:bg-accent-color/90 text-background inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold shadow-sm transition-all"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              Investigation Engine
            </Link>
          </div>
        </div>
      </div>

      {/* ── SECTION 1: SECURITY POSTURE CARDS ── */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="bg-card border-border rounded-xl border p-4 text-center shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-red-500">
            Critical
          </div>
          <div className="text-primary-text mt-1 text-3xl font-extrabold">{posture.critical}</div>
          <div className="text-secondary-text mt-1 text-[10px]">Immediate action</div>
        </div>

        <div className="bg-card border-border rounded-xl border p-4 text-center shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-orange-500">
            High Risk
          </div>
          <div className="text-primary-text mt-1 text-3xl font-extrabold">{posture.high}</div>
          <div className="text-secondary-text mt-1 text-[10px]">Significant concern</div>
        </div>

        <div className="bg-card border-border rounded-xl border p-4 text-center shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-yellow-500">
            Medium
          </div>
          <div className="text-primary-text mt-1 text-3xl font-extrabold">{posture.medium}</div>
          <div className="text-secondary-text mt-1 text-[10px]">Config & transport</div>
        </div>

        <div className="bg-card border-border rounded-xl border p-4 text-center shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-blue-500">
            Low / Debt
          </div>
          <div className="text-primary-text mt-1 text-3xl font-extrabold">{posture.low}</div>
          <div className="text-secondary-text mt-1 text-[10px]">Code quality/TODOs</div>
        </div>

        <div className="bg-card border-border rounded-xl border p-4 text-center shadow-sm">
          <div className="text-secondary-text text-xs font-semibold uppercase tracking-wider">
            Sensitive Files
          </div>
          <div className="text-primary-text mt-1 text-3xl font-extrabold">
            {posture.sensitive_files_count}
          </div>
          <div className="text-secondary-text mt-1 text-[10px]">Auth & config files</div>
        </div>

        <div className="bg-card border-border rounded-xl border p-4 text-center shadow-sm">
          <div className="text-secondary-text text-xs font-semibold uppercase tracking-wider">
            Total Telemetry
          </div>
          <div className="text-primary-text mt-1 text-3xl font-extrabold">
            {posture.security_events_count}
          </div>
          <div className="text-secondary-text mt-1 text-[10px]">Observed events</div>
        </div>
      </div>

      {/* ── SECTION 2: ACTIVE INCIDENTS & RISK SCORE EXPLANATION ── */}
      <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Active Incidents (2 cols) */}
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-primary-text flex items-center gap-2 text-lg font-bold">
              <ShieldAlert className="text-accent-color h-5 w-5" />
              Active Correlated Incidents
            </h2>
            <span className="text-secondary-text text-xs">
              {incidents.length} correlated {incidents.length === 1 ? "incident" : "incidents"}
            </span>
          </div>

          {incidents.length === 0 ? (
            <div className="bg-card border-border flex flex-col items-center justify-center rounded-xl border p-8 text-center">
              <ShieldCheck className="h-10 w-10 text-emerald-500" />
              <h3 className="text-primary-text mt-2 text-sm font-bold">No Security Incidents</h3>
              <p className="text-secondary-text mt-1 text-xs">
                No credential exposures or anomalous execution bursts detected in observed
                telemetry.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {incidents.map((inc) => (
                <div
                  key={inc.incident_id}
                  className="bg-card border-border hover:border-accent-color/40 rounded-xl border p-5 shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            inc.severity === "CRITICAL"
                              ? "border border-red-500/20 bg-red-500/10 text-red-400"
                              : inc.severity === "HIGH"
                                ? "border border-orange-500/20 bg-orange-500/10 text-orange-400"
                                : "border border-yellow-500/20 bg-yellow-500/10 text-yellow-400"
                          }`}
                        >
                          {inc.severity}
                        </span>
                        <h3 className="text-primary-text truncate text-sm font-bold">
                          {inc.title}
                        </h3>
                      </div>

                      <div className="text-secondary-text mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                        <span>
                          <strong>{inc.event_count}</strong> correlated events
                        </span>
                        <span>•</span>
                        <span>
                          <strong>{inc.affected_files.length}</strong> affected files
                        </span>
                        <span>•</span>
                        <span>
                          Risk Score: <strong>{inc.risk_score}/100</strong>
                        </span>
                        <span>•</span>
                        <span>{formatRelativeTime(inc.latest_event_at)}</span>
                      </div>

                      {inc.affected_files.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {inc.affected_files.map((af) => (
                            <span
                              key={af}
                              className="bg-muted-color/30 text-secondary-text rounded px-2 py-0.5 font-mono text-[10px]"
                            >
                              {af}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <Link
                      to={`/projects/${projectId}/investigation`}
                      className="bg-card hover:bg-card-subtle border-border text-primary-text inline-flex shrink-0 items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors"
                    >
                      Investigate
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Explainable Risk Score (1 col) */}
        <div className="bg-card border-border rounded-xl border p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-primary-text flex items-center gap-2 text-base font-bold">
              <Activity className="text-accent-color h-4 w-4" />
              Explainable Risk Score
            </h2>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                risk.risk_level === "CRITICAL"
                  ? "border border-red-500/20 bg-red-500/10 text-red-400"
                  : risk.risk_level === "HIGH"
                    ? "border border-orange-500/20 bg-orange-500/10 text-orange-400"
                    : "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
              }`}
            >
              {risk.risk_level}
            </span>
          </div>

          <div className="mb-6 flex items-baseline gap-2">
            <span className="text-primary-text text-4xl font-extrabold">{risk.total_score}</span>
            <span className="text-secondary-text text-sm font-semibold">/ 100</span>
          </div>

          {/* Progress Bar */}
          <div className="bg-muted-color/40 mb-6 h-2 w-full overflow-hidden rounded-full">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                risk.total_score >= 80
                  ? "bg-red-500"
                  : risk.total_score >= 60
                    ? "bg-orange-500"
                    : risk.total_score >= 30
                      ? "bg-yellow-500"
                      : "bg-emerald-500"
              }`}
              style={{ width: `${Math.max(risk.total_score, 5)}%` }}
            />
          </div>

          <h3 className="text-secondary-text mb-3 text-xs font-bold uppercase tracking-wider">
            Risk Factor Contributions
          </h3>

          {risk.breakdown.length === 0 ? (
            <p className="text-secondary-text text-xs">No risk factors identified.</p>
          ) : (
            <div className="space-y-2.5">
              {risk.breakdown.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="text-secondary-text truncate pr-2" title={item.factor}>
                    {item.factor}
                  </span>
                  <span className="text-accent-color shrink-0 font-mono font-bold">
                    +{item.points}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION 2.5: 7-DAY SECURITY ACTIVITY & TREND ── */}
      <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* 7-day Activity breakdown */}
        <div className="bg-card border-border rounded-xl border p-6 shadow-sm">
          <h2 className="text-primary-text mb-4 flex items-center gap-2 text-base font-bold">
            <Activity className="text-accent-color h-4 w-4" />
            7-Day Activity Metrics
          </h2>
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-secondary-text">Credential Exposures</span>
              <span className="text-primary-text font-mono font-bold">
                {activity.credential_exposure_count}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-secondary-text">Authentication Changes</span>
              <span className="text-primary-text font-mono font-bold">
                {activity.auth_changes_count}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-secondary-text">Configuration Changes</span>
              <span className="text-primary-text font-mono font-bold">
                {activity.config_changes_count}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-secondary-text">Security Alerts</span>
              <span className="text-primary-text font-mono font-bold">
                {activity.analyzer_alerts_count}
              </span>
            </div>
          </div>
        </div>

        {/* 7-day Trend Bar Histogram */}
        <div className="bg-card border-border rounded-xl border p-6 shadow-sm lg:col-span-2">
          <h2 className="text-primary-text mb-4 flex items-center gap-2 text-base font-bold">
            <Activity className="text-accent-color h-4 w-4" />
            Daily Activity & Findings Trend (Last 7 Days)
          </h2>
          <div className="grid grid-cols-7 gap-2 pt-2 text-center">
            {trend.map((pt, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <div className="bg-muted-color/20 flex h-24 w-full flex-col justify-end rounded-lg p-1">
                  {pt.finding_count > 0 && (
                    <div
                      className="w-full rounded-t bg-red-500 transition-all"
                      style={{ height: `${Math.min(pt.finding_count * 20, 60)}%` }}
                      title={`${pt.finding_count} findings`}
                    />
                  )}
                  <div
                    className="bg-accent-color/60 w-full rounded-b transition-all"
                    style={{ height: `${Math.min(pt.event_count * 10, 40)}%` }}
                    title={`${pt.event_count} events`}
                  />
                </div>
                <span className="text-secondary-text mt-2 w-full truncate text-[10px] font-medium">
                  {pt.date_label.split(" ")[0]}
                </span>
                <span className="text-primary-text text-[10px] font-bold">
                  {pt.event_count}e / {pt.finding_count}f
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── SECTION 3: SENSITIVE FILES & DEPENDENCIES ── */}
      <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Security-Sensitive Files */}
        <div className="bg-card border-border rounded-xl border p-6 shadow-sm">
          <h2 className="text-primary-text mb-4 flex items-center gap-2 text-base font-bold">
            <Lock className="text-accent-color h-4 w-4" />
            Security-Sensitive Files
          </h2>

          {sensitiveFiles.length === 0 ? (
            <p className="text-secondary-text text-xs">
              No sensitive configuration or auth files observed yet.
            </p>
          ) : (
            <div className="divide-border divide-y">
              {sensitiveFiles.map((sf) => (
                <div key={sf.file_path} className="flex items-center justify-between py-3">
                  <div className="min-w-0 flex-1 pr-4">
                    <div className="text-primary-text truncate font-mono text-xs font-semibold">
                      {sf.file_path}
                    </div>
                    <div className="text-secondary-text mt-0.5 text-[11px]">{sf.role}</div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3 text-right">
                    <span className="bg-muted-color/30 text-secondary-text rounded px-2 py-0.5 text-[10px] font-semibold">
                      {sf.activity_count} {sf.activity_count === 1 ? "event" : "events"}
                    </span>
                    {sf.findings_count > 0 && (
                      <span className="rounded border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-400">
                        {sf.findings_count} {sf.findings_count === 1 ? "alert" : "alerts"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dependency Security Foundation */}
        <div className="bg-card border-border rounded-xl border p-6 shadow-sm">
          <h2 className="text-primary-text mb-4 flex items-center gap-2 text-base font-bold">
            <Package className="text-accent-color h-4 w-4" />
            Dependency Inventory Foundation
          </h2>

          <div className="mb-6 grid grid-cols-3 gap-4 text-center">
            <div className="bg-muted-color/20 rounded-lg p-3">
              <div className="text-primary-text text-xl font-bold">{dependencies.total_count}</div>
              <div className="text-secondary-text mt-1 text-[10px] font-semibold uppercase">
                Total Tracked
              </div>
            </div>
            <div className="bg-muted-color/20 rounded-lg p-3">
              <div className="text-primary-text text-xl font-bold">{dependencies.direct_count}</div>
              <div className="text-secondary-text mt-1 text-[10px] font-semibold uppercase">
                Direct
              </div>
            </div>
            <div className="bg-muted-color/20 rounded-lg p-3">
              <div className="text-primary-text text-xl font-bold">{dependencies.dev_count}</div>
              <div className="text-secondary-text mt-1 text-[10px] font-semibold uppercase">
                Dev Dependencies
              </div>
            </div>
          </div>

          <div className="border-border rounded-lg border p-4">
            <div className="flex items-start gap-2.5">
              <Info className="text-secondary-text mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <div className="text-primary-text text-xs font-semibold">
                  Vulnerability Advisory Status
                </div>
                <p className="text-secondary-text mt-1 text-xs">
                  {dependencies.vulnerability_intelligence_status}
                </p>
                <div className="text-muted-foreground mt-2 font-mono text-[10px]">
                  Manifests: {dependencies.manifest_files.join(", ") || "None observed"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 4: RECENT FINDINGS LIST ── */}
      <div className="bg-card border-border rounded-xl border p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-primary-text flex items-center gap-2 text-base font-bold">
            <FileCode className="text-accent-color h-4 w-4" />
            Security Findings & Guardrails
          </h2>
          <span className="text-secondary-text text-xs">{findings.length} findings recorded</span>
        </div>

        {findings.length === 0 ? (
          <p className="text-secondary-text text-xs">
            No active security findings in this project.
          </p>
        ) : (
          <div className="divide-border divide-y">
            {findings.map((f) => (
              <div
                key={f.finding_id}
                onClick={() => setSelectedFinding(f)}
                className="hover:bg-card-subtle flex cursor-pointer items-center justify-between py-3.5 transition-colors"
              >
                <div className="min-w-0 flex-1 pr-4">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                        f.severity === "CRITICAL"
                          ? "border border-red-500/20 bg-red-500/10 text-red-400"
                          : f.severity === "HIGH"
                            ? "border border-orange-500/20 bg-orange-500/10 text-orange-400"
                            : "border border-yellow-500/20 bg-yellow-500/10 text-yellow-400"
                      }`}
                    >
                      {f.severity}
                    </span>
                    <span className="text-primary-text font-mono text-xs font-bold">
                      {f.rule_id}
                    </span>
                    <span className="text-primary-text truncate text-xs font-semibold">
                      {f.title}
                    </span>
                  </div>
                  <div className="text-secondary-text mt-1 truncate font-mono text-[11px]">
                    {f.file_path}:{f.line_number || 1}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <span className="bg-accent-color/10 text-accent-color border-accent-color/20 rounded border px-2 py-0.5 text-[10px] font-bold">
                    +{f.risk_contribution}
                  </span>
                  <span className="text-secondary-text text-[11px]">
                    {formatRelativeTime(f.detected_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── FINDING DETAILS MODAL ── */}
      {selectedFinding && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setSelectedFinding(null)}
        >
          <div
            className="bg-card border-border max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                      selectedFinding.severity === "CRITICAL"
                        ? "border border-red-500/20 bg-red-500/10 text-red-400"
                        : selectedFinding.severity === "HIGH"
                          ? "border border-orange-500/20 bg-orange-500/10 text-orange-400"
                          : "border border-yellow-500/20 bg-yellow-500/10 text-yellow-400"
                    }`}
                  >
                    {selectedFinding.severity}
                  </span>
                  <h3 className="text-primary-text text-lg font-bold">{selectedFinding.title}</h3>
                </div>
                <p className="text-secondary-text mt-1 font-mono text-xs">
                  {selectedFinding.file_path}:{selectedFinding.line_number || 1}
                </p>
              </div>

              <button
                onClick={() => setSelectedFinding(null)}
                className="text-secondary-text hover:text-primary-text rounded-lg p-1 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <div className="text-secondary-text text-xs font-bold uppercase tracking-wider">
                  Why It Matters
                </div>
                <p className="text-primary-text mt-1 text-xs leading-relaxed">
                  {selectedFinding.why || selectedFinding.description}
                </p>
              </div>

              <div>
                <div className="text-secondary-text text-xs font-bold uppercase tracking-wider">
                  Redacted Evidence (Secret-Safe)
                </div>
                <pre className="bg-muted-color/30 text-primary-text mt-1 overflow-x-auto rounded-lg p-3 font-mono text-xs">
                  {selectedFinding.redacted_evidence}
                </pre>
              </div>

              <div>
                <div className="text-secondary-text text-xs font-bold uppercase tracking-wider">
                  Remediation Guidance
                </div>
                <div className="bg-accent-color/10 border-accent-color/20 text-primary-text mt-1 flex items-start gap-2.5 rounded-lg border p-3 text-xs leading-relaxed">
                  <CheckCircle2 className="text-accent-color mt-0.5 h-4 w-4 shrink-0" />
                  <div>{selectedFinding.remediation}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 text-xs">
                <div>
                  <span className="text-secondary-text">Rule ID:</span>{" "}
                  <span className="text-primary-text font-mono font-semibold">
                    {selectedFinding.rule_id}
                  </span>
                </div>
                <div>
                  <span className="text-secondary-text">Risk Contribution:</span>{" "}
                  <span className="text-accent-color font-bold">
                    +{selectedFinding.risk_contribution}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
