export interface DemoProjectLanguage {
  name: string;
  percentage: number;
  color: string;
}

export interface DemoProject {
  id: string;
  name: string;
  path: string;
  watchedFiles: number;
  lastActive: string;
  status: "active" | "observing" | "idle";
  languages: DemoProjectLanguage[];
  startedObserving: string;
  lastAnalyzed: string;
  projectHealth: string;
  workspaceSize: string;
}

export const demoProjects: DemoProject[] = [
  {
    id: "p1",
    name: "VibePulse",
    path: "d:/VibeSync",
    watchedFiles: 142,
    lastActive: "Just now",
    status: "active",
    languages: [
      { name: "TypeScript", percentage: 92, color: "bg-blue-500" },
      { name: "CSS", percentage: 8, color: "bg-pink-500" },
    ],
    startedObserving: "Jul 10, 2026",
    lastAnalyzed: "5 mins ago",
    projectHealth: "98%",
    workspaceSize: "1.2 MB",
  },
  {
    id: "p2",
    name: "AquaPulse",
    path: "d:/AquaPulse",
    watchedFiles: 89,
    lastActive: "2 hours ago",
    status: "observing",
    languages: [{ name: "TypeScript", percentage: 100, color: "bg-blue-500" }],
    startedObserving: "Jul 12, 2026",
    lastAnalyzed: "2 hours ago",
    projectHealth: "96%",
    workspaceSize: "840 KB",
  },
  {
    id: "p3",
    name: "HackNagpur",
    path: "d:/HackNagpur",
    watchedFiles: 56,
    lastActive: "Yesterday",
    status: "idle",
    languages: [{ name: "JavaScript", percentage: 100, color: "bg-amber-500" }],
    startedObserving: "Jun 24, 2026",
    lastAnalyzed: "Yesterday",
    projectHealth: "90%",
    workspaceSize: "450 KB",
  },
];
