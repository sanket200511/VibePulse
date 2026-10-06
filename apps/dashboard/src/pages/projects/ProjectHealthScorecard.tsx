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
import { Badge } from "@depradar/ui";
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
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
    case "HEALTHY":
      return "border-primary/30 bg-primary/10 text-primary";
    case "NEEDS_ATTENTION":
      return "border-amber-500/30 bg-amber-500/10 text-amber-400";
    case "DEGRADED":
      return "border-orange-500/30 bg-orange-500/10 text-orange-400";
    case "CRITICAL":
      return "border-rose-500/30 bg-rose-500/10 text-rose-400";
    default:
      return "border-border/70 bg-secondary/40 text-muted-foreground";
  }
}

function getDimensionIcon(key: string) {
  switch (key) {
    case "security_health":
      return <ShieldCheck className="text-primary h-3.5 w-3.5" />;
    case "engineering_stability":
      return <Zap className="h-3.5 w-3.5 text-emerald-400" />;
    case "incident_health":
      return <AlertOctagon className="h-3.5 w-3.5 text-rose-400" />;
    case "resolution_health":
      return <CheckCircle2 className="h-3.5 w-3.5 text-sky-400" />;
    case "predictive_risk_health":
      return <TrendingUp className="h-3.5 w-3.5 text-purple-400" />;
    default:
      return <Activity className="text-muted-foreground h-3.5 w-3.5" />;
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
      <div className="border-border/80 bg-card/60 text-muted-foreground rounded-lg border p-5 text-center font-mono text-xs">
        <Activity className="text-primary mx-auto mb-2 h-5 w-5 animate-pulse" />
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
    <div className="border-border/80 bg-card/60 shadow-xs backdrop-blur-xs space-y-4 rounded-lg border p-4 sm:p-5">
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="border-border/60 flex flex-col justify-between gap-3 border-b pb-3.5 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-foreground flex items-center gap-1.5 text-sm font-semibold tracking-tight">
              <Activity className="text-primary h-4 w-4" />
              Unified Project Health
            </h2>
            <Badge
              variant="outline"
              className={`font-mono text-[10px] font-medium ${getGradeBadgeColor(health.grade)}`}
            >
              {health.grade}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-0.5 text-xs">{health.status_message}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setInspectTarget({ type: "health", id: "overall" })}
            className="border-primary/25 bg-primary/10 text-primary hover:bg-primary/20 inline-flex items-center gap-1 rounded-md border px-2.5 py-1 font-mono text-xs font-medium transition"
          >
            <WhyIcon className="h-3 w-3" />
            Why This Score?
          </button>
          <button
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
            className="border-border/70 bg-secondary/50 text-foreground hover:bg-secondary inline-flex items-center gap-1 rounded-md border px-2.5 py-1 font-mono text-xs font-medium transition disabled:opacity-50"
          >
            <RotateCcw
              className={`h-3 w-3 ${refreshMutation.isPending ? "text-primary animate-spin" : ""}`}
            />
            Recalculate
          </button>
        </div>
      </div>

      {isInsufficient ? (
        <div className="border-border/80 bg-card/40 rounded-lg border border-dashed p-6 text-center">
          <HelpCircle className="text-primary/70 mx-auto mb-2 h-6 w-6" />
          <h3 className="text-foreground text-xs font-semibold">
            Baseline Telemetry Ingestion Active
          </h3>
          <p className="text-muted-foreground mt-1 text-xs">
            Record development sessions to establish the empirical health baseline.
          </p>
        </div>
      ) : (
        <>
          {/* ── OVERALL HEALTH GAUGE & FIVE DIMENSIONS ────────────────────────── */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Health Score Main Dial */}
            <div className="border-border/70 bg-secondary/30 flex flex-col items-center justify-center rounded-md border p-4 text-center lg:col-span-4">
              <span className="text-muted-foreground font-mono text-[10px] font-semibold uppercase tracking-wider">
                OVERALL COMPOSITE SCORE
              </span>
              <div className="text-foreground my-2 font-mono text-3xl font-bold tabular-nums tracking-tight">
                {health.overall_health_score}
                <span className="text-muted-foreground text-sm font-normal">/100</span>
              </div>
              <div className="w-full space-y-1.5">
                <div className="bg-muted/60 h-1.5 w-full overflow-hidden rounded-full">
                  <div
                    className="h-full rounded-full bg-emerald-400 transition-all duration-300"
                    style={{ width: `${health.overall_health_score ?? 0}%` }}
                  />
                </div>
                <div className="text-muted-foreground flex justify-between font-mono text-[9px] font-medium">
                  <span>0 CRITICAL</span>
                  <span>60 ATTENTION</span>
                  <span>100 OPTIMAL</span>
                </div>
              </div>
            </div>

            {/* 5-Dimensional Health Grid */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:col-span-8">
              {dimensions.map((dim) => (
                <div
                  key={dim.dimension_key}
                  className="border-border/70 bg-secondary/30 space-y-1.5 rounded-md border p-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {getDimensionIcon(dim.dimension_key)}
                      <span className="text-foreground text-xs font-semibold">{dim.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-foreground font-mono text-xs font-bold tabular-nums">
                        {dim.score}/100
                      </span>
                    </div>
                  </div>

                  <div className="bg-muted/60 h-1 w-full overflow-hidden rounded-full">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-300"
                      style={{ width: `${dim.score}%` }}
                    />
                  </div>

                  <div className="text-muted-foreground flex items-center justify-between text-[10px]">
                    <span className="max-w-[190px] truncate" title={dim.explanation}>
                      {dim.explanation}
                    </span>
                    <button
                      onClick={() => setInspectTarget({ type: "health", id: dim.dimension_key })}
                      className="text-primary shrink-0 font-mono font-medium hover:underline"
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
            <div className="border-border/60 space-y-2.5 border-t pt-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-foreground flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wider">
                    <Sparkles className="text-primary h-3.5 w-3.5" />
                    What Should I Do Next?
                  </h3>
                  <p className="text-muted-foreground text-[11px]">
                    Ranked actionable engineering priorities synthesized from incidents, findings,
                    and forecasts.
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="border-primary/25 text-primary font-mono text-[10px]"
                >
                  DETERMINISTIC RANKING
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                {health.top_priorities.map((item) => (
                  <div
                    key={item.priority_id}
                    className="border-border/70 bg-secondary/20 hover:border-border hover:bg-secondary/40 space-y-2 rounded-md border p-3 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="border-primary/30 bg-primary/10 py-0.2 text-primary rounded border px-1 font-mono text-[9px] font-bold">
                            #{item.rank}
                          </span>
                          <Badge
                            variant="outline"
                            className={`font-mono text-[9px] font-medium ${
                              item.severity === "CRITICAL"
                                ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                                : item.severity === "HIGH"
                                  ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                                  : "border-primary/30 text-primary bg-primary/10"
                            }`}
                          >
                            {item.severity}
                          </Badge>
                          <span className="text-muted-foreground font-mono text-[10px]">
                            {item.category.replace("_", " ")}
                          </span>
                        </div>
                        <h4 className="text-foreground text-xs font-semibold">{item.title}</h4>
                      </div>

                      <span className="text-foreground font-mono text-xs font-bold tabular-nums">
                        {item.priority_score}pt
                      </span>
                    </div>

                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {item.why_ranked_highly}
                    </p>

                    <div className="border-primary/20 bg-primary/5 text-foreground/90 rounded-md border p-2 text-xs">
                      <span className="text-primary font-mono text-[11px] font-semibold">
                        Next Step:{" "}
                      </span>
                      {item.recommended_action}
                    </div>

                    <div className="flex items-center justify-between pt-0.5">
                      <button
                        onClick={() => setInspectTarget({ type: "priority", id: item.priority_id })}
                        className="text-primary font-mono text-xs font-medium hover:underline"
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
                          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1 rounded-md px-2 py-1 font-mono text-xs font-medium transition"
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
