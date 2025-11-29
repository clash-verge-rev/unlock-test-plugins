import { makeUnlockItem } from "./shared.js";
import { safeText } from "../utils/http.js";

const DEVICE_API_URL = "https://disney.api.edge.bamgrid.com/devices";
const TOKEN_URL = "https://disney.api.edge.bamgrid.com/token";
const GRAPHQL_URL = "https://disney.api.edge.bamgrid.com/graph/v1/device/graphql";
const AUTH_HEADER =
  "Bearer ZGlzbmV5JmJyb3dzZXImMS4wLjA.Cu56AgSfBTDag5NiRA81oLHkDZfu5L3CKadnefEAY84";

export async function checkDisneyPlus(ctx) {
  const deviceReqBody = {
    deviceFamily: "browser",
    applicationRuntime: "chrome",
    deviceProfile: "windows",
    attributes: {},
  };

  let deviceResp;
  try {
    deviceResp = await ctx.request(DEVICE_API_URL, {
      method: "POST",
      headers: {
        authorization: AUTH_HEADER,
        "content-type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify(deviceReqBody),
    });
  } catch (err) {
    ctx.log("warn", "disney device request failed", err?.message || err);
    return makeUnlockItem("Disney+", "Failed (Network Connection)", null, ctx);
  }

  if (deviceResp?.status === 403) {
    return makeUnlockItem("Disney+", "No (IP Banned By Disney+)", null, ctx);
  }

  const deviceBody = await safeText(deviceResp);
  const assertionMatch = deviceBody.match(/"assertion"\s*:\s*"([^"]+)"/i);
  const assertion = assertionMatch ? assertionMatch[1] : null;
  if (!assertion) {
    return makeUnlockItem("Disney+", "Failed (Error: Cannot extract assertion)", null, ctx);
  }

  const tokenBody = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
    latitude: "0",
    longitude: "0",
    platform: "browser",
    subject_token: assertion,
    subject_token_type: "urn:bamtech:params:oauth:token-type:device",
  });

  let tokenResp;
  try {
    tokenResp = await ctx.request(TOKEN_URL, {
      method: "POST",
      headers: {
        authorization: AUTH_HEADER,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: tokenBody.toString(),
    });
  } catch (err) {
    ctx.log("warn", "disney token request failed", err?.message || err);
    return makeUnlockItem("Disney+", "Failed (Network Connection)", null, ctx);
  }

  const tokenStatus = tokenResp?.status ?? 0;
  const tokenText = await safeText(tokenResp);
  if (tokenText.includes("forbidden-location") || tokenText.includes("403 ERROR")) {
    return makeUnlockItem("Disney+", "No (IP Banned By Disney+)", null, ctx);
  }

  let refreshToken = null;
  try {
    const parsed = JSON.parse(tokenText);
    refreshToken = parsed?.refresh_token || null;
  } catch {
    const match = tokenText.match(/"refresh_token"\s*:\s*"([^"]+)"/i);
    refreshToken = match ? match[1] : null;
  }

  if (!refreshToken) {
    const snippet = tokenText.slice(0, 100);
    return makeUnlockItem(
      "Disney+",
      `Failed (Error: Cannot extract refresh token, status: ${tokenStatus}, response: ${snippet}...)`,
      null,
      ctx
    );
  }

  const graphqlPayload = JSON.stringify({
    query:
      "mutation refreshToken($input: RefreshTokenInput!) { refreshToken(refreshToken: $input) { activeSession { sessionId } } }",
    variables: { input: { refreshToken } },
  });

  let graphqlResp;
  try {
    graphqlResp = await ctx.request(GRAPHQL_URL, {
      method: "POST",
      headers: {
        authorization: AUTH_HEADER,
        "content-type": "application/json",
      },
      body: graphqlPayload,
    });
  } catch (err) {
    ctx.log("warn", "disney graphql request failed", err?.message || err);
    return makeUnlockItem("Disney+", "Failed (Network Connection)", null, ctx);
  }

  const previewCheck = await checkDisneyPreview(ctx);
  const graphqlStatus = graphqlResp?.status ?? 0;
  const graphqlBodyText = await safeText(graphqlResp);

  if (!graphqlBodyText || graphqlStatus >= 400) {
    const regionFromMain = await getDisneyRegionFromMain(ctx);
    if (regionFromMain) {
      const emoji = ctx.countryCodeToEmoji(regionFromMain);
      return makeUnlockItem(
        "Disney+",
        "Yes",
        `${emoji}${regionFromMain} (from main page)`,
        ctx
      );
    }

    if (!graphqlBodyText) {
      return makeUnlockItem(
        "Disney+",
        `Failed (GraphQL error: empty response, status: ${graphqlStatus})`,
        null,
        ctx
      );
    }
    return makeUnlockItem(
      "Disney+",
      `Failed (GraphQL error: ${graphqlBodyText.slice(0, 50)}..., status: ${graphqlStatus})`,
      null,
      ctx
    );
  }

  const regionMatch = graphqlBodyText.match(/"countryCode"\s*:\s*"([^"]+)"/i);
  const regionCode = regionMatch ? regionMatch[1] : null;

  const supportedMatch = graphqlBodyText.match(/"inSupportedLocation"\s*:\s*(false|true)/i);
  const inSupportedLocation = supportedMatch ? supportedMatch[1] === "true" : null;

  if (!regionCode) {
    const regionFromMain = await getDisneyRegionFromMain(ctx);
    if (regionFromMain) {
      const emoji = ctx.countryCodeToEmoji(regionFromMain);
      return makeUnlockItem(
        "Disney+",
        "Yes",
        `${emoji}${regionFromMain} (from main page)`,
        ctx
      );
    }
    return makeUnlockItem("Disney+", "No", null, ctx);
  }

  if (regionCode === "JP") {
    const emoji = ctx.countryCodeToEmoji("JP");
    return makeUnlockItem("Disney+", "Yes", `${emoji}${regionCode}`, ctx);
  }

  if (previewCheck) {
    return makeUnlockItem("Disney+", "No", null, ctx);
  }

  if (inSupportedLocation === false) {
    const emoji = ctx.countryCodeToEmoji(regionCode);
    return makeUnlockItem("Disney+", "Soon", `${emoji}${regionCode}（即将上线）`, ctx);
  }

  if (inSupportedLocation === true) {
    const emoji = ctx.countryCodeToEmoji(regionCode);
    return makeUnlockItem("Disney+", "Yes", `${emoji}${regionCode}`, ctx);
  }

  return makeUnlockItem(
    "Disney+",
    `Failed (Error: Unknown region status for ${regionCode})`,
    null,
    ctx
  );
}

async function checkDisneyPreview(ctx) {
  try {
    const resp = await ctx.request("https://disneyplus.com");
    const url = resp?.url || "";
    return url.includes("preview") || url.includes("unavailable");
  } catch {
    return true;
  }
}

async function getDisneyRegionFromMain(ctx) {
  try {
    const resp = await ctx.request("https://www.disneyplus.com/");
    const body = await safeText(resp);
    const match = body.match(/region"\s*:\s*"([^"]+)"/i);
    return match ? match[1] : null;
  } catch (err) {
    ctx.log("warn", "disney main page region failed", err?.message || err);
    return null;
  }
}
