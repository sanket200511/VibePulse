import type { Session } from "../pages/sessions/types";
import type { Timeline } from "../pages/sessions/timeline-types";
import type { Replay } from "../pages/sessions/replay-types";
import type { HealthReport } from "../pages/sessions/health-types";
import type { SessionProfile } from "../pages/sessions/insights-types";

// COHERENT STORY:
// Developer is building the DepRadar observability daemon.
// They had a completed session yesterday (session_vibesync_001) which has rich replay, health, timeline, and insights.
// They have an active session today (session_vibesync_002) which is what is shown on the main dashboard.

export const demoActiveSession: Session = {
  id: "session_vibesync_002",
  project_id: "project_vibesync_001",
  project_root: "d:/VibeSync",
  status: "ACTIVE",
  started_at: "2026-07-15T09:00:00Z",
  last_event_at: "2026-07-15T13:00:00Z",
  ended_at: null,
  git_branch: "main",
  event_count: 27,
  events_by_type: { code: 18, test: 6, docs: 3 },
  languages: { TypeScript: 92, JSON: 8 },
  duration_seconds: 14400,
  primary_language: "TypeScript",
  distinct_file_count: 5,
  summary: {
    headline: "Refactoring the filesystem observation pipeline",
    duration_seconds: 14400,
    event_count: 27,
    primary_language: "TypeScript",
    distinct_file_count: 5,
    dominant_event_type: "code",
  },
};

export const demoCompletedSession: Session = {
  id: "session_vibesync_001",
  project_id: "project_vibesync_001",
  project_root: "d:/VibeSync",
  status: "COMPLETED",
  started_at: "2026-07-14T10:00:00Z",
  last_event_at: "2026-07-14T13:00:00Z",
  ended_at: "2026-07-14T13:00:00Z",
  git_branch: "main",
  event_count: 45,
  events_by_type: { code: 30, test: 10, docs: 5 },
  languages: { TypeScript: 85, JSON: 15 },
  duration_seconds: 10800,
  primary_language: "TypeScript",
  distinct_file_count: 8,
  summary: {
    headline: "Initial observation client structure",
    duration_seconds: 10800,
    event_count: 45,
    primary_language: "TypeScript",
    distinct_file_count: 8,
    dominant_event_type: "code",
  },
};

export const demoSessionsList: Session[] = [demoActiveSession, demoCompletedSession];

export function computeDemoProjectIntelligence(projectId: string) {
  const sessions = demoSessionsList.filter((s) => s.project_id === projectId);
  if (sessions.length === 0) return null;

  sessions.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
  const first = sessions[sessions.length - 1]?.started_at ?? null;
  const latest = sessions[0]?.last_event_at ?? null;

  const totalSessions = sessions.length;
  let totalEvents = 0;
  const eventComposition: Record<string, number> = {};
  const languageActivity: Record<string, number> = {};
  const filesMap: Record<string, number> = {};

  const activitySeries = sessions.map((s) => {
    totalEvents += s.event_count;

    // Merge events by type
    for (const [k, v] of Object.entries(s.events_by_type)) {
      eventComposition[k] = (eventComposition[k] || 0) + (v as number);
    }
    // Merge languages
    for (const [k, v] of Object.entries(s.languages)) {
      languageActivity[k] = (languageActivity[k] || 0) + (v as number);
    }

    // Simulate some file counts since demo sessions don't have explicit file aggregates
    // Wait, demoSessions don't have .files in typescript, let's mock some based on the distinct_file_count
    if (s.id === "session_vibesync_001") {
      filesMap["src/observation/watcher.ts"] = 20;
      filesMap["src/daemon/index.ts"] = 10;
      filesMap["src/core/utils.ts"] = 15;
    } else {
      filesMap["src/observation/watcher.ts"] = (filesMap["src/observation/watcher.ts"] || 0) + 15;
      filesMap["src/api/client.ts"] = 12;
    }

    return {
      session_id: s.id,
      started_at: s.started_at,
      event_count: s.event_count,
      status: s.status,
    };
  });

  const frequentlyObservedFiles = Object.entries(filesMap)
    .sort((a, b) => b[1] - a[1])
    .map(([path, count]) => ({ path, event_count: count }))
    .slice(0, 50);

  return {
    project_id: projectId,
    observation_window: {
      first_observed_at: first,
      latest_observed_at: latest,
    },
    metrics: {
      total_sessions: totalSessions,
      total_events: totalEvents,
    },
    activity_series: activitySeries,
    event_composition: eventComposition,
    language_activity: languageActivity,
    frequently_observed_files: frequentlyObservedFiles,
  };
}

export const demoTimelineData: Timeline = {
  session_id: "session_vibesync_001",
  generated_at: "2026-07-14T13:05:00Z",
  entries: [
    {
      id: "entry_1",
      entry_kind: "MARKER",
      metadata: {
        timestamp: "2026-07-14T10:00:00Z",
        event_type: null,
        file_path: null,
        language: null,
        git_branch: "main",
        group_size: 1,
        group_span_seconds: null,
        member_event_ids: [],
        marker_kind: "SESSION_START",
        marker_detail: "Session started on branch 'main'",
      },
      insights: { analyzer_findings: {} },
    },
    {
      id: "entry_2",
      entry_kind: "EVENT",
      metadata: {
        timestamp: "2026-07-14T10:15:00Z",
        event_type: "code",
        file_path: "src/observation/watcher.ts",
        language: "TypeScript",
        git_branch: "main",
        group_size: 1,
        group_span_seconds: null,
        member_event_ids: ["ev_1"],
        marker_kind: null,
        marker_detail: null,
      },
      insights: {
        analyzer_findings: {
          complexity: { increase: true, message: "Added Watcher class constructor" },
        },
      },
    },
    {
      id: "entry_3",
      entry_kind: "EVENT",
      metadata: {
        timestamp: "2026-07-14T10:30:00Z",
        event_type: "code",
        file_path: "src/observation/publisher.ts",
        language: "TypeScript",
        git_branch: "main",
        group_size: 1,
        group_span_seconds: null,
        member_event_ids: ["ev_2"],
        marker_kind: null,
        marker_detail: null,
      },
      insights: { analyzer_findings: {} },
    },
    {
      id: "entry_4",
      entry_kind: "GROUP",
      metadata: {
        timestamp: "2026-07-14T11:00:00Z",
        event_type: "code",
        file_path: "src/observation/watcher.ts",
        language: "TypeScript",
        git_branch: "main",
        group_size: 12,
        group_span_seconds: 1800,
        member_event_ids: ["ev_3", "ev_4", "ev_5"],
        marker_kind: null,
        marker_detail: null,
      },
      insights: { analyzer_findings: {} },
    },
    {
      id: "entry_5",
      entry_kind: "EVENT",
      metadata: {
        timestamp: "2026-07-14T11:45:00Z",
        event_type: "test",
        file_path: "src/observation/__tests__/watcher.test.ts",
        language: "TypeScript",
        git_branch: "main",
        group_size: 1,
        group_span_seconds: null,
        member_event_ids: ["ev_6"],
        marker_kind: null,
        marker_detail: null,
      },
      insights: { analyzer_findings: {} },
    },
    {
      id: "entry_6",
      entry_kind: "EVENT",
      metadata: {
        timestamp: "2026-07-14T12:30:00Z",
        event_type: "docs",
        file_path: "docs/design/VISUAL_LANGUAGE.md",
        language: "Markdown",
        git_branch: "main",
        group_size: 1,
        group_span_seconds: null,
        member_event_ids: ["ev_7"],
        marker_kind: null,
        marker_detail: null,
      },
      insights: { analyzer_findings: {} },
    },
    {
      id: "entry_7",
      entry_kind: "MARKER",
      metadata: {
        timestamp: "2026-07-14T13:00:00Z",
        event_type: null,
        file_path: null,
        language: null,
        git_branch: "main",
        group_size: 1,
        group_span_seconds: null,
        member_event_ids: [],
        marker_kind: "SESSION_END",
        marker_detail: "Session completed naturally",
      },
      insights: { analyzer_findings: {} },
    },
  ],
  outcome: {
    duration_seconds: 10800,
    event_count: 45,
    distinct_file_count: 8,
    primary_language: "TypeScript",
    languages: { TypeScript: 85, Markdown: 15 },
    largest_change: {
      file_path: "src/observation/watcher.ts",
      event_count: 24,
    },
    session_summary: null,
  },
};

export const demoInsightsData: SessionProfile = {
  session_id: "session_vibesync_001",
  generated_at: "2026-07-14T13:05:00Z",
  categories: {
    DEVELOPMENT_PATTERNS: [
      {
        id: "ins_1",
        category: "DEVELOPMENT_PATTERNS",
        generator_name: "pattern_analyzer",
        generator_version: 1,
        headline: "File Concentration",
        evidence: "Activity was concentrated in src/observation/watcher.ts (24 events).",
        metrics: { file: "watcher.ts", events: 24 },
      },
    ],
    SESSION_STATISTICS: [
      {
        id: "ins_2",
        category: "SESSION_STATISTICS",
        generator_name: "stats_analyzer",
        generator_version: 1,
        headline: "Language Distribution",
        evidence: "Session consisted of 85% TypeScript events and 15% Markdown events.",
        metrics: {},
      },
    ],
  },
};

export const demoReplayData: Replay = {
  // ... existing replay data logic is below, do not modify ...

  session_id: "session_vibesync_001",
  generated_at: "2026-07-14T13:05:00Z",
  frames: [
    {
      id: "f_0",
      index: 0,
      timestamp: "2026-07-14T10:00:00Z",
      kind: "MARKER",
      metadata: demoTimelineData.entries[0]!.metadata,
      insights: demoTimelineData.entries[0]!.insights,
      chapter_id: 0,
      is_chapter_start: true,
    },
    {
      id: "f_1",
      index: 1,
      timestamp: "2026-07-14T10:15:00Z",
      kind: "EVENT",
      metadata: demoTimelineData.entries[1]!.metadata,
      insights: demoTimelineData.entries[1]!.insights,
      chapter_id: 1,
      is_chapter_start: true,
    },
    {
      id: "f_2",
      index: 2,
      timestamp: "2026-07-14T10:30:00Z",
      kind: "EVENT",
      metadata: demoTimelineData.entries[2]!.metadata,
      insights: demoTimelineData.entries[2]!.insights,
      chapter_id: 1,
      is_chapter_start: false,
    },
    {
      id: "f_3",
      index: 3,
      timestamp: "2026-07-14T11:00:00Z",
      kind: "GROUP",
      metadata: demoTimelineData.entries[3]!.metadata,
      insights: demoTimelineData.entries[3]!.insights,
      chapter_id: 1,
      is_chapter_start: false,
    },
    {
      id: "f_4",
      index: 4,
      timestamp: "2026-07-14T11:45:00Z",
      kind: "EVENT",
      metadata: demoTimelineData.entries[4]!.metadata,
      insights: demoTimelineData.entries[4]!.insights,
      chapter_id: 2,
      is_chapter_start: true,
    },
    {
      id: "f_5",
      index: 5,
      timestamp: "2026-07-14T12:30:00Z",
      kind: "EVENT",
      metadata: demoTimelineData.entries[5]!.metadata,
      insights: demoTimelineData.entries[5]!.insights,
      chapter_id: 2,
      is_chapter_start: false,
    },
  ],
  chapters: [
    {
      id: 0,
      label: "Session Started",
      kind: "SESSION_STARTED",
      start_frame_index: 0,
      end_frame_index: 0,
      start_timestamp: "2026-07-14T10:00:00Z",
      end_timestamp: "2026-07-14T10:00:00Z",
      duration_seconds: 0,
      summary_metrics: {},
    },
    {
      id: 1,
      label: "Filesystem Watcher Development",
      kind: "WORK",
      start_frame_index: 1,
      end_frame_index: 3,
      start_timestamp: "2026-07-14T10:15:00Z",
      end_timestamp: "2026-07-14T11:30:00Z",
      duration_seconds: 4500,
      summary_metrics: {},
    },
    {
      id: 2,
      label: "Validation & Documentation",
      kind: "SESSION_COMPLETED",
      start_frame_index: 4,
      end_frame_index: 5,
      start_timestamp: "2026-07-14T11:45:00Z",
      end_timestamp: "2026-07-14T12:30:00Z",
      duration_seconds: 2700,
      summary_metrics: {},
    },
  ],
};

export const demoHealthData: HealthReport = {
  session_id: "session_vibesync_001",
  generated_at: "2026-07-14T13:05:00Z",
  metrics: {
    FOCUS: {
      id: "hm_1",
      category: "FOCUS",
      generator_name: "focus_scorer",
      generator_version: 1,
      label: "Activity Density",
      headline: "High-Activity Window",
      evidence: "35 observed events occurred between 10:15 and 11:30.",
      metrics: { events: 35, duration_minutes: 75 },
    },
    STABILITY: {
      id: "hm_2",
      category: "STABILITY",
      generator_name: "stability_analyzer",
      generator_version: 1,
      label: "Test Verification",
      headline: "Test Activity Observed",
      evidence: "10 test-related events were recorded alongside 30 code-related events.",
      metrics: { code_to_test_ratio: "3:1" },
    },
  },
  summary: {
    narrative:
      "Session activity was predominantly grouped in the first 90 minutes, with a verifiable transition to testing and documentation toward the end.",
    guidance: [],
  },
};

export interface DemoMilestone {
  id: string;
  time: string;
  title: string;
  description: string;
  completed: boolean;
}

export const demoMilestones: DemoMilestone[] = [
  {
    id: "m1",
    time: "2026-07-14T10:00:00Z",
    title: "Watcher Initialization",
    description: "Successfully initialized the local filesystem watcher daemon",
    completed: true,
  },
  {
    id: "m2",
    time: "2026-07-14T10:30:00Z",
    title: "Sequence Synchronization",
    description: "Daemon event ordering and sequence numbers synchronized",
    completed: true,
  },
  {
    id: "m3",
    time: "2026-07-14T11:00:00Z",
    title: "Retry Logic Refactoring",
    description: "Refactored publisher retry logic to stabilize telemetry pipes",
    completed: true,
  },
  {
    id: "m4",
    time: "2026-07-14T12:15:00Z",
    title: "Test Suite Pass",
    description: "Verified all 238 backend test targets passing",
    completed: true,
  },
  {
    id: "m5",
    time: "2026-07-14T13:00:00Z",
    title: "Spec Sign-off",
    description: "Merged and finalized VISUAL_LANGUAGE.md & REPLAY.md",
    completed: true,
  },
];
