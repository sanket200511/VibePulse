const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Relative time phrasing (docs/design/COPY_GUIDELINES.md, "Dates & Time" —
 * prefer relative time; absolute timestamps only where necessary).
 */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const diffMs = now.getTime() - then.getTime();

  if (diffMs < MINUTE) {
    return "Just now";
  }
  if (diffMs < HOUR) {
    const minutes = Math.round(diffMs / MINUTE);
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  if (diffMs < DAY) {
    const hours = Math.round(diffMs / HOUR);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  if (diffMs < 2 * DAY) {
    return "Yesterday";
  }
  if (diffMs < 7 * DAY) {
    const days = Math.round(diffMs / DAY);
    return `${days} days ago`;
  }
  return "Over a week ago";
}
