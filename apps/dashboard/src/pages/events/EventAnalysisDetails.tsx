import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  Plus,
  Minus,
  FilePlus,
  Code2,
  Text,
  FileSignature,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@depradar/ui";
import { getApiBaseUrl } from "../../lib/api-config";

interface EvolutionObservation {
  kind: string;
  symbol: string;
}

interface EvolutionFindings {
  observations?: EvolutionObservation[];
  [key: string]: unknown;
}

interface SecurityFindingItem {
  rule_id: string;
  title: string;
  line_number: number;
  symbol: string;
  file: string;
  language: string;
  timestamp: string;
  evidence: string;
  redacted_evidence?: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  category?: string;
  description?: string;
}

interface SecurityFindings {
  findings?: SecurityFindingItem[];
  [key: string]: unknown;
}

interface AnalysisFinding {
  analyzer_name: string;
  findings: EvolutionFindings | SecurityFindings | Record<string, unknown>;
}

interface AnalysisResponse {
  event_id: string;
  analyses: AnalysisFinding[];
}

const KIND_METADATA: Record<
  string,
  { label: string; icon: LucideIcon; color: string; bg: string }
> = {
  FUNCTION_ADDED: {
    label: "Function Added",
    icon: Plus,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  FUNCTION_REMOVED: {
    label: "Function Removed",
    icon: Minus,
    color: "text-rose-500",
    bg: "bg-rose-500/10",
  },
  CLASS_ADDED: {
    label: "Class Added",
    icon: Plus,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  CLASS_REMOVED: {
    label: "Class Removed",
    icon: Minus,
    color: "text-rose-500",
    bg: "bg-rose-500/10",
  },
  IMPORT_INTRODUCED: {
    label: "Import Introduced",
    icon: Plus,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  IMPORT_REMOVED: {
    label: "Import Removed",
    icon: Minus,
    color: "text-rose-500",
    bg: "bg-rose-500/10",
  },
  TODO_INTRODUCED: {
    label: "TODO Introduced",
    icon: Text,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  TODO_RESOLVED: {
    label: "TODO Resolved",
    icon: Text,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  FILE_CREATED: {
    label: "File Created",
    icon: FilePlus,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  FILE_DELETED: {
    label: "File Deleted",
    icon: Minus,
    color: "text-rose-500",
    bg: "bg-rose-500/10",
  },
  FILE_EXPANDED: {
    label: "File Expanded",
    icon: Code2,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  FILE_SHRANK: {
    label: "File Shrank",
    icon: Code2,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
};

export function EventAnalysisDetails({ eventId }: { eventId: string }) {
  const { data, isLoading, error } = useQuery<AnalysisResponse>({
    queryKey: ["event_analysis", eventId],
    queryFn: async () => {
      const res = await fetch(new URL(`/events/${eventId}/analysis`, getApiBaseUrl()).toString());
      if (!res.ok) throw new Error("Failed to fetch analysis");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex h-20 items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return <div className="px-4 py-2 text-sm text-red-500">Could not load analysis details.</div>;
  }

  const evolution = data.analyses.find((a) => a.analyzer_name === "code_evolution");
  const evolutionFindings = (evolution?.findings as EvolutionFindings) || {};
  const observations = evolutionFindings.observations || [];

  const security = data.analyses.find((a) => a.analyzer_name === "security_guardian");
  const securityFindings = (security?.findings as SecurityFindings)?.findings || [];

  if (observations.length === 0 && securityFindings.length === 0) {
    return (
      <div className="text-muted-foreground px-4 py-2 text-sm">
        No evolution or security findings observed for this event.
      </div>
    );
  }

  return (
    <div className="border-border/80 bg-secondary/15 flex flex-col gap-4 border-t p-3.5">
      {/* Code Evolution Panel */}
      {observations.length > 0 && (
        <div>
          <div className="text-foreground mb-2 flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider">
            <FileSignature className="text-primary h-3.5 w-3.5" />
            <span>Code Evolution</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {observations.map((obs, i) => {
              const meta = KIND_METADATA[obs.kind] || {
                label: obs.kind,
                icon: Plus,
                color: "text-muted-foreground",
                bg: "bg-muted",
              };
              const Icon = meta.icon;
              return (
                <div
                  key={i}
                  className="border-border/70 bg-card/60 flex items-center gap-2.5 rounded-md border p-2"
                >
                  <div className={`rounded p-1 ${meta.bg} ${meta.color}`}>
                    <Icon className="h-3 w-3" />
                  </div>
                  <div className="flex flex-1 items-center justify-between">
                    <span className="text-muted-foreground font-mono text-xs">{meta.label}</span>
                    <span className="text-foreground font-mono text-xs font-semibold">
                      {obs.symbol}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Security Findings Panel */}
      {securityFindings.length > 0 && (
        <div className={observations.length > 0 ? "border-border/60 border-t pt-3" : ""}>
          <div className="mb-2 flex items-center gap-2">
            <ShieldAlert className="text-destructive h-3.5 w-3.5" />
            <span className="text-foreground font-mono text-xs font-bold uppercase tracking-wider">
              Security Findings
            </span>
            <span className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider">
              {securityFindings.length} {securityFindings.length === 1 ? "issue" : "issues"}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {securityFindings.map((finding, i) => (
              <div
                key={i}
                className="border-border/80 bg-card/60 shadow-xs overflow-hidden rounded-md border"
              >
                <div className="border-border/60 bg-destructive/5 flex flex-wrap items-center gap-2 border-b px-3 py-2">
                  <Badge
                    variant={
                      finding.severity === "HIGH"
                        ? "danger"
                        : finding.severity === "MEDIUM"
                          ? "warning"
                          : "default"
                    }
                  >
                    {finding.severity}
                  </Badge>
                  {finding.rule_id && (
                    <span className="border-border/80 bg-secondary/50 text-foreground rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold">
                      {finding.rule_id}
                    </span>
                  )}
                  <span className="text-foreground text-xs font-semibold">{finding.title}</span>
                  <span className="text-muted-foreground ml-auto font-mono text-[11px]">
                    {finding.file}:{finding.line_number}
                  </span>
                </div>
                <div className="flex flex-col gap-1.5 p-3">
                  <div className="border-border/70 bg-background text-destructive/90 whitespace-pre-wrap break-all rounded-md border p-2 font-mono text-xs">
                    {finding.evidence || finding.redacted_evidence || finding.symbol}
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    {finding.description ||
                      "Credential-like value detected. Secret is masked to prevent credential leakage."}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
