/**
 * Reflection Preview — one meaningful observation, not a dashboard widget
 * (docs/design/COPY_GUIDELINES.md, "Reflection" tone: thoughtful, never
 * evaluative). Links into Session Detail, where the full Reflection lives.
 */

import { Link } from "react-router-dom";
import { SectionContainer } from "../../components/layout/SectionContainer";
import { LoadingState, ErrorState, EmptyState } from "../../components/states";
import type { ReflectionPreview } from "./types";

export interface ReflectionPreviewCardProps {
  preview: ReflectionPreview | null;
  isLoading: boolean;
  isError: boolean;
}

export function ReflectionPreviewCard({ preview, isLoading, isError }: ReflectionPreviewCardProps) {
  return (
    <SectionContainer title="Reflection">
      {isLoading ? (
        <LoadingState label="Gathering today's reflection…" />
      ) : isError ? (
        <ErrorState message="We couldn't load your reflection. Try again shortly." />
      ) : preview ? (
        <>
          <p className="text-foreground text-sm">{preview.observation}</p>
          <Link
            to={`/sessions/${preview.sessionId}`}
            className="text-primary mt-3 inline-block text-sm hover:underline"
          >
            Open session
          </Link>
        </>
      ) : (
        <EmptyState
          title="No reflection yet"
          description="Insights appear once there's enough session activity to reflect on."
        />
      )}
    </SectionContainer>
  );
}
