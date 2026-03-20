export interface FlightLeg {
  flightNo: string    // e.g. "SQ038"
  from: string        // IATA code e.g. "SIN"
  to: string          // IATA code e.g. "LAX"
  departAt: string    // ISO datetime in SGT e.g. "2026-01-20T12:30"
  arriveAt: string    // ISO datetime in SGT e.g. "2026-01-20T13:20"
}

export interface Trip {
  legs: FlightLeg[]
  destination: string        // IATA code of the main destination
  departureDate: Date        // SGT datetime of first leg departure
  returnDate: Date           // SGT datetime of last leg arrival
  flightNumbers: string[]    // e.g. ["SQ038", "SQ035"]
}

export interface AirportInfo {
  city: string
  country: string
  flag: string
  lat: number
  lon: number
}

export interface ReminderOption {
  label: string
  hours: number
}
