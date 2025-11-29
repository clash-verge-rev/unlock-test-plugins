export function countryCodeToEmoji(code = "") {
  if (!code) return "";
  const upper = code.trim().toUpperCase();
  const alpha2 = upper.length === 3 ? upper.slice(0, 2) : upper;
  if (alpha2.length !== 2) return "";
  const first = alpha2.codePointAt(0);
  const second = alpha2.codePointAt(1);
  if (!first || !second) return "";
  const base = 0x1f1e6;
  const offsetA = "A".codePointAt(0);
  if (first < offsetA || second < offsetA) return "";
  return String.fromCodePoint(base + first - offsetA, base + second - offsetA);
}
