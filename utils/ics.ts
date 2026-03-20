/**
 * Low-level ICS string builder (RFC 5545 subset)
 * All datetimes are in Asia/Singapore timezone.
 */

const CRLF = '\r\n'

/** Fold lines at 75 octets per RFC 5545 */
function foldLine(line: string): string {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(line)
  if (bytes.length <= 75) return line

  const parts: string[] = []
  let start = 0
  let isFirst = true

  while (start < bytes.length) {
    const maxLen = isFirst ? 75 : 74 // subsequent lines have a leading space
    let end = start + maxLen

    if (end >= bytes.length) {
      const segment = new TextDecoder().decode(bytes.slice(start))
      parts.push(isFirst ? segment : ' ' + segment)
      break
    }

    // Don't split in the middle of a multi-byte UTF-8 character
    while (end > start && (bytes[end] & 0xC0) === 0x80) {
      end--
    }

    const segment = new TextDecoder().decode(bytes.slice(start, end))
    parts.push(isFirst ? segment : ' ' + segment)
    start = end
    isFirst = false
  }

  return parts.join(CRLF)
}

function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

function formatDateTimeSGT(date: Date): string {
  // Format as YYYYMMDDTHHMMSS for TZID=Asia/Singapore
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  return `${y}${m}${d}T${h}${min}${s}`
}

function formatDateTimeUTC(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  const h = String(date.getUTCHours()).padStart(2, '0')
  const min = String(date.getUTCMinutes()).padStart(2, '0')
  const s = String(date.getUTCSeconds()).padStart(2, '0')
  return `${y}${m}${d}T${h}${min}${s}Z`
}

export interface IcsEvent {
  uid: string
  summary: string
  description: string
  location: string
  dtstart: Date      // SGT datetime
  dtend: Date        // SGT datetime
  reminderHours: number[]
}

function buildVTimezone(): string {
  const lines = [
    'BEGIN:VTIMEZONE',
    'TZID:Asia/Singapore',
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:+0800',
    'TZOFFSETTO:+0800',
    'TZNAME:SGT',
    'END:STANDARD',
    'END:VTIMEZONE',
  ]
  return lines.map(foldLine).join(CRLF)
}

function buildVEvent(event: IcsEvent): string {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${formatDateTimeUTC(new Date())}`,
    `DTSTART;TZID=Asia/Singapore:${formatDateTimeSGT(event.dtstart)}`,
    `DTEND;TZID=Asia/Singapore:${formatDateTimeSGT(event.dtend)}`,
    `SUMMARY:${escapeText(event.summary)}`,
    `LOCATION:${escapeText(event.location)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
  ]

  for (const hours of event.reminderHours) {
    lines.push(
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:Reminder',
      `TRIGGER:-PT${hours}H`,
      'END:VALARM',
    )
  }

  lines.push('END:VEVENT')
  return lines.map(foldLine).join(CRLF)
}

export function buildIcs(events: IcsEvent[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Flight Schedule Exporter//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  const header = lines.map(foldLine).join(CRLF)
  const timezone = buildVTimezone()
  const vevents = events.map(buildVEvent).join(CRLF)
  const footer = 'END:VCALENDAR'

  return [header, timezone, vevents, footer].join(CRLF) + CRLF
}
