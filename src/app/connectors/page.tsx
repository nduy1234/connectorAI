import Link from "next/link";
import { listConnectors } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function ConnectorsPage() {
  const connectors = listConnectors();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Connectors</h1>
      {connectors.length === 0 ? (
        <div className="card text-sm text-slate-600">
          No connectors yet. <Link href="/" className="font-medium underline">Build your first one</Link>.
        </div>
      ) : (
        <div className="grid gap-3">
          {connectors.map((c) => (
            <Link key={c.id} href={`/connectors/${c.id}`} className="card flex items-center justify-between gap-4 hover:border-slate-400">
              <div>
                <div className="font-medium">{c.name}</div>
                <div className="mt-0.5 text-sm text-slate-500">{c.spec.summary}</div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 text-xs">
                <span className="chip bg-slate-100 text-slate-700">{c.spec.tools.length} tools</span>
                <span className="chip bg-amber-50 text-amber-800">{c.spec.rules.length} rules</span>
                {c.applied_patterns.length > 0 && (
                  <span className="chip bg-emerald-50 text-emerald-700">{c.applied_patterns.length} learned applied</span>
                )}
                <span className="text-slate-400">{new Date(c.created_at).toLocaleString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
