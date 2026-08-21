import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Activity, ArrowLeft, RotateCcw, Wifi, WifiOff, Flame, Layers, Search } from "lucide-react";
import { Badge } from "@vibepulse/ui";
import { useQuery } from "@tanstack/react-query";
import { getApiBaseUrl } from "../../lib/api-config";
import type { Project } from "../projects/types";
import type { HotspotItem } from "../predictions/usePredictions";
import { useCommandCenter } from "./useCommandCenter";
import { IntelligenceCascadeRibbon } from "./IntelligenceCascadeRibbon";
import { LiveEventCascadeStream } from "./LiveEventCascadeStream";
import { ProjectHealthScorecard } from "../projects/ProjectHealthScorecard";
import { EvidenceInspector } from "../evidence/EvidenceInspector";
import type { EntityType } from "../evidence/types";

export function EngineeringCommandCenter() {
  const { projectId } = useParams<{ projectId: string }>();

  // Evidence Inspector Modal State
  const [inspectTarget, setInspectTarget] = useState<{
    type: EntityType;
    id: string;
  } | null>(null);

  // Fetch project details
  const { data: project } = useQuery<Project>({
    queryKey: ["project", projectId],
    queryFn: async () => {
      if (!projectId) throw new Error("Missing projectId");
      const res = await fetch(new URL(`/api/projects/${projectId}`, getApiBaseUrl()).toString());
      if (!res.ok) throw new Error("Failed to fetch project");
      return res.json() as Promise<Project>;
    },
    enabled: !!projectId,
  });

  const {
    wsStatus,
    activeStage,
    liveEvents,
    selectedEvent,
    setSelectedEventId,
    health,
    predictions,
    security,
    refreshAll,
  } = useCommandCenter(projectId, project?.root_path);

  if (!projectId) return null;

  return (
    <div className="animate-fade-in-up bg-background flex flex-1 flex-col space-y-8 p-8">
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div>
        <Link
          to={`/projects/${projectId}`}
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 transition hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Project Story
        </Link>

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="flex items-center gap-2.5 text-3xl font-extrabold tracking-tight text-white">
                <Activity className="h-7 w-7 text-indigo-400" />
                {project?.display_name || "Engineering"} Command Center
              </h1>
              <Badge
                variant="outline"
                className={`font-mono text-xs font-bold ${
                  wsStatus === "open"
                    ? "border-emerald-500/50 bg-emerald-950/40 text-emerald-300"
                    : "border-amber-500/50 bg-amber-950/40 text-amber-300"
                }`}
              >
                {wsStatus === "open" ? (
                  <span className="flex items-center gap-1.5">
                    <Wifi className="h-3 w-3 text-emerald-400" />
                    LIVE STREAM ACTIVE
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <WifiOff className="h-3 w-3 text-amber-400" />
                    RECONNECTING...
                  </span>
                )}
              </Badge>
            </div>
            <p className="mt-1 font-mono text-xs text-gray-400">{project?.root_path}</p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => refreshAll()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800/80 px-3 py-1.5 text-xs font-semibold text-gray-200 transition hover:bg-gray-700"
            >
              <RotateCcw className="h-3.5 w-3.5 text-indigo-400" />
              Sync State
            </button>
            <Link
              to={`/projects/${projectId}/investigation`}
              className="border-accent-color/30 bg-accent-color/10 text-accent-color hover:bg-accent-color/20 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition"
            >
              <Search className="h-3.5 w-3.5" />
              Evidence Graph
            </Link>
          </div>
        </div>
      </div>

      {/* ── VISUAL INTELLIGENCE CASCADE RIBBON ─────────────────────────────── */}
      <IntelligenceCascadeRibbon activeStage={activeStage} />

      {/* ── SECTION 1: UNIFIED PROJECT HEALTH & PRIORITIES ─────────────────── */}
      <ProjectHealthScorecard projectId={projectId} />

      {/* ── SECTION 2: LIVE EVENT STREAM & CAUSAL CASCADE ─────────────────── */}
      <div className="space-y-4 rounded-2xl border border-gray-800/80 bg-gray-900/60 p-6 shadow-xl">
        <LiveEventCascadeStream
          projectId={projectId}
          events={liveEvents}
          selectedEvent={selectedEvent}
          onSelectEvent={setSelectedEventId}
          health={health}
          security={security}
          onInspectWhy={(type, id) => setInspectTarget({ type, id })}
        />
      </div>

      {/* ── SECTION 3: PREDICTIVE HOTSPOTS & ENGINEERING FOCUS ─────────────── */}
      {predictions && predictions.status === "READY" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Active Hotspots */}
          <div className="space-y-4 rounded-2xl border border-gray-800/80 bg-gray-950 p-6 shadow-xl lg:col-span-6">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
                <Flame className="h-4 w-4 text-amber-400" />
                Active Engineering Hotspots
              </h3>
              <Link
                to={`/projects/${projectId}/predictions`}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
              >
                View Predictions →
              </Link>
            </div>

            <div className="space-y-3">
              {predictions.hotspots.slice(0, 3).map((h: HotspotItem) => (
                <div
                  key={h.file_path}
                  className="space-y-2 rounded-lg border border-gray-800/80 bg-gray-900/40 p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="max-w-[240px] truncate font-mono text-xs font-bold text-white">
                      {h.file_path}
                    </span>
                    <span className="font-mono text-xs font-bold text-amber-400">
                      {h.hotspot_score}/100
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
                    <div
                      className="h-full rounded-full bg-amber-500"
                      style={{ width: `${h.hotspot_score}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-500">
                    <span>Subsystem: {h.subsystem}</span>
                    <span>{h.activity_count} modifications</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Focus Evolution */}
          <div className="space-y-4 rounded-2xl border border-gray-800/80 bg-gray-950 p-6 shadow-xl lg:col-span-6">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
                <Layers className="h-4 w-4 text-purple-400" />
                Engineering Focus Drift
              </h3>
              <Badge variant="outline" className="border-purple-500/30 text-[10px] text-purple-300">
                CHRONOLOGICAL
              </Badge>
            </div>

            <div className="space-y-3 rounded-lg border border-gray-800/80 bg-gray-900/40 p-4">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-gray-400">Previous Focus:</span>
                <span className="font-mono text-gray-300">
                  {predictions.engineering_drift.previous_focus}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-indigo-400">Current Focus:</span>
                <span className="font-mono font-bold text-white">
                  {predictions.engineering_drift.current_focus}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-purple-400">Emerging Focus:</span>
                <span className="font-mono text-purple-300">
                  {predictions.engineering_drift.emerging_focus}
                </span>
              </div>
              <p className="mt-2 border-t border-gray-800/60 pt-2 text-xs text-gray-400">
                {predictions.engineering_drift.drift_explanation}
              </p>
            </div>
          </div>
        </div>
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
