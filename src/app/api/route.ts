import { NextResponse } from "next/server";

export const preferredRegion = "sin1";

export async function GET() {
  return NextResponse.json({ message: "Hello, world!" });
}
