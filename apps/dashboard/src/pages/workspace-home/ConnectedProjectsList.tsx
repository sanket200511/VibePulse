/**
 * Connected Projects — every project DepRadar is currently observing
 * (docs/design/PRODUCT_EXPERIENCE.md, Section 5, Workspace Home #3, and
 * Section 3.5). Recognition over detail: name, path, live status. No
 * per-project link yet — Projects has no per-project deep route until a
 * later sprint.
 */

import { Badge } from "@depradar/ui";
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
          description="Connect a project and DepRadar will start observing its activity here."
        />
      </SectionContainer>
    );
  }

  return (
    <SectionContainer title="Connected Projects">
      <ul className="flex flex-col gap-2">
        {projects.map((project) => (
          <li
            key={project.id}
            className="border-border/60 flex flex-col gap-1 border-b pb-2.5 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
          >
            <div className="min-w-0">
              <p className="text-foreground truncate text-xs font-semibold">{project.name}</p>
              <p className="text-muted-foreground truncate font-mono text-[11px]">{project.path}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2.5">
              <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
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
