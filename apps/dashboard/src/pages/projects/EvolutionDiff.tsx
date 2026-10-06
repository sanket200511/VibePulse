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
      <div className="border-border/80 bg-card/60 rounded-lg border p-4 text-center shadow-sm">
        <h3 className="text-foreground text-sm font-semibold">Up to date</h3>
        <p className="text-muted-foreground mt-1 font-mono text-xs">
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
      color: "text-emerald-400",
    },
    {
      label: "Functions Removed",
      value: evolutionDiff.removedFunctions,
      icon: MinusCircle,
      color: "text-rose-400",
    },
    {
      label: "Classes Added",
      value: evolutionDiff.addedClasses,
      icon: Code2,
      color: "text-cyan-400",
    },
    {
      label: "Classes Removed",
      value: evolutionDiff.removedClasses,
      icon: Code2,
      color: "text-rose-400",
    },
    {
      label: "Imports Added",
      value: evolutionDiff.addedImports,
      icon: Import,
      color: "text-purple-400",
    },
    {
      label: "Imports Removed",
      value: evolutionDiff.removedImports,
      icon: Import,
      color: "text-amber-400",
    },
    {
      label: "Security Findings",
      value: evolutionDiff.securityFindings,
      icon: ShieldAlert,
      color: "text-rose-400",
    },
    {
      label: "TODOs Resolved",
      value: evolutionDiff.resolvedTodos,
      icon: ListTodo,
      color: "text-emerald-400",
    },
    {
      label: "TODOs Introduced",
      value: evolutionDiff.introducedTodos,
      icon: ListTodo,
      color: "text-amber-400",
    },
  ].filter((i) => i.value > 0);

  return (
    <div
      data-tour="evolution-diff"
      className="border-border/80 bg-card/60 rounded-lg border p-4 shadow-sm"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-foreground text-sm font-semibold tracking-tight">Evolution Diff</h3>
        <span className="border-border/60 bg-secondary/40 text-muted-foreground rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider">
          Changes Since Selected Time
        </span>
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground font-mono text-xs">
          No deterministic structural changes found in the subsequent timeline.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
          {items.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="border-border/80 bg-secondary/20 flex items-center justify-between rounded-md border p-2.5 shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`border-border/60 bg-secondary/40 rounded border p-1.5 ${item.color}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-muted-foreground font-mono text-[10px] font-medium uppercase tracking-wider">
                    {item.label}
                  </span>
                </div>
                <span className="text-foreground font-mono text-sm font-bold tabular-nums">
                  {item.value}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
