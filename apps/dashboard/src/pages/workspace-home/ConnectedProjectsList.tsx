/**
 * Connected Projects — every project VibePulse is currently observing
 * (docs/design/PRODUCT_EXPERIENCE.md, Section 5, Workspace Home #3, and
 * Section 3.5). Recognition over detail: name, path, live status. No
 * per-project link yet — Projects has no per-project deep route until a
 * later sprint.
 */

import { Badge } from "@vibepulse/ui";
import { SectionContainer } from "../../components/layout/SectionContainer";
import { EmptyState } from "../../components/states";
import type { ConnectedProject } from "./types";
import { formatRelativeTime } from "../../lib/relative-time";

export interface ConnectedProjectsListProps {
  projects: ConnectedProject[];
}

export function ConnectedProjectsList({ projects }: ConnectedProjectsListProps) {
  if (projects.length === 0) {
    return (
      <SectionContainer title="Connected Projects">
        <EmptyState
          title="No projects connected yet"
          description="Connect a project and VibePulse will start observing its activity here."
        />
      </SectionContainer>
    );
  }

  return (
    <SectionContainer title="Connected Projects">
      <ul className="flex flex-col gap-3">
        {projects.map((project) => (
          <li
            key={project.id}
            className="border-border flex flex-col gap-2 border-b pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
          >
            <div className="min-w-0">
              <p className="text-foreground truncate text-sm font-medium">{project.name}</p>
              <p className="text-muted-foreground truncate font-mono text-xs">{project.path}</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-muted-foreground text-xs">
                {formatRelativeTime(project.lastActivityAt)}
              </span>
              <Badge variant={project.status === "observing" ? "success" : "secondary"}>
                {project.status === "observing" ? "Observing" : "Idle"}
              </Badge>
            </div>
          </li>
        ))}
      </ul>
    </SectionContainer>
  );
}
