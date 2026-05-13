/**
 * Low-level ICS string builder (RFC 5545 subset)
 * All datetimes use a single IANA timezone per event (default: Asia/Singapore).
 */

const CRLF = "\r\n";
const SGT = "Asia/Singapore";

/** Fold lines at 75 octets per RFC 5545 */
function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(line);
  if (bytes.length <= 75) return line;

  const parts: string[] = [];
  let start = 0;
  let isFirst = true;

  while (start < bytes.length) {
    const maxLen = isFirst ? 75 : 74; // subsequent lines have a leading space
    let end = start + maxLen;

    if (end >= bytes.length) {
      const segment = new TextDecoder().decode(bytes.slice(start));
      parts.push(isFirst ? segment : " " + segment);
      break;
    }

    // Don't split in the middle of a multi-byte UTF-8 character
    while (end > start && (bytes[end] & 0xc0) === 0x80) {
      end--;
    }

    // Don't split ICS escape sequences (\n, \,, \;, \\) — backslash must not be last byte
    if (end > start && bytes[end - 1] === 0x5c) {
      end--;
    }

    const segment = new TextDecoder().decode(bytes.slice(start, end));
    parts.push(isFirst ? segment : " " + segment);
    start = end;
    isFirst = false;
  }

  return parts.join(CRLF);
}

function escapeText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/** Format a UTC Date as YYYYMMDDTHHMMSS in a given IANA timezone */
function formatDateTimeInTz(date: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  // en-CA gives "2026-01-20" for date parts; grab each piece individually
  const year = get("year");
  const month = get("month");
  const day = get("day");
  let hour = get("hour");
  // Intl may return "24" for midnight in some locales; normalise to "00"
  if (hour === "24") hour = "00";
  const minute = get("minute");
  const second = get("second");
  return `${year}${month}${day}T${hour}${minute}${second}`;
}

function formatDateTimeUTC(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const h = String(date.getUTCHours()).padStart(2, "0");
  const min = String(date.getUTCMinutes()).padStart(2, "0");
  const s = String(date.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${d}T${h}${min}${s}Z`;
}

export interface IcsEvent {
  uid: string;
  summary: string;
  description: string;
  location: string;
  geo: string | null; // "lat;lon" e.g. "33.9425;-118.408"
  dtstart: Date;
  dtend: Date;
  reminderHours: number[];
}

function buildSgtVTimezone(): string {
  const lines = [
    "BEGIN:VTIMEZONE",
    "TZID:Asia/Singapore",
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZOFFSETFROM:+0800",
    "TZOFFSETTO:+0800",
    "TZNAME:SGT",
    "END:STANDARD",
    "END:VTIMEZONE",
  ];
  return lines.map(foldLine).join(CRLF);
}

function buildVEvent(event: IcsEvent): string {
  const lines = [
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${formatDateTimeUTC(new Date())}`,
    `DTSTART;TZID=${SGT}:${formatDateTimeInTz(event.dtstart, SGT)}`,
    `DTEND;TZID=${SGT}:${formatDateTimeInTz(event.dtend, SGT)}`,
    `SUMMARY:${escapeText(event.summary)}`,
    `LOCATION:${escapeText(event.location)}`,
    ...(event.geo ? [`GEO:${event.geo}`] : []),
    `DESCRIPTION:${escapeText(event.description)}`,
  ];

  for (const hours of event.reminderHours) {
    lines.push(
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      "DESCRIPTION:Reminder",
      `TRIGGER:-PT${hours}H`,
      "END:VALARM",
    );
  }

  lines.push("END:VEVENT");
  return lines.map(foldLine).join(CRLF);
}

export function buildIcs(events: IcsEvent[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Flight Schedule Exporter//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  const header = lines.map(foldLine).join(CRLF);
  const timezone = buildSgtVTimezone();
  const vevents = events.map(buildVEvent).join(CRLF);
  const footer = "END:VCALENDAR";

  return [header, timezone, vevents, footer].join(CRLF) + CRLF;
}
