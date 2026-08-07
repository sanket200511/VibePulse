import type { CanonicalEventViewModel } from "./viewModel";
import type {
  InvestigationResult,
  InvestigationArchitectureChange,
  InvestigationSecurityFinding,
} from "../../pages/investigation/useInvestigation";
import type { AIInteractionTimelineEntry } from "../../pages/projects/useAIProvenance";
import type { ArchitectureTimelineEntry } from "../../pages/sessions/useSessionArchitectureTimeline";

export function mapInvestigationResultToViewModel(
  result: InvestigationResult,
): CanonicalEventViewModel {
  return {
    id: result.id,
    timestamp: result.timestamp,
    projectId: result.project_root,
    sessionId: result.session_id,
    eventType: result.event_type,
    title: result.summary,
    description: "",
    filePath: result.file_path,
    language: result.language,
    architectureChanges: result.architecture_changes.map((a: InvestigationArchitectureChange) => ({
      kind: a.kind,
      symbol: a.symbol,
    })),
    securityFindings: result.security_findings.map((s: InvestigationSecurityFinding) => ({
      severity: s.severity,
      ruleId: s.rule_id,
      message: s.message,
    })),
    aiObservation: result.ai_event
      ? {
          provider: result.ai_event.provider,
          model: result.ai_event.model,
          interactionType: result.ai_event.interaction_type || "Observation",
        }
      : undefined,
    replayUrl: result.replay_link || undefined,
    dnaUrl: result.file_path
      ? `/projects/${result.project_root}/files/${encodeURIComponent(result.file_path)}`
      : undefined,
    timeMachineUrl: `/projects/${result.project_root}/story`,
  };
}

export function mapAIProvenanceToViewModel(
  entry: AIInteractionTimelineEntry,
  projectId?: string,
): CanonicalEventViewModel {
  return {
    id: entry.event_id,
    timestamp: entry.timestamp,
    projectId: projectId || "",
    sessionId: entry.conversation_id || "", // Not always available, but used roughly
    eventType: entry.event_type,
    title: `AI Interaction: ${entry.interaction_type || "Prompt"}`,
    description: `${entry.tool_count ? `Executed ${entry.tool_count} tools.` : "Observed AI Activity."}`,
    architectureChanges:
      entry.architecture_events_afterwards?.map((e) => ({
        kind: e.event_type,
        symbol: "Multiple", // Approximate
      })) || [],
    securityFindings:
      entry.security_events_afterwards?.map((e) => ({
        severity: "UNKNOWN",
        ruleId: e.event_type,
        message: "Observed post-AI security event",
      })) || [],
    aiObservation: {
      provider: entry.provider || "Unknown",
      model: entry.model || "Unknown",
      interactionType: entry.interaction_type || "Interaction",
    },
    replayUrl: undefined,
    dnaUrl: undefined,
    timeMachineUrl: projectId ? `/projects/${projectId}/story` : undefined,
  };
}

export function mapArchitectureTimelineToViewModel(
  entry: ArchitectureTimelineEntry,
  projectId: string,
  sessionId?: string,
): CanonicalEventViewModel {
  const isSecurity = entry.kind === "SECURITY_FINDING";

  return {
    id: entry.id,
    timestamp: entry.timestamp,
    projectId,
    sessionId: sessionId || "",
    eventType: entry.kind,
    title: entry.title,
    description: entry.description || "",
    filePath: entry.related_file,
    architectureChanges: !isSecurity
      ? [
          {
            kind: entry.kind,
            symbol: entry.title,
          },
        ]
      : [],
    securityFindings: isSecurity
      ? [
          {
            severity: entry.severity || "UNKNOWN",
            ruleId: entry.title,
            message: entry.description || "Security finding observed",
          },
        ]
      : [],
    replayUrl:
      sessionId && entry.related_event_id
        ? `/sessions/${sessionId}/replay?event=${entry.related_event_id}`
        : undefined,
    dnaUrl: entry.related_file
      ? `/projects/${projectId}/files/${encodeURIComponent(entry.related_file)}`
      : undefined,
    timeMachineUrl: undefined,
  };
}
