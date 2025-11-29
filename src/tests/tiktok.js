import { makeUnlockItem } from "./shared.js";
import { safeText } from "../utils/http.js";

export async function checkTikTok(ctx) {
  const traceUrl = "https://www.tiktok.com/cdn-cgi/trace";
  let status = "Failed";
  let region = null;

  try {
    const resp = await ctx.request(traceUrl);
    const body = await safeText(resp);
    status = determineTikTokStatus(resp?.status || 0, body);
    region = extractTikTokRegion(body, ctx);
  } catch (err) {
    ctx.log("warn", "tiktok trace failed", err?.message || err);
  }

  if ((!region || status === "Failed") && !(ctx?.abortSignal?.aborted)) {
    try {
      const resp = await ctx.request("https://www.tiktok.com/");
      const body = await safeText(resp);
      const fallbackStatus = determineTikTokStatus(resp?.status || 0, body);
      const fallbackRegion = extractTikTokRegion(body, ctx);
      if (status !== "No") {
        status = fallbackStatus;
      }
      if (!region) {
        region = fallbackRegion;
      }
    } catch (err) {
      ctx.log("warn", "tiktok fallback failed", err?.message || err);
    }
  }

  return makeUnlockItem("TikTok", status, region, ctx);
}

function determineTikTokStatus(status, body) {
  if (status === 403 || status === 451) return "No";
  if (status < 200 || status >= 300) return "Failed";
  const lower = body.toLowerCase();
  if (
    lower.includes("access denied") ||
    lower.includes("not available in your region") ||
    lower.includes("tiktok is not available")
  ) {
    return "No";
  }
  return "Yes";
}

function extractTikTokRegion(body = "", ctx) {
  const match = body.match(/"region"\s*:\s*"([a-zA-Z-]+)"/i);
  if (match && match[1]) {
    const raw = match[1];
    const country = raw.split("-")[0].toUpperCase();
    if (country) {
      const emoji = ctx.countryCodeToEmoji(country);
      return `${emoji}${country}`;
    }
  }
  return null;
}
