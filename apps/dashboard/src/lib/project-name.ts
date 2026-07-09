/**
 * Derives a short, recognizable project name from a session's full
 * `project_root` path (e.g. "/home/dev/code/vibepulse/apps/api" ->
 * "api"), used anywhere the Workspace shows a project by name rather than
 * its full observed path (docs/design/PRODUCT_EXPERIENCE.md, Component
 * Philosophy: "Recognition over detail").
 */
export function projectDisplayName(projectRoot: string): string {
  const segments = projectRoot.split(/[\\/]+/).filter(Boolean);
  return segments.length > 0 ? segments[segments.length - 1]! : projectRoot;
}
