import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ShieldCheck,
  Zap,
  CheckCircle2,
  TrendingUp,
  AlertOctagon,
  ArrowRight,
  RotateCcw,
  Sparkles,
  HelpCircle,
  HelpCircle as WhyIcon,
} from "lucide-react";
import { Badge } from "@vibepulse/ui";
import {
  useProjectHealth,
  useRefreshProjectHealth,
  type HealthDimension,
} from "./useProjectHealth";
import { EvidenceInspector } from "../evidence/EvidenceInspector";
import type { EntityType } from "../evidence/types";

function getGradeBadgeColor(grade: string) {
  switch (grade) {
    case "EXCELLENT":
      return "border-emerald-500/40 bg-emerald-950/40 text-emerald-300";
    case "HEALTHY":
      return "border-blue-500/40 bg-blue-950/40 text-blue-300";
    case "NEEDS_ATTENTION":
      return "border-amber-500/40 bg-amber-950/40 text-amber-300";
    case "DEGRADED":
      return "border-orange-500/40 bg-orange-950/40 text-orange-300";
    case "CRITICAL":
      return "border-red-500/40 bg-red-950/40 text-red-300";
    default:
      return "border-gray-700 bg-gray-900 text-gray-400";
  }
}

function getDimensionIcon(key: string) {
  switch (key) {
    case "security_health":
      return <ShieldCheck className="h-4 w-4 text-indigo-400" />;
    case "engineering_stability":
      return <Zap className="h-4 w-4 text-emerald-400" />;
    case "incident_health":
      return <AlertOctagon className="h-4 w-4 text-rose-400" />;
    case "resolution_health":
      return <CheckCircle2 className="h-4 w-4 text-blue-400" />;
    case "predictive_risk_health":
      return <TrendingUp className="h-4 w-4 text-purple-400" />;
    default:
      return <Activity className="h-4 w-4 text-gray-400" />;
  }
}

export function ProjectHealthScorecard({ projectId }: { projectId: string }) {
  const navigate = useNavigate();
  const { data: health, isLoading, isError } = useProjectHealth(projectId);
  const refreshMutation = useRefreshProjectHealth(projectId);

  // Evidence Inspector Modal State
  const [inspectTarget, setInspectTarget] = useState<{
    type: EntityType;
    id: string;
  } | null>(null);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-950/80 p-6 text-center text-xs text-gray-400">
        <Activity className="mx-auto mb-2 h-6 w-6 animate-pulse text-indigo-400" />
        Synthesizing Unified Project Health & Intelligence...
      </div>
    );
  }

  if (isError || !health) {
    return null;
  }

  const isInsufficient = health.status === "INSUFFICIENT_EVIDENCE";
  const dimensions: HealthDimension[] = [
    health.security_health,
    health.engineering_stability,
    health.incident_health,
    health.resolution_health,
    health.predictive_risk_health,
  ];

  return (
    <div className="space-y-6 rounded-2xl border border-gray-800/80 bg-gradient-to-b from-gray-900/90 to-gray-950 p-6 shadow-2xl">
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col justify-between gap-4 border-b border-gray-800/80 pb-5 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="flex items-center gap-2 text-xl font-black tracking-tight text-white">
              <Activity className="h-5 w-5 text-indigo-400" />
              Unified Project Health
            </h2>
            <Badge
              variant="outline"
              className={`font-mono text-xs font-bold ${getGradeBadgeColor(health.grade)}`}
            >
              {health.grade}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-gray-400">{health.status_message}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setInspectTarget({ type: "health", id: "overall" })}
            className="inline-flex items-center gap-1.5 rounded-md border border-indigo-500/40 bg-indigo-950/40 px-3 py-1.5 text-xs font-bold text-indigo-300 transition hover:bg-indigo-900/50"
          >
            <WhyIcon className="h-3.5 w-3.5" />
            Why This Score?
          </button>
          <button
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-700 bg-gray-800/80 px-3 py-1.5 text-xs font-medium text-gray-200 transition hover:bg-gray-700 disabled:opacity-50"
          >
            <RotateCcw
              className={`h-3.5 w-3.5 ${refreshMutation.isPending ? "animate-spin text-indigo-400" : ""}`}
            />
            Recalculate Health
          </button>
        </div>
      </div>

      {isInsufficient ? (
        <div className="rounded-xl border border-dashed border-gray-800 bg-gray-900/30 p-8 text-center">
          <HelpCircle className="mx-auto mb-2 h-8 w-8 text-indigo-400/70" />
          <h3 className="text-sm font-bold text-white">Baseline Telemetry Ingestion Active</h3>
          <p className="mt-1 text-xs text-gray-400">
            Record development sessions to establish the empirical health baseline.
          </p>
        </div>
      ) : (
        <>
          {/* ── OVERALL HEALTH GAUGE & FIVE DIMENSIONS ────────────────────────── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Health Score Main Dial */}
            <div className="flex flex-col items-center justify-center rounded-xl border border-gray-800 bg-gray-950/70 p-6 text-center lg:col-span-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                OVERALL COMPOSITE SCORE
              </span>
              <div className="my-3 font-mono text-5xl font-black tracking-tight text-white">
                {health.overall_health_score}
                <span className="text-lg font-normal text-gray-500">/100</span>
              </div>
              <div className="w-full space-y-2">
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 transition-all duration-500"
                    style={{ width: `${health.overall_health_score ?? 0}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] font-semibold text-gray-500">
                  <span>0 CRITICAL</span>
                  <span>60 ATTENTION</span>
                  <span>100 EXCELLENT</span>
                </div>
              </div>
            </div>

            {/* 5-Dimensional Health Grid */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:col-span-8">
              {dimensions.map((dim) => (
                <div
                  key={dim.dimension_key}
                  className="space-y-1.5 rounded-lg border border-gray-800/80 bg-gray-950/60 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {getDimensionIcon(dim.dimension_key)}
                      <span className="text-xs font-bold text-gray-200">{dim.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black text-indigo-300">
                        {dim.score}/100
                      </span>
                    </div>
                  </div>

                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                      style={{ width: `${dim.score}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-gray-400">
                    <span className="max-w-[200px] truncate" title={dim.explanation}>
                      {dim.explanation}
                    </span>
                    <button
                      onClick={() => setInspectTarget({ type: "health", id: dim.dimension_key })}
                      className="shrink-0 font-bold text-indigo-400 hover:text-indigo-300"
                    >
                      Why?
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── "WHAT SHOULD I DO NEXT?" PRIORITY ACTION CENTER ───────────────── */}
          {health.top_priorities.length > 0 && (
            <div className="space-y-3 border-t border-gray-800/80 pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
                    <Sparkles className="h-4 w-4 text-indigo-400" />
                    What Should I Do Next?
                  </h3>
                  <p className="text-xs text-gray-400">
                    Ranked actionable engineering priorities synthesized from incidents, findings,
                    and forecasts.
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="border-indigo-500/30 text-[10px] text-indigo-300"
                >
                  DETERMINISTIC RANKING
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {health.top_priorities.map((item) => (
                  <div
                    key={item.priority_id}
                    className="space-y-2.5 rounded-lg border border-gray-800 bg-gray-950 p-4 transition hover:border-gray-700"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="rounded border border-indigo-800/60 bg-indigo-950/80 px-1.5 py-0.5 font-mono text-[10px] font-bold text-indigo-400">
                            #{item.rank}
                          </span>
                          <Badge
                            variant="outline"
                            className={`font-mono text-[9px] font-bold ${
                              item.severity === "CRITICAL"
                                ? "border-red-500/50 text-red-400"
                                : item.severity === "HIGH"
                                  ? "border-amber-500/50 text-amber-400"
                                  : "border-blue-500/50 text-blue-400"
                            }`}
                          >
                            {item.severity}
                          </Badge>
                          <span className="text-[10px] font-semibold text-gray-400">
                            {item.category.replace("_", " ")}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-white">{item.title}</h4>
                      </div>

                      <span className="font-mono text-xs font-bold text-indigo-400">
                        {item.priority_score}pt
                      </span>
                    </div>

                    <p className="text-xs text-gray-300">{item.why_ranked_highly}</p>

                    <div className="rounded border border-indigo-950 bg-indigo-950/30 p-2 text-xs text-indigo-200">
                      <span className="font-semibold text-indigo-300">Next Step: </span>
                      {item.recommended_action}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => setInspectTarget({ type: "priority", id: item.priority_id })}
                        className="text-xs font-bold text-indigo-400 hover:text-indigo-300"
                      >
                        Why is this #{item.rank}?
                      </button>

                      {item.deep_link_url && (
                        <button
                          onClick={() => {
                            if (item.deep_link_url) {
                              void navigate(item.deep_link_url);
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded bg-indigo-600/90 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-indigo-600"
                        >
                          Take Action
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── EVIDENCE INSPECTOR MODAL ────────────────────────────────────────── */}
      {inspectTarget && (
        <EvidenceInspector
          projectId={projectId}
          entityType={inspectTarget.type}
          entityId={inspectTarget.id}
          onClose={() => setInspectTarget(null)}
        />
      )}
    </div>
  );
}
