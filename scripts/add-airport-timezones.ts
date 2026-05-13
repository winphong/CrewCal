/**
 * Fetches the OpenFlights airports.dat and patches utils/airports.ts to add
 * a `tz` field (IANA timezone) to each airport entry that has one.
 *
 * Re-run this after regenerating the base airports.ts data.
 * Run with: bun run scripts/add-airport-timezones.ts
 */

const DATA_URL =
  "https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat";

console.log("Fetching OpenFlights airports.dat...");
const response = await fetch(DATA_URL);
const text = await response.text();

// Build IATA → IANA timezone map from the dataset
const tzMap = new Map<string, string>();

for (const line of text.split("\n")) {
  if (!line.trim()) continue;

  // Parse CSV respecting quoted fields
  const fields: string[] = [];
  let cur = "";
  let inQuote = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (ch === "," && !inQuote) {
      fields.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  fields.push(cur);

  const iata = fields[4]?.trim();
  const tz = fields[11]?.trim();

  if (!iata || iata.length !== 3 || iata === "\\N") continue;
  if (!tz || tz === "\\N" || tz === "") continue;

  if (!tzMap.has(iata)) tzMap.set(iata, tz);
}

console.log(`Loaded ${tzMap.size} timezone entries.`);

// Patch airports.ts
const airportsPath = new URL("../utils/airports.ts", import.meta.url).pathname;
const source = await Bun.file(airportsPath).text();

let count = 0;

const patched = source
  .split("\n")
  .map((line) => {
    const match = line.match(/^  ([A-Z]{3}): \{(.+)\},$/);
    if (!match) return line;

    const iata = match[1];
    const tz = tzMap.get(iata);
    if (!tz) return line;

    // Remove any existing tz field before re-adding (idempotent)
    const body = match[2].replace(/,?\s*tz:\s*'[^']*'/, "").trimEnd();

    count++;
    return `  ${iata}: {${body}, tz: '${tz}' },`;
  })
  .join("\n");

await Bun.write(airportsPath, patched);
console.log(`Patched ${count} airport entries in utils/airports.ts.`);
