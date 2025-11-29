import { makeUnlockItem } from "./shared.js";
import { safeJson } from "../utils/http.js";

export async function checkNetflix(ctx) {
  const cdnResult = await checkNetflixCdn(ctx);
  if (cdnResult.status === "Yes") {
    return cdnResult;
  }

  const url1 = "https://www.netflix.com/title/81280792";
  const url2 = "https://www.netflix.com/title/70143836";

  let res1;
  let res2;
  try {
    [res1, res2] = await Promise.all([ctx.request(url1), ctx.request(url2)]);
  } catch (err) {
    ctx.log("warn", "netflix request error", err?.message || err);
    return makeUnlockItem("Netflix", "Failed", null, ctx);
  }

  const status1 = res1?.status ?? 0;
  const status2 = res2?.status ?? 0;

  if (status1 === 404 && status2 === 404) {
    return makeUnlockItem("Netflix", "Originals Only", null, ctx);
  }

  if (status1 === 403 || status2 === 403) {
    return makeUnlockItem("Netflix", "No", null, ctx);
  }

  if ([200, 301].includes(status1) || [200, 301].includes(status2)) {
    const testUrl = "https://www.netflix.com/title/80018499";
    try {
      const resp = await ctx.request(testUrl);
      const loc = resp?.headers?.get ? resp.headers.get("location") : null;
      if (loc) {
        const parts = loc.split("/");
        if (parts.length >= 4) {
          const regionCode = parts[3].split("-")[0] || "unknown";
          const emoji = ctx.countryCodeToEmoji(regionCode);
          return makeUnlockItem("Netflix", "Yes", `${emoji}${regionCode}`, ctx);
        }
      }
      const emoji = ctx.countryCodeToEmoji("us");
      return makeUnlockItem("Netflix", "Yes", `${emoji}us`, ctx);
    } catch (err) {
      ctx.log("warn", "netflix region lookup failed", err?.message || err);
      return makeUnlockItem("Netflix", "Yes (但无法获取区域)", null, ctx);
    }
  }

  return makeUnlockItem("Netflix", `Failed (状态码: ${status1}_${status2}`, null, ctx);
}

async function checkNetflixCdn(ctx) {
  const url =
    "https://api.fast.com/netflix/speedtest/v2?https=true&token=YXNkZmFzZGxmbnNkYWZoYXNkZmhrYWxm&urlCount=5";
  try {
    const resp = await ctx.request(url);
    if (resp?.status === 403) {
      return makeUnlockItem("Netflix", "No (IP Banned By Netflix)", null, ctx);
    }
    const data = await safeJson(resp);
    const targets = Array.isArray(data?.targets) ? data.targets : [];
    if (targets.length) {
      const country = targets[0]?.location?.country;
      if (country) {
        const emoji = ctx.countryCodeToEmoji(country);
        return makeUnlockItem("Netflix", "Yes", `${emoji}${country}`, ctx);
      }
    }
    return makeUnlockItem("Netflix", "Unknown", null, ctx);
  } catch (err) {
    ctx.log("warn", "netflix cdn check failed", err?.message || err);
    return makeUnlockItem("Netflix", "Failed (CDN API)", null, ctx);
  }
}
