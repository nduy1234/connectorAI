// The ConnectorSpec is the contract between the three stages:
//   Claude extraction  ->  ConnectorSpec  ->  (codegen.ts: MCP server source) + (runtime.ts: "Try it" executor)
// Codegen and runtime implement the same quirk handlers, so what you test is what you download.
import { z } from "zod";

const Param = z.object({
  name: z.string(),
  in: z.enum(["path", "query", "body"]),
  type: z.enum(["string", "number", "boolean"]),
  required: z.boolean(),
  description: z.string(),
  normalize: z.enum(["uppercase", "lowercase", "trim"]).nullable().describe("Input fix-up a tribal rule requires, else null"),
});

const Tool = z.object({
  name: z.string().describe("snake_case tool name, e.g. list_orders"),
  description: z.string().describe("What the tool does, for an LLM agent. Do not repeat the rules here."),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  path: z.string().describe("Path with :param placeholders, e.g. /orders/:id"),
  params: z.array(Param),
  silentError: z
    .object({ field: z.string(), okValues: z.array(z.string()), messageField: z.string() })
    .nullable()
    .describe("Set when HTTP 200 can still mean failure. okValues are the stringified success values, e.g. ['OK'] or ['true']"),
  pagination: z
    .object({
      style: z.enum(["page", "cursor"]),
      param: z.string().describe("Query param carrying the page number or cursor"),
      itemsField: z.string().describe("Response field holding the items array"),
      nextField: z.string().describe("page style: boolean 'more' flag; cursor style: field holding the next cursor"),
    })
    .nullable(),
  blockedHours: z
    .object({ startHour: z.number(), endHour: z.number() })
    .nullable()
    .describe("Local hours [start, end) during which the tool must refuse to run"),
  ruleIds: z.array(z.string()).describe("ids of the rules that apply to this tool"),
  sampleArgs: z.string().describe("JSON object string of realistic, VALID arguments for a smoke test"),
});

const Rule = z.object({
  id: z.string().describe("short id, e.g. r1"),
  text: z.string().describe("The tribal rule as a crisp instruction"),
  patternSlug: z.string().describe("kebab-case slug of the general quirk pattern. Reuse a known slug when it is the same quirk."),
  patternName: z.string().describe("Short human name, e.g. 'Silent 200 errors'"),
  patternDescription: z.string().describe("The general, system-agnostic pattern"),
  fix: z.string().describe("The general fix the connector applies"),
});

export const ConnectorSpecSchema = z.object({
  systemName: z.string(),
  summary: z.string().describe("One sentence about the system"),
  baseUrl: z.string(),
  auth: z.object({
    type: z.enum(["none", "api_key", "bearer_token", "session_token"]),
    tokenEndpoint: z.string().nullable().describe("Path that issues tokens, e.g. /auth/token"),
    credentials: z.string().nullable().describe("JSON object string POSTed to tokenEndpoint (use the sandbox creds from the docs)"),
    tokenField: z.string().nullable().describe("Response field holding the token"),
    headerName: z.string().describe("e.g. Authorization or X-Session-Token"),
    headerPrefix: z.string().describe("e.g. 'Bearer ' or ''"),
    refreshOn401: z.boolean(),
    notes: z.string(),
  }),
  entities: z.array(z.object({ name: z.string(), fields: z.array(z.string()) })),
  endpoints: z.array(z.object({ method: z.string(), path: z.string(), description: z.string() })),
  rules: z.array(Rule),
  tools: z.array(Tool),
});

export type ConnectorSpec = z.infer<typeof ConnectorSpecSchema>;
export type ToolSpec = ConnectorSpec["tools"][number];
export type RuleSpec = ConnectorSpec["rules"][number];
