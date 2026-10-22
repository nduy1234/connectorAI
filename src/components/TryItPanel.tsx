"use client";

import { useState } from "react";

interface ToolView {
  name: string;
  method: string;
  path: string;
  description: string;
  params: string[];
  sampleArgs: string;
}

interface RunResult {
  status: "pass" | "fail" | "blocked";
  log: string[];
  data?: unknown;
  error?: string;
  ms: number;
}

const BADGE: Record<RunResult["status"], string> = {
  pass: "bg-emerald-100 text-emerald-800",
  fail: "bg-red-100 text-red-800",
  blocked: "bg-amber-100 text-amber-800",
};

export default function TryItPanel({ connectorId, tools }: { connectorId: number; tools: ToolView[] }) {
  const [args, setArgs] = useState<Record<string, string>>(() => Object.fromEntries(tools.map((t) => [t.name, pretty(t.sampleArgs)])));
  const [results, setResults] = useState<Record<string, RunResult>>({});
  const [running, setRunning] = useState<Set<string>>(new Set());

  async function run(tool: string) {
    setRunning((s) => new Set(s).add(tool));
    let result: RunResult;
    try {
      const parsed = JSON.parse(args[tool] || "{}");
      const res = await fetch(`/api/connectors/${connectorId}/test`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tool, args: parsed }),
      });
      result = await res.json();
    } catch (e) {
      result = { status: "fail", log: [], error: (e as Error).message, ms: 0 };
    }
    setResults((r) => ({ ...r, [tool]: result }));
    setRunning((s) => {
      const next = new Set(s);
      next.delete(tool);
      return next;
    });
  }

  async function runAll() {
    for (const t of tools) await run(t.name); // sequential, so token expiry/refresh shows up in the logs
  }

  const done = Object.values(results);
  const passed = done.filter((r) => r.status === "pass").length;

  return (
    <section className="card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Try it</h2>
          <p className="text-sm text-slate-500">Calls each generated tool against the mock server, with every tribal-rule handler active.</p>
        </div>
        <div className="flex items-center gap-3">
          {done.length > 0 && (
            <span className="text-sm text-slate-600">
              {passed}/{tools.length} passed
            </span>
          )}
          <button className="btn-primary" onClick={runAll} disabled={running.size > 0}>
            Run all
          </button>
        </div>
      </div>

      <div className="mt-4 divide-y divide-slate-100">
        {tools.map((t) => {
          const r = results[t.name];
          return (
            <div key={t.name} className="grid gap-4 py-4 lg:grid-cols-[1fr_1fr]">
              <div>
                <div className="flex items-center gap-2">
                  <code className="font-semibold">{t.name}</code>
                  <code className="text-xs text-slate-500">
                    {t.method} {t.path}
                  </code>
                </div>
                <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{t.description}</p>
              </div>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <textarea
                    className="input h-16 flex-1 font-mono text-xs"
                    value={args[t.name]}
                    onChange={(e) => setArgs((a) => ({ ...a, [t.name]: e.target.value }))}
                    aria-label={`${t.name} arguments`}
                    placeholder={t.params.length ? `{ ${t.params.map((p) => `"${p}": …`).join(", ")} }` : "{}"}
                  />
                  <button className="btn-ghost self-start" onClick={() => run(t.name)} disabled={running.has(t.name)}>
                    {running.has(t.name) ? "…" : "Run"}
                  </button>
                </div>
                {r && (
                  <div className="rounded-lg bg-slate-50 p-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`chip uppercase ${BADGE[r.status]}`}>{r.status}</span>
                      <span className="text-slate-500">{r.ms} ms</span>
                      {r.error && <span className="text-red-700">{r.error}</span>}
                    </div>
                    <ul className="mt-2 space-y-0.5 font-mono text-slate-600">
                      {r.log.map((l, i) => (
                        <li key={i} className={l.includes("[") ? "text-violet-700" : ""}>
                          {l}
                        </li>
                      ))}
                    </ul>
                    {r.data !== undefined && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-slate-500">Response</summary>
                        <pre className="mt-1 max-h-48 overflow-auto">{JSON.stringify(r.data, null, 2)}</pre>
                      </details>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function pretty(json: string) {
  try {
    return JSON.stringify(JSON.parse(json));
  } catch {
    return json;
  }
}
