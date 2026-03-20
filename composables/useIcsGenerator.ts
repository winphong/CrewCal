import { buildIcs, type IcsEvent } from "~/utils/ics";
import { getAirportInfo, getMapsUrl } from "~/utils/airports";
import type { Trip } from "~/utils/types";

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

function tripToIcsEvent(trip: Trip, reminderHours: number[]): IcsEvent {
  const destInfo = getAirportInfo(trip.destination);
  const flightNos = trip.flightNumbers.join("/");
  const uid = `${trip.flightNumbers.join("-")}-${formatUidDate(trip.departureDate)}@flight-schedule-exporter`;

  const summary = `${destInfo.city} - ${destInfo.country} ${destInfo.flag} (${flightNos})`;
  const location = getMapsUrl(trip.destination);
  const description = trip.legs.map(formatLegDetail).join("\n");

  return {
    uid,
    summary,
    description,
    location,
    dtstart: trip.departureDate,
    dtend: trip.returnDate,
    reminderHours,
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

export function useIcsGenerator() {
  function generateIcs(trips: Trip[], reminderHours: number[] = []): string {
    const events = trips.map((trip) => tripToIcsEvent(trip, reminderHours));
    return buildIcs(events);
  }

  function downloadIcs(icsContent: string, filename = "flights.ics") {
    const blob = new Blob([icsContent], {
      type: "text/calendar;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return { generateIcs, downloadIcs };
}
