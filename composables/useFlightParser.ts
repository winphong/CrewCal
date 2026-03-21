import Papa from "papaparse";
import { normalizeFlightNo } from "~/utils/airlines";
import type { FlightLeg, Trip } from "~/utils/types";

/** Parse an ISO datetime string (SGT, no timezone suffix) into a UTC Date */
function parseSgtIso(isoStr: string): Date {
  // Input like "2026-01-20T12:30" is SGT (UTC+8)
  const [datePart, timePart] = isoStr.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [h, min] = (timePart ?? "00:00").split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, h - 8, min));
}

const REQUIRED_HEADERS = [
  "Airline",
  "Flight",
  "From",
  "To",
  "Gate Departure (Scheduled)",
  "Gate Arrival (Scheduled)",
];

function parseFlightLegs(csvText: string): FlightLeg[] {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  });

  const headers = result.meta.fields ?? [];
  const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    throw new Error(
      `This doesn't look like a Flighty export. Missing columns: ${missing.join(", ")}`,
    );
  }

  return result.data.map((row) => {
    const airline = (row["Airline"] ?? "").trim();
    const flight = (row["Flight"] ?? "").trim();
    const flightNo = normalizeFlightNo(`${airline}${flight}`);

    return {
      flightNo,
      from: (row["From"] ?? "").trim().toUpperCase(),
      to: (row["To"] ?? "").trim().toUpperCase(),
      departAt: (row["Gate Departure (Scheduled)"] ?? "").trim(),
      arriveAt: (row["Gate Arrival (Scheduled)"] ?? "").trim(),
    };
  });
}

/** The destination is the `to` of the leg with the longest gap before the
 *  next departure — i.e. where the traveller actually stays. Falls back to
 *  the first leg's `to` for single-leg or same-day trips. */
function findDestination(legs: FlightLeg[]): string {
  if (legs.length === 1) return legs[0].to;
  let maxGap = -1;
  let destination = legs[0].to;
  for (let i = 0; i < legs.length - 1; i++) {
    const arriveAt = parseSgtIso(legs[i].arriveAt);
    const nextDepartAt = parseSgtIso(legs[i + 1].departAt);
    const gap = nextDepartAt.getTime() - arriveAt.getTime();
    if (gap > maxGap) {
      maxGap = gap;
      destination = legs[i].to;
    }
  }
  return destination;
}

const MAX_TRIP_GAP_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

function finalizeTrip(legs: FlightLeg[]): Trip {
  const destination = findDestination(legs);
  const departureDate = parseSgtIso(legs[0].departAt);
  const returnDate = parseSgtIso(legs[legs.length - 1].arriveAt);
  return {
    legs: [...legs],
    destination,
    departureDate,
    returnDate,
    flightNumbers: legs.map((l) => l.flightNo),
  };
}

function groupTrips(legs: FlightLeg[], homeAirport: string): Trip[] {
  // Sort legs by departure time
  const sorted = [...legs].sort((a, b) => {
    const dateA = parseSgtIso(a.departAt);
    const dateB = parseSgtIso(b.departAt);
    return dateA.getTime() - dateB.getTime();
  });

  const trips: Trip[] = [];
  let currentLegs: FlightLeg[] = [];

  for (const leg of sorted) {
    // If a trip is in progress but gap to this leg exceeds 14 days, close it first
    if (currentLegs.length > 0) {
      const lastLeg = currentLegs[currentLegs.length - 1];
      const gap =
        parseSgtIso(leg.departAt).getTime() -
        parseSgtIso(lastLeg.arriveAt).getTime();
      if (gap > MAX_TRIP_GAP_MS) {
        trips.push(finalizeTrip(currentLegs));
        currentLegs = [];
      }
    }

    currentLegs.push(leg);

    // Trip ends when arriving back at home airport
    if (leg.to === homeAirport) {
      trips.push(finalizeTrip(currentLegs));
      currentLegs = [];
    }
  }

  // Handle incomplete trip (no return to SIN yet)
  if (currentLegs.length > 0) {
    trips.push(finalizeTrip(currentLegs));
  }

  return trips;
}

export function useFlightParser() {
  const trips = ref<Trip[]>([]);
  const error = ref<string | null>(null);
  const rawLegs = ref<FlightLeg[]>([]);

  function parseCsv(csvText: string, homeAirport: string) {
    try {
      error.value = null;
      const legs = parseFlightLegs(csvText);
      if (legs.length === 0) {
        error.value = "No flight data found in CSV";
        return;
      }
      rawLegs.value = legs;
      trips.value = groupTrips(legs, homeAirport);
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to parse CSV";
      rawLegs.value = [];
      trips.value = [];
    }
  }

  function regroup(homeAirport: string) {
    if (rawLegs.value.length > 0) {
      trips.value = groupTrips(rawLegs.value, homeAirport);
    }
  }

  function filterByDate(fromDate: Date | null, toDate: Date | null): Trip[] {
    return trips.value.filter((trip) => {
      if (fromDate && trip.departureDate < fromDate) return false;
      if (toDate && trip.departureDate > toDate) return false;
      return true;
    });
  }

  return { trips, error, parseCsv, regroup, filterByDate };
}
