import { DEFAULT_TIMEOUT_MS, DEFAULT_UA } from "./constants.js";
import { nowString } from "./utils/time.js";

export function makeContext(ctx = {}) {
  const fetchImpl = ctx.fetch || (typeof fetch === "function" ? fetch : null);
  if (!fetchImpl) {
    throw new Error("No fetch implementation provided");
  }

  return {
    ...ctx,
    fetchImpl,
    request: (url, options = {}) => request(fetchImpl, ctx, url, options),
    log: (level, message, extra) => log(ctx, level, message, extra),
    now: () => (ctx?.time?.now ? ctx.time.now() : nowString()),
  };
}

function log(ctx, level, message, extra) {
  const logger = ctx?.logger;
  const fn = logger && typeof logger[level] === "function" ? logger[level] : null;
  if (!fn) return;
  try {
    fn(extra ? `${message} ${extra}` : message);
  } catch {
    // ignore logging errors
  }
}

function linkAbort(source, target) {
  if (!source) return () => {};
  const handler = () => target.abort(source.reason);
  source.addEventListener("abort", handler);
  return () => source.removeEventListener("abort", handler);
}

async function request(fetchImpl, ctx, url, options = {}) {
  const timeout = options.timeout ?? ctx?.limits?.requestTimeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const cleanupAbort = linkAbort(ctx?.abortSignal, controller);
  const timer = setTimeout(() => controller.abort(new Error("Request timeout")), timeout);

  const headers = {
    "User-Agent": DEFAULT_UA,
    ...options.headers,
  };

  try {
    const resp = await fetchImpl(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    return resp;
  } finally {
    clearTimeout(timer);
    cleanupAbort();
  }
}
