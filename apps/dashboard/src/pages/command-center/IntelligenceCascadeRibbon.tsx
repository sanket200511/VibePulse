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
    <div className="border-border/80 bg-card/60 shadow-xs backdrop-blur-xs rounded-lg border p-3">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-muted-foreground font-mono text-[10px] font-semibold uppercase tracking-wider">
          INTELLIGENCE CASCADE PIPELINE
        </span>
        <span className="text-muted-foreground font-mono text-[11px]">
          Active Stage: <span className="text-primary font-bold">{activeStage}</span>
        </span>
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-1 overflow-x-auto pb-0.5">
        {STAGES.map((s, idx) => {
          const isActive = s.stage === activeStage;
          const Icon = s.icon;

          return (
            <div key={s.stage} className="flex shrink-0 items-center gap-1">
              <div
                className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 transition-all duration-150 ${
                  isActive
                    ? "border-primary/40 bg-secondary/80 text-foreground ring-primary/30 shadow-xs ring-1"
                    : "border-border/70 bg-secondary/30 text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? s.color : "text-muted-foreground"}`} />
                <div className="flex flex-col text-left">
                  <span className="text-[11px] font-semibold leading-tight">{s.label}</span>
                  <span className="text-muted-foreground font-mono text-[8px]">{s.sublabel}</span>
                </div>
              </div>

              {idx < STAGES.length - 1 && (
                <ArrowRight className="text-muted-foreground/40 mx-0.5 h-3 w-3 shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
