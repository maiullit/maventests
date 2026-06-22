import { NextResponse } from "next/server";
import { z } from "zod";

export const ConvertSchema = z.object({
  dateTime: z.string().min(1, "dateTime is required"),
  fromZone: z.string().min(1, "fromZone is required"),
  toZone: z.string().min(1, "toZone is required"),
});

export const WorldClockSchema = z.object({
  zones: z.array(z.string().min(1)).min(1, "at least one zone is required"),
});

export const LocationInputSchema = z.object({
  label: z.string().min(1, "label is required"),
  timeZone: z.string().min(1, "timeZone is required"),
  note: z.string().optional(),
});

/** Partial schema for PUT/PATCH — every field optional, but at least one present. */
export const LocationPatchSchema = LocationInputSchema.partial().refine(
  (obj) => Object.keys(obj).length > 0,
  { message: "at least one field must be provided" },
);

/**
 * Parse a request's JSON body against a schema. On success returns
 * `{ data }`; on failure returns `{ error }` — a ready-to-return 400 response.
 */
export async function parseBody<T>(
  schema: z.ZodSchema<T>,
  request: Request,
): Promise<{ data: T; error?: never } | { data?: never; error: NextResponse }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      error: NextResponse.json(
        { error: "Request body must be valid JSON" },
        { status: 400 },
      ),
    };
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      error: NextResponse.json(
        { error: "Validation failed", issues: result.error.flatten() },
        { status: 400 },
      ),
    };
  }

  return { data: result.data };
}
