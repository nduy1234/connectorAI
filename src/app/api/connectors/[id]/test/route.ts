import { NextResponse } from "next/server";
import { getConnector } from "@/lib/db";
import { runTool } from "@/lib/runtime";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const c = getConnector(Number(params.id));
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { tool, args } = (await req.json()) as { tool: string; args: Record<string, unknown> };
  return NextResponse.json(await runTool(c.id, c.spec, tool, args ?? {}));
}
