export interface DemoSession {
  id: string;
  status: "ACTIVE" | "COMPLETED";
  durationMinutes: number;
  primaryLanguage: string;
  projectName: string;
}

export const demoSession: DemoSession = {
  id: "demo-session-current",
  status: "ACTIVE",
  durationMinutes: 240,
  primaryLanguage: "TypeScript",
  projectName: "VibePulse",
};
