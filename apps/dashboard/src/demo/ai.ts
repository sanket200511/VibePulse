export interface DemoAiInsight {
  id: string;
  category: "Reflection" | "Pattern" | "Learning";
  headline: string;
  text: string;
}

export const demoAiInsights: DemoAiInsight[] = [
  {
    id: "ai-1",
    category: "Pattern",
    headline: "Architectural Focus",
    text: "You spent significantly more time improving architecture than writing new features today. That usually results in fewer integration issues later.",
  },
  {
    id: "ai-2",
    category: "Reflection",
    headline: "Daily Rhythm",
    text: "Your focus blocks peaked in late morning during the watcher refactor, followed by a steady integration phase in the afternoon.",
  },
];
