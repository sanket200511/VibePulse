export interface ArchitectureChangeViewModel {
  kind: string;
  symbol: string;
}

export interface SecurityFindingViewModel {
  severity: string;
  ruleId: string;
  message: string;
}

export interface AIPromptViewModel {
  provider: string;
  model: string;
  interactionType: string;
}

export interface CanonicalEventViewModel {
  id: string;
  timestamp: string;
  projectId: string;
  sessionId: string;
  eventType: string; // e.g. "FILE_MODIFIED", "AI_TOOL_EXECUTED", "SESSION_START"
  title: string;
  description: string;

  filePath?: string | null | undefined;
  language?: string | null | undefined;

  architectureChanges: ArchitectureChangeViewModel[];
  securityFindings: SecurityFindingViewModel[];
  aiObservation?: AIPromptViewModel | undefined;

  // Shortcuts
  replayUrl?: string | undefined;
  dnaUrl?: string | undefined;
  timeMachineUrl?: string | undefined;
}
