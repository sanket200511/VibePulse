import { useTimeMachine } from "./TimeMachineContext";
import { PlusCircle, MinusCircle, ShieldAlert, Code2, Import, ListTodo } from "lucide-react";

export function EvolutionDiff() {
  const { mode, evolutionDiff } = useTimeMachine();

  if (mode === "LIVE" || !evolutionDiff) {
    return null;
  }

  // If there are no diff entries, it means we are at the very end (Now) or no events occurred after
  if (evolutionDiff.entries.length === 0) {
    return (
      <div className="bg-card border-border rounded-xl border p-6 text-center shadow-sm">
        <h3 className="text-primary-text mb-2 text-lg font-bold">Up to date</h3>
        <p className="text-secondary-text text-sm">
          You are viewing the present state of the project.
        </p>
      </div>
    );
  }

  const items = [
    {
      label: "Functions Added",
      value: evolutionDiff.addedFunctions,
      icon: PlusCircle,
      color: "text-green-500",
    },
    {
      label: "Functions Removed",
      value: evolutionDiff.removedFunctions,
      icon: MinusCircle,
      color: "text-red-500",
    },
    {
      label: "Classes Added",
      value: evolutionDiff.addedClasses,
      icon: Code2,
      color: "text-blue-500",
    },
    {
      label: "Classes Removed",
      value: evolutionDiff.removedClasses,
      icon: Code2,
      color: "text-red-500",
    },
    {
      label: "Imports Added",
      value: evolutionDiff.addedImports,
      icon: Import,
      color: "text-purple-500",
    },
    {
      label: "Imports Removed",
      value: evolutionDiff.removedImports,
      icon: Import,
      color: "text-orange-500",
    },
    {
      label: "Security Findings",
      value: evolutionDiff.securityFindings,
      icon: ShieldAlert,
      color: "text-red-600",
    },
    {
      label: "TODOs Resolved",
      value: evolutionDiff.resolvedTodos,
      icon: ListTodo,
      color: "text-green-500",
    },
    {
      label: "TODOs Introduced",
      value: evolutionDiff.introducedTodos,
      icon: ListTodo,
      color: "text-yellow-500",
    },
  ].filter((i) => i.value > 0);

  return (
    <div
      data-tour="evolution-diff"
      className="bg-card border-border animate-in fade-in slide-in-from-bottom-2 rounded-xl border p-6 shadow-sm duration-300"
    >
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-primary-text text-lg font-bold tracking-tight">Evolution Diff</h3>
        <span className="text-muted-foreground bg-muted-color/30 rounded px-2 py-1 text-xs font-semibold uppercase tracking-wider">
          Changes Since Selected Time
        </span>
      </div>

      {items.length === 0 ? (
        <p className="text-secondary-text text-sm">
          No deterministic structural changes found in the subsequent timeline.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {items.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="bg-background border-border flex items-center justify-between rounded-lg border p-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className={`bg-muted-color/20 rounded p-2 ${item.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-secondary-text text-xs font-bold uppercase tracking-wider">
                    {item.label}
                  </span>
                </div>
                <span className="text-primary-text font-mono text-lg font-bold">{item.value}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
