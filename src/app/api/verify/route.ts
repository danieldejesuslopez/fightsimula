import { NextResponse } from "next/server";
import { createHash } from "crypto";

export async function POST(req: Request) {
  const body = await req.json();
  const { serverSeed, seedHash } = body;

  if (!serverSeed || !seedHash) {
    return NextResponse.json({ error: "serverSeed and seedHash are required" }, { status: 400 });
  }

  const computed = createHash("sha256").update(serverSeed).digest("hex");
  const valid = computed === seedHash;

  return NextResponse.json({ valid, computed, expected: seedHash });
}
