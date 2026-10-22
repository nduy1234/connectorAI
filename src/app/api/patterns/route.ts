import { NextResponse } from "next/server";
import { listPatterns, resetPatterns } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(listPatterns());
}

/** Wipe the library (handy for re-running the demo from scratch). */
export async function DELETE() {
  resetPatterns();
  return NextResponse.json({ ok: true });
}
