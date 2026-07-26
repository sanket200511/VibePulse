import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getApiBaseUrl } from "../../lib/api-config";
import { PageHeader } from "../../components/layout/PageHeader";
import { EmptyState, ErrorState } from "../../components/states";
import { useDemoMode } from "../../demo/config";
import { demoProjects } from "../../demo/projects";
import type { Project } from "./types";
import { Clock, Folder } from "lucide-react";

export function ProjectsPage() {
  const { isDemo } = useDemoMode();

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: async (): Promise<Project[]> => {
      const response = await fetch(new URL("/projects", getApiBaseUrl()).toString());
      if (!response.ok) {
        throw new Error(`Failed to load projects (${response.status})`);
      }
      const data = await response.json();
      return data.projects;
    },
    enabled: !isDemo,
  });

  const projects = isDemo ? demoProjects : projectsQuery.data || [];
  const isLoading = !isDemo && projectsQuery.isLoading;
  const isError = !isDemo && projectsQuery.isError;

  return (
    <div className="animate-fade-in-up flex flex-1 flex-col p-8">
      <PageHeader
        title="Projects"
        description={
          isDemo
            ? "Every project VibePulse is currently observing in Demo Mode."
            : "Every project VibePulse is currently observing."
        }
      />

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="border-accent-color/30 h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
        </div>
      ) : isError ? (
        <ErrorState message={projectsQuery.error?.message || "Failed to load projects."} />
      ) : projects.length === 0 ? (
        <EmptyState
          title="No projects found"
          description="VibePulse hasn't observed any development activity yet."
        />
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            // Demo mode might have extra mock fields, but we typecast for safety.
            // In real mode, we don't have these, so we just omit them or show placeholders if we really wanted to,
            // but the prompt says "remove unsupported project health and workspace metrics".
            // Since we're not supposed to redesign the whole card system, we'll just omit the fake bars if they don't exist.
            type LegacyProjectExt = Project & {
              status?: string;
              languages?: { name: string; percentage: number; color: string }[];
              lastActive?: string;
            };
            const p = project as LegacyProjectExt;

            const status = p.status || "idle";
            const statusColors: Record<string, string> = {
              active: "bg-accent-color/15 border-accent-color/25 text-accent-color",
              observing: "bg-success-color/15 border-success-color/25 text-success-color",
              idle: "bg-muted-color/15 border-border text-secondary-text",
            };

            return (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="bg-card border-border hover:border-accent-color/30 group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
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
                  {p.status && (
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${statusColors[status]}`}
                    >
                      {status}
                    </span>
                  )}
                </div>

                {/* Legacy Demo Metrics (Only rendered if they exist to avoid breaking demo) */}
                {p.languages && p.languages.length > 0 && (
                  <div className="mt-6 flex-1">
                    <span className="text-muted-foreground mb-2 block text-[9px] font-semibold uppercase tracking-wider">
                      Technology Stack
                    </span>
                    <div className="bg-muted-color/45 flex h-1.5 w-full overflow-hidden rounded-full">
                      {p.languages.map(
                        (
                          lang: { name: string; percentage: number; color: string },
                          idx: number,
                        ) => (
                          <div
                            key={idx}
                            className={lang.color}
                            style={{ width: `${lang.percentage}%` }}
                            title={`${lang.name}: ${lang.percentage}%`}
                          />
                        ),
                      )}
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1">
                      {p.languages.map(
                        (
                          lang: { name: string; percentage: number; color: string },
                          idx: number,
                        ) => (
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
                        ),
                      )}
                    </div>
                  </div>
                )}

                {/* Project metrics */}
                {(p.watchedFiles !== undefined || p.lastActive !== undefined) && (
                  <div className="border-border mt-6 mt-auto grid grid-cols-2 gap-x-6 gap-y-3.5 border-t pt-4 text-[11px]">
                    {p.watchedFiles !== undefined && (
                      <div>
                        <span className="text-muted-foreground block text-[9px] font-semibold uppercase tracking-wider">
                          Files Touched
                        </span>
                        <span className="text-primary-text mt-1 flex items-center gap-1 font-semibold">
                          <Folder className="text-accent-color/70 h-3.5 w-3.5" />
                          {p.watchedFiles} files
                        </span>
                      </div>
                    )}
                    {p.lastActive !== undefined && (
                      <div>
                        <span className="text-muted-foreground block text-[9px] font-semibold uppercase tracking-wider">
                          Last Activity
                        </span>
                        <span className="text-primary-text mt-1 flex items-center gap-1 font-semibold">
                          <Clock className="text-accent-color/70 h-3.5 w-3.5" />
                          {p.lastActive}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
