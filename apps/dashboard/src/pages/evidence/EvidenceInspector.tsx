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
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-3xl space-y-6 overflow-y-auto rounded-2xl border border-gray-800 bg-gray-950 p-6 shadow-2xl">
        {/* ── HEADER ───────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between border-b border-gray-800/80 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                TRUST & EVIDENCE INTELLIGENCE
              </span>
              <Badge
                variant="outline"
                className="border-indigo-500/40 bg-indigo-950/40 font-mono text-[9px] font-bold text-indigo-300"
              >
                WHY VIBEPULSE BELIEVES THIS
              </Badge>
              {explain?.provenance && (
                <Badge
                  variant="outline"
                  className={`font-mono text-[9px] font-bold ${
                    explain.provenance === "OBSERVED"
                      ? "border-blue-500/40 bg-blue-950/40 text-blue-300"
                      : explain.provenance === "INFERRED"
                        ? "border-purple-500/40 bg-purple-950/40 text-purple-300"
                        : "border-gray-600 bg-gray-900 text-gray-400"
                  }`}
                >
                  [{explain.provenance}]
                </Badge>
              )}
            </div>
            <h2 className="text-xl font-extrabold text-white">
              {explain?.title || "Evidence Inspector"}
            </h2>
            <p className="text-xs text-gray-400">{explain?.summary}</p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── CONTENT ──────────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="animate-pulse p-12 text-center text-xs text-gray-400">
            Synthesizing evidence-backed explainability from PostgreSQL telemetry...
          </div>
        ) : isError || !explain ? (
          <div className="p-6 text-center text-xs text-rose-400">
            Failed to load explainability intelligence for this entity.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Rationale Banner */}
            <div className="space-y-2 rounded-xl border border-indigo-900/50 bg-indigo-950/20 p-4">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase text-indigo-300">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                Evidence-Grounded Rationale
              </span>
              <p className="text-xs leading-relaxed text-gray-200">{explain.why_explanation}</p>
            </div>

            {/* Score Decomposition (for Health or weighted scores) */}
            {explain.score_decomposition && explain.score_decomposition.length > 0 && (
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-300">
                  <Calculator className="h-3.5 w-3.5 text-indigo-400" />
                  Score Decomposition & Contribution
                </h3>

                <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900/40">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-gray-800 bg-gray-900/80 text-[10px] font-bold uppercase text-gray-400">
                      <tr>
                        <th className="p-3">Dimension</th>
                        <th className="p-3">Raw Score</th>
                        <th className="p-3">Weight</th>
                        <th className="p-3">Contribution</th>
                        <th className="p-3">Provenance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800 font-mono">
                      {explain.score_decomposition.map((d: ScoreDecompositionItem) => (
                        <tr key={d.dimension_key} className="hover:bg-gray-900/50">
                          <td className="p-3 font-sans font-medium text-white">
                            {d.dimension_name}
                          </td>
                          <td className="p-3 text-indigo-300">{d.raw_score}/100</td>
                          <td className="p-3 text-gray-400">{(d.weight * 100).toFixed(0)}%</td>
                          <td className="p-3 font-bold text-emerald-400">
                            +{d.weighted_contribution}
                          </td>
                          <td className="p-3">
                            <Badge
                              variant="outline"
                              className="border-blue-500/30 text-[9px] text-blue-300"
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
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-300">
                  <Layers className="h-3.5 w-3.5 text-indigo-400" />
                  Causal Evidence Chain
                </h3>

                <div className="space-y-2">
                  {explain.evidence_chain.map((c: EvidenceChainStep) => (
                    <div
                      key={c.step_number}
                      className="flex items-start gap-3 rounded-lg border border-gray-800/80 bg-gray-900/40 p-3"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 font-mono text-[10px] font-bold text-white">
                        {c.step_number}
                      </span>
                      <div className="flex-1 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{c.title}</span>
                          <Badge
                            variant="outline"
                            className="border-gray-700 font-mono text-[8px] text-gray-400"
                          >
                            {c.stage}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-gray-400">{c.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Redacted Evidence Snippet */}
            {explain.evidence_items?.some((i) => i.redacted_evidence) && (
              <div className="space-y-2">
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-300">
                  <FileCode className="h-3.5 w-3.5 text-rose-400" />
                  Observed Code Snippet (Secrets Masked)
                </h3>
                {explain.evidence_items
                  .filter((i) => i.redacted_evidence)
                  .map((i) => (
                    <pre
                      key={i.evidence_id}
                      className="overflow-x-auto rounded-lg border border-gray-800 bg-black/60 p-3 font-mono text-[11px] text-rose-300"
                    >
                      {i.redacted_evidence}
                    </pre>
                  ))}
              </div>
            )}

            {/* Remediation Action & Deep Link */}
            <div className="flex flex-col justify-between gap-3 border-t border-gray-800/80 pt-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2 text-[10px] text-gray-400">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>Zero raw credentials exposed • Redaction verified</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    onClose();
                    void navigate(`/projects/${projectId}/investigation`);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md transition hover:bg-indigo-500"
                >
                  <Search className="h-3.5 w-3.5" />
                  Investigate in Engine 3.0
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
