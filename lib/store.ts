import type { LocationInput, SavedLocation } from "@/types";
import { InvalidZoneError, isValidZone } from "@/lib/timezone";

/**
 * In-memory store for saved locations.
 *
 * Persisted on `globalThis` so Next.js dev-mode hot reloads (which re-evaluate
 * modules) don't wipe state on every edit. Data still resets on a full server
 * restart — there is no database by design for this phase.
 */
const globalForStore = globalThis as unknown as {
  __locations?: Map<string, SavedLocation>;
};

const locations: Map<string, SavedLocation> =
  globalForStore.__locations ?? (globalForStore.__locations = new Map());

function nowIso(): string {
  return new Date().toISOString();
}

export function listLocations(): SavedLocation[] {
  return Array.from(locations.values()).sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
}

export function getLocation(id: string): SavedLocation | undefined {
  return locations.get(id);
}

export function createLocation(input: LocationInput): SavedLocation {
  if (!isValidZone(input.timeZone)) throw new InvalidZoneError(input.timeZone);

  const timestamp = nowIso();
  const location: SavedLocation = {
    id: crypto.randomUUID(),
    label: input.label,
    timeZone: input.timeZone,
    note: input.note,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  locations.set(location.id, location);
  return location;
}

export function updateLocation(
  id: string,
  patch: Partial<LocationInput>,
): SavedLocation | undefined {
  const existing = locations.get(id);
  if (!existing) return undefined;

  if (patch.timeZone !== undefined && !isValidZone(patch.timeZone)) {
    throw new InvalidZoneError(patch.timeZone);
  }

  const updated: SavedLocation = {
    ...existing,
    ...patch,
    updatedAt: nowIso(),
  };
  locations.set(id, updated);
  return updated;
}

export function deleteLocation(id: string): boolean {
  return locations.delete(id);
}
