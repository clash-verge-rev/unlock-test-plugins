import { nowString } from "../utils/time.js";

export function makeUnlockItem(name, status, region, ctx) {
  const now = ctx?.now ? ctx.now() : nowString();
  return {
    name,
    status,
    region,
    check_time: now,
  };
}
