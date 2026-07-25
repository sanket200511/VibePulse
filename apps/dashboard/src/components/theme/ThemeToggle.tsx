import { useTheme, type Theme } from "./ThemeProvider";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@vibepulse/ui";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const options: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <div className="bg-muted border-border flex items-center rounded-md border p-0.5">
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = theme === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => setTheme(opt.value)}
            className={cn(
              "text-muted-foreground hover:text-foreground group relative flex h-7 w-7 items-center justify-center rounded-sm transition-all duration-150 ease-out",
              isActive && "bg-card text-foreground shadow-sm",
            )}
            title={`${opt.label} Theme`}
            aria-label={`${opt.label} Theme`}
          >
            <Icon className="h-4 w-4 transition-transform duration-200 ease-out group-hover:rotate-12 group-hover:scale-110" />
          </button>
        );
      })}
    </div>
  );
}
