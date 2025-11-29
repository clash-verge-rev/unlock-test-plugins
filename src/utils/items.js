import { DEFAULT_UNLOCK_ITEM_NAMES } from "../constants.js";

export function dedupeAndMerge(items) {
  const map = new Map();
  for (const item of items) {
    const key = item.name.trim().toLowerCase();
    if (!map.has(key)) {
      map.set(key, item);
      continue;
    }
    const existing = map.get(key);
    const existingPriority = existing.status === "Pending" ? 0 : 1;
    const itemPriority = item.status === "Pending" ? 0 : 1;
    if (itemPriority > existingPriority) {
      map.set(key, mergeOptionalFields(item, existing));
    } else if (itemPriority < existingPriority) {
      map.set(key, mergeOptionalFields(existing, item));
    } else {
      map.set(key, mergeOptionalFields(item, existing));
    }
  }

  const defaults = DEFAULT_UNLOCK_ITEM_NAMES.map((name) => ({
    name,
    status: "Pending",
    region: null,
    check_time: null,
  }));

  const merged = defaults.map((item) => {
    const key = item.name.trim().toLowerCase();
    const match = map.get(key);
    if (match) {
      return { ...match, name: item.name };
    }
    return item;
  });

  const mergedKeys = new Set(merged.map((i) => i.name.trim().toLowerCase()));
  for (const value of map.values()) {
    const key = value.name.trim().toLowerCase();
    if (!mergedKeys.has(key)) {
      merged.push(value);
    }
  }

  return merged.sort((a, b) => a.name.localeCompare(b.name));
}

function mergeOptionalFields(preferred, fallback) {
  return {
    ...preferred,
    region: preferred.region ?? fallback.region,
    check_time: preferred.check_time ?? fallback.check_time,
  };
}
