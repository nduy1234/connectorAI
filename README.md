# ACE — Agentic Connector

ACE helps engineers build **agent connectors (MCP servers) for custom enterprise software**. You give it the system's docs plus the
tribal knowledge you got from the client's engineers; it extracts endpoints, auth, entities and rules, generates a working TypeScript
MCP server, tests every tool against the system, and **learns** each quirk into a Pattern Library that it applies to the next connector.

```
docs + tribal notes ──► Claude (claude-sonnet-4-6) ──► ConnectorSpec ──┬─► codegen  ─► MCP server (.ts, download)
        ▲                       ▲                                       └─► runtime  ─► "Try it" pass / fail
        │                 learned patterns                                         │
        └──────────────── Pattern Library (SQLite) ◄──── every extracted quirk ◄───┘
```

## Setup

Requires **Node.js 22.13+** (uses the built-in `node:sqlite`, so there is nothing native to compile).

```bash
git clone https://github.com/nduy1234/connectorAI.git
cd connectorAI
npm install
cp .env.example .env        # then put your key in ANTHROPIC_API_KEY
npm run dev
```

`npm run dev` starts the Next.js app on http://localhost:3000 **and** both mock legacy systems:

| Mock system | URL | Quirks |
|---|---|---|
| AcmeERP | http://localhost:4001 | silent 200 errors (`status: "ERROR"`), `?pg=` pagination with a `more` flag, tokens that die after 3 calls, `/sync` forbidden 09:00–17:00 |
| ShipTrack | http://localhost:4002 | silent 200 errors (`ok: false`), `?page=` pagination with `has_next`, sessions that die after 3 calls, case-sensitive UPPERCASE tracking IDs, hidden required `weight_kg` |

**No API key?** The app still runs the two demo systems in *offline demo mode* using a pre-recorded extraction
(`demo/offline/*.json`). Everything else — codegen, tests, the Pattern Library — runs for real. Any other system needs a key.

The SQLite database lives in `data/ace.db`. Delete it (or use **Reset library** on the Pattern Library page) to start over.

## 2-minute demo script

1. **(0:00) Frame it.** "Every enterprise has a legacy system with quirks nobody wrote down. ACE turns docs + hallway knowledge into an agent connector — and gets smarter with each one." Show the empty **Pattern Library**.
2. **(0:15) First connector.** On **New Connector**, click **1 · AcmeERP**. Point at the left box (official docs, which claim "standard HTTP errors") and the right box (Dana's notes: "everything returns 200", "never call /sync during business hours"). Click **Build connector**.
3. **(0:40) What it extracted.** On the connector page show auth, endpoints, entities and the four **tribal rules**, each tagged *new*. Scroll to a tool: its description embeds the rules an agent must know.
4. **(0:55) Try it.** Click **Run all**. Point at the purple log lines: `Token expired (401) -> re-authenticating and retrying`, `Pagination: collected 5 items across all pages`. If it's business hours, `run_sync` shows **BLOCKED** — the tribal rule is enforced, not just documented. Optional: change `get_order` args to `{"id":"9999"}` and Run → **FAIL ORDER_NOT_FOUND** even though the server said HTTP 200.
5. **(1:15) Download.** Scroll to the generated MCP server, click **Download**. It's a standalone file: `npm i @modelcontextprotocol/sdk zod && npx tsx acmeerp-mcp-server.ts`.
6. **(1:25) Second connector — the payoff.** Open **Pattern Library**: 4 patterns, each seen 1×. Go to **New Connector**, click **2 · ShipTrack**, **Build connector**. The green banner reads **"Applied 3 learned patterns: silent 200 errors, legacy pagination, token refresh."** Two genuinely new quirks (case-sensitive IDs, undocumented required fields) are tagged *new*.
7. **(1:45) Close.** **Run all** on ShipTrack — `get_shipment` with `st-9001` is auto-uppercased. Back on **Pattern Library**, three patterns now show **2×** across AcmeERP and ShipTrack. "Connector #2 took no extra explaining. Connector #20 takes less."

## How it works

| Step | Where |
|---|---|
| **Input** — paste or upload docs/specs/sample code + free-text notes | `src/components/NewConnectorForm.tsx` |
| **Retrieve** — keyword-match the new system against the Pattern Library | `src/lib/patterns.ts` → `retrievePatterns` |
| **Extract** — Claude returns a typed `ConnectorSpec` (structured outputs via `messages.parse` + Zod), reusing learned pattern slugs | `src/lib/extract.ts`, `src/lib/spec.ts` |
| **Generate** — deterministic template → MCP server, one tool per action, tribal rules in each description | `src/lib/codegen.ts` |
| **Test** — "Try it" executes each tool against the mock server with the same quirk handlers as the generated code | `src/lib/runtime.ts`, `src/components/TryItPanel.tsx` |
| **Self-improve** — every rule is upserted into `patterns` (pattern, fix, count, systems); the banner lists learned patterns the new spec reused | `src/lib/patterns.ts`, `src/lib/db.ts` |

Quirks are encoded **structurally** in the spec, so the connector handles them rather than hoping the agent reads the description:

| Spec field | Handler (generated server and Try it) |
|---|---|
| `tool.silentError` | treat HTTP 200 with a bad status field as an error |
| `tool.pagination` | fetch every page (page-number or cursor style) |
| `auth.refreshOn401` | re-login once and retry |
| `tool.blockedHours` | refuse to run inside the window |
| `param.normalize` | uppercase / lowercase / trim inputs |

## Project layout

```
src/app/            pages (New Connector, Connectors, connector detail, Pattern Library) + API routes
src/components/     client components (form, Try it panel, code view)
src/lib/            spec schema, Claude extraction, codegen, runtime, patterns, SQLite
mock-servers/       Express mocks for AcmeERP (4001) and ShipTrack (4002)
demo/               demo docs + tribal notes, and the offline pre-recorded extractions
```

## Scripts

- `npm run dev` — app + mock servers
- `npm run mocks` — mock servers only
- `npm run typecheck` — TypeScript check
