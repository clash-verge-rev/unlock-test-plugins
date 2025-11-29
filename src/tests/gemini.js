import { makeUnlockItem } from "./shared.js";
import { safeText } from "../utils/http.js";

export async function checkGemini(ctx) {
  const url = "https://gemini.google.com";
  try {
    const resp = await ctx.request(url);
    const body = await safeText(resp);
    const status = body.includes("45631641,null,true") ? "Yes" : "No";
    const match = body.match(/,2,1,200,"([A-Z]{3})"/);
    const region = match ? match[1] : null;
    const emoji = region ? ctx.countryCodeToEmoji(region) : "";
    return makeUnlockItem("Gemini", status, region ? `${emoji}${region}` : null, ctx);
  } catch (err) {
    ctx.log("warn", "gemini failed", err?.message || err);
    return makeUnlockItem("Gemini", "Failed", null, ctx);
  }
}
