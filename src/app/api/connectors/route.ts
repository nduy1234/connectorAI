import { NextResponse } from "next/server";
import { insertConnector, listConnectors, listPatterns } from "@/lib/db";
import { extractSpec } from "@/lib/extract";
import { generateServer } from "@/lib/codegen";
import { appliedPatterns, learnFromSpec, retrievePatterns } from "@/lib/patterns";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(listConnectors().map(({ id, name, created_at, applied_patterns, spec }) => ({ id, name, created_at, applied_patterns, tools: spec.tools.length })));
}

export async function POST(req: Request) {
  const { name, docs, notes } = (await req.json()) as { name?: string; docs?: string; notes?: string };
  if (!name?.trim() || !docs?.trim()) return NextResponse.json({ error: "Name and docs are required." }, { status: 400 });

  try {
    // 1. Retrieve learned patterns that look relevant to this system.
    const before = listPatterns();
    const retrieved = retrievePatterns(`${name}\n${docs}\n${notes ?? ""}`);

    // 2. Extract the spec with Claude, primed with those patterns.
    const { spec, source } = await extractSpec({ name, docs, notes: notes ?? "", patterns: retrieved });

    // 3. Generate the MCP server.
    const applied = appliedPatterns(spec, before);
    const code = generateServer(spec, applied);
    const id = insertConnector({ name: spec.systemName || name, docs, notes: notes ?? "", spec, code, applied_patterns: applied, source });

    // 4. Self-improve: every quirk in this spec goes into the Pattern Library.
    learnFromSpec(spec);

    return NextResponse.json({ id, applied, retrieved: retrieved.length, source });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
