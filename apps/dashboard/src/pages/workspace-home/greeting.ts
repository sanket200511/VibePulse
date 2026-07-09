export interface Greeting {
  salutation: string;
  message: string;
}

/**
 * Time-based greeting (docs/design/COPY_GUIDELINES.md, "Greeting" — warm,
 * professional, never marketing). `hasActiveSession` shifts the contextual
 * line without changing the calm tone. `projectName`, when known, grounds the
 * message in the developer's own work rather than a generic phrase.
 */
export function getGreeting(now: Date, hasActiveSession: boolean, projectName?: string): Greeting {
  const hour = now.getHours();
  const salutation = hour < 12 ? "Good morning." : hour < 18 ? "Good afternoon." : "Good evening.";
  const message = hasActiveSession
    ? projectName
      ? `You have a session in progress on ${projectName}.`
      : "You have a session in progress."
    : projectName
      ? `Here's where you left off in ${projectName}.`
      : "Here's where you left off.";

  return { salutation, message };
}
