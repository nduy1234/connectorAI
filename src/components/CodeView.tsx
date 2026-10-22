"use client";

import { useState } from "react";

export default function CodeView({ code, downloadHref }: { code: string; downloadHref: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section className="card">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Generated MCP server</h2>
          <p className="text-sm text-slate-500">TypeScript · {code.split("\n").length} lines · one tool per action, tribal rules in every description</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={copy}>
            {copied ? "Copied" : "Copy"}
          </button>
          <a className="btn-primary" href={downloadHref}>
            Download
          </a>
        </div>
      </div>
      <pre className="mt-4 max-h-[36rem] overflow-auto rounded-lg bg-slate-950 p-4 text-xs leading-relaxed text-slate-100">
        <code>{code}</code>
      </pre>
    </section>
  );
}
