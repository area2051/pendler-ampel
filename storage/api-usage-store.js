import { STORAGE_KEYS } from "../shared/constants.js";
import { coordinateStorageMutation } from "./storage-mutation-coordinator.js";

const MAX_API_LOG_ENTRIES = 100;
const ALLOWED_SOURCES = new Set(["test", "manual", "alarm", "startup"]);
const ALLOWED_ERROR_CODES = new Set([
  "INVALID_ROUTE",
  "AUTH_REJECTED",
  "QUOTA_EXCEEDED",
  "NETWORK_ERROR",
  "TIMEOUT",
  "NO_ROUTE",
  "INVALID_RESPONSE",
  "UNKNOWN",
]);

function storageOrDefault(storageArea) {
  return storageArea ?? chrome.storage.local;
}

function sanitizeEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const attemptedAt = String(entry.attemptedAt);
  if (!Number.isFinite(Date.parse(attemptedAt))) return null;
  const sanitized = {
    attemptedAt,
    source: ALLOWED_SOURCES.has(entry.source) ? entry.source : "unknown",
    outcome: ["pending", "success", "error"].includes(entry.outcome) ? entry.outcome : "pending",
  };
  if (sanitized.outcome === "error") {
    sanitized.errorCode = ALLOWED_ERROR_CODES.has(entry.errorCode) ? entry.errorCode : "UNKNOWN";
  }
  return sanitized;
}

export function loadApiUsage(storageArea, mutationContext) {
  const storage = storageOrDefault(storageArea);
  return coordinateStorageMutation(mutationContext, async () => {
    const values = await storage.get(STORAGE_KEYS.apiUsage);
    const stored = values.apiUsage ?? {};
    const usage = {
      totalCalls: Number.isSafeInteger(stored.totalCalls) && stored.totalCalls >= 0 ? stored.totalCalls : 0,
      entries: Array.isArray(stored.entries)
        ? stored.entries.map(sanitizeEntry).filter(Boolean).slice(-MAX_API_LOG_ENTRIES)
        : [],
    };
    if (Object.hasOwn(values, STORAGE_KEYS.apiUsage) && JSON.stringify(stored) !== JSON.stringify(usage)) {
      await storage.set({ [STORAGE_KEYS.apiUsage]: usage });
    }
    return usage;
  });
}

export function recordApiCallStarted(call, storageArea, mutationContext) {
  const storage = storageOrDefault(storageArea);
  return coordinateStorageMutation(mutationContext, async (activeContext) => {
    const usage = await loadApiUsage(storage, activeContext);
    const totalCalls = usage.totalCalls + 1;
    const entry = sanitizeEntry({
      attemptedAt: call.attemptedAt,
      source: call.source,
      outcome: "pending",
    });
    if (!entry) throw new TypeError("Ungültiger API-Aufrufzeitpunkt.");
    await storage.set({
      [STORAGE_KEYS.apiUsage]: {
        totalCalls,
        entries: [...usage.entries, entry].slice(-MAX_API_LOG_ENTRIES),
      },
    });
    return { attemptedAt: entry.attemptedAt, source: entry.source };
  });
}

export function recordApiCallFinished(callToken, result, storageArea, mutationContext) {
  const storage = storageOrDefault(storageArea);
  return coordinateStorageMutation(mutationContext, async (activeContext) => {
    const usage = await loadApiUsage(storage, activeContext);
    const matchingIndex = usage.entries.findLastIndex((entry) => (
      entry.outcome === "pending"
      && entry.attemptedAt === callToken?.attemptedAt
      && entry.source === callToken?.source
    ));
    if (matchingIndex < 0) return usage;
    const entries = [...usage.entries];
    entries[matchingIndex] = sanitizeEntry({
      ...entries[matchingIndex],
      outcome: result.outcome,
      errorCode: result.errorCode,
    });
    const updated = { totalCalls: usage.totalCalls, entries };
    await storage.set({ [STORAGE_KEYS.apiUsage]: updated });
    return updated;
  });
}
