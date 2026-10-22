"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const STEPS = ["Retrieving learned patterns…", "Extracting endpoints, auth and tribal rules with Claude…", "Generating MCP server…"];

export default function NewConnectorForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [docs, setDocs] = useState("");
  const [notes, setNotes] = useState("");
  const [step, setStep] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadDemo(key: "acmeerp" | "shiptrack") {
    const res = await fetch(`/api/demo/${key}`);
    const demo = await res.json();
    setName(demo.name);
    setDocs(demo.docs);
    setNotes(demo.notes);
    setError(null);
  }

  async function onFiles(files: FileList | null) {
    if (!files) return;
    const texts = await Promise.all(Array.from(files).map(async (f) => `// ---- ${f.name} ----\n${await f.text()}`));
    setDocs((d) => [d, ...texts].filter(Boolean).join("\n\n"));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStep(0);
    const timer = setInterval(() => setStep((s) => (s === null ? s : Math.min(s + 1, STEPS.length - 1))), 1500);
    try {
      const res = await fetch("/api/connectors", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, docs, notes }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Generation failed");
      router.push(`/connectors/${body.id}`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setStep(null);
    } finally {
      clearInterval(timer);
    }
  }

  const busy = step !== null;

  return (
    <form onSubmit={submit} className="card space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-slate-500">Load demo system:</span>
        <button type="button" className="btn-ghost" onClick={() => loadDemo("acmeerp")} disabled={busy}>
          1 · AcmeERP
        </button>
        <button type="button" className="btn-ghost" onClick={() => loadDemo("shiptrack")} disabled={busy}>
          2 · ShipTrack
        </button>
      </div>

      <div>
        <label className="label" htmlFor="name">System name</label>
        <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. AcmeERP" required />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="label mb-0" htmlFor="docs">API spec, docs or sample code</label>
            <label className="cursor-pointer text-xs font-medium text-slate-600 underline">
              Upload files
              <input
                type="file"
                multiple
                accept=".md,.txt,.json,.yaml,.yml,.js,.ts,.py,.xml,.html"
                className="hidden"
                onChange={(e) => onFiles(e.target.files)}
              />
            </label>
          </div>
          <textarea id="docs" className="input h-80 font-mono text-xs" value={docs} onChange={(e) => setDocs(e.target.value)} placeholder="Paste OpenAPI, README, curl examples, SDK snippets…" required />
        </div>
        <div>
          <label className="label" htmlFor="notes">Tribal knowledge — notes from the client&apos;s engineers</label>
          <textarea id="notes" className="input h-80 text-sm" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={'e.g. "/orders returns 200 even on failure, check the status field"\n"never call /sync during business hours"'} />
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="flex items-center gap-4">
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "Building…" : "Build connector"}
        </button>
        {busy && <span className="animate-pulse text-sm text-slate-600">{STEPS[step]}</span>}
      </div>
    </form>
  );
}
