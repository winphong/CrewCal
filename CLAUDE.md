# Flight Schedule Exporter

Nuxt 3 SPA that converts cabin crew flight roster CSVs into grouped trip events (.ics) for calendar import.

## Commands

- `bun run dev` — Start dev server
- `bun run build` — Production build (Nitro node-server preset)
- `bun run preview` — Preview production build
- `bun run format` — Format all files with Prettier

## Code Style

- Follow the Prettier config in `.prettierrc.json`
- Always run `bun run format` before completing any code changes

## Architecture

- **Nuxt 3** with `ssr: false` (SPA mode), **Tailwind CSS** for styling
- **Runtime**: Bun (Node 22.14.0 via asdf)
- All processing is client-side — no server API routes needed

## CSV Format

The input CSV uses these columns from airline crew rosters:
`Date, Airline, Flight, From, To, Dep Terminal, Dep Gate, Arr Terminal, Arr Gate, Gate Departure (Scheduled), Gate Arrival (Scheduled), Aircraft Type Name`

- Datetimes are ISO format in SGT (e.g. `2026-01-20T12:30`)
- Airline + Flight number are separate columns (e.g. `SIA` + `38` → `SQ38`)

## Trip Grouping Logic

Flights are grouped into trips: a trip starts when `from === 'SIN'` and ends when `to === 'SIN'`. The destination is the `to` of the first outbound leg.

## ICS Generation

- Datetimes use `TZID=Asia/Singapore` (not all-day events)
- UIDs are deterministic for deduplication: `{flightNos}-{date}@flight-schedule-exporter`
- CRLF line endings, lines folded at 75 octets per RFC 5545

## Key Files

- `utils/airports.ts` — 6000+ airports from OpenFlights dataset (auto-generated, do not hand-edit)
- `utils/ics.ts` — Low-level ICS string builder
- `composables/useFlightParser.ts` — CSV parsing + trip grouping
- `composables/useIcsGenerator.ts` — Trip → ICS event conversion + blob download
