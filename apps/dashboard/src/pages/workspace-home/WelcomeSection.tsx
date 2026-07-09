/**
 * Welcome — the Workspace's front door (docs/design/PRODUCT_EXPERIENCE.md,
 * Section 5, Workspace Home #1). Answers "where am I" before anything else;
 * a plain greeting, not a PageHeader — this screen is personal, not chrome.
 */

import { getGreeting } from "./greeting";

export interface WelcomeSectionProps {
  hasActiveSession: boolean;
  projectName?: string;
}

export function WelcomeSection({ hasActiveSession, projectName }: WelcomeSectionProps) {
  const { salutation, message } = getGreeting(new Date(), hasActiveSession, projectName);

  return (
    <header>
      <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
        {salutation}
      </h1>
      <p className="text-muted-foreground mt-1.5 text-sm">{message}</p>
    </header>
  );
}
