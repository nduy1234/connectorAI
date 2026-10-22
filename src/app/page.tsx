import NewConnectorForm from "@/components/NewConnectorForm";
import { listPatterns } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function NewConnectorPage() {
  const patterns = listPatterns();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New Connector</h1>
        <p className="mt-1 text-sm text-slate-600">
          Paste the system&apos;s docs and what the client&apos;s engineers told you. AI Connector extracts the endpoints, auth and tribal rules,
          then generates an MCP server.{" "}
          <span className="text-slate-500">
            Pattern Library: {patterns.length} learned pattern{patterns.length === 1 ? "" : "s"} ready to apply.
          </span>
        </p>
      </div>
      <NewConnectorForm />
    </div>
  );
}
