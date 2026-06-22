import { NextResponse } from "next/server";
import { listZones } from "@/lib/timezone";

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? undefined;
  const zones = listZones(q);
  return NextResponse.json({ count: zones.length, zones });
}
