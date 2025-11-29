import { CLAUDE_BLOCKED } from "../constants.js";
import { makeUnlockItem } from "./shared.js";
import { safeText } from "../utils/http.js";

export async function checkClaude(ctx) {
  const url = "https://claude.ai/cdn-cgi/trace";
  try {
    const resp = await ctx.request(url);
    const body = await safeText(resp);
    let country = null;
    for (const line of body.split("\n")) {
      if (line.startsWith("loc=")) {
        country = line.slice(4).trim().toUpperCase();
        break;
      }
    }
    if (!country) {
      return makeUnlockItem("Claude", "Failed", null, ctx);
    }
    const emoji = ctx.countryCodeToEmoji(country);
    const status = CLAUDE_BLOCKED.includes(country) ? "No" : "Yes";
    return makeUnlockItem("Claude", status, `${emoji}${country}`, ctx);
  } catch (err) {
    ctx.log("warn", "claude failed", err?.message || err);
    return makeUnlockItem("Claude", "Failed", null, ctx);
  }
}
