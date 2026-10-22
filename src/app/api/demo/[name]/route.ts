import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

const DEMOS: Record<string, string> = { acmeerp: "AcmeERP", shiptrack: "ShipTrack" };

export async function GET(_req: Request, { params }: { params: { name: string } }) {
  const name = DEMOS[params.name];
  if (!name) return NextResponse.json({ error: "Unknown demo" }, { status: 404 });
  const dir = path.join(process.cwd(), "demo", params.name);
  return NextResponse.json({
    name,
    docs: fs.readFileSync(path.join(dir, "docs.md"), "utf8"),
    notes: fs.readFileSync(path.join(dir, "notes.md"), "utf8"),
  });
}
