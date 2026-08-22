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
import { Badge } from "@vibepulse/ui";
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
    <div className="animate-fade-in-up bg-background text-foreground flex flex-1 flex-col space-y-6 p-6 md:p-8">
      {/* ── BREADCRUMB HEADER ─────────────────────────────────────────────────── */}
      <div>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Breadcrumbs
            items={[
              { label: "Projects", to: "/projects" },
              { label: "Project Story", to: `/projects/${projectId}` },
              { label: "Predictive Intelligence" },
            ]}
          />
          <Link
            to={`/projects/${projectId}`}
            className="text-secondary-text hover:text-primary-text inline-flex items-center gap-1.5 text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Project Story
          </Link>
        </div>

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-primary-text flex items-center gap-2 text-2xl font-extrabold tracking-tight md:text-3xl">
                <BrainCircuit className="h-7 w-7 text-indigo-400" />
                Predictive Engineering Center
              </h1>
              <Badge
                variant="outline"
                className="border-indigo-500/40 font-mono text-xs text-indigo-300"
              >
                EVIDENCE-BACKED FORECASTING
              </Badge>
            </div>
            <p className="text-secondary-text mt-1 text-xs md:text-sm">
              Deterministic, evidence-backed forecasts derived strictly from observed project
              telemetry and engineering patterns.
            </p>
          </div>

          {/* Global actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => refreshMutation.mutate()}
              disabled={refreshMutation.isPending}
              className="bg-card hover:bg-card-subtle border-border text-primary-text inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold shadow-sm transition disabled:opacity-50"
            >
              <RotateCcw
                className={`h-3.5 w-3.5 ${refreshMutation.isPending ? "animate-spin text-indigo-400" : ""}`}
              />
              Recalculate Projections
            </button>
          </div>
        </div>
      </div>

      {/* ── METRIC OVERVIEW CARDS ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-card border-border rounded-xl border p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-secondary-text text-[10px] font-bold uppercase tracking-wider">
              FORECAST SIGNALS
            </span>
            <Sparkles className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-primary-text mt-2 flex items-baseline gap-2 font-mono text-2xl font-black">
            {summary.total_predictions}
            <span className="text-xs font-semibold text-amber-400">
              ({summary.critical_count} Critical, {summary.high_count} High)
            </span>
          </div>
        </div>

        <div className="bg-card border-border rounded-xl border p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-secondary-text text-[10px] font-bold uppercase tracking-wider">
              ACTIVE HOTSPOTS
            </span>
            <Flame className="h-4 w-4 text-rose-400" />
          </div>
          <div className="mt-2 font-mono text-2xl font-black text-rose-400">
            {summary.active_hotspots_count}
          </div>
        </div>

        <div className="bg-card border-border rounded-xl border p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-secondary-text text-[10px] font-bold uppercase tracking-wider">
              RECURRING RISKS
            </span>
            <TrendingUp className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 font-mono text-2xl font-black text-amber-400">
            {summary.recurring_risks_count}
          </div>
        </div>

        <div className="bg-card border-border rounded-xl border p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-secondary-text text-[10px] font-bold uppercase tracking-wider">
              CURRENT FOCUS
            </span>
            <Compass className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-primary-text mt-2 truncate font-mono text-base font-bold text-emerald-400">
            {summary.engineering_drift.current_focus}
          </div>
        </div>
      </div>

      {/* ── INSUFFICIENT EVIDENCE STATE OR FORECAST CENTER ──────────────────── */}
      {isInsufficient ? (
        <div className="bg-card border-border rounded-xl border border-dashed p-12 text-center">
          <HelpCircle className="text-accent-color/80 mx-auto mb-3 h-10 w-10" />
          <h3 className="text-primary-text text-base font-bold">
            Insufficient Historical Telemetry
          </h3>
          <p className="text-secondary-text mx-auto mt-1 max-w-md text-xs">
            {summary.status_message}
          </p>
          <div className="bg-card-subtle border-border text-secondary-text mt-4 inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs">
            <span>Minimum requirements:</span>
            <Badge variant="outline" className="text-primary-text text-[10px]">
              2+ telemetry events or recorded sessions
            </Badge>
          </div>
        </div>
      ) : (
        <>
          {/* ── "WHAT SHOULD WE WATCH NEXT?" HERO SECTION ────────────────────── */}
          <div className="space-y-4 rounded-xl border border-gray-800 bg-gradient-to-r from-gray-900 via-gray-900 to-indigo-950/20 p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-800/80 pb-3">
              <div>
                <h2 className="flex items-center gap-2 text-base font-bold uppercase tracking-wider text-white">
                  <Sparkles className="h-4 w-4 text-indigo-400" />
                  What Should We Watch Next?
                </h2>
                <p className="text-xs text-gray-400">
                  Highest-strength evidence forecasts projected from repository history.
                </p>
              </div>
              <Badge variant="outline" className="border-indigo-500/40 text-xs text-indigo-300">
                FORECAST STRENGTH RANKED
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {(summary.forecast_signals || []).map((sig) => (
                <div
                  key={sig.prediction_id}
                  className="space-y-3 rounded-lg border border-gray-800 bg-gray-950/90 p-4 transition hover:border-gray-700"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`font-mono text-[10px] font-bold ${
                            sig.severity === "CRITICAL"
                              ? "border-red-500 bg-red-950/30 text-red-400"
                              : sig.severity === "HIGH"
                                ? "border-amber-500 bg-amber-950/30 text-amber-400"
                                : "border-blue-500 text-blue-400"
                          }`}
                        >
                          {sig.severity} SEVERITY
                        </Badge>
                        <Badge
                          variant="outline"
                          className="border-gray-700 font-mono text-[10px] text-gray-300"
                        >
                          {sig.time_horizon}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="border-emerald-500/40 text-[10px] text-emerald-400"
                        >
                          {sig.evidence_strength} EVIDENCE
                        </Badge>
                      </div>
                      <h3 className="text-sm font-bold text-white">{sig.title}</h3>
                    </div>

                    {/* Forecast Score Gauge */}
                    <div className="text-right">
                      <div className="font-mono text-xl font-black text-indigo-400">
                        {sig.forecast_score}
                        <span className="text-xs text-gray-500">/100</span>
                      </div>
                      <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500">
                        FORECAST STRENGTH
                      </div>
                    </div>
                  </div>

                  <p className="text-xs leading-relaxed text-gray-300">{sig.summary}</p>

                  {/* Contributing Signals */}
                  <div className="space-y-1 rounded border border-gray-800/60 bg-gray-900/50 p-2.5 text-xs">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      OBSERVED HISTORICAL SIGNALS
                    </div>
                    {sig.contributing_signals.map((cs, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 text-[11px] text-gray-300">
                        <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-indigo-400" />
                        <span>{cs}</span>
                      </div>
                    ))}
                  </div>

                  {/* Recommended Action Box */}
                  <div className="rounded border border-indigo-900/40 bg-indigo-950/20 p-2.5 text-xs text-indigo-200">
                    <span className="font-bold text-indigo-300">Recommended Action: </span>
                    {sig.recommended_action}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between border-t border-gray-800/80 pt-2 text-xs">
                    <button
                      onClick={() => setSelectedSignal(sig)}
                      className="flex items-center gap-1 text-gray-400 transition hover:text-white"
                    >
                      <Search className="h-3 w-3" />
                      View Additive Evidence
                    </button>

                    <button
                      onClick={() => {
                        void navigate(`/projects/${projectId}/investigation`);
                      }}
                      className="flex items-center gap-1 rounded bg-indigo-600 px-3 py-1 font-semibold text-white transition hover:bg-indigo-500"
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
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Hotspots Map */}
            <div className="space-y-3 rounded-xl border border-gray-800 bg-gray-900/60 p-5 lg:col-span-6">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white">
                  <Flame className="h-4 w-4 text-rose-400" />
                  Engineering Hotspots
                </h3>
                <span className="text-[10px] text-gray-400">BY ACTIVITY & FINDINGS</span>
              </div>

              {!summary.hotspots || summary.hotspots.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-500">
                  No active hotspots detected.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {(summary.hotspots || []).map((h, i) => (
                    <div
                      key={i}
                      className="space-y-1.5 rounded-lg border border-gray-800 bg-gray-950 p-3 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-200">{h.subsystem}</span>
                        <Badge
                          variant="outline"
                          className={`font-mono text-[10px] ${
                            h.hotspot_score >= 60
                              ? "border-rose-500/40 text-rose-400"
                              : "border-gray-700 text-gray-300"
                          }`}
                        >
                          HOTSPOT SCORE: {h.hotspot_score}/100
                        </Badge>
                      </div>

                      {/* Score Progress Bar */}
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-rose-500"
                          style={{ width: `${h.hotspot_score}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-gray-400">
                        <span className="flex items-center gap-1 truncate font-mono">
                          <FileCode className="h-3 w-3 shrink-0 text-gray-500" />
                          {h.file_path}
                        </span>
                        <span>
                          {h.activity_count} events · {h.findings_count} findings
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Engineering DNA Focus Drift */}
            <div className="space-y-4 rounded-xl border border-gray-800 bg-gray-900/60 p-5 lg:col-span-6">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white">
                  <Compass className="h-4 w-4 text-emerald-400" />
                  Engineering DNA Focus Drift
                </h3>
                <Badge variant="outline" className="border-gray-700 text-[10px] text-gray-400">
                  OBSERVED EVOLUTION
                </Badge>
              </div>

              <div className="space-y-3 rounded-lg border border-gray-800 bg-gray-950 p-4">
                {/* Visual Drift Progression Flow */}
                <div className="flex flex-col items-stretch justify-between gap-2 sm:flex-row sm:items-center">
                  <div className="rounded border border-gray-800 bg-gray-900 p-2 text-center sm:flex-1">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-500">
                      PREVIOUS FOCUS
                    </span>
                    <span className="font-mono text-xs font-semibold text-gray-300">
                      {summary.engineering_drift.previous_focus}
                    </span>
                  </div>

                  <ArrowRight className="mx-auto hidden h-4 w-4 shrink-0 text-gray-600 sm:block" />

                  <div className="rounded border border-indigo-500/40 bg-indigo-950/40 p-2 text-center sm:flex-1">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-indigo-400">
                      CURRENT FOCUS
                    </span>
                    <span className="font-mono text-xs font-bold text-indigo-200">
                      {summary.engineering_drift.current_focus}
                    </span>
                  </div>

                  <ArrowRight className="mx-auto hidden h-4 w-4 shrink-0 text-gray-600 sm:block" />

                  <div className="rounded border border-emerald-500/40 bg-emerald-950/40 p-2 text-center sm:flex-1">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                      EMERGING FOCUS
                    </span>
                    <span className="font-mono text-xs font-bold text-emerald-200">
                      {summary.engineering_drift.emerging_focus}
                    </span>
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-gray-300">
                  {summary.engineering_drift.drift_explanation}
                </p>
              </div>

              {/* Recurring Risks Summary */}
              {(summary.recurring_risks || []).length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    RECURRING ENGINEERING RISKS
                  </div>
                  <div className="space-y-1.5">
                    {(summary.recurring_risks || []).map((r, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded border border-gray-800 bg-gray-950 p-2.5 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-400">{r.rule_id}</span>
                          <span className="text-gray-300">{r.title}</span>
                        </div>
                        <span className="rounded bg-gray-800 px-2 py-0.5 font-mono text-[10px] text-gray-300">
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
            <div className="space-y-3 rounded-xl border border-gray-800 bg-gray-900/60 p-5">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white">
                  <BarChart3 className="h-4 w-4 text-indigo-400" />
                  Historical Activity & Finding Trends
                </h3>
                <span className="font-mono text-xs text-gray-400">ROLLING 7 DAYS</span>
              </div>

              <div className="grid grid-cols-7 gap-2 pt-2">
                {(summary.trends || []).map((t, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col items-center rounded border border-gray-800 bg-gray-950 p-3 text-center"
                  >
                    <span className="text-[10px] text-gray-500">{t.date_label}</span>
                    <span className="mt-1 font-mono text-base font-bold text-white">
                      {t.event_count}
                    </span>
                    <span className="text-[9px] uppercase text-gray-500">Events</span>

                    {t.finding_count > 0 && (
                      <span className="mt-1 rounded border border-red-900/50 bg-red-950/60 px-1 font-mono text-[10px] text-red-400">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg space-y-4 rounded-xl border border-gray-800 bg-gray-900 p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-base font-bold text-white">{selectedSignal.title}</h3>
              <Badge variant="outline" className="border-indigo-500/40 text-xs text-indigo-300">
                PROVENANCE: {selectedSignal.provenance}
              </Badge>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  ADDITIVE SCORE EXPLANATION ({selectedSignal.forecast_score}/100)
                </span>
                <div className="mt-1.5 space-y-1 rounded border border-gray-800 bg-gray-950 p-2.5">
                  {selectedSignal.score_breakdown.explanation.map((exp, i) => (
                    <div key={i} className="font-mono text-gray-300">
                      &bull; {exp}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  AFFECTED REPOSITORY FILES
                </span>
                <div className="mt-1 max-h-24 overflow-y-auto rounded border border-gray-800 bg-gray-950 p-2 font-mono text-gray-300">
                  {selectedSignal.affected_files.map((f, i) => (
                    <div key={i}>&bull; {f}</div>
                  ))}
                </div>
              </div>

              <div className="rounded border border-indigo-900/40 bg-indigo-950/20 p-2.5 text-indigo-200">
                <span className="font-bold text-indigo-300">Recommended Next Step: </span>
                {selectedSignal.recommended_action}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-800 pt-3">
              <button
                onClick={() => setSelectedSignal(null)}
                className="rounded px-4 py-1.5 text-xs text-gray-400 transition hover:bg-gray-800 hover:text-white"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSelectedSignal(null);
                  void navigate(`/projects/${projectId}/investigation`);
                }}
                className="rounded bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-500"
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
