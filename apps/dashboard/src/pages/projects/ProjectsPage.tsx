import { PageHeader } from "../../components/layout/PageHeader";
import { EmptyState } from "../../components/states";
import { useDemoMode } from "../../demo/config";
import { demoProjects } from "../../demo/projects";
import { Clock, Folder } from "lucide-react";

export function ProjectsPage() {
  const { isDemo } = useDemoMode();

  if (!isDemo) {
    return (
      <div className="animate-fade-in-up flex flex-1 flex-col p-8">
        <PageHeader
          title="Projects"
          description="Every project VibePulse is currently observing."
        />
        <EmptyState
          title="Project connection is coming soon"
          description="Once available, you'll be able to connect a project and see its live status here."
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up flex flex-1 flex-col p-8">
      <PageHeader
        title="Projects"
        description="Every project VibePulse is currently observing in Demo Mode."
      />

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {demoProjects.map((project) => {
          const statusColors = {
            active: "bg-accent-color/15 border-accent-color/25 text-accent-color",
            observing: "bg-success-color/15 border-success-color/25 text-success-color",
            idle: "bg-muted-color/15 border-border text-secondary-text",
          };

          return (
            <div
              key={project.id}
              className="bg-card border-border hover:border-accent-color/30 group relative cursor-pointer overflow-hidden rounded-xl border p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="text-primary-text group-hover:text-accent-color text-base font-bold tracking-tight transition-colors">
                    {project.display_name}
                  </h3>
                  <p className="text-secondary-text selection:bg-selection-color mt-1.5 truncate font-mono text-[11px]">
                    {project.root_path}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${statusColors[project.status]}`}
                >
                  {project.status}
                </span>
              </div>

              {/* Languages bar breakdown (Technology Stack) */}
              <div className="mt-6">
                <span className="text-muted-foreground mb-2 block text-[9px] font-semibold uppercase tracking-wider">
                  Technology Stack
                </span>
                <div className="bg-muted-color/45 flex h-1.5 w-full overflow-hidden rounded-full">
                  {project.languages.map((lang, idx) => (
                    <div
                      key={idx}
                      className={lang.color}
                      style={{ width: `${lang.percentage}%` }}
                      title={`${lang.name}: ${lang.percentage}%`}
                    />
                  ))}
                </div>
                <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1">
                  {project.languages.map((lang, idx) => (
                    <div
                      key={idx}
                      className="text-secondary-text flex items-center gap-1.5 text-[10px]"
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${lang.color}`} />
                      <span>
                        {lang.name}{" "}
                        <span className="text-muted-foreground">({lang.percentage}%)</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Project metrics */}
              <div className="border-border mt-6 grid grid-cols-2 gap-x-6 gap-y-3.5 border-t pt-4 text-[11px]">
                <div>
                  <span className="text-muted-foreground block text-[9px] font-semibold uppercase tracking-wider">
                    Files Touched
                  </span>
                  <span className="text-primary-text mt-1 flex items-center gap-1 font-semibold">
                    <Folder className="text-accent-color/70 h-3.5 w-3.5" />
                    {project.watchedFiles} files
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[9px] font-semibold uppercase tracking-wider">
                    Last Activity
                  </span>
                  <span className="text-primary-text mt-1 flex items-center gap-1 font-semibold">
                    <Clock className="text-accent-color/70 h-3.5 w-3.5" />
                    {project.lastActive}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
