import type { TourStep } from "./types";

export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to DepRadar",
    description:
      "DepRadar is an Engineering Observability Platform. It doesn't rely on self-reported status or AI-inferred productivity. Everything you see is deterministically derived from absolute reality.",
    routeResolver: () => "/",
    target: "presentation-welcome", // A hidden or full-screen target
    placement: "center",
  },
  {
    id: "workspace-overview",
    title: "Workspace Connections",
    description:
      "DepRadar connects directly to the repositories you are currently working on. A background daemon observes the file system in real-time.",
    routeResolver: () => "/",
    target: "workspace-projects",
    placement: "right",
  },
  {
    id: "project-story",
    title: "Engineering Story",
    description:
      "Selecting a project opens the Engineering Story. This is a unified view of what actually happened during development.",
    routeResolver: (ctx) => `/projects/${ctx.projectId || "demo-project"}/story`,
    target: "engineering-story-header",
    placement: "bottom",
  },
  {
    id: "project-pulse",
    title: "Project Pulse",
    description:
      "The Pulse visualizes engineering momentum. Each node represents an active session. DepRadar automatically groups continuous work into logical sessions.",
    routeResolver: (ctx) => `/projects/${ctx.projectId || "demo-project"}/story`,
    target: "project-pulse",
    placement: "bottom",
  },
  {
    id: "project-intelligence",
    title: "Deterministic Intelligence",
    description:
      "Metrics are derived purely from AST changes and language heuristics. There are no AI hallucinations—only observed facts.",
    routeResolver: (ctx) => `/projects/${ctx.projectId || "demo-project"}/story`,
    target: "project-intelligence",
    placement: "top",
  },
  {
    id: "architecture-timeline",
    title: "Architecture Timeline",
    description:
      "DepRadar tells the story of your software. The Static Analysis engine detects functions added, classes removed, and structural shifts.",
    routeResolver: (ctx) => `/projects/${ctx.projectId || "demo-project"}/story`,
    target: "architecture-timeline",
    placement: "left",
  },
  {
    id: "ai-provenance",
    title: "AI Provenance Engine",
    description:
      "DepRadar observes AI interactions—prompts, responses, and tool executions—and deterministically correlates them to the exact architectural shifts and security events that followed, without relying on AI to guess intent.",
    routeResolver: (ctx) => `/projects/${ctx.projectId || "demo-project"}/ai-provenance`,
    target: "ai-provenance", // Can point to a header element
    placement: "bottom",
  },
  {
    id: "security-guardian",
    title: "Security Guardian",
    description:
      "The Live Security Guardian observes code patterns as they are written, immediately exposing risks directly in the timeline without blocking your IDE.",
    routeResolver: (ctx) => `/projects/${ctx.projectId || "demo-project"}/story`,
    target: "security-evolution",
    placement: "left",
  },
  {
    id: "replay-engine",
    title: "Replay Engine",
    description:
      "Every architectural milestone acts as a chronological anchor. The Replay Engine synchronizes directly to the moment an event occurred.",
    routeResolver: (ctx) => `/sessions/${ctx.sessionId || "session-demo"}/replay`,
    target: "replay-scrubber",
    placement: "top",
  },
  {
    id: "time-machine",
    title: "Engineering Time Machine",
    description:
      "The Time Machine reconstructs the codebase history. Slide back in time to deterministically filter future observations.",
    routeResolver: (ctx) => `/projects/${ctx.projectId || "demo-project"}/story`,
    target: "time-machine-scrubber",
    placement: "bottom",
  },
  {
    id: "engineering-investigation",
    title: "Investigation Engine",
    description:
      "A powerful command palette to search, filter, and discover engineering context across Time, Files, Security, AI, and Architecture—all deterministically.",
    routeResolver: (ctx) => `/projects/${ctx.projectId || "demo-project"}/investigation`,
    target: "investigation",
    placement: "bottom",
  },
  {
    id: "evolution-diff",
    title: "Evolution Diff",
    description:
      "At any point in time, the system compares the selected past state to the present, surfacing exactly how the software evolved.",
    routeResolver: (ctx) => `/projects/${ctx.projectId || "demo-project"}/story`,
    target: "evolution-diff",
    placement: "top",
  },
  {
    id: "engineering-dna",
    title: "Engineering DNA",
    description:
      "This is the complete observed life of a software file. Every mutation, every refactor, every security finding and every structural evolution is reconstructed from deterministic engineering evidence.",
    routeResolver: (ctx) =>
      `/projects/${ctx.projectId || "demo-project"}/files/${encodeURIComponent("src/main.ts")}`,
    target: "dna-biography",
    placement: "left",
  },
  {
    id: "live-observability",
    title: "Live Observability",
    description:
      "DepRadar is entirely reactive. As soon as you save a file, the timeline patches, the pulse animates, and the story updates—live.",
    routeResolver: (ctx) => `/projects/${ctx.projectId || "demo-project"}/story`,
    target: "live-observability-indicator",
    placement: "bottom",
  },
  {
    id: "summary",
    title: "Demo Complete",
    description:
      "You've seen the power of deterministic engineering observability. DepRadar restores truth to software development.",
    routeResolver: () => `/`,
    target: "presentation-summary",
    placement: "center",
  },
];
