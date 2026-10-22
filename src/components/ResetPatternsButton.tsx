"use client";

import { useRouter } from "next/navigation";

export default function ResetPatternsButton() {
  const router = useRouter();

  async function reset() {
    if (!confirm("Clear every learned pattern? Connectors are kept.")) return;
    await fetch("/api/patterns", { method: "DELETE" });
    router.refresh();
  }

  return (
    <button className="btn-ghost" onClick={reset}>
      Reset library
    </button>
  );
}
