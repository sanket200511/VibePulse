import {
  Eye,
  ShieldAlert,
  Search,
  CheckCircle2,
  BookOpen,
  TrendingUp,
  Activity,
  ArrowRight,
} from "lucide-react";
import type { IntelligenceStage } from "./useCommandCenter";

interface StageConfig {
  stage: IntelligenceStage;
  label: string;
  sublabel: string;
  icon: typeof Eye;
  color: string;
  activeBg: string;
  activeBorder: string;
  activeText: string;
}

const STAGES: StageConfig[] = [
  {
    stage: "OBSERVE",
    label: "Observe",
    sublabel: "Raw Telemetry",
    icon: Eye,
    color: "text-blue-400",
    activeBg: "bg-blue-950/80",
    activeBorder: "border-blue-500",
    activeText: "text-blue-300",
  },
  {
    stage: "DETECT",
    label: "Detect",
    sublabel: "AST & Guardian",
    icon: ShieldAlert,
    color: "text-rose-400",
    activeBg: "bg-rose-950/80",
    activeBorder: "border-rose-500",
    activeText: "text-rose-300",
  },
  {
    stage: "INVESTIGATE",
    label: "Investigate",
    sublabel: "Evidence Graph",
    icon: Search,
    color: "text-amber-400",
    activeBg: "bg-amber-950/80",
    activeBorder: "border-amber-500",
    activeText: "text-amber-300",
  },
  {
    stage: "RESOLVE",
    label: "Resolve",
    sublabel: "Triage & Notes",
    icon: CheckCircle2,
    color: "text-emerald-400",
    activeBg: "bg-emerald-950/80",
    activeBorder: "border-emerald-500",
    activeText: "text-emerald-300",
  },
  {
    stage: "LEARN",
    label: "Learn",
    sublabel: "Context Memory",
    icon: BookOpen,
    color: "text-cyan-400",
    activeBg: "bg-cyan-950/80",
    activeBorder: "border-cyan-500",
    activeText: "text-cyan-300",
  },
  {
    stage: "ANTICIPATE",
    label: "Anticipate",
    sublabel: "Forecast Signals",
    icon: TrendingUp,
    color: "text-purple-400",
    activeBg: "bg-purple-950/80",
    activeBorder: "border-purple-500",
    activeText: "text-purple-300",
  },
  {
    stage: "HEALTH",
    label: "Unified Health",
    sublabel: "5 Dimensions",
    icon: Activity,
    color: "text-indigo-400",
    activeBg: "bg-indigo-950/80",
    activeBorder: "border-indigo-500",
    activeText: "text-indigo-300",
  },
];

export function IntelligenceCascadeRibbon({ activeStage }: { activeStage: IntelligenceStage }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-950/90 p-4 shadow-xl">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
          INTELLIGENCE CASCADE PIPELINE
        </span>
        <span className="text-xs font-medium text-gray-400">
          Active Stage: <span className="font-mono font-bold text-indigo-400">{activeStage}</span>
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-1 overflow-x-auto pb-1">
        {STAGES.map((s, idx) => {
          const isActive = s.stage === activeStage;
          const Icon = s.icon;

          return (
            <div key={s.stage} className="flex shrink-0 items-center gap-1">
              <div
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-all duration-300 ${
                  isActive
                    ? `${s.activeBg} ${s.activeBorder} ${s.activeText} scale-105 shadow-lg ring-2 ring-indigo-500/30`
                    : "border-gray-800/80 bg-gray-900/40 text-gray-400 hover:border-gray-700"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? s.color : "text-gray-500"}`} />
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold leading-tight">{s.label}</span>
                  <span className="text-[9px] text-gray-500">{s.sublabel}</span>
                </div>
              </div>

              {idx < STAGES.length - 1 && (
                <ArrowRight className="mx-0.5 h-3 w-3 shrink-0 text-gray-700" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
