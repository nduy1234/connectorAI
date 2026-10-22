// Pattern Library logic: retrieve learned quirks for a new system, and learn new ones from a finished spec.
import { listPatterns, upsertPattern, type AppliedPattern, type Pattern } from "./db";
import type { ConnectorSpec } from "./spec";

const STOPWORDS = new Set(
  "the and for with that this from your have will when then than they them into only every each must just call calls returns return field fields".split(
    " ",
  ),
);

function words(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3 && !STOPWORDS.has(w)),
  );
}

/**
 * Cheap keyword retrieval: score each learned pattern by how many of its words appear in the new
 * system's docs + notes. Good enough for a library of dozens of patterns; swap for embeddings later.
 */
export function retrievePatterns(inputText: string, limit = 8): Pattern[] {
  const input = words(inputText);
  return listPatterns()
    .map((p) => {
      const pw = words(`${p.name} ${p.pattern} ${p.fix} ${p.examples.join(" ")}`);
      let score = 0;
      pw.forEach((w) => input.has(w) && score++);
      return { p, score };
    })
    .filter((x) => x.score >= 2)
    .sort((a, b) => b.score - a.score || b.p.count - a.p.count)
    .slice(0, limit)
    .map((x) => x.p);
}

/** Learned patterns (already in the library before this build) that the new spec reused. */
export function appliedPatterns(spec: ConnectorSpec, before: Pattern[]): AppliedPattern[] {
  const known = new Map(before.map((p) => [p.slug, p]));
  const seen = new Set<string>();
  const applied: AppliedPattern[] = [];
  for (const r of spec.rules) {
    const p = known.get(r.patternSlug);
    if (p && !seen.has(p.slug)) {
      seen.add(p.slug);
      applied.push({ slug: p.slug, name: p.name, fix: p.fix });
    }
  }
  return applied;
}

/** Save every quirk in the spec to the library (new pattern, or count + 1). */
export function learnFromSpec(spec: ConnectorSpec) {
  const bySlug = new Map<string, ConnectorSpec["rules"][number]>();
  spec.rules.forEach((r) => bySlug.has(r.patternSlug) || bySlug.set(r.patternSlug, r));
  bySlug.forEach((r) =>
    upsertPattern({
      slug: r.patternSlug,
      name: r.patternName,
      pattern: r.patternDescription,
      fix: r.fix,
      system: spec.systemName,
      example: `${spec.systemName}: ${r.text}`,
    }),
  );
}
