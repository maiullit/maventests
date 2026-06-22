import { DateTime, IANAZone } from "luxon";
import type { ClockEntry, ConvertResult } from "@/types";

/** Thrown when a supplied IANA zone is not valid/recognized. */
export class InvalidZoneError extends Error {
  constructor(public zone: string) {
    super(`Invalid IANA timezone: "${zone}"`);
    this.name = "InvalidZoneError";
  }
}

/** Thrown when a supplied date/time string cannot be parsed. */
export class InvalidDateTimeError extends Error {
  constructor(public dateTime: string, reason?: string) {
    super(`Invalid date/time: "${dateTime}"${reason ? ` (${reason})` : ""}`);
    this.name = "InvalidDateTimeError";
  }
}

/** True if `zone` is a recognized IANA timezone identifier. */
export function isValidZone(zone: string): boolean {
  return IANAZone.isValidZone(zone);
}

/**
 * List supported IANA timezone identifiers, optionally filtered by a
 * case-insensitive substring match against the zone id.
 */
export function listZones(query?: string): string[] {
  const all = Intl.supportedValuesOf("timeZone");
  if (!query) return all;
  const q = query.toLowerCase();
  return all.filter((z) => z.toLowerCase().includes(q));
}

/** Format Luxon's numeric offset (minutes) as a "+HH:mm" string. */
function formatOffset(dt: DateTime): string {
  return dt.toFormat("ZZ");
}

/**
 * Convert a wall-clock time interpreted in `fromZone` into `toZone`.
 *
 * `dateTime` is an ISO-ish string WITHOUT an offset (e.g. "2026-06-17T09:00"),
 * interpreted as local time in `fromZone`.
 */
export function convert(params: {
  dateTime: string;
  fromZone: string;
  toZone: string;
}): ConvertResult {
  const { dateTime, fromZone, toZone } = params;

  if (!isValidZone(fromZone)) throw new InvalidZoneError(fromZone);
  if (!isValidZone(toZone)) throw new InvalidZoneError(toZone);

  const source = DateTime.fromISO(dateTime, { zone: fromZone });
  if (!source.isValid) {
    throw new InvalidDateTimeError(dateTime, source.invalidReason ?? undefined);
  }

  const target = source.setZone(toZone);

  return {
    input: {
      dateTime,
      zone: fromZone,
      offset: formatOffset(source),
      iso: source.toISO()!,
    },
    output: {
      zone: toZone,
      offset: formatOffset(target),
      iso: target.toISO()!,
      formatted: target.toFormat("yyyy-MM-dd HH:mm:ss"),
    },
  };
}

/** Return the current time across a set of zones. */
export function worldClock(zones: string[]): ClockEntry[] {
  const now = DateTime.utc();
  return zones.map((zone) => {
    if (!isValidZone(zone)) throw new InvalidZoneError(zone);
    const local = now.setZone(zone);
    return {
      zone,
      iso: local.toISO()!,
      offset: formatOffset(local),
      formatted: local.toFormat("yyyy-MM-dd HH:mm:ss"),
    };
  });
}
