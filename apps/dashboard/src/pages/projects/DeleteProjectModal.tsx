import { useState, useEffect } from "react";
import { AlertTriangle, X, ShieldAlert, Loader2, HardDrive, Database } from "lucide-react";
import type { Project } from "./types";
import { useDeleteProject } from "./useDeleteProject";
import { useProjectContext } from "./useProjectContext";

interface DeleteProjectModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onDeleted?: () => void;
}

export function DeleteProjectModal({
  project,
  isOpen,
  onClose,
  onDeleted,
}: DeleteProjectModalProps) {
  const [confirmName, setConfirmName] = useState("");
  const [conflictError, setConflictError] = useState<string | null>(null);

  const { context } = useProjectContext(project.id);
  const deleteMutation = useDeleteProject({
    onSuccess: () => {
      onClose();
      onDeleted?.();
    },
  });

  const { reset } = deleteMutation;

  useEffect(() => {
    if (isOpen) {
      setConfirmName("");
      setConflictError(null);
      reset();
    }
  }, [isOpen, reset]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !deleteMutation.isPending) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, deleteMutation.isPending, onClose]);

  if (!isOpen) return null;

  const isConfirmed = confirmName.trim() === project.display_name.trim();

  const handleDelete = () => {
    if (!isConfirmed || deleteMutation.isPending) return;
    setConflictError(null);

    deleteMutation.mutate(project.id, {
      onError: (err: unknown) => {
        const errorObj = err as { isConflict?: boolean; detail?: { message?: string } };
        if (errorObj?.isConflict) {
          setConflictError(
            errorObj.detail?.message ||
              "This project is currently being observed. Stop observation before deleting it.",
          );
        }
      },
    });
  };

  const totalEvents = context?.activity_summary?.total_events ?? 0;
  const totalSessions = context?.activity_summary?.total_sessions ?? 0;
  const totalFindings = context?.security_summary?.total_findings ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-project-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={() => !deleteMutation.isPending && onClose()}
      />

      {/* Modal Card */}
      <div className="bg-card border-border relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border shadow-2xl transition-all">
        {/* Header */}
        <div className="border-border flex shrink-0 items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 id="delete-project-title" className="text-primary-text text-base font-bold">
                Remove from DepRadar
              </h3>
              <p className="text-secondary-text text-xs">Safe deletion of observation history</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={deleteMutation.isPending}
            className="text-muted-foreground hover:text-primary-text rounded-lg p-1.5 transition-colors disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-6">
          {/* Active Conflict Banner */}
          {conflictError && (
            <div className="border-border flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-300">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
              <div className="text-xs">
                <div className="font-semibold text-amber-200">Project Currently Active</div>
                <p className="mt-1 leading-relaxed text-amber-300/90">{conflictError}</p>
                <p className="mt-1 font-mono text-[11px] text-amber-400/80">
                  Root: {project.root_path}
                </p>
              </div>
            </div>
          )}

          {/* Core Assurance Callout */}
          <div className="border-border flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
            <HardDrive className="text-accent-color mt-0.5 h-5 w-5 shrink-0" />
            <div className="text-xs leading-relaxed text-blue-200/90">
              <span className="font-semibold text-blue-100">Filesystem Safe:</span> Your physical
              project directory and source files will <strong className="text-blue-100">NOT</strong>{" "}
              be modified or deleted.
            </div>
          </div>

          {/* Stored Data to be Removed */}
          <div className="bg-card-subtle/50 border-border rounded-xl border p-4 text-xs">
            <div className="text-secondary-text mb-2.5 flex items-center gap-1.5 font-semibold">
              <Database className="h-3.5 w-3.5" />
              DepRadar will permanently remove its stored PostgreSQL data:
            </div>
            <ul className="text-secondary-text list-disc space-y-1.5 pl-4 marker:text-red-400">
              <li>
                <strong className="text-primary-text">{totalEvents}</strong> development events
              </li>
              <li>
                <strong className="text-primary-text">{totalSessions}</strong> recorded sessions
              </li>
              <li>
                <strong className="text-primary-text">{totalFindings}</strong> security & analyzer
                findings
              </li>
              <li>Investigation history & timeline records</li>
              <li>Durable Project Context Memory</li>
            </ul>
          </div>

          {/* Target Identity */}
          <div className="bg-card border-border rounded-xl border p-3.5">
            <div className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
              Target Project
            </div>
            <div className="text-primary-text mt-1 text-sm font-bold">{project.display_name}</div>
            <div
              className="text-secondary-text mt-0.5 truncate font-mono text-[11px]"
              title={project.root_path}
            >
              {project.root_path}
            </div>
          </div>

          {/* Confirmation Input */}
          <div>
            <label
              htmlFor="confirm-project-name"
              className="text-secondary-text block text-xs font-medium"
            >
              To confirm, type{" "}
              <strong className="text-primary-text font-mono">{project.display_name}</strong> below:
            </label>
            <input
              id="confirm-project-name"
              type="text"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={project.display_name}
              disabled={deleteMutation.isPending}
              className="border-border bg-background text-primary-text placeholder:text-muted-foreground mt-2 w-full rounded-lg border px-3.5 py-2 font-mono text-xs shadow-sm transition-all focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 disabled:opacity-50"
            />
          </div>

          {deleteMutation.isError && !conflictError && (
            <div className="rounded-lg bg-red-500/10 p-3 text-xs text-red-400">
              {deleteMutation.error?.message || "Failed to remove project from DepRadar."}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-border bg-card-subtle/30 flex shrink-0 items-center justify-end gap-3 border-t px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={deleteMutation.isPending}
            className="border-border hover:bg-card-subtle text-secondary-text hover:text-primary-text rounded-lg border px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!isConfirmed || deleteMutation.isPending}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/40 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {deleteMutation.isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Removing from DepRadar...
              </>
            ) : (
              "Remove Project"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
