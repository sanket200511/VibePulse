/**
 * Projects — the map of everything VibePulse currently watches
 * (docs/design/PRODUCT_EXPERIENCE.md, Section 3.5). This is a PX-1
 * placeholder: the anchor and route exist to complete the Contextual
 * Navigation model. The real content — connected projects with live status,
 * per-project session summaries, connect/disconnect — is PX-3's job (Section
 * 8, "PX-3 — Project Connection & Projects Screen").
 */

import { PageHeader } from "../../components/layout/PageHeader";
import { EmptyState } from "../../components/states";

export function ProjectsPage() {
  return (
    <div className="flex flex-1 flex-col p-8">
      <PageHeader title="Projects" description="Every project VibePulse is currently observing." />

      <EmptyState
        title="Project connection is coming soon"
        description="Once available, you'll be able to connect a project and see its live status here."
      />
    </div>
  );
}
