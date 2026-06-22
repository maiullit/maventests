import { NextResponse } from "next/server";
import { deleteLocation, getLocation, updateLocation } from "@/lib/store";
import { InvalidZoneError } from "@/lib/timezone";
import { LocationPatchSchema, parseBody } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  const location = getLocation(id);
  if (!location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }
  return NextResponse.json(location);
}

export async function PUT(request: Request, { params }: Context) {
  const { id } = await params;
  const parsed = await parseBody(LocationPatchSchema, request);
  if (parsed.error) return parsed.error;

  try {
    const updated = updateLocation(id, parsed.data);
    if (!updated) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof InvalidZoneError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const { id } = await params;
  const deleted = deleteLocation(id);
  if (!deleted) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
