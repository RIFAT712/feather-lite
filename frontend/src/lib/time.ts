/**
 * Timezone and Date Utilities for Wikimedia Contests
 * Ensures contest timelines always start at the beginning of the day (00:00)
 * and end at the end of the day (23:59) in the contest's target timezone,
 * querying the live Wikimedia database directly and preventing UTC drift bugs.
 */

/**
 * Queries the MediaWiki Action API siteinfo database to retrieve the target wiki's
 * configured timezone and UTC offset directly.
 */
export async function fetchWikiSiteinfo(wikiUrl: string): Promise<{
  timezone: string;
  timeoffset: number;
  sitename?: string;
} | null> {
  if (!wikiUrl) return null;
  try {
    const res = await fetch(`/api/wikis/siteinfo?url=${encodeURIComponent(wikiUrl)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      timezone: data.timezone || "UTC",
      timeoffset: typeof data.timeoffset === "number" ? data.timeoffset : 0,
      sitename: data.sitename,
    };
  } catch (err) {
    console.debug("[Time] Failed to query wiki siteinfo database:", err);
    return null;
  }
}

/**
 * Returns today's date formatted as YYYY-MM-DD in the specified IANA timezone.
 * Uses standard Intl.DateTimeFormat to compute the date accurately without UTC shift.
 */
export function getTodayDateString(tz: string = "UTC"): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(new Date());
  } catch {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }
}

/**
 * Returns the beginning of the day (00:00) for a given date or today in the specified timezone.
 * Format: YYYY-MM-DDTHH:mm (e.g. "2026-11-13T00:00")
 */
export function getBeginningOfDay(tz: string = "UTC", baseDateStr?: string): string {
  const dateStr = baseDateStr ? baseDateStr.slice(0, 10) : getTodayDateString(tz);
  return `${dateStr}T00:00`;
}

/**
 * Calculates the end of the day (23:59) after `days` days from a given start date.
 * Format: YYYY-MM-DDTHH:mm (e.g. "2026-12-13T23:59")
 */
export function calculateEndOfDay(startDateStr: string, days: number = 30): string {
  const datePart = startDateStr ? startDateStr.slice(0, 10) : getTodayDateString();
  const [year, month, day] = datePart.split("-").map(Number);

  // Construct target date using local date components to avoid timezone drift
  const targetDate = new Date(year, month - 1, day + days);
  const pad = (n: number) => n.toString().padStart(2, "0");
  const y = targetDate.getFullYear();
  const m = pad(targetDate.getMonth() + 1);
  const d = pad(targetDate.getDate());

  return `${y}-${m}-${d}T23:59`;
}

/**
 * Returns the readable GMT offset for an IANA timezone (e.g. "GMT+6" for Asia/Dhaka, "GMT+0" for UTC).
 * Normalizes "GMT" to "GMT+0" to eliminate SSR hydration mismatches between Node.js and browser ICU.
 */
export function getTimezoneOffsetLabel(tz: string = "UTC"): string {
  const normalized = (tz || "").trim();
  if (!normalized || normalized === "UTC" || normalized === "Etc/UTC" || normalized === "Etc/GMT") {
    return "GMT+0";
  }
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: normalized,
      timeZoneName: "shortOffset",
    });
    const parts = formatter.formatToParts(new Date());
    const tzPart = parts.find((p) => p.type === "timeZoneName");
    if (!tzPart) return "";
    return tzPart.value === "GMT" ? "GMT+0" : tzPart.value;
  } catch {
    return "";
  }
}

/**
 * Formats a UTC ISO string into a readable date string in a specified timezone.
 */
export function formatUtcToTz(
  isoDateStr: string | null | undefined,
  tz: string = "UTC",
  format: "date" | "datetime" | "MMM d, yyyy" | "MMM D, YYYY" = "MMM d, yyyy"
): string {
  if (!isoDateStr) return "—";
  try {
    const date = new Date(isoDateStr);
    if (isNaN(date.getTime())) return "—";
    if (format === "MMM d, yyyy") {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date);
    }
    if (format === "datetime") {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    }
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return String(isoDateStr).slice(0, 10);
  }
}

