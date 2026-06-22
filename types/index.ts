/** A timezone the user has saved/"managed" in the app. */
export interface SavedLocation {
  id: string;
  /** Human-friendly label, e.g. "HQ Office", "Tokyo Team". */
  label: string;
  /** IANA timezone identifier, e.g. "America/New_York". */
  timeZone: string;
  /** Optional free-form note. */
  note?: string;
  createdAt: string;
  updatedAt: string;
}

/** Fields a client may supply when creating/updating a location. */
export interface LocationInput {
  label: string;
  timeZone: string;
  note?: string;
}

/** Result of converting a single instant between two zones. */
export interface ConvertResult {
  input: {
    dateTime: string;
    zone: string;
    offset: string;
    iso: string;
  };
  output: {
    zone: string;
    offset: string;
    iso: string;
    formatted: string;
  };
}

/** Current time in a single zone, used by the world clock. */
export interface ClockEntry {
  zone: string;
  iso: string;
  offset: string;
  formatted: string;
}
