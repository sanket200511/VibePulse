import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  BrainCircuit,
  TrendingUp,
  Flame,
  AlertTriangle,
  Compass,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Search,
  FileCode,
  RotateCcw,
  BarChart3,
  HelpCircle,
} from "lucide-react";
import { Badge } from "@depradar/ui";
import { Breadcrumbs } from "../../components/layout/Breadcrumbs";
import {
  usePredictiveSummary,
  useRefreshPredictions,
  type PredictiveSignal,
} from "./usePredictions";
import { LoadingState } from "../../components/states";

export function PredictionsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [selectedSignal, setSelectedSignal] = useState<PredictiveSignal | null>(null);

  const { data: summary, isLoading, isError } = usePredictiveSummary(projectId);
  const refreshMutation = useRefreshPredictions(projectId);

  if (isLoading) {
    return <LoadingState label="Projecting evidence-backed engineering intelligence..." />;
  }

  if (isError || !summary) {
    return (
      <div className="bg-background text-foreground flex flex-1 flex-col items-center justify-center p-8 text-center text-rose-400">
        <AlertTriangle className="mb-4 h-12 w-12" />
        <h2 className="text-xl font-bold">Predictive Intelligence Offline</h2>
        <p className="text-secondary-text mt-2 text-sm">
          Failed to query historical predictive telemetry for this project.
        </p>
      </div>
    );
  }

  const isInsufficient = summary.status === "INSUFFICIENT_EVIDENCE";

  return (
    <div className="animate-fade-in-up text-foreground mx-auto flex w-full max-w-[1400px] flex-1 flex-col space-y-6 px-4 py-4 sm:px-6 md:py-6">
      {/* ── BREADCRUMB HEADER ─────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Breadcrumbs
            items={[
              { label: "Projects", to: "/projects" },
              { label: "Project Story", to: `/projects/${projectId}` },
              { label: "Predictive Intelligence" },
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

        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-foreground flex items-center gap-2 text-xl font-bold tracking-tight">
                <BrainCircuit className="text-primary h-5 w-5" />
                Predictive Engineering Center
              </h1>
              <Badge
                variant="outline"
                className="border-border/80 bg-secondary/30 text-muted-foreground font-mono text-[10px]"
              >
                EVIDENCE-BACKED FORECASTING
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Deterministic, evidence-backed forecasts derived strictly from observed project
              telemetry and engineering patterns.
            </p>
          </div>

          {/* Global actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => refreshMutation.mutate()}
              disabled={refreshMutation.isPending}
              className="border-border/80 bg-secondary/40 text-foreground hover:bg-secondary inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium shadow-sm transition-colors disabled:opacity-50"
            >
              <RotateCcw
                className={`h-3.5 w-3.5 ${refreshMutation.isPending ? "text-primary animate-spin" : ""}`}
              />
              Recalculate Projections
            </button>
          </div>
        </div>
      </div>

      {/* ── METRIC OVERVIEW CARDS ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border-border/80 bg-card/60 rounded-lg border p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground font-mono text-[10px] font-semibold uppercase tracking-wider">
              FORECAST SIGNALS
            </span>
            <Sparkles className="text-primary h-3.5 w-3.5" />
          </div>
          <div className="text-foreground mt-1 flex items-baseline gap-2 font-mono text-2xl font-bold tabular-nums">
            {summary.total_predictions}
            <span className="text-[11px] font-medium text-amber-400">
              ({summary.critical_count} Crit, {summary.high_count} High)
            </span>
          </div>
        </div>

        <div className="border-border/80 bg-card/60 rounded-lg border p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground font-mono text-[10px] font-semibold uppercase tracking-wider">
              ACTIVE HOTSPOTS
            </span>
            <Flame className="h-3.5 w-3.5 text-rose-400" />
          </div>
          <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-rose-400">
            {summary.active_hotspots_count}
          </div>
        </div>

        <div className="border-border/80 bg-card/60 rounded-lg border p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground font-mono text-[10px] font-semibold uppercase tracking-wider">
              RECURRING RISKS
            </span>
            <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-amber-400">
            {summary.recurring_risks_count}
          </div>
        </div>

        <div className="border-border/80 bg-card/60 rounded-lg border p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground font-mono text-[10px] font-semibold uppercase tracking-wider">
              CURRENT FOCUS
            </span>
            <Compass className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="mt-1 truncate font-mono text-sm font-semibold text-emerald-400">
            {summary.engineering_drift.current_focus}
          </div>
        </div>
      </div>

      {/* ── INSUFFICIENT EVIDENCE STATE OR FORECAST CENTER ──────────────────── */}
      {isInsufficient ? (
        <div className="border-border/80 bg-card/40 flex flex-col items-center justify-center rounded-lg border border-dashed p-10 text-center">
          <HelpCircle className="text-muted-foreground/60 mx-auto mb-3 h-8 w-8" />
          <h3 className="text-foreground text-sm font-semibold">
            Insufficient Historical Telemetry
          </h3>
          <p className="text-muted-foreground mx-auto mt-1 max-w-md text-xs leading-relaxed">
            {summary.status_message}
          </p>
          <div className="border-border/80 bg-secondary/30 text-muted-foreground mt-3 inline-flex items-center gap-2 rounded-md border px-3 py-1 text-xs">
            <span>Minimum requirements:</span>
            <Badge
              variant="outline"
              className="border-border/60 text-foreground font-mono text-[10px]"
            >
              2+ telemetry events or recorded sessions
            </Badge>
          </div>
        </div>
      ) : (
        <>
          {/* ── "WHAT SHOULD WE WATCH NEXT?" HERO SECTION ────────────────────── */}
          <div className="border-border/80 bg-card/60 space-y-3 rounded-lg border p-4">
            <div className="border-border/60 flex items-center justify-between border-b pb-2.5">
              <div>
                <h2 className="text-foreground flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
                  <Sparkles className="text-primary h-3.5 w-3.5" />
                  What Should We Watch Next?
                </h2>
                <p className="text-muted-foreground text-[11px]">
                  Highest-strength evidence forecasts projected from repository history.
                </p>
              </div>
              <Badge
                variant="outline"
                className="border-border/80 bg-secondary/30 text-muted-foreground font-mono text-[10px]"
              >
                FORECAST STRENGTH RANKED
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {(summary.forecast_signals || []).map((sig) => (
                <div
                  key={sig.prediction_id}
                  className="border-border/80 bg-card/40 hover:border-border hover:bg-secondary/10 space-y-2.5 rounded-md border p-3 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className={`font-mono text-[9px] font-bold ${
                            sig.severity === "CRITICAL"
                              ? "border-red-500/30 bg-red-500/10 text-red-400"
                              : sig.severity === "HIGH"
                                ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                                : "border-blue-500/30 bg-blue-500/10 text-blue-400"
                          }`}
                        >
                          {sig.severity} SEVERITY
                        </Badge>
                        <Badge
                          variant="outline"
                          className="border-border/60 text-muted-foreground font-mono text-[9px]"
                        >
                          {sig.time_horizon}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="border-emerald-500/30 font-mono text-[9px] text-emerald-400"
                        >
                          {sig.evidence_strength} EVIDENCE
                        </Badge>
                      </div>
                      <h3 className="text-foreground text-xs font-semibold">{sig.title}</h3>
                    </div>

                    {/* Forecast Score Gauge */}
                    <div className="text-right">
                      <div className="text-primary font-mono text-lg font-bold tabular-nums">
                        {sig.forecast_score}
                        <span className="text-muted-foreground text-[10px]">/100</span>
                      </div>
                      <div className="text-muted-foreground font-mono text-[8px] font-semibold uppercase tracking-wider">
                        FORECAST STRENGTH
                      </div>
                    </div>
                  </div>

                  <p className="text-muted-foreground text-xs leading-relaxed">{sig.summary}</p>

                  {/* Contributing Signals */}
                  <div className="border-border/60 bg-secondary/20 space-y-1 rounded border p-2 text-xs">
                    <div className="text-muted-foreground font-mono text-[9px] font-semibold uppercase tracking-wider">
                      OBSERVED HISTORICAL SIGNALS
                    </div>
                    {sig.contributing_signals.map((cs, idx) => (
                      <div
                        key={idx}
                        className="text-foreground flex items-start gap-1.5 text-[11px]"
                      >
                        <CheckCircle2 className="text-primary mt-0.5 h-3 w-3 shrink-0" />
                        <span>{cs}</span>
                      </div>
                    ))}
                  </div>

                  {/* Recommended Action Box */}
                  <div className="border-border/60 bg-secondary/30 text-foreground rounded border p-2 text-xs">
                    <span className="text-primary font-semibold">Recommended Action: </span>
                    <span className="text-muted-foreground">{sig.recommended_action}</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="border-border/60 flex items-center justify-between border-t pt-2 text-xs">
                    <button
                      onClick={() => setSelectedSignal(sig)}
                      className="text-muted-foreground hover:text-foreground flex items-center gap-1 font-mono text-[11px] transition-colors"
                    >
                      <Search className="h-3 w-3" />
                      View Additive Evidence
                    </button>

                    <button
                      onClick={() => {
                        const targetId = sig.investigation_incident_id;
                        if (targetId) {
                          void navigate(
                            `/projects/${projectId}/investigation?incidentId=${encodeURIComponent(targetId)}`,
                          );
                        } else if (sig.affected_files?.[0]) {
                          void navigate(
                            `/projects/${projectId}/investigation?q=${encodeURIComponent(sig.affected_files[0])}`,
                          );
                        } else {
                          void navigate(`/projects/${projectId}/investigation`);
                        }
                      }}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
                    >
                      Investigate Incident
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── HOTSPOTS & ENGINEERING FOCUS DRIFT ────────────────────────────── */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Hotspots Map */}
            <div className="border-border/80 bg-card/60 space-y-3 rounded-lg border p-4 lg:col-span-6">
              <div className="flex items-center justify-between">
                <h3 className="text-foreground flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
                  <Flame className="h-3.5 w-3.5 text-rose-400" />
                  Engineering Hotspots
                </h3>
                <span className="text-muted-foreground font-mono text-[10px]">
                  BY ACTIVITY & FINDINGS
                </span>
              </div>

              {!summary.hotspots || summary.hotspots.length === 0 ? (
                <div className="text-muted-foreground p-4 text-center text-xs">
                  No active hotspots detected.
                </div>
              ) : (
                <div className="space-y-2">
                  {(summary.hotspots || []).map((h, i) => (
                    <div
                      key={i}
                      className="border-border/60 bg-card/40 space-y-1.5 rounded-md border p-2.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-foreground font-medium">{h.subsystem}</span>
                        <Badge
                          variant="outline"
                          className={`font-mono text-[9px] ${
                            h.hotspot_score >= 60
                              ? "border-rose-500/30 text-rose-400"
                              : "border-border/60 text-muted-foreground"
                          }`}
                        >
                          SCORE: {h.hotspot_score}/100
                        </Badge>
                      </div>

                      {/* Score Progress Bar */}
                      <div className="bg-secondary/40 h-1.5 w-full overflow-hidden rounded">
                        <div
                          className="from-primary h-full bg-gradient-to-r to-rose-500"
                          style={{ width: `${h.hotspot_score}%` }}
                        />
                      </div>

                      <div className="text-muted-foreground flex items-center justify-between font-mono text-[10px]">
                        <span className="flex items-center gap-1 truncate">
                          <FileCode className="text-muted-foreground h-3 w-3 shrink-0" />
                          {h.file_path}
                        </span>
                        <span className="tabular-nums">
                          {h.activity_count} events · {h.findings_count} findings
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Engineering DNA Focus Drift */}
            <div className="border-border/80 bg-card/60 space-y-3 rounded-lg border p-4 lg:col-span-6">
              <div className="flex items-center justify-between">
                <h3 className="text-foreground flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
                  <Compass className="h-3.5 w-3.5 text-emerald-400" />
                  Engineering DNA Focus Drift
                </h3>
                <Badge
                  variant="outline"
                  className="border-border/60 text-muted-foreground font-mono text-[10px]"
                >
                  OBSERVED EVOLUTION
                </Badge>
              </div>

              <div className="border-border/60 bg-secondary/20 space-y-3 rounded-md border p-3">
                {/* Visual Drift Progression Flow */}
                <div className="flex flex-col items-stretch justify-between gap-2 sm:flex-row sm:items-center">
                  <div className="border-border/80 bg-background/80 rounded border p-2 text-center sm:flex-1">
                    <span className="text-muted-foreground block font-mono text-[9px] font-semibold uppercase tracking-wider">
                      PREVIOUS FOCUS
                    </span>
                    <span className="text-foreground font-mono text-xs font-medium">
                      {summary.engineering_drift.previous_focus}
                    </span>
                  </div>

                  <ArrowRight className="text-muted-foreground mx-auto hidden h-3.5 w-3.5 shrink-0 sm:block" />

                  <div className="border-primary/40 bg-primary/10 rounded border p-2 text-center sm:flex-1">
                    <span className="text-primary block font-mono text-[9px] font-semibold uppercase tracking-wider">
                      CURRENT FOCUS
                    </span>
                    <span className="text-foreground font-mono text-xs font-bold">
                      {summary.engineering_drift.current_focus}
                    </span>
                  </div>

                  <ArrowRight className="text-muted-foreground mx-auto hidden h-3.5 w-3.5 shrink-0 sm:block" />

                  <div className="rounded border border-emerald-500/40 bg-emerald-500/10 p-2 text-center sm:flex-1">
                    <span className="block font-mono text-[9px] font-semibold uppercase tracking-wider text-emerald-400">
                      EMERGING FOCUS
                    </span>
                    <span className="text-foreground font-mono text-xs font-bold">
                      {summary.engineering_drift.emerging_focus}
                    </span>
                  </div>
                </div>

                <p className="text-muted-foreground text-xs leading-relaxed">
                  {summary.engineering_drift.drift_explanation}
                </p>
              </div>

              {/* Recurring Risks Summary */}
              {(summary.recurring_risks || []).length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-muted-foreground font-mono text-[10px] font-semibold uppercase tracking-wider">
                    RECURRING ENGINEERING RISKS
                  </div>
                  <div className="space-y-1">
                    {(summary.recurring_risks || []).map((r, idx) => (
                      <div
                        key={idx}
                        className="border-border/60 bg-secondary/20 flex items-center justify-between rounded-md border p-2 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-400">{r.rule_id}</span>
                          <span className="text-foreground">{r.title}</span>
                        </div>
                        <span className="border-border/60 bg-secondary/40 text-muted-foreground rounded border px-1.5 py-0.5 font-mono text-[10px]">
                          {r.occurrence_count} occurrence(s)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── HISTORICAL TREND VISUALIZER (ROLLING 7 DAYS) ──────────────────── */}
          {(summary.trends || []).length > 0 && (
            <div className="border-border/80 bg-card/60 space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-foreground flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
                  <BarChart3 className="text-primary h-3.5 w-3.5" />
                  Historical Activity & Finding Trends
                </h3>
                <span className="text-muted-foreground font-mono text-[11px]">ROLLING 7 DAYS</span>
              </div>

              <div className="grid grid-cols-7 gap-2 pt-1">
                {(summary.trends || []).map((t, idx) => (
                  <div
                    key={idx}
                    className="border-border/60 bg-secondary/20 flex flex-col items-center rounded-md border p-2.5 text-center"
                  >
                    <span className="text-muted-foreground font-mono text-[10px]">
                      {t.date_label}
                    </span>
                    <span className="text-foreground mt-1 font-mono text-base font-bold tabular-nums">
                      {t.event_count}
                    </span>
                    <span className="text-muted-foreground font-mono text-[9px] uppercase">
                      Events
                    </span>

                    {t.finding_count > 0 && (
                      <span className="mt-1 rounded border border-red-500/30 bg-red-500/10 px-1 font-mono text-[10px] text-red-400">
                        +{t.finding_count} finding(s)
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── EVIDENCE INSPECTOR MODAL ────────────────────────────────────────── */}
      {selectedSignal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="border-border/80 bg-card w-full max-w-lg space-y-3 rounded-lg border p-4 shadow-xl">
            <div className="border-border/60 flex items-center justify-between border-b pb-2.5">
              <h3 className="text-foreground text-sm font-semibold">{selectedSignal.title}</h3>
              <Badge
                variant="outline"
                className="border-border/80 bg-secondary/30 text-muted-foreground font-mono text-[10px]"
              >
                PROVENANCE: {selectedSignal.provenance}
              </Badge>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-muted-foreground block font-mono text-[10px] font-semibold uppercase tracking-wider">
                  ADDITIVE SCORE EXPLANATION ({selectedSignal.forecast_score}/100)
                </span>
                <div className="border-border/80 bg-background/80 mt-1 space-y-1 rounded-md border p-2.5">
                  {selectedSignal.score_breakdown.explanation.map((exp, i) => (
                    <div key={i} className="text-muted-foreground font-mono">
                      &bull; {exp}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-muted-foreground block font-mono text-[10px] font-semibold uppercase tracking-wider">
                  AFFECTED REPOSITORY FILES
                </span>
                <div className="border-border/80 bg-background/80 text-muted-foreground mt-1 max-h-24 overflow-y-auto rounded-md border p-2 font-mono">
                  {selectedSignal.affected_files.map((f, i) => (
                    <div key={i}>&bull; {f}</div>
                  ))}
                </div>
              </div>

              <div className="border-border/60 bg-secondary/30 text-foreground rounded-md border p-2 text-xs">
                <span className="text-primary font-semibold">Recommended Next Step: </span>
                <span className="text-muted-foreground">{selectedSignal.recommended_action}</span>
              </div>
            </div>

            <div className="border-border/60 flex items-center justify-end gap-2 border-t pt-2.5">
              <button
                onClick={() => setSelectedSignal(null)}
                className="text-muted-foreground hover:bg-secondary/40 hover:text-foreground rounded-md px-3 py-1.5 text-xs transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const targetId = selectedSignal.investigation_incident_id;
                  const affFile = selectedSignal.affected_files?.[0];
                  setSelectedSignal(null);
                  if (targetId) {
                    void navigate(
                      `/projects/${projectId}/investigation?incidentId=${encodeURIComponent(targetId)}`,
                    );
                  } else if (affFile) {
                    void navigate(
                      `/projects/${projectId}/investigation?q=${encodeURIComponent(affFile)}`,
                    );
                  } else {
                    void navigate(`/projects/${projectId}/investigation`);
                  }
                }}
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors"
              >
                Open in Investigation Engine
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
