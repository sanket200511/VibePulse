import { useDemoMode } from "../../demo/config";
import { Sparkles, Activity } from "lucide-react";

export function PresentationToggle() {
  const { isDemo, toggleDemoMode } = useDemoMode();

  return (
    <div className="border-border bg-muted-color/30 flex items-center rounded-lg border p-0.5 text-xs font-medium">
      <button
        onClick={() => toggleDemoMode(false)}
        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-all duration-200 ${
          !isDemo
            ? "bg-background text-primary-text shadow-sm"
            : "text-secondary-text hover:text-primary-text"
        }`}
        title="Switch to Live mode (uses backend APIs)"
      >
        <Activity className={`h-3.5 w-3.5 ${!isDemo ? "text-success-color" : ""}`} />
        <span className="hidden sm:inline">Live</span>
      </button>
      <button
        onClick={() => toggleDemoMode(true)}
        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-all duration-200 ${
          isDemo
            ? "bg-background text-primary-text shadow-sm"
            : "text-secondary-text hover:text-primary-text"
        }`}
        title="Switch to Demo mode (uses local mock data)"
      >
        <Sparkles className={`h-3.5 w-3.5 ${isDemo ? "text-accent-color" : ""}`} />
        <span className="hidden sm:inline">Demo</span>
      </button>
    </div>
  );
}
