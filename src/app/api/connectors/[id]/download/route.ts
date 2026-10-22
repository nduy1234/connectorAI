import { getConnector } from "@/lib/db";
import { slugify } from "@/lib/codegen";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const c = getConnector(Number(params.id));
  if (!c) return new Response("Not found", { status: 404 });
  return new Response(c.code, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "content-disposition": `attachment; filename="${slugify(c.name)}-mcp-server.ts"`,
    },
  });
}
