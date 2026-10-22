import { NextResponse } from "next/server";
import { deleteConnector, getConnector } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const c = getConnector(Number(params.id));
  return c ? NextResponse.json(c) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  deleteConnector(Number(params.id));
  return NextResponse.json({ ok: true });
}
