import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getApiBaseUrl } from "../../lib/api-config";
import { PageHeader } from "../../components/layout/PageHeader";
import { EmptyState, ErrorState } from "../../components/states";
import { useDemoMode } from "../../demo/config";
import { demoProjects } from "../../demo/projects";
import type { Project } from "./types";
import { Clock, MoreVertical, Trash2, FolderOpen, FileText } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { DeleteProjectModal } from "./DeleteProjectModal";
import { useProjectContext } from "./useProjectContext";

export function ProjectCard({
  project,
  onDeleteRequest,
}: {
  project: Project;
  onDeleteRequest?: (p: Project) => void;
}) {
  const [pulse, setPulse] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { exportContext } = useProjectContext(project.id);

  useEffect(() => {
    // When updated_at changes (i.e. new telemetry), pulse
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 1000);
    return () => clearTimeout(t);
  }, [project.updated_at]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  return (
    <div
      className={`bg-card/60 border-border/80 hover:border-primary/40 shadow-xs backdrop-blur-xs group relative flex flex-col rounded-lg border p-4 transition-all duration-200 ${
        pulse ? "ring-accent-color ring-primary/40 ring-2" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <Link to={`/projects/${project.id}`} className="min-w-0 flex-1">
          <h3 className="text-foreground group-hover:text-primary truncate text-sm font-semibold tracking-tight transition-colors">
            {project.display_name}
          </h3>
          <p
            className="text-muted-foreground mt-1 truncate font-mono text-[11px]"
            title={project.root_path}
          >
            {project.root_path}
          </p>
        </Link>

        {/* ⋯ Action Menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMenuOpen((prev) => !prev);
            }}
            className="text-muted-foreground hover:text-foreground hover:bg-muted/50 flex h-7 w-7 items-center justify-center rounded-md transition-colors"
            aria-label="Project actions"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>

          {menuOpen && (
            <div className="bg-card/95 border-border/80 absolute right-0 top-full z-30 mt-1 w-48 overflow-hidden rounded-md border py-1 shadow-lg backdrop-blur-md">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  void navigate(`/projects/${project.id}`);
                }}
                className="text-muted-foreground hover:text-foreground hover:bg-muted/50 flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium transition-colors"
              >
                <FolderOpen className="h-3.5 w-3.5" />
                Open Project
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  exportContext();
                }}
                className="text-muted-foreground hover:text-foreground hover:bg-muted/50 flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium transition-colors"
              >
                <FileText className="h-3.5 w-3.5" />
                Generate Project Context
              </button>
              {onDeleteRequest && (
                <>
                  <div className="border-border/60 my-1 border-t" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onDeleteRequest(project);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium text-rose-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove from DepRadar
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <Link
        to={`/projects/${project.id}`}
        className="border-border/60 mt-auto flex flex-col gap-y-2 border-t pt-3 text-[11px]"
      >
        <div>
          <span className="text-muted-foreground block font-mono text-[9px] font-semibold uppercase tracking-wider">
            Last Activity
          </span>
          <span className="text-foreground mt-0.5 flex items-center gap-1 font-mono text-xs font-semibold tabular-nums">
            <Clock className="text-primary h-3 w-3" />
            {new Date(project.updated_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </Link>
    </div>
  );
}

export function ProjectsPage() {
  const { isDemo } = useDemoMode();
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: async (): Promise<Project[]> => {
      const response = await fetch(new URL("/api/projects", getApiBaseUrl()).toString());
      if (!response.ok) {
        throw new Error(`Failed to load projects (${response.status})`);
      }
      const data = await response.json();
      return data.projects;
    },
  });

  const realProjects = projectsQuery.data || [];
  const projects = realProjects.length > 0 ? realProjects : isDemo ? demoProjects : [];
  const isLoading = projectsQuery.isLoading;
  const isError = projectsQuery.isError && (!isDemo || realProjects.length === 0);

  return (
    <div className="animate-fade-in-up mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-4 py-4 sm:px-6 md:py-6">
      <PageHeader
        title="Projects"
        description={
          isDemo
            ? "Every project DepRadar is currently observing in Demo Mode."
            : "Every project DepRadar is currently observing."
        }
      />

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
        </div>
      ) : isError ? (
        <ErrorState message={projectsQuery.error?.message || "Failed to load projects."} />
      ) : projects.length === 0 ? (
        <EmptyState
          title="No projects found"
          description="DepRadar hasn't observed any development activity yet."
        />
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onDeleteRequest={(p) => setProjectToDelete(p)}
            />
          ))}
        </div>
      )}

      {projectToDelete && (
        <DeleteProjectModal
          project={projectToDelete}
          isOpen={!!projectToDelete}
          onClose={() => setProjectToDelete(null)}
        />
      )}
    </div>
  );
}
