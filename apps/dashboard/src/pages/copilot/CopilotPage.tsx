import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Bot,
  Send,
  Sparkles,
  ShieldAlert,
  HelpCircle,
  FileCode,
  Share2,
  CheckCircle2,
  ChevronRight,
  Activity,
  Layers,
  Search,
} from "lucide-react";
import { Badge } from "@vibepulse/ui";
import { useCopilot } from "./useCopilot";
import { EvidenceInspector } from "../evidence/EvidenceInspector";
import type { EntityType } from "../evidence/types";

export function CopilotPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { askQuestion, isAsking, lastResponse, queryError, suggestions, isLoadingSuggestions } =
    useCopilot(projectId);

  const [inputQuery, setInputQuery] = useState("");
  const [inspectTarget, setInspectTarget] = useState<{
    type: EntityType;
    id: string;
  } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim() || isAsking) return;
    askQuestion({ query: inputQuery.trim() }).catch(() => {
      // Handled by queryError in UI
    });
  };

  const handleSuggestionClick = (question: string) => {
    setInputQuery(question);
    askQuestion({ query: question }).catch(() => {
      // Handled by queryError
    });
  };

  return (
    <div className="min-h-screen space-y-6 bg-black p-6 text-gray-100 md:p-8">
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 border-b border-gray-800 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <Link
              to={`/projects/${projectId}/command-center`}
              className="inline-flex items-center gap-1 transition hover:text-indigo-400"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Command Center
            </Link>
            <span>/</span>
            <Link
              to={`/projects/${projectId}/knowledge-graph`}
              className="inline-flex items-center gap-1 transition hover:text-indigo-400"
            >
              <Share2 className="h-3.5 w-3.5" />
              Knowledge Graph
            </Link>
            <span>/</span>
            <span className="text-gray-200">AI Copilot</span>
          </div>

          <h1 className="mt-2 flex items-center gap-3 text-2xl font-bold tracking-tight text-white">
            <Bot className="h-7 w-7 text-indigo-400" />
            AI Engineering Copilot
          </h1>
          <p className="mt-0.5 text-xs text-gray-400">
            Ask anything about this codebase. Evidence-first answers grounded strictly in PostgreSQL
            historical telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-indigo-500/30 bg-indigo-950/20 py-1 text-xs text-indigo-300"
          >
            <Sparkles className="mr-1 h-3.5 w-3.5 text-indigo-400" />
            Zero-Hallucination Grounded
          </Badge>
        </div>
      </div>

      {/* ── QUERY CONSOLE ─────────────────────────────────────────────────── */}
      <div className="space-y-4 rounded-2xl border border-gray-800 bg-gray-950/80 p-5 shadow-2xl backdrop-blur-xl">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <Search className="absolute left-4 h-5 w-5 text-gray-500" />
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask VibePulse anything... (e.g., 'What should I fix first?', 'Why is auth.py risky?')"
            className="w-full rounded-xl border border-gray-800 bg-gray-900/90 py-3.5 pl-12 pr-28 text-sm text-white placeholder-gray-500 shadow-inner focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            disabled={isAsking}
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isAsking}
            className="absolute right-2.5 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {isAsking ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Thinking...</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>Ask</span>
              </>
            )}
          </button>
        </form>

        {/* ── STATE-DRIVEN SUGGESTIONS ───────────────────────────────────────── */}
        {!isLoadingSuggestions && suggestions.length > 0 && (
          <div className="space-y-2 border-t border-gray-800/60 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Suggested for current repository state:
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((sug) => (
                <button
                  key={sug.suggestion_id}
                  onClick={() => handleSuggestionClick(sug.question)}
                  disabled={isAsking}
                  className="group inline-flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-900/50 px-3 py-1.5 text-xs text-gray-300 transition hover:border-indigo-500/40 hover:bg-gray-800/80 hover:text-white"
                >
                  <span className="text-indigo-400 transition-transform group-hover:translate-x-0.5">
                    ↳
                  </span>
                  <span>{sug.question}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── ERROR DISPLAY ──────────────────────────────────────────────────── */}
      {queryError && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 text-xs text-rose-300">
          <ShieldAlert className="h-5 w-5 flex-shrink-0 text-rose-400" />
          <div>{queryError.message}</div>
        </div>
      )}

      {/* ── ANSWER VIEW ────────────────────────────────────────────────────── */}
      {lastResponse && (
        <div className="space-y-6">
          {/* ── SUMMARY CARD ───────────────────────────────────────────────── */}
          <div className="space-y-4 rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-gray-900/90 via-indigo-950/10 to-gray-900/90 p-6 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800/80 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-400">Query:</span>
                <span className="text-sm font-bold italic text-white">
                  &ldquo;{lastResponse.query}&rdquo;
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-gray-700 bg-gray-800 text-[11px] text-gray-300"
                >
                  Intent: {lastResponse.intent}
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    lastResponse.answerable
                      ? "border-emerald-500/40 bg-emerald-950/20 text-[11px] text-emerald-300"
                      : "border-amber-500/40 bg-amber-950/20 text-[11px] text-amber-300"
                  }
                >
                  {lastResponse.answerable ? "Grounded in Telemetry" : "Ungrounded / Out of Scope"}
                </Badge>
              </div>
            </div>

            <div className="text-sm font-medium leading-relaxed text-gray-200">
              {lastResponse.summary}
            </div>

            {/* Next actions ribbon */}
            {lastResponse.next_actions.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <span className="text-xs font-semibold text-gray-400">Navigate to:</span>
                {lastResponse.next_actions.map((act, i) => (
                  <Link
                    key={i}
                    to={act.url}
                    className="inline-flex items-center gap-1 rounded-md bg-gray-800 px-2.5 py-1 text-xs font-medium text-gray-300 transition hover:bg-gray-700 hover:text-white"
                  >
                    <span>{act.label}</span>
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* ── 3-COLUMN FACT DECOMPOSITION ───────────────────────────────── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Column 1: OBSERVED FACTS */}
            <div className="space-y-3 rounded-2xl border border-emerald-500/20 bg-gray-950/60 p-5">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    [OBSERVED] Ground Truth
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="border-emerald-500/30 bg-emerald-950/20 text-[10px] text-emerald-300"
                >
                  {lastResponse.observed.length} facts
                </Badge>
              </div>

              {lastResponse.observed.length === 0 ? (
                <p className="text-xs italic text-gray-500">No direct raw telemetry facts.</p>
              ) : (
                <ul className="space-y-2.5 text-xs text-gray-300">
                  {lastResponse.observed.map((fact, idx) => (
                    <li
                      key={idx}
                      className="space-y-1 rounded-lg border border-gray-800/80 bg-gray-900/40 p-2.5"
                    >
                      <div className="leading-relaxed">{fact.statement}</div>
                      {fact.source_reference && (
                        <div className="font-mono text-[10px] text-gray-500">
                          ref: {fact.source_reference}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Column 2: INFERRED INTELLIGENCE */}
            <div className="space-y-3 rounded-2xl border border-indigo-500/20 bg-gray-950/60 p-5">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-indigo-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                    [INFERRED] Derived Posture
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="border-indigo-500/30 bg-indigo-950/20 text-[10px] text-indigo-300"
                >
                  {lastResponse.inferred.length} models
                </Badge>
              </div>

              {lastResponse.inferred.length === 0 ? (
                <p className="text-xs italic text-gray-500">No derived model inferences.</p>
              ) : (
                <ul className="space-y-2.5 text-xs text-gray-300">
                  {lastResponse.inferred.map((fact, idx) => (
                    <li
                      key={idx}
                      className="space-y-1 rounded-lg border border-gray-800/80 bg-gray-900/40 p-2.5"
                    >
                      <div className="leading-relaxed">{fact.statement}</div>
                      {fact.source_reference && (
                        <div className="font-mono text-[10px] text-indigo-400/80">
                          model: {fact.source_reference}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Column 3: UNKNOWN & GAPS */}
            <div className="space-y-3 rounded-2xl border border-amber-500/20 bg-gray-950/60 p-5">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    [UNKNOWN] Observation Gaps
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="border-amber-500/30 bg-amber-950/20 text-[10px] text-amber-300"
                >
                  {lastResponse.unknown.length} unknowns
                </Badge>
              </div>

              {lastResponse.unknown.length === 0 ? (
                <p className="text-xs italic text-gray-500">Zero unestablished items.</p>
              ) : (
                <ul className="space-y-2.5 text-xs text-gray-300">
                  {lastResponse.unknown.map((fact, idx) => (
                    <li
                      key={idx}
                      className="space-y-1 rounded-lg border border-gray-800/80 bg-gray-900/40 p-2.5"
                    >
                      <div className="leading-relaxed text-amber-200/90">{fact.statement}</div>
                      {fact.source_reference && (
                        <div className="font-mono text-[10px] text-gray-500">
                          boundary: {fact.source_reference}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* ── RECOMMENDATIONS & EVIDENCE INSPECTION ───────────────────────── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Recommendations */}
            <div className="space-y-3 rounded-2xl border border-gray-800 bg-gray-950/60 p-5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                Actionable Recommendations
              </div>
              {lastResponse.recommendations.length === 0 ? (
                <p className="text-xs text-gray-500">No active recommendations required.</p>
              ) : (
                <div className="space-y-2.5">
                  {lastResponse.recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className="space-y-1.5 rounded-xl border border-gray-800 bg-gray-900/50 p-3 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{rec.title}</span>
                        <Badge
                          variant="outline"
                          className={
                            rec.priority === "CRITICAL"
                              ? "border-rose-500/40 bg-rose-950/20 text-[10px] text-rose-300"
                              : "border-indigo-500/40 bg-indigo-950/20 text-[10px] text-indigo-300"
                          }
                        >
                          {rec.priority}
                        </Badge>
                      </div>
                      <p className="text-gray-300">{rec.explanation}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Evidence & Deep Inspection */}
            <div className="space-y-3 rounded-2xl border border-gray-800 bg-gray-950/60 p-5">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-white">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-indigo-400" />
                  Evidence Grounding & Why?
                </div>
                <button
                  onClick={() => setInspectTarget({ type: "health", id: "overall" })}
                  className="rounded bg-indigo-600/20 px-2 py-1 text-[11px] font-semibold text-indigo-300 transition hover:bg-indigo-600/30"
                >
                  [Why?] Universal Evidence Inspector
                </button>
              </div>

              <div className="space-y-2">
                <div className="space-y-2 rounded-xl border border-gray-800 bg-gray-900/40 p-3 text-xs text-gray-400">
                  <div className="flex justify-between">
                    <span>Evidence Strength:</span>
                    <span className="font-bold text-white">{lastResponse.evidence_strength}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Contributing Evidence IDs:</span>
                    <span className="font-mono text-indigo-300">
                      {lastResponse.evidence.length} citations
                    </span>
                  </div>
                </div>

                {/* Related Entities */}
                {lastResponse.related_entities.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[11px] font-semibold text-gray-400">
                      Related Entities:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {lastResponse.related_entities.map((ent, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 rounded bg-gray-800/80 px-2 py-1 font-mono text-[11px] text-gray-300"
                        >
                          <FileCode className="h-3 w-3 text-gray-400" />
                          <span>{ent.label}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── UNIVERSAL EVIDENCE INSPECTOR MODAL ─────────────────────────────── */}
      {inspectTarget && (
        <EvidenceInspector
          projectId={projectId || ""}
          entityType={inspectTarget.type}
          entityId={inspectTarget.id}
          onClose={() => setInspectTarget(null)}
        />
      )}
    </div>
  );
}
