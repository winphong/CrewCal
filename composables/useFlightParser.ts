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

function parseFlightLegs(csvText: string): FlightLeg[] {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  });

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

function groupTrips(legs: FlightLeg[]): Trip[] {
  // Sort legs by departure time
  const sorted = [...legs].sort((a, b) => {
    const dateA = parseSgtIso(a.departAt);
    const dateB = parseSgtIso(b.departAt);
    return dateA.getTime() - dateB.getTime();
  });

  const trips: Trip[] = [];
  let currentLegs: FlightLeg[] = [];

  for (const leg of sorted) {
    // Start a new trip when departing from SIN
    if (leg.from === "SIN" && currentLegs.length === 0) {
      currentLegs.push(leg);
    } else if (currentLegs.length > 0) {
      currentLegs.push(leg);

      // Trip ends when arriving back at SIN
      if (leg.to === "SIN") {
        const destination = currentLegs[0].to;
        const departureDate = parseSgtIso(currentLegs[0].departAt);
        const lastLeg = currentLegs[currentLegs.length - 1];
        const returnDate = parseSgtIso(lastLeg.arriveAt);

        trips.push({
          legs: [...currentLegs],
          destination,
          departureDate,
          returnDate,
          flightNumbers: currentLegs.map((l) => l.flightNo),
        });
        currentLegs = [];
      }
    }
  }

  // Handle incomplete trip (no return to SIN yet)
  if (currentLegs.length > 0) {
    const destination = currentLegs[0].to;
    const departureDate = parseSgtIso(currentLegs[0].departAt);
    const lastLeg = currentLegs[currentLegs.length - 1];
    const returnDate = parseSgtIso(lastLeg.arriveAt);

    trips.push({
      legs: [...currentLegs],
      destination,
      departureDate,
      returnDate,
      flightNumbers: currentLegs.map((l) => l.flightNo),
    });
  }

  return trips;
}

export function useFlightParser() {
  const trips = ref<Trip[]>([]);
  const error = ref<string | null>(null);

  function parseCsv(csvText: string) {
    try {
      error.value = null;
      const legs = parseFlightLegs(csvText);
      if (legs.length === 0) {
        error.value = "No flight data found in CSV";
        return;
      }
      trips.value = groupTrips(legs);
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to parse CSV";
      trips.value = [];
    }
  }

  function filterByDate(fromDate: Date): Trip[] {
    return trips.value.filter((trip) => trip.departureDate >= fromDate);
  }

  return { trips, error, parseCsv, filterByDate };
}
