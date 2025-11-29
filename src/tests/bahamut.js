import { makeUnlockItem } from "./shared.js";
import { safeText } from "../utils/http.js";

export async function checkBahamutAnime(ctx) {
  const deviceUrl = "https://ani.gamer.com.tw/ajax/getdeviceid.php";
  let deviceId = "";

  try {
    const resp = await ctx.request(deviceUrl);
    const text = await safeText(resp);
    const match = text.match(/"deviceid"\s*:\s*"([^"]+)"/i);
    deviceId = match ? match[1] : "";
  } catch (err) {
    ctx.log("warn", "bahamut device id failed", err?.message || err);
  }

  if (!deviceId) {
    return makeUnlockItem("Bahamut Anime", "Failed", null, ctx);
  }

  const tokenUrl = `https://ani.gamer.com.tw/ajax/token.php?adID=89422&sn=37783&device=${encodeURIComponent(
    deviceId
  )}`;

  let tokenOk = false;
  try {
    const resp = await ctx.request(tokenUrl);
    const text = await safeText(resp);
    tokenOk = text.includes("animeSn");
  } catch (err) {
    ctx.log("warn", "bahamut token failed", err?.message || err);
  }

  if (!tokenOk) {
    return makeUnlockItem("Bahamut Anime", "No", null, ctx);
  }

  let region = null;
  try {
    const resp = await ctx.request("https://ani.gamer.com.tw/");
    const text = await safeText(resp);
    const match = text.match(/data-geo="([^"]+)"/i);
    if (match && match[1]) {
      const code = match[1];
      const emoji = ctx.countryCodeToEmoji(code);
      region = `${emoji}${code}`;
    }
  } catch (err) {
    ctx.log("warn", "bahamut region failed", err?.message || err);
  }

  return makeUnlockItem("Bahamut Anime", "Yes", region, ctx);
}
