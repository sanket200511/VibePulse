export interface DemoTimelineItem {
  id: string;
  timestamp: string;
  title: string;
  type: "system" | "code" | "test" | "docs";
  description?: string;
}

export const demoTimeline: DemoTimelineItem[] = [
  {
    id: "1",
    timestamp: "09:00",
    title: "Started Observation",
    type: "system",
    description: "DepRadar daemon attached to workspace root",
  },
  {
    id: "2",
    timestamp: "09:15",
    title: "Created Observation Gate",
    type: "code",
    description: "Implemented filesystem observer watcher class",
  },
  {
    id: "3",
    timestamp: "10:30",
    title: "Added daemon sequence numbers",
    type: "code",
    description: "Ensured out-of-order event synchronization",
  },
  {
    id: "4",
    timestamp: "11:00",
    title: "Fixed retry logic",
    type: "code",
    description: "Handled temporary connection drops in endpoint client",
  },
  {
    id: "5",
    timestamp: "11:45",
    title: "Refactored publisher",
    type: "code",
    description: "Streamlined batch extraction queue processor",
  },
  {
    id: "6",
    timestamp: "12:15",
    title: "Passed 238 backend tests",
    type: "test",
    description: "All unit and integration suites green",
  },
  {
    id: "7",
    timestamp: "13:00",
    title: "Documentation completed",
    type: "docs",
    description: "VISUAL_LANGUAGE.md and REPLAY.md signed off",
  },
];
