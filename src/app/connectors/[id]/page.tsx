import Link from "next/link";
import { notFound } from "next/navigation";
import { getConnector } from "@/lib/db";
import { agentParams, toolDescription } from "@/lib/codegen";
import TryItPanel from "@/components/TryItPanel";
import CodeView from "@/components/CodeView";

export const dynamic = "force-dynamic";

export default function ConnectorPage({ params }: { params: { id: string } }) {
  const c = getConnector(Number(params.id));
  if (!c) notFound();
  const { spec, applied_patterns: applied } = c;
  const appliedSlugs = new Set(applied.map((p) => p.slug));
  const newPatterns = Array.from(new Set(spec.rules.filter((r) => !appliedSlugs.has(r.patternSlug)).map((r) => r.patternName)));

  const tools = spec.tools.map((t) => ({
    name: t.name,
    method: t.method,
    path: t.path,
    description: toolDescription(spec, t),
    params: agentParams(t).map((p) => p.name),
    sampleArgs: t.sampleArgs,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/connectors" className="text-sm text-slate-500 hover:underline">← Connectors</Link>
          <h1 className="mt-1 text-2xl font-semibold">{c.name}</h1>
          <p className="mt-1 text-sm text-slate-600">{spec.summary}</p>
        </div>
        <span className={`chip ${c.source === "claude" ? "bg-violet-50 text-violet-700" : "bg-slate-100 text-slate-600"}`}>
          {c.source === "claude" ? "Extracted by Claude" : "Offline demo (no API key)"}
        </span>
      </div>

      {applied.length > 0 ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <div className="font-medium text-emerald-900">
            ✨ Applied {applied.length} learned pattern{applied.length === 1 ? "" : "s"}: {applied.map((p) => p.name.toLowerCase()).join(", ")}.
          </div>
          <ul className="mt-2 space-y-0.5 text-sm text-emerald-800">
            {applied.map((p) => (
              <li key={p.slug}>
                <span className="font-medium">{p.name}</span> → {p.fix}
              </li>
            ))}
          </ul>
          {newPatterns.length > 0 && <div className="mt-2 text-sm text-emerald-700">Learned {newPatterns.length} new: {newPatterns.join(", ")}.</div>}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-700">
          No learned patterns matched yet. Added {newPatterns.length} new pattern{newPatterns.length === 1 ? "" : "s"} to the{" "}
          <Link href="/patterns" className="font-medium underline">Pattern Library</Link>: {newPatterns.join(", ")}.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card space-y-4">
          <h2 className="font-semibold">Extracted</h2>
          <div className="text-sm">
            <div className="font-medium text-slate-700">Auth</div>
            <div className="mt-1 text-slate-600">
              <span className="chip mr-2 bg-slate-100 text-slate-700">{spec.auth.type}</span>
              {spec.auth.tokenEndpoint && <code className="mr-2 text-xs">POST {spec.auth.tokenEndpoint}</code>}
              <code className="text-xs">{spec.auth.headerName}: {spec.auth.headerPrefix}…</code>
              {spec.auth.refreshOn401 && <span className="chip ml-2 bg-amber-50 text-amber-800">refresh on 401</span>}
              <p className="mt-1">{spec.auth.notes}</p>
            </div>
          </div>
          <div className="text-sm">
            <div className="font-medium text-slate-700">Endpoints</div>
            <ul className="mt-1 space-y-1">
              {spec.endpoints.map((e) => (
                <li key={e.method + e.path} className="flex gap-2">
                  <code className="w-14 shrink-0 text-xs font-semibold text-slate-500">{e.method}</code>
                  <code className="text-xs">{e.path}</code>
                  <span className="text-slate-500">— {e.description}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="text-sm">
            <div className="font-medium text-slate-700">Entities</div>
            <ul className="mt-1 space-y-1">
              {spec.entities.map((e) => (
                <li key={e.name}>
                  <span className="font-medium">{e.name}</span> <span className="text-slate-500">{e.fields.join(", ")}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="card">
          <h2 className="font-semibold">Tribal rules</h2>
          <ul className="mt-3 space-y-3">
            {spec.rules.map((r) => (
              <li key={r.id} className="text-sm">
                <div>{r.text}</div>
                <div className="mt-1 flex gap-2">
                  <span className={`chip ${appliedSlugs.has(r.patternSlug) ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
                    {appliedSlugs.has(r.patternSlug) ? "learned" : "new"} · {r.patternName}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <TryItPanel connectorId={c.id} tools={tools} />
      <CodeView code={c.code} downloadHref={`/api/connectors/${c.id}/download`} />
    </div>
  );
}
