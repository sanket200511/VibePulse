import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getApiBaseUrl } from "../../lib/api-config";
import { useDemoMode } from "../../demo/config";
import { demoProjects } from "../../demo/projects";
import { demoSessionsList } from "../../demo/data";
import { EmptyState, ErrorState } from "../../components/states";
import type { Project } from "./types";
import type { Session } from "../sessions/types";
import { SessionCard } from "../sessions/SessionRow";
import { ArrowLeft, Clock, Trash2 } from "lucide-react";
import { formatRelativeTime } from "../../lib/relative-time";
import { useState } from "react";
import { ProjectIntelligencePanel } from "./ProjectIntelligencePanel";
import { ProjectContextMemory } from "./ProjectContextMemory";
import { DeleteProjectModal } from "./DeleteProjectModal";

interface PaginatedSessions {
  sessions: Session[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export function ProjectDetailsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { isDemo } = useDemoMode();
  const navigate = useNavigate();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: async (): Promise<Project> => {
      const response = await fetch(
        new URL(`/api/projects/${projectId}`, getApiBaseUrl()).toString(),
      );
      if (!response.ok) {
        if (response.status === 404) throw new Error("Project not found");
        throw new Error(`Failed to load project (${response.status})`);
      }
      return response.json();
    },
    enabled: !isDemo && !!projectId,
  });

  const [page, setPage] = useState(0);
  const LIMIT = 20;

  const sessionsQuery = useQuery({
    queryKey: ["project_sessions", projectId, page],
    queryFn: async (): Promise<PaginatedSessions> => {
      const response = await fetch(
        new URL(
          `/api/projects/${projectId}/sessions?limit=${LIMIT}&offset=${page * LIMIT}`,
          getApiBaseUrl(),
        ).toString(),
      );
      if (!response.ok) {
        throw new Error(`Failed to load sessions (${response.status})`);
      }
      return response.json();
    },
    enabled: !isDemo && !!projectId,
  });

  let project: Project | undefined;
  let sessions: Session[] = [];
  let isLoading = false;
  let isError = false;
  let errorMessage = "";
  let hasMore = false;

  if (isDemo) {
    project = demoProjects.find((p) => p.id === projectId);
    if (!project) {
      isError = true;
      errorMessage = "Project not found";
    } else {
      const projectSessions = demoSessionsList.filter((s) => s.project_id === projectId);
      projectSessions.sort(
        (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
      );

      const offset = page * LIMIT;
      sessions = projectSessions.slice(0, offset + LIMIT);
      hasMore = offset + LIMIT < projectSessions.length;
    }
  } else {
    project = projectQuery.data;
    sessions = sessionsQuery.data?.sessions || [];
    hasMore = sessionsQuery.data?.has_more || false;
    isLoading = projectQuery.isLoading || sessionsQuery.isLoading;
    isError = projectQuery.isError || sessionsQuery.isError;
    errorMessage =
      projectQuery.error?.message ||
      sessionsQuery.error?.message ||
      "Failed to load project details.";
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="border-accent-color/30 h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-1 flex-col p-8">
        <div className="mb-6">
          <Link
            to="/projects"
            className="text-secondary-text hover:text-primary-text inline-flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Link>
        </div>
        <ErrorState message={errorMessage} />
      </div>
    );
  }

  if (!project) return null;

  const totalSessions = isDemo
    ? demoSessionsList.filter((s) => s.project_id === projectId).length
    : sessionsQuery.data?.total || 0;

  const latestSession = isDemo
    ? demoSessionsList
        .filter((s) => s.project_id === projectId)
        .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())[0]
    : page === 0
      ? sessionsQuery.data?.sessions[0]
      : undefined;

  return (
    <div className="animate-fade-in-up flex flex-1 flex-col p-8">
      {/* Identity and Current State */}
      <div className="mb-8">
        <Link
          to="/projects"
          className="text-secondary-text hover:text-primary-text mb-6 inline-flex items-center gap-2 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Link>

        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-primary-text text-3xl font-bold tracking-tight">
              {project.display_name}
            </h1>
            <p
              className="text-secondary-text selection:bg-selection-color mt-2 truncate font-mono text-xs"
              title={project.root_path}
            >
              {project.root_path}
            </p>
          </div>

          {latestSession && (
            <div className="bg-card border-border flex flex-col items-end rounded-lg border p-4 shadow-sm">
              <span className="text-muted-foreground mb-1 text-[10px] font-semibold uppercase tracking-wider">
                Latest Observation
              </span>
              <div className="flex items-center gap-2">
                {latestSession.status === "ACTIVE" ? (
                  <span className="bg-accent-color/10 text-accent-color border-accent-color/20 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold">
                    <span className="bg-accent-color mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full" />
                    Active Session
                  </span>
                ) : (
                  <span className="text-primary-text flex items-center gap-1 text-sm font-medium">
                    <Clock className="text-secondary-text h-4 w-4" />
                    Last observed {formatRelativeTime(latestSession.last_event_at)}
                  </span>
                )}
              </div>
              <span className="text-secondary-text mt-1 text-xs">
                {totalSessions} recorded session{totalSessions === 1 ? "" : "s"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Project Context Memory (Durable Progressive Understanding) */}
      <div className="mb-10">
        <ProjectContextMemory projectId={project.id} />
      </div>

      {/* Project Intelligence & Temporal Pulse */}
      <div className="mb-12">
        <ProjectIntelligencePanel projectId={project.id} />
      </div>

      {/* Session History */}
      <div className="flex-1">
        <h2 className="text-primary-text mb-6 text-xl font-bold tracking-tight">Session History</h2>

        {sessions.length === 0 ? (
          <EmptyState
            title="No sessions recorded"
            description="VibePulse has not observed any development activity for this project yet."
          />
        ) : (
          <div className="flex flex-col gap-4">
            {sessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}

            {/* Pagination Controls */}
            <div className="border-border mt-4 flex items-center justify-between border-t pt-4">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="text-secondary-text hover:text-primary-text text-sm font-medium transition-colors disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-secondary-text text-xs">Page {page + 1}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasMore}
                className="text-secondary-text hover:text-primary-text text-sm font-medium transition-colors disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="border-border mt-16 rounded-xl border border-red-500/20 bg-red-500/5 p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-sm font-bold text-red-400">Danger Zone</h3>
            <p className="text-secondary-text mt-1 max-w-xl text-xs leading-relaxed">
              Remove this project from VibePulse. Permanently deletes stored telemetry, sessions,
              investigations, and project memory. Your actual project files and directory will{" "}
              <strong className="text-primary-text">NOT</strong> be deleted.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="flex items-center gap-2 self-start rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-400 transition-all hover:bg-red-500 hover:text-white sm:self-auto"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove from VibePulse
          </button>
        </div>
      </div>

      {isDeleteModalOpen && (
        <DeleteProjectModal
          project={project}
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onDeleted={() => {
            void navigate("/projects");
          }}
        />
      )}
    </div>
  );
}
