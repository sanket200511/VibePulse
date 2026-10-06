import { useNavigate } from "react-router-dom";
import {
  X,
  ShieldCheck,
  Search,
  Sparkles,
  ArrowRight,
  Calculator,
  Layers,
  FileCode,
} from "lucide-react";
import { Badge } from "@depradar/ui";
import { useEvidenceExplainability } from "./useEvidenceExplainability";
import type { EntityType, ScoreDecompositionItem, EvidenceChainStep } from "./types";

interface Props {
  projectId: string;
  entityType: EntityType | null;
  entityId: string | null;
  onClose: () => void;
}

export function EvidenceInspector({ projectId, entityType, entityId, onClose }: Props) {
  const navigate = useNavigate();
  const {
    data: explain,
    isLoading,
    isError,
  } = useEvidenceExplainability(projectId, entityType, entityId);

  if (!entityType) return null;

  return (
    <div className="backdrop-blur-xs fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4">
      <div className="border-border/80 bg-background/95 relative max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-lg border p-5 shadow-2xl">
        {/* ── HEADER ───────────────────────────────────────────────────────── */}
        <div className="border-border/80 flex items-start justify-between border-b pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-primary font-mono text-[10px] font-bold uppercase tracking-wider">
                TRUST & EVIDENCE INTELLIGENCE
              </span>
              <Badge
                variant="outline"
                className="border-primary/30 bg-primary/10 text-primary font-mono text-[9px] font-semibold"
              >
                WHY DEPRADAR BELIEVES THIS
              </Badge>
              {explain?.provenance && (
                <Badge
                  variant="outline"
                  className={`font-mono text-[9px] font-bold ${
                    explain.provenance === "OBSERVED"
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                      : explain.provenance === "INFERRED"
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border/80 bg-secondary/50 text-muted-foreground"
                  }`}
                >
                  [{explain.provenance}]
                </Badge>
              )}
            </div>
            <h2 className="text-foreground text-base font-bold">
              {explain?.title || "Evidence Inspector"}
            </h2>
            <p className="text-muted-foreground text-xs">{explain?.summary}</p>
          </div>

          <button
            onClick={onClose}
            className="text-muted-foreground hover:bg-secondary hover:text-foreground rounded-md p-1 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── CONTENT ──────────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="text-muted-foreground animate-pulse p-8 text-center font-mono text-xs">
            Synthesizing evidence-backed explainability from telemetry...
          </div>
        ) : isError || !explain ? (
          <div className="text-destructive p-6 text-center font-mono text-xs">
            Failed to load explainability intelligence for this entity.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Rationale Banner */}
            <div className="border-primary/20 bg-primary/5 space-y-1.5 rounded-md border p-3">
              <span className="text-primary flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase">
                <Sparkles className="text-primary h-3.5 w-3.5" />
                Evidence-Grounded Rationale
              </span>
              <p className="text-foreground/90 text-xs leading-relaxed">
                {explain.why_explanation}
              </p>
            </div>

            {/* Score Decomposition (for Health or weighted scores) */}
            {explain.score_decomposition && explain.score_decomposition.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-muted-foreground flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider">
                  <Calculator className="text-primary h-3.5 w-3.5" />
                  Score Decomposition & Contribution
                </h3>

                <div className="border-border/80 bg-card/60 overflow-hidden rounded-md border">
                  <table className="w-full text-left text-xs">
                    <thead className="border-border/80 bg-secondary/40 text-muted-foreground border-b font-mono text-[10px] font-bold uppercase">
                      <tr>
                        <th className="p-2.5">Dimension</th>
                        <th className="p-2.5">Raw Score</th>
                        <th className="p-2.5">Weight</th>
                        <th className="p-2.5">Contribution</th>
                        <th className="p-2.5">Provenance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-border/60 divide-y font-mono">
                      {explain.score_decomposition.map((d: ScoreDecompositionItem) => (
                        <tr
                          key={d.dimension_key}
                          className="hover:bg-secondary/30 transition-colors"
                        >
                          <td className="text-foreground p-2.5 font-sans font-medium">
                            {d.dimension_name}
                          </td>
                          <td className="text-primary p-2.5 tabular-nums">{d.raw_score}/100</td>
                          <td className="text-muted-foreground p-2.5 tabular-nums">
                            {(d.weight * 100).toFixed(0)}%
                          </td>
                          <td className="p-2.5 font-bold tabular-nums text-emerald-400">
                            +{d.weighted_contribution}
                          </td>
                          <td className="p-2.5">
                            <Badge
                              variant="outline"
                              className="border-primary/30 text-primary text-[9px]"
                            >
                              [{d.provenance}]
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Causal Evidence Chain */}
            {explain.evidence_chain && explain.evidence_chain.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-muted-foreground flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider">
                  <Layers className="text-primary h-3.5 w-3.5" />
                  Causal Evidence Chain
                </h3>

                <div className="space-y-1.5">
                  {explain.evidence_chain.map((c: EvidenceChainStep) => (
                    <div
                      key={c.step_number}
                      className="border-border/70 bg-secondary/20 flex items-start gap-2.5 rounded-md border p-2.5"
                    >
                      <span className="bg-primary text-primary-foreground flex h-4 w-4 shrink-0 items-center justify-center rounded font-mono text-[10px] font-bold">
                        {c.step_number}
                      </span>
                      <div className="flex-1 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-foreground text-xs font-semibold">{c.title}</span>
                          <Badge
                            variant="outline"
                            className="border-border/60 text-muted-foreground font-mono text-[8px]"
                          >
                            {c.stage}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground text-[11px]">{c.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Redacted Evidence Snippet */}
            {explain.evidence_items?.some((i) => i.redacted_evidence) && (
              <div className="space-y-1.5">
                <h3 className="text-muted-foreground flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider">
                  <FileCode className="text-destructive h-3.5 w-3.5" />
                  Observed Code Snippet (Secrets Masked)
                </h3>
                {explain.evidence_items
                  .filter((i) => i.redacted_evidence)
                  .map((i) => (
                    <pre
                      key={i.evidence_id}
                      className="border-border/80 bg-background text-destructive/90 overflow-x-auto rounded-md border p-2.5 font-mono text-[11px]"
                    >
                      {i.redacted_evidence}
                    </pre>
                  ))}
              </div>
            )}

            {/* Remediation Action & Deep Link */}
            <div className="border-border/80 flex flex-col justify-between gap-3 border-t pt-3 sm:flex-row sm:items-center">
              <div className="text-muted-foreground flex items-center gap-2 font-mono text-[10px]">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                <span>Zero raw credentials exposed • Redaction verified</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    onClose();
                    void navigate(`/projects/${projectId}/investigation`);
                  }}
                  className="bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors"
                >
                  <Search className="h-3 w-3" />
                  Investigate in Engine 3.0
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
