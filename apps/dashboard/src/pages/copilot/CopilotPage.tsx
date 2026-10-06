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
  CheckCircle2,
  ChevronRight,
  Activity,
  Layers,
  Search,
} from "lucide-react";
import { Badge } from "@depradar/ui";
import { useCopilot } from "./useCopilot";
import { EvidenceInspector } from "../evidence/EvidenceInspector";
import type { EntityType } from "../evidence/types";
import { Breadcrumbs } from "../../components/layout/Breadcrumbs";

export function CopilotPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { askQuestion, isAsking, lastResponse, queryError, suggestions, isLoadingSuggestions } =
    useCopilot(projectId);

  const [inputQuery, setInputQuery] = useState("");
  // Evidence Inspector Modal State
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
    <div className="animate-fade-in-up text-foreground mx-auto flex w-full max-w-[1400px] flex-1 flex-col space-y-6 px-4 py-4 sm:px-6 md:py-6">
      {/* ── BREADCRUMB HEADER ─────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Breadcrumbs
            items={[
              { label: "Projects", to: "/projects" },
              { label: "Project Story", to: `/projects/${projectId}` },
              { label: "AI Copilot" },
            ]}
          />
          <Link
            to={`/projects/${projectId}`}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Project Story
          </Link>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-foreground flex items-center gap-2 text-xl font-bold tracking-tight">
              <Bot className="text-primary h-5 w-5" />
              AI Engineering Copilot
            </h1>
            <p className="text-muted-foreground mt-1 text-xs">
              Ask anything about this codebase. Evidence-first answers grounded strictly in verified
              historical telemetry.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="border-border/80 bg-secondary/30 text-muted-foreground font-mono text-[10px]"
            >
              <Sparkles className="text-primary mr-1 h-3 w-3" />
              Zero-Hallucination Grounded
            </Badge>
          </div>
        </div>
      </div>

      {/* ── QUERY CONSOLE ─────────────────────────────────────────────────── */}
      <div className="border-border/80 bg-card/60 space-y-3 rounded-lg border p-4 shadow-sm">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <Search className="text-muted-foreground absolute left-3.5 h-4 w-4" />
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask DepRadar anything... (e.g., 'What should I fix first?', 'Why is auth.py risky?')"
            className="border-border/80 bg-background/80 text-foreground placeholder:text-muted-foreground/60 focus:border-primary w-full rounded-md border py-2 pl-10 pr-24 font-mono text-xs shadow-inner focus:outline-none"
            disabled={isAsking}
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isAsking}
            className="bg-primary text-primary-foreground hover:bg-primary/90 absolute right-1.5 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold shadow-sm transition disabled:opacity-50"
          >
            {isAsking ? (
              <>
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Thinking...</span>
              </>
            ) : (
              <>
                <Send className="h-3 w-3" />
                <span>Ask</span>
              </>
            )}
          </button>
        </form>

        {/* ── STATE-DRIVEN SUGGESTIONS ───────────────────────────────────────── */}
        {!isLoadingSuggestions && suggestions.length > 0 && (
          <div className="border-border/60 space-y-1.5 border-t pt-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-mono text-[10px] font-semibold uppercase tracking-wider">
                Suggested for current repository state:
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((sug) => (
                <button
                  key={sug.suggestion_id}
                  onClick={() => handleSuggestionClick(sug.question)}
                  disabled={isAsking}
                  className="border-border/70 bg-secondary/30 text-muted-foreground hover:border-primary/60 hover:bg-secondary/60 hover:text-foreground group inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors"
                >
                  <span className="text-primary transition-transform group-hover:translate-x-0.5">
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
        <div className="flex items-center gap-2.5 rounded-lg border border-rose-500/30 bg-rose-950/20 p-3 text-xs text-rose-300">
          <ShieldAlert className="h-4 w-4 flex-shrink-0 text-rose-400" />
          <div>{queryError.message}</div>
        </div>
      )}

      {/* ── ANSWER VIEW ────────────────────────────────────────────────────── */}
      {lastResponse && (
        <div className="space-y-4">
          {/* ── SUMMARY CARD ───────────────────────────────────────────────── */}
          <div className="border-border/80 bg-card/60 space-y-3 rounded-lg border p-4 shadow-sm">
            <div className="border-border/60 flex flex-wrap items-center justify-between gap-2 border-b pb-3">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-mono text-xs">Query:</span>
                <span className="text-foreground font-mono text-xs font-semibold">
                  &ldquo;{lastResponse.query}&rdquo;
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-border/80 bg-secondary/30 text-muted-foreground font-mono text-[10px]"
                >
                  Intent: {lastResponse.intent}
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    lastResponse.answerable
                      ? "border-emerald-500/30 bg-emerald-500/10 font-mono text-[10px] text-emerald-400"
                      : "border-amber-500/30 bg-amber-500/10 font-mono text-[10px] text-amber-400"
                  }
                >
                  {lastResponse.answerable ? "Grounded in Telemetry" : "Ungrounded / Out of Scope"}
                </Badge>
              </div>
            </div>

            <div className="text-foreground text-xs leading-relaxed">{lastResponse.summary}</div>

            {/* Next actions ribbon */}
            {lastResponse.next_actions.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-muted-foreground font-mono text-[10px] font-semibold uppercase tracking-wider">
                  Navigate to:
                </span>
                {lastResponse.next_actions.map((act, i) => (
                  <Link
                    key={i}
                    to={act.url}
                    className="border-border/80 bg-secondary/40 text-foreground hover:bg-secondary inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors"
                  >
                    <span>{act.label}</span>
                    <ChevronRight className="text-muted-foreground h-3 w-3" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* ── 3-COLUMN FACT DECOMPOSITION ───────────────────────────────── */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Column 1: OBSERVED FACTS */}
            <div className="bg-card/60 space-y-2.5 rounded-lg border border-emerald-500/30 p-4">
              <div className="border-border/60 flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="font-mono text-xs font-semibold uppercase tracking-wider text-emerald-400">
                    [OBSERVED] Ground Truth
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="border-emerald-500/30 bg-emerald-500/10 font-mono text-[9px] text-emerald-400"
                >
                  {lastResponse.observed.length} facts
                </Badge>
              </div>

              {lastResponse.observed.length === 0 ? (
                <p className="text-muted-foreground text-xs italic">
                  No direct raw telemetry facts.
                </p>
              ) : (
                <ul className="text-foreground space-y-2 text-xs">
                  {lastResponse.observed.map((fact, idx) => (
                    <li
                      key={idx}
                      className="border-border/60 bg-secondary/20 space-y-0.5 rounded-md border p-2"
                    >
                      <div className="leading-relaxed">{fact.statement}</div>
                      {fact.source_reference && (
                        <div className="text-muted-foreground font-mono text-[10px]">
                          ref: {fact.source_reference}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Column 2: INFERRED INTELLIGENCE */}
            <div className="border-primary/30 bg-card/60 space-y-2.5 rounded-lg border p-4">
              <div className="border-border/60 flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-1.5">
                  <Activity className="text-primary h-3.5 w-3.5" />
                  <span className="text-primary font-mono text-xs font-semibold uppercase tracking-wider">
                    [INFERRED] Derived Posture
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="border-primary/30 bg-primary/10 text-primary font-mono text-[9px]"
                >
                  {lastResponse.inferred.length} models
                </Badge>
              </div>

              {lastResponse.inferred.length === 0 ? (
                <p className="text-muted-foreground text-xs italic">No derived model inferences.</p>
              ) : (
                <ul className="text-foreground space-y-2 text-xs">
                  {lastResponse.inferred.map((fact, idx) => (
                    <li
                      key={idx}
                      className="border-border/60 bg-secondary/20 space-y-0.5 rounded-md border p-2"
                    >
                      <div className="leading-relaxed">{fact.statement}</div>
                      {fact.source_reference && (
                        <div className="text-primary/80 font-mono text-[10px]">
                          model: {fact.source_reference}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Column 3: UNKNOWN & GAPS */}
            <div className="bg-card/60 space-y-2.5 rounded-lg border border-amber-500/30 p-4">
              <div className="border-border/60 flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5 text-amber-400" />
                  <span className="font-mono text-xs font-semibold uppercase tracking-wider text-amber-400">
                    [UNKNOWN] Observation Gaps
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="border-amber-500/30 bg-amber-500/10 font-mono text-[9px] text-amber-400"
                >
                  {lastResponse.unknown.length} unknowns
                </Badge>
              </div>

              {lastResponse.unknown.length === 0 ? (
                <p className="text-muted-foreground text-xs italic">Zero unestablished items.</p>
              ) : (
                <ul className="text-foreground space-y-2 text-xs">
                  {lastResponse.unknown.map((fact, idx) => (
                    <li
                      key={idx}
                      className="border-border/60 bg-secondary/20 space-y-0.5 rounded-md border p-2"
                    >
                      <div className="leading-relaxed text-amber-300">{fact.statement}</div>
                      {fact.source_reference && (
                        <div className="text-muted-foreground font-mono text-[10px]">
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
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Recommendations */}
            <div className="border-border/80 bg-card/60 space-y-2.5 rounded-lg border p-4">
              <div className="text-foreground flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="text-primary h-3.5 w-3.5" />
                Actionable Recommendations
              </div>
              {lastResponse.recommendations.length === 0 ? (
                <p className="text-muted-foreground text-xs">No active recommendations required.</p>
              ) : (
                <div className="space-y-2">
                  {lastResponse.recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className="border-border/60 bg-secondary/20 space-y-1 rounded-md border p-2.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-foreground font-medium">{rec.title}</span>
                        <Badge
                          variant="outline"
                          className={
                            rec.priority === "CRITICAL"
                              ? "border-rose-500/30 bg-rose-500/10 font-mono text-[9px] text-rose-400"
                              : "border-border/60 bg-secondary/40 text-muted-foreground font-mono text-[9px]"
                          }
                        >
                          {rec.priority}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">{rec.explanation}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Evidence & Deep Inspection */}
            <div className="border-border/80 bg-card/60 space-y-2.5 rounded-lg border p-4">
              <div className="text-foreground flex items-center justify-between font-mono text-xs font-semibold uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <Layers className="text-primary h-3.5 w-3.5" />
                  Evidence Grounding & Why?
                </div>
                <button
                  onClick={() => setInspectTarget({ type: "health", id: "overall" })}
                  className="border-border/80 bg-secondary/40 text-foreground hover:bg-secondary rounded-md border px-2 py-0.5 font-mono text-[10px] font-medium transition-colors"
                >
                  Universal Inspector
                </button>
              </div>

              <div className="space-y-2">
                <div className="border-border/60 bg-secondary/20 text-muted-foreground space-y-1.5 rounded-md border p-2.5 text-xs">
                  <div className="flex justify-between">
                    <span>Evidence Strength:</span>
                    <span className="text-foreground font-mono font-semibold">
                      {lastResponse.evidence_strength}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Contributing Evidence IDs:</span>
                    <span className="text-foreground font-mono">
                      {lastResponse.evidence.length} citations
                    </span>
                  </div>
                </div>

                {/* Related Entities */}
                {lastResponse.related_entities.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <span className="text-muted-foreground font-mono text-[10px] font-semibold uppercase tracking-wider">
                      Related Entities:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {lastResponse.related_entities.map((ent, i) => (
                        <span
                          key={i}
                          className="border-border/60 bg-secondary/30 text-muted-foreground inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px]"
                        >
                          <FileCode className="text-muted-foreground h-3 w-3" />
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
