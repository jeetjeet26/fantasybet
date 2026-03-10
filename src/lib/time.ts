const EASTERN_TIME_ZONE = "America/New_York";

function formatDateParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error(`Failed to format date parts for ${timeZone}`);
  }

  return { year, month, day };
}

export function getEasternDateKey(date = new Date()): string {
  const { year, month, day } = formatDateParts(date, EASTERN_TIME_ZONE);
  return `${year}-${month}-${day}`;
}

export function getWeekStartDateKey(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.getUTCDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;

  date.setUTCDate(date.getUTCDate() + diff);
  return date.toISOString().split("T")[0];
}

export function getWeekEndDateKey(dateKey: string): string {
  const [year, month, day] = getWeekStartDateKey(dateKey).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + 6);
  return date.toISOString().split("T")[0];
}

export function getCurrentEasternWeekStart(date = new Date()): string {
  return getWeekStartDateKey(getEasternDateKey(date));
}

export function getCurrentEasternWeekEnd(date = new Date()): string {
  return getWeekEndDateKey(getEasternDateKey(date));
}

export function formatDateKey(dateKey: string, options?: Intl.DateTimeFormatOptions): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    ...options,
  }).format(date);
}

