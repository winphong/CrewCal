import { buildIcs, type IcsEvent } from "~/utils/ics";
import { getAirportInfo, getLocationText, getGeo } from "~/utils/airports";
import type { FlightLeg, Trip } from "~/utils/types";

/** Parse an ISO datetime string (SGT, no timezone suffix) into a UTC Date */
function parseSgtIso(isoStr: string): Date {
  const [datePart, timePart] = isoStr.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [h, min] = (timePart ?? "00:00").split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, h - 8, min));
}

/** Parse an ISO datetime string in a given IANA timezone into a UTC Date */
function parseLocalIso(isoStr: string, tz: string): Date {
  // Treat isoStr as UTC momentarily to get a Date object
  const naive = new Date(isoStr + "Z");
  // Find what local time that UTC corresponds to in `tz`
  const localStr = naive.toLocaleString("sv-SE", { timeZone: tz }); // "YYYY-MM-DD HH:MM:SS"
  const localAsUtc = new Date(localStr.replace(" ", "T") + "Z");
  // offsetMs = how far local is ahead of UTC
  const offsetMs = localAsUtc.getTime() - naive.getTime();
  // Actual UTC = naive shifted back by the offset
  return new Date(naive.getTime() - offsetMs);
}

function formatLegDetail(leg: {
  flightNo: string;
  from: string;
  to: string;
  departAt: string;
  arriveAt: string;
}): string {
  const fromInfo = getAirportInfo(leg.from);
  const toInfo = getAirportInfo(leg.to);
  // departAt/arriveAt are ISO like "2026-01-20T12:30"
  const depDisplay = leg.departAt.replace("T", " ");
  const arrDisplay = leg.arriveAt.replace("T", " ");
  return `${leg.flightNo}: ${fromInfo.city} (${leg.from}) → ${toInfo.city} (${leg.to}) | ${depDisplay} - ${arrDisplay}`;
}

function formatDuration(start: Date, end: Date): string {
  const totalMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function legToIcsEvent(leg: FlightLeg, reminderHours: number[]): IcsEvent {
  const fromInfo = getAirportInfo(leg.from);
  const toInfo = getAirportInfo(leg.to);
  const dtstart = parseSgtIso(leg.departAt);
  const dtend = parseSgtIso(leg.arriveAt);
  // UID based on flight number + departure datetime for deduplication
  const uid = `${leg.flightNo}-${leg.departAt.replace(/[T:]/g, "")}@flight-schedule-exporter`;
  // Use each airport's local timezone to compute the actual flight duration
  const depUtc = parseLocalIso(leg.departAt, fromInfo.tz ?? "Asia/Singapore");
  const arrUtc = parseLocalIso(leg.arriveAt, toInfo.tz ?? "Asia/Singapore");
  const duration = formatDuration(depUtc, arrUtc);
  const summary = `${leg.flightNo} · ${leg.from} → ${leg.to} (${duration})`;
  const description = `${leg.flightNo}: ${fromInfo.city} (${leg.from}) → ${toInfo.city} (${leg.to}) | ${leg.departAt.replace("T", " ")} - ${leg.arriveAt.replace("T", " ")}`;

  return {
    uid,
    summary,
    description,
    location: getLocationText(leg.to),
    geo: getGeo(leg.to),
    dtstart,
    dtend,
    reminderHours,
  };
}

function tripToIcsEvent(trip: Trip, reminderHours: number[]): IcsEvent {
  const destInfo = getAirportInfo(trip.destination);
  const flightNos = trip.flightNumbers.join("/");
  const uid = `${trip.flightNumbers.join("-")}-${formatUidDate(trip.departureDate)}@flight-schedule-exporter`;

  // Count distinct calendar days in SGT (UTC+8), inclusive of both endpoints
  const toSgtDateMs = (d: Date) => {
    const sgt = new Date(d.getTime() + 8 * 60 * 60 * 1000);
    return Date.UTC(sgt.getUTCFullYear(), sgt.getUTCMonth(), sgt.getUTCDate());
  };
  const days =
    Math.round(
      (toSgtDateMs(trip.returnDate) - toSgtDateMs(trip.departureDate)) /
        (1000 * 60 * 60 * 24),
    ) + 1;
  const summary = `${destInfo.city} - ${destInfo.country} ${destInfo.flag} (${flightNos} · ${days}d)`;
  const location = getLocationText(trip.destination);
  const geo = getGeo(trip.destination);
  const description = trip.legs.map(formatLegDetail).join("\n\n");

  // All-day DTEND is exclusive: advance return date by 1 SGT calendar day
  const returnSgt = new Date(trip.returnDate.getTime() + 8 * 60 * 60 * 1000);
  const dtend = new Date(
    Date.UTC(
      returnSgt.getUTCFullYear(),
      returnSgt.getUTCMonth(),
      returnSgt.getUTCDate() + 1,
    ),
  );

  return {
    uid,
    summary,
    description,
    location,
    geo,
    dtstart: trip.departureDate,
    dtend,
    reminderHours,
    allDay: true,
  };
}

function formatUidDate(date: Date): string {
  // Format date for UID - use SGT (UTC+8)
  const sgt = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const y = sgt.getUTCFullYear();
  const m = String(sgt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(sgt.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

export function buildIcsEvents(
  trips: Trip[],
  reminderHours: number[],
): IcsEvent[] {
  const tripEvents = trips.map((trip) => tripToIcsEvent(trip, reminderHours));
  const legEvents = trips.flatMap((trip) =>
    trip.legs.map((leg) => legToIcsEvent(leg, reminderHours)),
  );
  return [...tripEvents, ...legEvents];
}

export function useIcsGenerator() {
  function generateIcs(trips: Trip[], reminderHours: number[] = []): string {
    const events = buildIcsEvents(trips, reminderHours);
    return buildIcs(events);
  }

  function downloadIcs(icsContent: string, filename?: string) {
    const now = new Date();
    const ts =
      [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0"),
      ].join("") +
      "-" +
      [
        String(now.getHours()).padStart(2, "0"),
        String(now.getMinutes()).padStart(2, "0"),
        String(now.getSeconds()).padStart(2, "0"),
      ].join("");
    const resolvedFilename = filename ?? `flights-${ts}.ics`;
    const blob = new Blob([icsContent], {
      type: "text/calendar;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = resolvedFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return { generateIcs, downloadIcs };
}
