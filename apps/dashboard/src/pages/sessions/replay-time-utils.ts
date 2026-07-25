export function formatReplayTime(timestamp: string | number | null | undefined): string {
  if (!timestamp) return "00:00";
  const str = String(timestamp);

  const date = new Date(str);
  if (isNaN(date.getTime())) {
    return str || "00:00";
  }

  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
}
