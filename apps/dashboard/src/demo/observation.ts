export interface DemoObservation {
  active: boolean;
  fileWatchersActive: boolean;
  daemonConnected: boolean;
  workspacePath: string;
}

export const demoObservation: DemoObservation = {
  active: true,
  fileWatchersActive: true,
  daemonConnected: true,
  workspacePath: "d:/VibeSync",
};
