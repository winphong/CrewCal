export interface ParsedIcsEvent {
  summary: string;
  dtstart: string;
  dtend: string;
  location: string;
  description: string;
  uid: string;
}

/** Unfold ICS lines (CRLF + whitespace = line continuation) */
function unfold(text: string): string {
  return text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
}

/** Unescape ICS text values */
function unescape(value: string): string {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

/** Extract the value from a property line, stripping any parameters (e.g. TZID=...) */
function extractValue(line: string): string {
  const colonIdx = line.indexOf(":");
  return colonIdx >= 0 ? line.slice(colonIdx + 1).trim() : "";
}

/** Format an ICS datetime string for display */
export function formatIcsDate(dtStr: string): string {
  if (!dtStr) return "";
  // Strip TZID param if present: "TZID=Asia/Singapore:20260129T204500" → "20260129T204500"
  const raw = dtStr.includes(":") ? dtStr.split(":").pop()! : dtStr;
  const isUtc = raw.endsWith("Z");
  const s = raw.replace("Z", "");
  const y = s.slice(0, 4);
  const mo = s.slice(4, 6);
  const d = s.slice(6, 8);
  const h = s.slice(9, 11);
  const mi = s.slice(11, 13);
  return `${d} ${new Date(`${y}-${mo}-${d}`).toLocaleString("en-GB", { month: "short" })} ${y} ${h}:${mi}${isUtc ? " UTC" : " SGT"}`;
}

export function parseIcs(text: string): ParsedIcsEvent[] {
  const unfolded = unfold(text);
  const events: ParsedIcsEvent[] = [];

  const veventRegex = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/g;
  let match: RegExpExecArray | null;

  while ((match = veventRegex.exec(unfolded)) !== null) {
    const block = match[1];
    const event: ParsedIcsEvent = {
      summary: "",
      dtstart: "",
      dtend: "",
      location: "",
      description: "",
      uid: "",
    };

    let inAlarm = false;
    for (const line of block.split(/\r?\n/)) {
      const name = line.split(/[;:]/)[0].toUpperCase();
      if (name === "BEGIN") {
        inAlarm = extractValue(line) === "VALARM";
        continue;
      }
      if (name === "END") {
        inAlarm = false;
        continue;
      }
      if (inAlarm) continue;

      const value = unescape(extractValue(line));
      if (name === "SUMMARY") event.summary = value;
      else if (name === "DTSTART") event.dtstart = extractValue(line);
      else if (name === "DTEND") event.dtend = extractValue(line);
      else if (name === "LOCATION") event.location = value;
      else if (name === "DESCRIPTION") event.description = value;
      else if (name === "UID") event.uid = value;
    }

    if (event.summary || event.dtstart) events.push(event);
  }

  return events;
}
