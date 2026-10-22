// Stage 2 — Extract: Claude turns docs + tribal notes into a ConnectorSpec, reusing learned patterns.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import fs from "node:fs";
import path from "node:path";
import { ConnectorSpecSchema, type ConnectorSpec } from "./spec";
import type { Pattern } from "./db";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

const SYSTEM = `You are AI Connector, a senior integration engineer who builds MCP connectors for legacy enterprise systems.

You receive (1) official docs / API spec / sample code and (2) free-text notes from the client's engineers.
The notes are tribal knowledge: when they contradict the docs, the notes win.

Produce a ConnectorSpec:
- auth: how to obtain and send credentials. Use sandbox/test credentials from the docs for "credentials".
- entities and endpoints exactly as the system exposes them.
- rules: every tribal rule or quirk, phrased as a crisp instruction. Tag each with a general pattern
  (patternSlug/patternName/patternDescription/fix) that would also apply to other systems.
- tools: one per useful agent action (list, get, create, trigger...). Not one per endpoint if an endpoint is useless to an agent.
  Encode quirks structurally so the connector handles them automatically:
    * HTTP 200 that can mean failure -> silentError {field, okValues, messageField}
    * paging -> pagination (the tool fetches every page)
    * forbidden time windows -> blockedHours
    * input that must be transformed -> param.normalize
    * tokens that expire -> auth.refreshOn401 = true
  sampleArgs must be valid arguments that should succeed against the real system (use ids from the docs/notes).

PATTERN LIBRARY: you will be given patterns learned from previous connectors. If this system shows the same
quirk, you MUST reuse that pattern's exact slug and name, and apply its fix. Only invent a new slug for a genuinely new quirk.
Use short, general slugs like "silent-200-errors", "legacy-pagination", "token-refresh".`;

function patternBlock(patterns: Pattern[]) {
  if (!patterns.length) return "No learned patterns yet — this is the first connector.";
  return patterns
    .map((p) => `- slug: ${p.slug}\n  name: ${p.name}\n  pattern: ${p.pattern}\n  fix: ${p.fix}\n  seen ${p.count}x in: ${p.systems.join(", ")}`)
    .join("\n");
}

export interface ExtractInput {
  name: string;
  docs: string;
  notes: string;
  patterns: Pattern[];
}

export async function extractSpec(input: ExtractInput): Promise<{ spec: ConnectorSpec; source: "claude" | "offline-demo" }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    const offline = offlineDemoSpec(input);
    if (offline) return { spec: offline, source: "offline-demo" };
    throw new Error("ANTHROPIC_API_KEY is not set. Add it to .env (offline mode only covers the AcmeERP and ShipTrack demos).");
  }

  const client = new Anthropic();
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `System name: ${input.name}

<learned_patterns>
${patternBlock(input.patterns)}
</learned_patterns>

<docs>
${input.docs}
</docs>

<tribal_notes>
${input.notes}
</tribal_notes>`,
      },
    ],
    output_config: { format: zodOutputFormat(ConnectorSpecSchema) },
  });

  if (response.stop_reason === "max_tokens") throw new Error("Claude ran out of tokens while writing the spec; try trimming the docs.");
  if (!response.parsed_output) throw new Error("Claude did not return a valid connector spec.");
  return { spec: response.parsed_output, source: "claude" };
}

/** Pre-recorded Claude output for the two demo systems, so the demo works without an API key. */
function offlineDemoSpec(input: ExtractInput): ConnectorSpec | null {
  const text = `${input.name} ${input.docs}`.toLowerCase();
  const file = text.includes("acmeerp") ? "acmeerp.json" : text.includes("shiptrack") ? "shiptrack.json" : null;
  if (!file) return null;
  const raw = fs.readFileSync(path.join(process.cwd(), "demo", "offline", file), "utf8");
  return ConnectorSpecSchema.parse(JSON.parse(raw));
}
