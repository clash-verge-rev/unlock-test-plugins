import { meta } from "./meta.js";
import { makeContext } from "./context.js";
import { countryCodeToEmoji } from "./utils/emoji.js";
import { dedupeAndMerge } from "./utils/items.js";
import { runWithConcurrency } from "./utils/concurrency.js";

import {
  checkBilibiliChinaMainland,
  checkBilibiliHkMcTw,
} from "./tests/bilibili.js";
import { checkChatgptCombined } from "./tests/chatgpt.js";
import { checkClaude } from "./tests/claude.js";
import { checkGemini } from "./tests/gemini.js";
import { checkYoutubePremium } from "./tests/youtube.js";
import { checkBahamutAnime } from "./tests/bahamut.js";
import { checkNetflix } from "./tests/netflix.js";
import { checkDisneyPlus } from "./tests/disney-plus.js";
import { checkSpotify } from "./tests/spotify.js";
import { checkTikTok } from "./tests/tiktok.js";
import { checkPrimeVideo } from "./tests/prime-video.js";

export { meta };

export async function run(rawCtx = {}) {
  const ctx = makeContext({
    ...rawCtx,
    countryCodeToEmoji,
  });

  const tasks = [
    () => checkBilibiliChinaMainland(ctx),
    () => checkBilibiliHkMcTw(ctx),
    () => checkChatgptCombined(ctx),
    () => checkClaude(ctx),
    () => checkGemini(ctx),
    () => checkYoutubePremium(ctx),
    () => checkBahamutAnime(ctx),
    () => checkNetflix(ctx),
    () => checkDisneyPlus(ctx),
    () => checkSpotify(ctx),
    () => checkTikTok(ctx),
    () => checkPrimeVideo(ctx),
  ];

  const limit = Math.max(1, Math.min(tasks.length, ctx?.limits?.maxConcurrent || tasks.length));
  const results = await runWithConcurrency(tasks, limit, (idx, err) =>
    ctx.log("error", `task ${idx} failed`, err?.message || err)
  );

  return dedupeAndMerge(results);
}
