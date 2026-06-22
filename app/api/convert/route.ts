import { NextResponse } from "next/server";
import { convert, InvalidDateTimeError, InvalidZoneError } from "@/lib/timezone";
import { ConvertSchema, parseBody } from "@/lib/validation";

export async function POST(request: Request) {
  const parsed = await parseBody(ConvertSchema, request);
  if (parsed.error) return parsed.error;

  try {
    const result = convert(parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof InvalidZoneError || err instanceof InvalidDateTimeError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
