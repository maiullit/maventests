import { NextResponse } from "next/server";
import { createLocation, listLocations } from "@/lib/store";
import { InvalidZoneError } from "@/lib/timezone";
import { LocationInputSchema, parseBody } from "@/lib/validation";

export function GET() {
  return NextResponse.json({ locations: listLocations() });
}

export async function POST(request: Request) {
  const parsed = await parseBody(LocationInputSchema, request);
  if (parsed.error) return parsed.error;

  try {
    const location = createLocation(parsed.data);
    return NextResponse.json(location, { status: 201 });
  } catch (err) {
    if (err instanceof InvalidZoneError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
