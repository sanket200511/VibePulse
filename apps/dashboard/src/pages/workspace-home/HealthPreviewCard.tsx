/**
 * Health Preview — a plain-language summary, never an arbitrary score
 * (docs/design/COPY_GUIDELINES.md, "Health": never judges, never reduces a
 * session to a number). Mirrors ReflectionPreviewCard's shape deliberately —
 * both are one-sentence, non-evaluative previews into Session Detail.
 */

import { Link } from "react-router-dom";
import { SectionContainer } from "../../components/layout/SectionContainer";
import { LoadingState, ErrorState, EmptyState } from "../../components/states";
import type { HealthPreview } from "./types";

export interface HealthPreviewCardProps {
  preview: HealthPreview | null;
  isLoading: boolean;
  isError: boolean;
}

export function HealthPreviewCard({ preview, isLoading, isError }: HealthPreviewCardProps) {
  return (
    <SectionContainer title="Health">
      {isLoading ? (
        <LoadingState label="Preparing your health summary…" />
      ) : isError ? (
        <ErrorState message="We couldn't load your health summary. Try again shortly." />
      ) : preview ? (
        <>
          <p className="text-foreground text-sm">{preview.summary}</p>
          <Link
            to={`/sessions/${preview.sessionId}`}
            className="text-primary mt-3 inline-block text-sm hover:underline"
          >
            Open session
          </Link>
        </>
      ) : (
        <EmptyState
          title="No health report yet"
          description="Health becomes available once a session is completed."
        />
      )}
    </SectionContainer>
  );
}
