/**
 * Recent Activity — a simple, readable timeline of recent sessions
 * (docs/design/PRODUCT_EXPERIENCE.md, Section 5, Workspace Home #3). Not an
 * analytics table: one line per session, most recent first.
 */

import { Link } from "react-router-dom";
import { SectionContainer } from "../../components/layout/SectionContainer";
import { EmptyState } from "../../components/states";
import type { RecentActivityItem } from "./types";
import { formatRelativeTime } from "../../lib/relative-time";

export interface RecentActivityListProps {
  items: RecentActivityItem[];
}

export function RecentActivityList({ items }: RecentActivityListProps) {
  if (items.length === 0) {
    return (
      <SectionContainer title="Recent Activity">
        <EmptyState
          title="No recent activity yet"
          description="Start a coding session in an observed project and it will appear here."
        />
      </SectionContainer>
    );
  }

  return (
    <SectionContainer title="Recent Activity">
      <ul className="flex flex-col gap-4">
        {items.map((item) => (
          <li key={item.id} className="border-border border-b pb-4 last:border-0 last:pb-0">
            <Link
              to={`/sessions/${item.id}`}
              className="focus-visible:ring-ring group flex flex-col gap-0.5 rounded-[8px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              <span className="text-muted-foreground text-xs">
                {formatRelativeTime(item.occurredAt)} · {item.projectName}
              </span>
              <span className="text-foreground text-sm group-hover:underline">{item.summary}</span>
            </Link>
          </li>
        ))}
      </ul>
    </SectionContainer>
  );
}
