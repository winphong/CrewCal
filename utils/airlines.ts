/** Maps airline name/code from CSV to IATA 2-letter code */
export const airlineCodeMap: Record<string, string> = {
  SIA: "SQ",
  SQ: "SQ",
  SilkAir: "MI",
  MI: "MI",
  Scoot: "TR",
  TR: "TR",
};

export function normalizeFlightNo(raw: string): string {
  // e.g. "SIA038" → "SQ038", "SQ038" → "SQ038"
  const match = raw.match(/^([A-Za-z]+)(\d+)$/);
  if (!match) return raw;
  const [, airline, num] = match;
  const code = airlineCodeMap[airline] ?? airline;
  return `${code}${num}`;
}
