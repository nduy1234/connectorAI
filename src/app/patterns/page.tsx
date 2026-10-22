import { listPatterns } from "@/lib/db";
import ResetPatternsButton from "@/components/ResetPatternsButton";

export const dynamic = "force-dynamic";

export default function PatternsPage() {
  const patterns = listPatterns();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Pattern Library</h1>
          <p className="mt-1 text-sm text-slate-600">
            Every quirk AI Connector extracts lands here. New connectors retrieve matching patterns and apply their fixes automatically.
          </p>
        </div>
        {patterns.length > 0 && <ResetPatternsButton />}
      </div>

      {patterns.length === 0 ? (
        <div className="card text-sm text-slate-600">Empty. Build a connector and its tribal rules will show up here.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Pattern</th>
                <th className="px-4 py-3">Fix</th>
                <th className="px-4 py-3 text-right">Seen</th>
                <th className="px-4 py-3">Systems</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {patterns.map((p) => (
                <tr key={p.slug} className="align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-slate-600">{p.pattern}</div>
                    <details className="mt-1 text-xs text-slate-500">
                      <summary className="cursor-pointer">Examples</summary>
                      <ul className="mt-1 list-disc space-y-0.5 pl-4">
                        {p.examples.map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    </details>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{p.fix}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`chip ${p.count > 1 ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>{p.count}×</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.systems.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
