import type { Project } from "../pages/projects/types";

export interface DemoProjectLanguage {
  name: string;
  percentage: number;
  color: string;
}

export interface DemoProject extends Project {
  // Demo-specific mock properties for presentation until backend supports them
  status: "active" | "observing" | "idle";
  languages: DemoProjectLanguage[];
  lastActive: string;
}

export const demoProjectVibePulse: DemoProject = {
  id: "project_vibesync_001",
  display_name: "VibePulse",
  root_path: "d:/VibeSync",
  created_at: "2026-07-10T09:00:00Z",
  updated_at: "2026-07-25T09:00:00Z",
  // Mock extensions
  lastActive: "Just now",
  status: "active",
  languages: [
    { name: "TypeScript", percentage: 92, color: "bg-blue-500" },
    { name: "CSS", percentage: 8, color: "bg-pink-500" },
  ],
};

export const demoProjectAquaPulse: DemoProject = {
  id: "project_aquapulse_002",
  display_name: "AquaPulse",
  root_path: "d:/AquaPulse",
  created_at: "2026-07-12T09:00:00Z",
  updated_at: "2026-07-20T09:00:00Z",
  // Mock extensions
  lastActive: "2 hours ago",
  status: "observing",
  languages: [{ name: "TypeScript", percentage: 100, color: "bg-blue-500" }],
};

export const demoProjects: DemoProject[] = [demoProjectVibePulse, demoProjectAquaPulse];
