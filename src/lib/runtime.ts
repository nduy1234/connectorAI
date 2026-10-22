// Stage 4 — Test: execute one tool of a spec against the live (mock) system.
// Mirrors the helpers emitted by codegen.ts line for line, so a pass here means the download works too.
import type { ConnectorSpec, ToolSpec } from "./spec";
import { agentParams } from "./codegen";

export interface RunResult {
  status: "pass" | "fail" | "blocked";
  log: string[];
  data?: unknown;
  error?: string;
  ms: number;
}

// Cached auth tokens per connector, kept across "Try it" runs so token expiry actually shows up.
const tokens = new Map<number, string>();

const MAX_PAGES = 20;

export async function runTool(connectorId: number, spec: ConnectorSpec, toolName: string, args: Record<string, unknown>): Promise<RunResult> {
  const started = Date.now();
  const log: string[] = [];
  const done = (r: Omit<RunResult, "ms" | "log">): RunResult => ({ ...r, log, ms: Date.now() - started });

  const tool = spec.tools.find((t) => t.name === toolName);
  if (!tool) return done({ status: "fail", error: `Unknown tool ${toolName}` });

  if (tool.blockedHours) {
    const hour = new Date().getHours();
    const { startHour, endHour } = tool.blockedHours;
    if (hour >= startHour && hour < endHour) {
      log.push(`Guard: local hour ${hour} is inside the blocked window ${startHour}:00-${endHour}:00`);
      return done({ status: "blocked", error: `Refused by tribal rule: not allowed between ${startHour}:00 and ${endHour}:00` });
    }
  }

  try {
    const auth = spec.auth;
    const { url, body } = buildRequest(spec, tool, args, log);

    const login = async () => {
      if (!auth.tokenEndpoint) return;
      const res = await fetch(spec.baseUrl + auth.tokenEndpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: auth.credentials ?? "{}",
      });
      const body = await res.json();
      const token = body[auth.tokenField ?? "token"];
      if (!token) throw new Error(`Login failed: ${JSON.stringify(body)}`);
      tokens.set(connectorId, token);
      log.push(`Auth: obtained new token from ${auth.tokenEndpoint}`);
    };

    const request = async (url: string, retried = false): Promise<Record<string, unknown>> => {
      if (auth.type !== "none" && auth.tokenEndpoint && !tokens.has(connectorId)) await login();
      const headers: Record<string, string> = { "content-type": "application/json" };
      const token = tokens.get(connectorId);
      if (token) headers[auth.headerName] = auth.headerPrefix + token;
      const res = await fetch(url, { method: tool.method, headers, body: tool.method === "GET" ? undefined : JSON.stringify(body) });
      log.push(`${tool.method} ${url.replace(spec.baseUrl, "")} -> HTTP ${res.status}`);
      if (res.status === 401 && auth.refreshOn401 && !retried) {
        log.push("Token expired (401) -> re-authenticating and retrying [token refresh]");
        tokens.delete(connectorId);
        return request(url, true);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const json = await res.json();
      if (tool.silentError) {
        const { field, okValues, messageField } = tool.silentError;
        if (!okValues.includes(String(json[field]))) {
          log.push(`Silent error detected: ${field}=${JSON.stringify(json[field])} despite HTTP 200 [silent 200 check]`);
          throw new Error(String(json[messageField] ?? `${field}=${json[field]}`));
        }
      }
      return json;
    };

    if (!tool.pagination) return done({ status: "pass", data: await request(url) });

    const { style, param, itemsField, nextField } = tool.pagination;
    const items: unknown[] = [];
    let cursor: string | number = style === "page" ? 1 : "";
    for (let i = 0; i < MAX_PAGES; i++) {
      const pageUrl = new URL(url);
      if (style === "page" || cursor) pageUrl.searchParams.set(param, String(cursor));
      const page = await request(pageUrl.toString());
      items.push(...((page[itemsField] as unknown[]) ?? []));
      const next = page[nextField];
      if (!next) break;
      cursor = style === "page" ? (cursor as number) + 1 : String(next);
    }
    log.push(`Pagination: collected ${items.length} items across all pages [${style} pagination]`);
    return done({ status: "pass", data: { items, count: items.length } });
  } catch (e) {
    return done({ status: "fail", error: (e as Error).message });
  }
}

function buildRequest(spec: ConnectorSpec, tool: ToolSpec, args: Record<string, unknown>, log: string[]) {
  let path = tool.path;
  const query = new URLSearchParams();
  const body: Record<string, unknown> = {};
  for (const p of agentParams(tool)) {
    let value = args[p.name];
    if (value === undefined || value === null || value === "") {
      if (p.required) throw new Error(`Missing required argument: ${p.name}`);
      continue;
    }
    if (p.normalize && typeof value === "string") {
      const fixed = p.normalize === "uppercase" ? value.toUpperCase() : p.normalize === "lowercase" ? value.toLowerCase() : value.trim();
      if (fixed !== value) log.push(`Normalized ${p.name}: "${value}" -> "${fixed}" [${p.normalize}]`);
      value = fixed;
    }
    if (p.in === "path") path = path.replace(`:${p.name}`, encodeURIComponent(String(value))).replace(`{${p.name}}`, encodeURIComponent(String(value)));
    else if (p.in === "query") query.set(p.name, String(value));
    else body[p.name] = p.type === "number" ? Number(value) : value;
  }
  const qs = query.toString();
  return { url: spec.baseUrl + path + (qs ? `?${qs}` : ""), body };
}

export function resetTokens(connectorId: number) {
  tokens.delete(connectorId);
}
