import { makeUnlockItem } from "./shared.js";
import { safeText } from "../utils/http.js";

export async function checkSpotify(ctx) {
  const url =
    "https://www.spotify.com/api/content/v1/country-selector?platform=web&format=json";
  try {
    const resp = await ctx.request(url);
    const status = resp?.status ?? 0;
    const body = await safeText(resp);
    const regionFromUrl = extractSpotifyRegionFromUrl(resp?.url, ctx);
    const regionFromBody = extractSpotifyRegionFromBody(body, ctx);
    const region = regionFromUrl || regionFromBody;
    const finalStatus = determineSpotifyStatus(status, body);
    return makeUnlockItem("Spotify", finalStatus, region, ctx);
  } catch (err) {
    ctx.log("warn", "spotify failed", err?.message || err);
    return makeUnlockItem("Spotify", "Failed", null, ctx);
  }
}

function determineSpotifyStatus(status, body) {
  if (status === 403 || status === 451) return "No";
  if (status < 200 || status >= 300) return "Failed";
  if (body.toLowerCase().includes("not available in your country")) {
    return "No";
  }
  return "Yes";
}

function extractSpotifyRegionFromUrl(url, ctx) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const first = segments[0];
    if (!first || first === "api") return null;
    const countryCode = first.split("-")[0];
    const upper = countryCode.toUpperCase();
    if (!upper) return null;
    const emoji = ctx.countryCodeToEmoji ? ctx.countryCodeToEmoji(upper) : "";
    return `${emoji}${upper}`;
  } catch {
    return null;
  }
}

function extractSpotifyRegionFromBody(body = "", ctx) {
  const marker = '"countryCode":"';
  const idx = body.indexOf(marker);
  if (idx === -1) return null;
  const start = idx + marker.length;
  const end = body.indexOf('"', start);
  if (end === -1) return null;
  const code = body.slice(start, end).toUpperCase();
  if (!code) return null;
  const emoji = ctx.countryCodeToEmoji ? ctx.countryCodeToEmoji(code) : "";
  return `${emoji}${code}`;
}
