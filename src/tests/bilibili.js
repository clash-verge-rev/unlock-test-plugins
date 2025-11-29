import { safeJson } from "../utils/http.js";
import { makeUnlockItem } from "./shared.js";

export async function checkBilibiliChinaMainland(ctx) {
  const url =
    "https://api.bilibili.com/pgc/player/web/playurl?avid=82846771&qn=0&type=&otype=json&ep_id=307247&fourk=1&fnver=0&fnval=16&module=bangumi";
  try {
    const resp = await ctx.request(url);
    const body = await safeJson(resp);
    const status = parseBilibiliStatus(body);
    return makeUnlockItem("哔哩哔哩大陆", status, null, ctx);
  } catch (err) {
    ctx.log("error", "bilibili CN failed", err?.message || err);
    return makeUnlockItem("哔哩哔哩大陆", "Failed", null, ctx);
  }
}

export async function checkBilibiliHkMcTw(ctx) {
  const url =
    "https://api.bilibili.com/pgc/player/web/playurl?avid=18281381&cid=29892777&qn=0&type=&otype=json&ep_id=183799&fourk=1&fnver=0&fnval=16&module=bangumi";
  try {
    const resp = await ctx.request(url);
    const body = await safeJson(resp);
    const status = parseBilibiliStatus(body);
    return makeUnlockItem("哔哩哔哩港澳台", status, null, ctx);
  } catch (err) {
    ctx.log("error", "bilibili HK/Macau/TW failed", err?.message || err);
    return makeUnlockItem("哔哩哔哩港澳台", "Failed", null, ctx);
  }
}

function parseBilibiliStatus(body) {
  const code = body?.code;
  if (code === 0) return "Yes";
  if (code === -10403) return "No";
  return "Failed";
}
