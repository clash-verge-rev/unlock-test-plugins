import { makeUnlockItem } from "./shared.js";
import { safeText } from "../utils/http.js";

export async function checkChatgptCombined(ctx) {
  const region = await getOpenaiRegion(ctx);

  const iosStatus = await getChatgptIosStatus(ctx);
  const webStatus = await getChatgptWebStatus(ctx);

  return [
    makeUnlockItem("ChatGPT iOS", iosStatus, region, ctx),
    makeUnlockItem("ChatGPT Web", webStatus, region, ctx),
  ];
}

async function getOpenaiRegion(ctx) {
  const url = "https://chat.openai.com/cdn-cgi/trace";
  try {
    const resp = await ctx.request(url);
    const body = await safeText(resp);
    const map = {};
    for (const line of body.split("\n")) {
      const idx = line.indexOf("=");
      if (idx === -1) continue;
      const key = line.slice(0, idx);
      const value = line.slice(idx + 1);
      map[key] = value;
    }
    if (map.loc) {
      const emoji = ctx.countryCodeToEmoji(map.loc);
      return `${emoji}${map.loc}`;
    }
  } catch (err) {
    ctx.log("warn", "chatgpt region failed", err?.message || err);
  }
  return null;
}

async function getChatgptIosStatus(ctx) {
  const url = "https://ios.chat.openai.com/";
  try {
    const resp = await ctx.request(url);
    const body = (await safeText(resp)).toLowerCase();
    if (body.includes("you may be connected to a disallowed isp")) {
      return "Disallowed ISP";
    }
    if (body.includes("request is not allowed. please try again later.")) {
      return "Yes";
    }
    if (body.includes("sorry, you have been blocked")) {
      return "Blocked";
    }
    return "Failed";
  } catch (err) {
    ctx.log("warn", "chatgpt ios failed", err?.message || err);
    return "Failed";
  }
}

async function getChatgptWebStatus(ctx) {
  const url = "https://api.openai.com/compliance/cookie_requirements";
  try {
    const resp = await ctx.request(url);
    const body = (await safeText(resp)).toLowerCase();
    if (body.includes("unsupported_country")) {
      return "Unsupported Country/Region";
    }
    return "Yes";
  } catch (err) {
    ctx.log("warn", "chatgpt web failed", err?.message || err);
    return "Failed";
  }
}
