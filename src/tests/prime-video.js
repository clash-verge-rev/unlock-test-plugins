import { makeUnlockItem } from "./shared.js";
import { safeText } from "../utils/http.js";

export async function checkPrimeVideo(ctx) {
  const url = "https://www.primevideo.com";
  try {
    const resp = await ctx.request(url);
    const body = await safeText(resp);
    const isBlocked = body.includes("isServiceRestricted");
    const match = body.match(/"currentTerritory":"([^"]+)"/i);
    const regionCode = match ? match[1] : null;

    if (isBlocked) {
      return makeUnlockItem("Prime Video", "No (Service Not Available)", null, ctx);
    }

    if (regionCode) {
      const emoji = ctx.countryCodeToEmoji(regionCode);
      return makeUnlockItem("Prime Video", "Yes", `${emoji}${regionCode}`, ctx);
    }

    if (!isBlocked) {
      return makeUnlockItem("Prime Video", "Failed (Error: PAGE ERROR)", null, ctx);
    }

    return makeUnlockItem("Prime Video", "Failed (Error: Unknown Region)", null, ctx);
  } catch (err) {
    ctx.log("warn", "prime video failed", err?.message || err);
    return makeUnlockItem("Prime Video", "Failed (Network Connection)", null, ctx);
  }
}
