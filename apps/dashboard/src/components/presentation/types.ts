export interface TourStep {
  id: string;
  title: string;
  description: string;
  routeResolver: (context: { projectId?: string; sessionId?: string }) => string;
  target: string; // The data-tour value (e.g. "project-pulse")
  placement: "top" | "bottom" | "left" | "right" | "center";
  waitFor?: string; // Optional selector to wait for before entering
  beforeEnter?: () => Promise<void> | void;
  afterEnter?: () => Promise<void> | void;
  beforeLeave?: () => Promise<void> | void;
  afterLeave?: () => Promise<void> | void;
}

export type EngineState =
  | "IDLE"
  | "STARTING"
  | "WAITING_FOR_TARGET"
  | "SHOWING_TOOLTIP"
  | "TRANSITIONING"
  | "COMPLETED"
  | "CANCELLED"
  | "ERROR";

export interface PresentationState {
  state: EngineState;
  running: boolean;
  stepIndex: number;
  currentStep: TourStep | null;
  projectId?: string | undefined;
  sessionId?: string | undefined;

  next: () => void;
  previous: () => void;
  start: (options?: { projectId?: string; sessionId?: string }) => void;
  stop: () => void;
  goTo: (step: number) => void;
  reportError: (error: Error) => void;
  targetFound: () => void;
}
