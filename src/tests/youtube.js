import { makeUnlockItem } from "./shared.js";
import { safeText } from "../utils/http.js";

export async function checkYoutubePremium(ctx) {
  const url = "https://www.youtube.com/premium";
  try {
    const resp = await ctx.request(url);
    const body = await safeText(resp);
    const lower = body.toLowerCase();
    let status = "Failed";
    let region = null;

    if (lower.includes("youtube premium is not available in your country")) {
      status = "No";
    } else if (lower.includes("ad-free")) {
      const match = body.match(/id="country-code"[^>]*>([^<]+)</i);
      if (match && match[1]) {
        const code = match[1].trim();
        const emoji = ctx.countryCodeToEmoji(code);
        region = `${emoji}${code}`;
        status = "Yes";
      }
    }

    return makeUnlockItem("YouTube Premium", status, region, ctx);
  } catch (err) {
    ctx.log("warn", "youtube premium failed", err?.message || err);
    return makeUnlockItem("YouTube Premium", "Failed", null, ctx);
  }
}
