import type { LocalStore } from "@grimmlink/persistence";

const SETTING_KEY = "diagnostics.log-retention.v1";
const HOUR_MS = 60 * 60 * 1000;
const DEFAULT_VALUE = Object.freeze({
  maxEntries: 500,
  maxBytes: 1024 * 1024,
  retentionHours: 24,
});

export type LocalDiagnosticsRetention = Readonly<{
  maxEntries: number;
  maxBytes: number;
  retentionHours: number;
}>;

export type LocalDiagnosticsSettingsSource = Readonly<{
  read: () => LocalDiagnosticsRetention;
  write: (value: LocalDiagnosticsRetention) => LocalDiagnosticsRetention;
}>;

function valid(value: unknown): value is LocalDiagnosticsRetention {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    Object.keys(record).sort().join(",") === "maxBytes,maxEntries,retentionHours" &&
    Number.isSafeInteger(record.maxEntries) &&
    (record.maxEntries as number) >= 100 &&
    (record.maxEntries as number) <= 10_000 &&
    Number.isSafeInteger(record.maxBytes) &&
    (record.maxBytes as number) >= 256 * 1024 &&
    (record.maxBytes as number) <= 8 * 1024 * 1024 &&
    Number.isSafeInteger(record.retentionHours) &&
    (record.retentionHours as number) >= 1 &&
    (record.retentionHours as number) <= 24
  );
}

function parseStored(value: string): LocalDiagnosticsRetention {
  try {
    const parsed: unknown = JSON.parse(value);
    if (valid(parsed)) return Object.freeze({ ...parsed });
  } catch {
    // A malformed local preference fails closed below.
  }
  throw new Error("DIAGNOSTICS_SETTINGS_CORRUPT");
}

/** Persistent, owner-editable diagnostics retention. Values never affect protected sync policy. */
export function createLocalDiagnosticsSettingsSource(
  store: LocalStore,
  now: () => number = Date.now,
): LocalDiagnosticsSettingsSource {
  const read = (): LocalDiagnosticsRetention => {
    const row = store.sqlite
      .prepare("SELECT value FROM runtime_settings WHERE key=?")
      .get(SETTING_KEY) as { value: string } | undefined;
    return row ? parseStored(row.value) : DEFAULT_VALUE;
  };

  const write = (value: LocalDiagnosticsRetention): LocalDiagnosticsRetention => {
    if (!valid(value)) throw new Error("DIAGNOSTICS_SETTINGS_INVALID");
    const updatedAt = now();
    if (!Number.isSafeInteger(updatedAt) || updatedAt < 0) {
      throw new Error("DIAGNOSTICS_SETTINGS_CLOCK_INVALID");
    }
    const frozen = Object.freeze({ ...value });
    store.sqlite
      .prepare(
        "INSERT INTO runtime_settings(key,value,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at",
      )
      .run(SETTING_KEY, JSON.stringify(frozen), updatedAt);
    return frozen;
  };

  return Object.freeze({ read, write });
}

export function toLogBufferLimits(value: LocalDiagnosticsRetention) {
  if (!valid(value)) throw new Error("DIAGNOSTICS_SETTINGS_INVALID");
  return Object.freeze({
    maxEntries: value.maxEntries,
    maxBytes: value.maxBytes,
    retentionMs: value.retentionHours * HOUR_MS,
  });
}

export function fromLogBufferLimits(value: {
  maxEntries: number;
  maxBytes: number;
  retentionMs: number;
}): LocalDiagnosticsRetention {
  const converted = {
    maxEntries: value.maxEntries,
    maxBytes: value.maxBytes,
    retentionHours: value.retentionMs / HOUR_MS,
  };
  if (!valid(converted)) throw new Error("DIAGNOSTICS_SETTINGS_INVALID");
  return Object.freeze(converted);
}
