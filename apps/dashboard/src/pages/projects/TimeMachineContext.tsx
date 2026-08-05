import React, { createContext, useContext, useMemo, useState } from "react";
import type { Session } from "../sessions/types";
import type { ArchitectureTimelineEntry } from "../sessions/useSessionArchitectureTimeline";
import type { ProjectIntelligence } from "./types";

export type TimeMachineMode = "LIVE" | "TIME_TRAVEL";

export interface EvolutionDiff {
  addedFunctions: number;
  removedFunctions: number;
  addedClasses: number;
  removedClasses: number;
  addedImports: number;
  removedImports: number;
  securityFindings: number;
  resolvedTodos: number;
  introducedTodos: number;
  // Store the actual diff entries if detailed rendering is needed
  entries: ArchitectureTimelineEntry[];
}

export interface TimeMachineState {
  mode: TimeMachineMode;
  selectedTime: number | null;
  selectedMilestoneId: string | undefined;
  isPlaying: boolean;

  // The engine derived read models
  visibleSessions: Session[];
  visibleEntries: ArchitectureTimelineEntry[];
  visibleIntelligence: ProjectIntelligence | null;
  evolutionDiff: EvolutionDiff | null;

  // Raw bounds for the scrubber
  minTime: number;
  maxTime: number;
  rawEntries: ArchitectureTimelineEntry[];

  // Actions
  setMode: (mode: TimeMachineMode) => void;
  setSelectedTime: (time: number | null) => void;
  setSelectedMilestoneId: (id: string | undefined) => void;
  setIsPlaying: (playing: boolean) => void;
}

const TimeMachineContext = createContext<TimeMachineState | null>(null);

export function useTimeMachine() {
  const ctx = useContext(TimeMachineContext);
  if (!ctx) {
    throw new Error("useTimeMachine must be used within a TimeMachineProvider");
  }
  return ctx;
}

interface TimeMachineProviderProps {
  children: React.ReactNode;
  rawSessions: Session[];
  rawEntries: ArchitectureTimelineEntry[];
  rawIntelligence: ProjectIntelligence | null;
}

export function TimeMachineProvider({
  children,
  rawSessions,
  rawEntries,
  rawIntelligence,
}: TimeMachineProviderProps) {
  const [mode, setMode] = useState<TimeMachineMode>("LIVE");
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | undefined>();
  const [isPlaying, setIsPlaying] = useState(false);

  // Compute the absolute bounds
  const minTime = useMemo(() => {
    if (rawEntries.length > 0 && rawEntries[0]) return new Date(rawEntries[0].timestamp).getTime();
    if (rawSessions.length > 0 && rawSessions[rawSessions.length - 1])
      return new Date(rawSessions[rawSessions.length - 1]!.started_at).getTime();
    return Date.now();
  }, [rawEntries, rawSessions]);

  const maxTime = useMemo(() => {
    if (rawEntries.length > 0 && rawEntries[rawEntries.length - 1])
      return new Date(rawEntries[rawEntries.length - 1]!.timestamp).getTime();
    if (rawSessions.length > 0 && rawSessions[0])
      return new Date(rawSessions[0]!.last_event_at).getTime();
    return Date.now();
  }, [rawEntries, rawSessions]);

  // Compute sliced views
  const effectiveTime = mode === "LIVE" || selectedTime === null ? Date.now() : selectedTime;

  const visibleEntries = useMemo(() => {
    if (mode === "LIVE") return rawEntries;
    return rawEntries.filter((e) => new Date(e.timestamp).getTime() <= effectiveTime);
  }, [rawEntries, effectiveTime, mode]);

  const visibleSessions = useMemo(() => {
    if (mode === "LIVE") return rawSessions;
    // Keep sessions that STARTED before or at the effective time
    return rawSessions.filter((s) => new Date(s.started_at).getTime() <= effectiveTime);
  }, [rawSessions, effectiveTime, mode]);

  const visibleIntelligence = useMemo(() => {
    if (!rawIntelligence) return null;
    if (mode === "LIVE") return rawIntelligence;

    // Filter the series
    const visibleSeries = rawIntelligence.activity_series.filter(
      (s) => new Date(s.started_at).getTime() <= effectiveTime,
    );

    return {
      ...rawIntelligence,
      activity_series: visibleSeries,
      metrics: {
        ...(rawIntelligence.metrics || {}),
        total_sessions: visibleSeries.length,
        total_events: visibleSeries.reduce((acc, s) => acc + s.event_count, 0),
      },
    };
  }, [rawIntelligence, effectiveTime, mode]);

  // Compute Evolution Diff (What happened AFTER the selected time)
  const evolutionDiff = useMemo<EvolutionDiff | null>(() => {
    if (mode === "LIVE" || selectedTime === null) return null;

    // Diff entries are those that occurred AFTER selectedTime
    const diffEntries = rawEntries.filter((e) => new Date(e.timestamp).getTime() > effectiveTime);

    const diff: EvolutionDiff = {
      addedFunctions: 0,
      removedFunctions: 0,
      addedClasses: 0,
      removedClasses: 0,
      addedImports: 0,
      removedImports: 0,
      securityFindings: 0,
      resolvedTodos: 0,
      introducedTodos: 0,
      entries: diffEntries,
    };

    for (const e of diffEntries) {
      if (e.kind === "SECURITY_FINDING") {
        diff.securityFindings++;
      } else if (e.kind === "CODE_EVOLUTION") {
        const t = e.title.toLowerCase();
        if (t.includes("function") && t.includes("added")) diff.addedFunctions++;
        else if (t.includes("function") && t.includes("removed")) diff.removedFunctions++;
        else if (t.includes("class") && t.includes("added")) diff.addedClasses++;
        else if (t.includes("class") && t.includes("removed")) diff.removedClasses++;
        else if (t.includes("import") && t.includes("added")) diff.addedImports++;
        else if (t.includes("import") && t.includes("removed")) diff.removedImports++;
        else if (t.includes("todo") && t.includes("resolved")) diff.resolvedTodos++;
        else if (t.includes("todo") && t.includes("introduced")) diff.introducedTodos++;
      }
    }

    return diff;
  }, [rawEntries, effectiveTime, mode, selectedTime]);

  // If in TIME_TRAVEL but selectedTime is null, default to minTime
  // We use useEffect to push this state down cleanly
  React.useEffect(() => {
    if (mode === "TIME_TRAVEL" && selectedTime === null) {
      setSelectedTime(maxTime);
    }
  }, [mode, selectedTime, maxTime]);

  const value: TimeMachineState = {
    mode,
    selectedTime,
    selectedMilestoneId,
    isPlaying,
    visibleSessions,
    visibleEntries,
    visibleIntelligence,
    evolutionDiff,
    minTime,
    maxTime,
    rawEntries,
    setMode,
    setSelectedTime,
    setSelectedMilestoneId,
    setIsPlaying,
  };

  return <TimeMachineContext.Provider value={value}>{children}</TimeMachineContext.Provider>;
}
