import { NextResponse } from "next/server";
import { InvalidZoneError, worldClock } from "@/lib/timezone";
import { parseBody, WorldClockSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const parsed = await parseBody(WorldClockSchema, request);
  if (parsed.error) return parsed.error;

  try {
    const clocks = worldClock(parsed.data.zones);
    return NextResponse.json({ clocks });
  } catch (err) {
    if (err instanceof InvalidZoneError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
