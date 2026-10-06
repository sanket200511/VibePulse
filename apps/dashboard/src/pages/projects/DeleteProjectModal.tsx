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
      <div className="border-border/80 bg-background/95 relative z-10 flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-lg border shadow-2xl backdrop-blur-md">
        {/* Header */}
        <div className="border-border/80 flex shrink-0 items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md border border-rose-500/30 bg-rose-500/10 text-rose-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h3 id="delete-project-title" className="text-foreground text-sm font-semibold">
                Remove from DepRadar
              </h3>
              <p className="text-muted-foreground text-[11px]">
                Safe deletion of observation history
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={deleteMutation.isPending}
            className="text-muted-foreground hover:bg-secondary/40 hover:text-foreground rounded p-1 transition-colors disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto p-4">
          {/* Active Conflict Banner */}
          {conflictError && (
            <div className="flex items-start gap-2.5 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-amber-300">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <div className="text-xs">
                <div className="font-semibold text-amber-200">Project Currently Active</div>
                <p className="mt-0.5 leading-relaxed text-amber-300/90">{conflictError}</p>
                <p className="mt-1 font-mono text-[10px] text-amber-400/80">
                  Root: {project.root_path}
                </p>
              </div>
            </div>
          )}

          {/* Core Assurance Callout */}
          <div className="flex items-start gap-2.5 rounded-md border border-cyan-500/20 bg-cyan-500/10 p-3">
            <HardDrive className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
            <div className="text-xs leading-relaxed text-cyan-200/90">
              <span className="font-semibold text-cyan-100">Filesystem Safe:</span> Your physical
              project directory and source files will <strong className="text-cyan-100">NOT</strong>{" "}
              be modified or deleted.
            </div>
          </div>

          {/* Stored Data to be Removed */}
          <div className="border-border/80 bg-secondary/15 rounded-md border p-3 text-xs">
            <div className="text-muted-foreground mb-2 flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider">
              <Database className="h-3 w-3" />
              Permanent Database Removal:
            </div>
            <ul className="text-muted-foreground list-disc space-y-1 pl-4 marker:text-rose-400">
              <li>
                <strong className="text-foreground font-mono">{totalEvents}</strong> development
                events
              </li>
              <li>
                <strong className="text-foreground font-mono">{totalSessions}</strong> recorded
                sessions
              </li>
              <li>
                <strong className="text-foreground font-mono">{totalFindings}</strong> security &
                analyzer findings
              </li>
              <li>Investigation history & timeline records</li>
              <li>Durable Project Context Memory</li>
            </ul>
          </div>

          {/* Target Identity */}
          <div className="border-border/80 bg-secondary/20 rounded-md border p-2.5">
            <div className="text-muted-foreground font-mono text-[10px] font-medium uppercase tracking-wider">
              Target Project
            </div>
            <div className="text-foreground mt-0.5 text-xs font-semibold">
              {project.display_name}
            </div>
            <div
              className="text-muted-foreground truncate font-mono text-[10px]"
              title={project.root_path}
            >
              {project.root_path}
            </div>
          </div>

          {/* Confirmation Input */}
          <div>
            <label
              htmlFor="confirm-project-name"
              className="text-muted-foreground block font-mono text-xs"
            >
              To confirm, type{" "}
              <strong className="text-foreground font-mono">{project.display_name}</strong> below:
            </label>
            <input
              id="confirm-project-name"
              type="text"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={project.display_name}
              disabled={deleteMutation.isPending}
              className="border-border/80 bg-secondary/30 text-foreground placeholder:text-muted-foreground mt-1.5 w-full rounded-md border px-3 py-1.5 font-mono text-xs shadow-sm transition-colors focus:border-rose-500 focus:outline-none disabled:opacity-50"
            />
          </div>

          {deleteMutation.isError && !conflictError && (
            <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-2.5 font-mono text-xs text-rose-400">
              {deleteMutation.error?.message || "Failed to remove project from DepRadar."}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-border/80 bg-secondary/15 flex shrink-0 items-center justify-end gap-2.5 border-t px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={deleteMutation.isPending}
            className="border-border/80 bg-secondary/30 text-foreground hover:bg-secondary/50 rounded-md border px-3.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!isConfirmed || deleteMutation.isPending}
            className="flex items-center gap-1.5 rounded-md bg-rose-600 px-3.5 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-rose-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
          >
            {deleteMutation.isPending ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Removing...
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
