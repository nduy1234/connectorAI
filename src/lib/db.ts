import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import type { ConnectorSpec } from "./spec";

const DB_PATH = path.join(process.cwd(), "data", "ace.db");

function open() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS connectors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      docs TEXT NOT NULL,
      notes TEXT NOT NULL,
      spec TEXT NOT NULL,
      code TEXT NOT NULL,
      applied_patterns TEXT NOT NULL,
      source TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS patterns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      pattern TEXT NOT NULL,
      fix TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      systems TEXT NOT NULL DEFAULT '[]',
      examples TEXT NOT NULL DEFAULT '[]',
      first_seen TEXT NOT NULL,
      last_seen TEXT NOT NULL
    );
  `);
  return db;
}

// Reuse one connection across Next.js hot reloads.
const g = globalThis as unknown as { __aceDb?: DatabaseSync };
export const db = g.__aceDb ?? (g.__aceDb = open());

export interface Pattern {
  id: number;
  slug: string;
  name: string;
  pattern: string;
  fix: string;
  count: number;
  systems: string[];
  examples: string[];
  first_seen: string;
  last_seen: string;
}

export interface AppliedPattern {
  slug: string;
  name: string;
  fix: string;
}

export interface Connector {
  id: number;
  name: string;
  created_at: string;
  docs: string;
  notes: string;
  spec: ConnectorSpec;
  code: string;
  applied_patterns: AppliedPattern[];
  source: "claude" | "offline-demo";
}

type Row = Record<string, unknown>;

function toPattern(r: Row): Pattern {
  return { ...(r as unknown as Pattern), systems: JSON.parse(r.systems as string), examples: JSON.parse(r.examples as string) };
}

function toConnector(r: Row): Connector {
  return {
    ...(r as unknown as Connector),
    spec: JSON.parse(r.spec as string),
    applied_patterns: JSON.parse(r.applied_patterns as string),
  };
}

export function listPatterns(): Pattern[] {
  return (db.prepare("SELECT * FROM patterns ORDER BY count DESC, name").all() as Row[]).map(toPattern);
}

/** Record one sighting of a pattern: insert it, or bump its count and remember the system + example. */
export function upsertPattern(p: { slug: string; name: string; pattern: string; fix: string; system: string; example: string }) {
  const now = new Date().toISOString();
  const existing = db.prepare("SELECT * FROM patterns WHERE slug = ?").get(p.slug) as Row | undefined;
  if (!existing) {
    db.prepare(
      "INSERT INTO patterns (slug, name, pattern, fix, count, systems, examples, first_seen, last_seen) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)",
    ).run(p.slug, p.name, p.pattern, p.fix, JSON.stringify([p.system]), JSON.stringify([p.example]), now, now);
    return;
  }
  const cur = toPattern(existing);
  const systems = Array.from(new Set([...cur.systems, p.system]));
  const examples = [...cur.examples, p.example].slice(-5);
  db.prepare("UPDATE patterns SET count = count + 1, systems = ?, examples = ?, last_seen = ? WHERE slug = ?").run(
    JSON.stringify(systems),
    JSON.stringify(examples),
    now,
    p.slug,
  );
}

export function resetPatterns() {
  db.exec("DELETE FROM patterns");
}

export function insertConnector(c: Omit<Connector, "id" | "created_at">): number {
  const result = db
    .prepare(
      "INSERT INTO connectors (name, created_at, docs, notes, spec, code, applied_patterns, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .run(
      c.name,
      new Date().toISOString(),
      c.docs,
      c.notes,
      JSON.stringify(c.spec),
      c.code,
      JSON.stringify(c.applied_patterns),
      c.source,
    );
  return Number(result.lastInsertRowid);
}

export function listConnectors(): Connector[] {
  return (db.prepare("SELECT * FROM connectors ORDER BY id DESC").all() as Row[]).map(toConnector);
}

export function getConnector(id: number): Connector | null {
  const row = db.prepare("SELECT * FROM connectors WHERE id = ?").get(id) as Row | undefined;
  return row ? toConnector(row) : null;
}

export function deleteConnector(id: number) {
  db.prepare("DELETE FROM connectors WHERE id = ?").run(id);
}
