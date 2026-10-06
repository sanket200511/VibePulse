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
import { Breadcrumbs } from "../../components/layout/Breadcrumbs";

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
    <div className="animate-fade-in-up text-foreground mx-auto flex w-full max-w-[1400px] flex-1 flex-col space-y-6 px-4 py-4 sm:px-6 md:py-6">
      {/* ── HEADER ── */}
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Breadcrumbs
            items={[
              { label: "Projects", to: "/projects" },
              { label: "Project Story", to: `/projects/${projectId}` },
              { label: "Security Intelligence" },
            ]}
          />
          <Link
            to={`/projects/${projectId}`}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Project Story
          </Link>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-foreground text-xl font-bold tracking-tight">
                Security Intelligence 2.0
              </h1>
              <span className="border-border/80 bg-secondary/30 text-muted-foreground rounded border px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider">
                Explainable Risk Engine
              </span>
            </div>
            <p className="text-muted-foreground mt-1 font-mono text-xs">
              {security.project_root_path}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refresh()}
              disabled={isRefreshing}
              className="border-border/80 bg-secondary/40 text-foreground hover:bg-secondary inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium shadow-sm transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Reprojecting..." : "Refresh Intelligence"}
            </button>
            <Link
              to={`/projects/${projectId}/investigation`}
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              Investigation Engine
            </Link>
          </div>
        </div>

        {/* Hybrid ML Status Banner */}
        <div className="border-border/60 bg-secondary/20 text-muted-foreground flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-foreground font-semibold">Hybrid Secret Detection:</span>
            <span>Deterministic Rules + ML Random Forest (v1.0.0)</span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span className="text-emerald-400">Classical ML: ACTIVE</span>
            <span>•</span>
            <span className="text-zinc-500">Transformer: NOT_AVAILABLE</span>
            <span>•</span>
            <span className="border-border/60 bg-background/50 text-foreground rounded border px-1.5 py-0.5">
              Truth Boundary: OBSERVED vs INFERRED
            </span>
          </div>
        </div>
      </div>

      {/* ── SECTION 1: SECURITY POSTURE CARDS ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="border-border/80 bg-card/60 rounded-lg border p-3 text-center">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-red-400">
            Critical
          </div>
          <div className="text-foreground mt-1 font-mono text-2xl font-bold tabular-nums">
            {posture.critical}
          </div>
          <div className="text-muted-foreground mt-0.5 text-[10px]">Immediate action</div>
        </div>

        <div className="border-border/80 bg-card/60 rounded-lg border p-3 text-center">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-orange-400">
            High Risk
          </div>
          <div className="text-foreground mt-1 font-mono text-2xl font-bold tabular-nums">
            {posture.high}
          </div>
          <div className="text-muted-foreground mt-0.5 text-[10px]">Significant concern</div>
        </div>

        <div className="border-border/80 bg-card/60 rounded-lg border p-3 text-center">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-amber-400">
            Medium
          </div>
          <div className="text-foreground mt-1 font-mono text-2xl font-bold tabular-nums">
            {posture.medium}
          </div>
          <div className="text-muted-foreground mt-0.5 text-[10px]">Config & transport</div>
        </div>

        <div className="border-border/80 bg-card/60 rounded-lg border p-3 text-center">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-blue-400">
            Low / Debt
          </div>
          <div className="text-foreground mt-1 font-mono text-2xl font-bold tabular-nums">
            {posture.low}
          </div>
          <div className="text-muted-foreground mt-0.5 text-[10px]">Code quality / debt</div>
        </div>

        <div className="border-border/80 bg-card/60 rounded-lg border p-3 text-center">
          <div className="text-muted-foreground font-mono text-[10px] font-semibold uppercase tracking-wider">
            Sensitive Files
          </div>
          <div className="text-foreground mt-1 font-mono text-2xl font-bold tabular-nums">
            {posture.sensitive_files_count}
          </div>
          <div className="text-muted-foreground mt-0.5 text-[10px]">Auth & secrets</div>
        </div>

        <div className="border-border/80 bg-card/60 rounded-lg border p-3 text-center">
          <div className="text-muted-foreground font-mono text-[10px] font-semibold uppercase tracking-wider">
            Total Telemetry
          </div>
          <div className="text-foreground mt-1 font-mono text-2xl font-bold tabular-nums">
            {posture.security_events_count}
          </div>
          <div className="text-muted-foreground mt-0.5 text-[10px]">Observed events</div>
        </div>
      </div>

      {/* ── SECTION 2: ACTIVE INCIDENTS & RISK SCORE EXPLANATION ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Active Incidents (2 cols) */}
        <div className="space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-foreground flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
              <ShieldAlert className="text-primary h-3.5 w-3.5" />
              Active Correlated Incidents
            </h2>
            <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
              {incidents.length} correlated {incidents.length === 1 ? "incident" : "incidents"}
            </span>
          </div>

          {incidents.length === 0 ? (
            <div className="border-border/80 bg-card/40 flex flex-col items-center justify-center rounded-lg border p-8 text-center">
              <ShieldCheck className="h-8 w-8 text-emerald-400" />
              <h3 className="text-foreground mt-2 text-xs font-semibold">No Security Incidents</h3>
              <p className="text-muted-foreground mt-0.5 text-xs">
                No credential exposures or anomalous execution bursts detected in observed
                telemetry.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {incidents.map((inc) => (
                <div
                  key={inc.incident_id}
                  className="border-border/80 bg-card/60 hover:border-border hover:bg-secondary/10 rounded-lg border p-4 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase ${
                            inc.severity === "CRITICAL"
                              ? "border border-red-500/30 bg-red-500/10 text-red-400"
                              : inc.severity === "HIGH"
                                ? "border border-orange-500/30 bg-orange-500/10 text-orange-400"
                                : "border border-amber-500/30 bg-amber-500/10 text-amber-400"
                          }`}
                        >
                          {inc.severity}
                        </span>
                        <h3 className="text-foreground truncate text-xs font-semibold">
                          {inc.title}
                        </h3>
                      </div>

                      <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px]">
                        <span>
                          <strong className="text-foreground">{inc.event_count}</strong> events
                        </span>
                        <span>•</span>
                        <span>
                          <strong className="text-foreground">{inc.affected_files.length}</strong>{" "}
                          files
                        </span>
                        <span>•</span>
                        <span>
                          Risk: <strong className="text-foreground">{inc.risk_score}</strong>/100
                        </span>
                        <span>•</span>
                        <span>{formatRelativeTime(inc.latest_event_at)}</span>
                      </div>

                      {inc.affected_files.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {inc.affected_files.map((af) => (
                            <span
                              key={af}
                              className="border-border/60 bg-secondary/30 text-muted-foreground rounded border px-1.5 py-0.5 font-mono text-[10px]"
                            >
                              {af}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <Link
                      to={`/projects/${projectId}/investigation?incidentId=${encodeURIComponent(inc.incident_id)}`}
                      className="border-border/80 bg-secondary/40 text-foreground hover:bg-secondary inline-flex shrink-0 items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors"
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
        <div className="border-border/80 bg-card/60 space-y-4 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-foreground flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
              <Activity className="text-primary h-3.5 w-3.5" />
              Risk Score
            </h2>
            <span
              className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                risk.risk_level === "CRITICAL"
                  ? "border border-red-500/30 bg-red-500/10 text-red-400"
                  : risk.risk_level === "HIGH"
                    ? "border border-orange-500/30 bg-orange-500/10 text-orange-400"
                    : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              }`}
            >
              {risk.risk_level}
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-foreground font-mono text-3xl font-bold tabular-nums">
              {risk.total_score}
            </span>
            <span className="text-muted-foreground font-mono text-xs">/ 100</span>
          </div>

          {/* Progress Bar */}
          <div className="bg-secondary/40 h-1.5 w-full overflow-hidden rounded">
            <div
              className={`h-full transition-all duration-500 ${
                risk.total_score >= 80
                  ? "bg-red-500"
                  : risk.total_score >= 60
                    ? "bg-orange-500"
                    : risk.total_score >= 30
                      ? "bg-amber-500"
                      : "bg-emerald-500"
              }`}
              style={{ width: `${Math.max(risk.total_score, 5)}%` }}
            />
          </div>

          <h3 className="text-muted-foreground font-mono text-[10px] font-semibold uppercase tracking-wider">
            Risk Factor Contributions
          </h3>

          {!risk.breakdown || risk.breakdown.length === 0 ? (
            <p className="text-muted-foreground text-xs">No risk factors identified.</p>
          ) : (
            <div className="space-y-2">
              {(risk.breakdown || []).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground truncate pr-2" title={item.factor}>
                    {item.factor}
                  </span>
                  <span className="text-foreground shrink-0 font-mono text-[11px] font-bold">
                    +{item.points}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION 2.5: 7-DAY SECURITY ACTIVITY & TREND ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 7-day Activity breakdown */}
        <div className="border-border/80 bg-card/60 rounded-lg border p-4">
          <h2 className="text-foreground mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
            <Activity className="text-primary h-3.5 w-3.5" />
            7-Day Activity Metrics
          </h2>
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Credential Exposures</span>
              <span className="text-foreground font-mono font-bold tabular-nums">
                {activity.credential_exposure_count}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Authentication Changes</span>
              <span className="text-foreground font-mono font-bold tabular-nums">
                {activity.auth_changes_count}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Configuration Changes</span>
              <span className="text-foreground font-mono font-bold tabular-nums">
                {activity.config_changes_count}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Security Alerts</span>
              <span className="text-foreground font-mono font-bold tabular-nums">
                {activity.analyzer_alerts_count}
              </span>
            </div>
          </div>
        </div>

        {/* 7-day Trend Bar Histogram */}
        <div className="border-border/80 bg-card/60 rounded-lg border p-4 lg:col-span-2">
          <h2 className="text-foreground mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
            <Activity className="text-primary h-3.5 w-3.5" />
            Daily Activity & Findings Trend (Last 7 Days)
          </h2>
          <div className="grid grid-cols-7 gap-2 pt-1 text-center">
            {trend.map((pt, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <div className="bg-secondary/30 flex h-20 w-full flex-col justify-end rounded-md p-1">
                  {pt.finding_count > 0 && (
                    <div
                      className="w-full rounded-t bg-red-500/80 transition-all"
                      style={{ height: `${Math.min(pt.finding_count * 20, 60)}%` }}
                      title={`${pt.finding_count} findings`}
                    />
                  )}
                  <div
                    className="bg-primary/60 w-full rounded-b transition-all"
                    style={{ height: `${Math.min(pt.event_count * 10, 40)}%` }}
                    title={`${pt.event_count} events`}
                  />
                </div>
                <span className="text-muted-foreground mt-1.5 w-full truncate font-mono text-[10px]">
                  {pt.date_label.split(" ")[0]}
                </span>
                <span className="text-foreground font-mono text-[10px] font-semibold tabular-nums">
                  {pt.event_count}e / {pt.finding_count}f
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── SECTION 3: SENSITIVE FILES & DEPENDENCIES ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Security-Sensitive Files */}
        <div className="border-border/80 bg-card/60 rounded-lg border p-4">
          <h2 className="text-foreground mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
            <Lock className="text-primary h-3.5 w-3.5" />
            Security-Sensitive Files
          </h2>

          {sensitiveFiles.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              No sensitive configuration or auth files observed yet.
            </p>
          ) : (
            <div className="divide-border/60 divide-y">
              {sensitiveFiles.map((sf) => (
                <div key={sf.file_path} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="text-foreground truncate font-mono text-xs font-medium">
                      {sf.file_path}
                    </div>
                    <div className="text-muted-foreground mt-0.5 text-[11px]">{sf.role}</div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 text-right">
                    <span className="border-border/60 bg-secondary/30 text-muted-foreground rounded border px-1.5 py-0.5 font-mono text-[10px]">
                      {sf.activity_count} {sf.activity_count === 1 ? "event" : "events"}
                    </span>
                    {sf.findings_count > 0 && (
                      <span className="rounded border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-red-400">
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
        <div className="border-border/80 bg-card/60 rounded-lg border p-4">
          <h2 className="text-foreground mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
            <Package className="text-primary h-3.5 w-3.5" />
            Dependency Inventory Foundation
          </h2>

          <div className="mb-4 grid grid-cols-3 gap-2.5 text-center">
            <div className="border-border/60 bg-secondary/20 rounded-md border p-2.5">
              <div className="text-foreground font-mono text-lg font-bold tabular-nums">
                {dependencies.total_count}
              </div>
              <div className="text-muted-foreground mt-0.5 font-mono text-[9px] uppercase tracking-wider">
                Total Tracked
              </div>
            </div>
            <div className="border-border/60 bg-secondary/20 rounded-md border p-2.5">
              <div className="text-foreground font-mono text-lg font-bold tabular-nums">
                {dependencies.direct_count}
              </div>
              <div className="text-muted-foreground mt-0.5 font-mono text-[9px] uppercase tracking-wider">
                Direct
              </div>
            </div>
            <div className="border-border/60 bg-secondary/20 rounded-md border p-2.5">
              <div className="text-foreground font-mono text-lg font-bold tabular-nums">
                {dependencies.dev_count}
              </div>
              <div className="text-muted-foreground mt-0.5 font-mono text-[9px] uppercase tracking-wider">
                Dev
              </div>
            </div>
          </div>

          <div className="border-border/60 bg-secondary/20 rounded-md border p-3">
            <div className="flex items-start gap-2">
              <Info className="text-muted-foreground mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div>
                <div className="text-foreground text-xs font-medium">
                  Vulnerability Advisory Status
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {dependencies.vulnerability_intelligence_status}
                </p>
                <div className="text-muted-foreground mt-1.5 font-mono text-[10px]">
                  Manifests: {dependencies.manifest_files?.join(", ") || "None observed"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 4: RECENT FINDINGS LIST ── */}
      <div className="border-border/80 bg-card/60 rounded-lg border p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-foreground flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
            <FileCode className="text-primary h-3.5 w-3.5" />
            Security Findings & Guardrails
          </h2>
          <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
            {findings.length} findings recorded
          </span>
        </div>

        {findings.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            No active security findings in this project.
          </p>
        ) : (
          <div className="divide-border/60 divide-y">
            {findings.map((f) => (
              <div
                key={f.finding_id}
                onClick={() => setSelectedFinding(f)}
                className="hover:bg-secondary/30 flex cursor-pointer items-center justify-between py-2.5 transition-colors"
              >
                <div className="min-w-0 flex-1 pr-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase ${
                        f.severity === "CRITICAL"
                          ? "border border-red-500/30 bg-red-500/10 text-red-400"
                          : f.severity === "HIGH"
                            ? "border border-orange-500/30 bg-orange-500/10 text-orange-400"
                            : "border border-amber-500/30 bg-amber-500/10 text-amber-400"
                      }`}
                    >
                      {f.severity}
                    </span>
                    <span className="text-foreground font-mono text-xs font-semibold">
                      {f.rule_id}
                    </span>
                    {f.detection_source === "hybrid" && (
                      <span className="rounded border border-indigo-500/30 bg-indigo-500/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-indigo-400">
                        HYBRID
                      </span>
                    )}
                    {f.detection_source === "ml" && (
                      <span className="rounded border border-purple-500/30 bg-purple-500/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-purple-400">
                        ML
                      </span>
                    )}
                    {f.ml_classification && (
                      <span
                        className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold ${
                          f.ml_classification === "REAL_SECRET"
                            ? "border border-red-500/30 bg-red-500/10 text-red-400"
                            : f.ml_classification === "PLACEHOLDER_OR_EXAMPLE"
                              ? "border border-amber-500/30 bg-amber-500/10 text-amber-400"
                              : "border border-zinc-500/30 bg-zinc-500/10 text-zinc-400"
                        }`}
                      >
                        {f.ml_classification}
                        {f.ml_confidence !== undefined && f.ml_confidence !== null
                          ? ` (${(f.ml_confidence * 100).toFixed(0)}%)`
                          : ""}
                      </span>
                    )}
                    <span className="text-foreground truncate text-xs">{f.title}</span>
                  </div>
                  <div className="text-muted-foreground mt-1 truncate font-mono text-[11px]">
                    {f.file_path}:{f.line_number || 1}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <span className="border-border/80 bg-secondary/40 text-foreground rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold">
                    +{f.risk_contribution}
                  </span>
                  <span className="text-muted-foreground font-mono text-[11px]">
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setSelectedFinding(null)}
        >
          <div
            className="border-border/80 bg-card max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg border p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase ${
                      selectedFinding.severity === "CRITICAL"
                        ? "border border-red-500/30 bg-red-500/10 text-red-400"
                        : selectedFinding.severity === "HIGH"
                          ? "border border-orange-500/30 bg-orange-500/10 text-orange-400"
                          : "border border-amber-500/30 bg-amber-500/10 text-amber-400"
                    }`}
                  >
                    {selectedFinding.severity}
                  </span>
                  <h3 className="text-foreground text-sm font-semibold">{selectedFinding.title}</h3>
                </div>
                <p className="text-muted-foreground mt-1 font-mono text-xs">
                  {selectedFinding.file_path}:{selectedFinding.line_number || 1}
                </p>
              </div>

              <button
                onClick={() => setSelectedFinding(null)}
                className="text-muted-foreground hover:bg-secondary hover:text-foreground rounded p-1 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <div className="text-muted-foreground font-mono text-[10px] font-semibold uppercase tracking-wider">
                  Why It Matters
                </div>
                <p className="text-foreground mt-1 text-xs leading-relaxed">
                  {selectedFinding.why || selectedFinding.description}
                </p>
              </div>

              <div>
                <div className="text-muted-foreground font-mono text-[10px] font-semibold uppercase tracking-wider">
                  Redacted Evidence (Secret-Safe)
                </div>
                <pre className="border-border/80 bg-background/90 text-muted-foreground mt-1 overflow-x-auto rounded-md border p-2.5 font-mono text-xs">
                  {selectedFinding.redacted_evidence}
                </pre>
              </div>

              {/* ML Provenance & Truth Boundary */}
              <div className="border-border/80 bg-secondary/20 rounded-md border p-3">
                <div className="text-muted-foreground mb-2 font-mono text-[10px] font-semibold uppercase tracking-wider">
                  Detection Provenance & ML Intelligence
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Detection Engine:</span>{" "}
                    <span className="text-foreground font-mono font-bold uppercase">
                      {selectedFinding.detection_source || "deterministic"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Truth Boundary:</span>{" "}
                    <span className="text-foreground font-mono font-bold">
                      {selectedFinding.truth_state || "OBSERVED"}
                    </span>
                  </div>
                  {selectedFinding.ml_model && (
                    <div>
                      <span className="text-muted-foreground">Model:</span>{" "}
                      <span className="text-foreground font-mono">
                        {selectedFinding.ml_model} (v{selectedFinding.ml_version || "1.0.0"})
                      </span>
                    </div>
                  )}
                  {selectedFinding.ml_confidence !== undefined &&
                    selectedFinding.ml_confidence !== null && (
                      <div>
                        <span className="text-muted-foreground">ML Probability:</span>{" "}
                        <span className="text-foreground font-mono font-bold">
                          {(selectedFinding.ml_confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    )}
                  {selectedFinding.ml_classification && (
                    <div className="col-span-2 mt-1">
                      <span className="text-muted-foreground">ML Classification:</span>{" "}
                      <span className="text-foreground font-mono font-semibold">
                        {selectedFinding.ml_classification}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="text-muted-foreground font-mono text-[10px] font-semibold uppercase tracking-wider">
                  Remediation Guidance
                </div>

                <div className="border-border/80 bg-secondary/30 text-foreground mt-1 flex items-start gap-2 rounded-md border p-2.5 text-xs leading-relaxed">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  <div>{selectedFinding.remediation}</div>
                </div>
              </div>

              <div className="border-border/60 grid grid-cols-2 gap-4 border-t pt-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Rule ID:</span>{" "}
                  <span className="text-foreground font-mono font-semibold">
                    {selectedFinding.rule_id}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Risk Contribution:</span>{" "}
                  <span className="text-foreground font-mono font-bold">
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
