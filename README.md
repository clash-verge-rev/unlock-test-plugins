# unlock-test-plugins

Standalone media unlock test plugin for Clash Verge Rev. This repo hosts the CDN-delivered MJS module plus metadata and notes on the host/plugin contract.

## Plugin contract (v1)
- Export `meta` and `run(ctx)`.
- `meta` fields:
  - `name`: plugin name, e.g. `media-unlock`.
  - `version`: semantic version of the plugin build.
  - `apiVersion`: plugin API version this build targets (host negotiates compatibility).
  - `tests`: array of `{ id, label }` describing the checks contained.
  - `integrity`: SRI hash for the module content (fill at release).
- `run(ctx)` returns an array of `UnlockItem`:
  ```ts
  type UnlockItem = {
    name: string;
    status: string;
    region?: string | null;
    check_time?: string | null;
  };
  ```

## Host context expectations
- `ctx.fetch(input, init)`: Response-compatible fetch, proxied by host (`@tauri-apps/plugin-http` recommended). Supports `signal` for aborts and standard `text()` / `json()` accessors.
- `ctx.logger`: `{ debug?, info?, warn?, error? }` forwarding to host logs.
- `ctx.time.now()`: returns local time string in `YYYY-MM-DD HH:MM:SS` (plugin falls back to its own formatter if absent).
- `ctx.limits`: `{ requestTimeoutMs?, maxConcurrent? }` to tune guardrails.
- `ctx.abortSignal`: optional AbortSignal to cancel all requests.

## Release flow
1) Update `meta.version` and recompute `meta.integrity` (SRI sha256 of the published MJS).
2) Publish the module to CDN (e.g., `.../media-unlock/vX.Y.Z/media-unlock.mjs`).
3) Host loader should verify integrity, cache the module, and fall back to a bundled copy if network fails.

## Development status
- Modular source lives in `src/` (per-service checks under `src/tests/`). Root `media-unlock.mjs` re-exports `src/index.mjs` so it can be served directly as the plugin entry.
- Direct-port JS implementation of the existing Rust media checks (Bilibili, ChatGPT, Claude, Gemini, YouTube Premium, Bahamut, Netflix, Disney+, Spotify, TikTok, Prime Video).
- No external dependencies; authored as ESM to be fetched and executed directly by the host.
