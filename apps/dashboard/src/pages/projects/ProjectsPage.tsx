import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getApiBaseUrl } from "../../lib/api-config";
import { PageHeader } from "../../components/layout/PageHeader";
import { EmptyState, ErrorState } from "../../components/states";
import { useDemoMode } from "../../demo/config";
import { demoProjects } from "../../demo/projects";
import type { Project } from "./types";
import { Clock } from "lucide-react";
import { useEffect, useState } from "react";

export function ProjectCard({ project }: { project: Project }) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    // When updated_at changes (i.e. new telemetry), pulse
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 1000);
    return () => clearTimeout(t);
  }, [project.updated_at]);

  return (
    <Link
      to={`/projects/${project.id}`}
      className={`bg-card border-border hover:border-accent-color/30 group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
        pulse
          ? "ring-accent-color scale-[1.02] shadow-[0_0_15px_rgba(var(--accent-color-rgb),0.2)] ring-2"
          : ""
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-primary-text group-hover:text-accent-color text-base font-bold tracking-tight transition-colors">
            {project.display_name}
          </h3>
          <p
            className="text-secondary-text selection:bg-selection-color mt-1.5 truncate font-mono text-[11px]"
            title={project.root_path}
          >
            {project.root_path}
          </p>
        </div>
      </div>

      <div className="border-border mt-6 mt-auto flex flex-col gap-y-3.5 border-t pt-4 text-[11px]">
        <div>
          <span className="text-muted-foreground block text-[9px] font-semibold uppercase tracking-wider">
            Last Activity
          </span>
          <span className="text-primary-text mt-1 flex items-center gap-1 font-semibold">
            <Clock className="text-accent-color/70 h-3.5 w-3.5" />
            {new Date(project.updated_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>
    </Link>
  );
}

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
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
