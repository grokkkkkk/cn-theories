import { Theory, githubUrl } from "./data.js";

export type Lang = "zh" | "en" | "both";

const norm = (s: string) => s.normalize("NFKC").toLowerCase().trim();

/** Year a theory belongs to: first_viral year, else the leading year in `generation`. */
export function yearOf(t: Theory): number | undefined {
  const m = (t.first_viral || "").match(/^(\d{4})/) || (t.generation || "").match(/(\d{4})/);
  return m ? Number(m[1]) : undefined;
}

/** Sortable date key; "2026-10" -> "2026-10-00", missing -> year-00-00 or "". */
function dateKey(t: Theory): string {
  const fv = t.first_viral || "";
  const parts = fv.split("-");
  if (parts[0]) return [parts[0], parts[1] || "00", parts[2] || "00"].join("-");
  const y = yearOf(t);
  return y ? `${y}-00-00` : "";
}

export function sortLatest(list: Theory[]): Theory[] {
  return list
    .map((t, i) => ({ t, i }))
    .sort((a, b) => dateKey(b.t).localeCompare(dateKey(a.t)) || b.i - a.i)
    .map((x) => x.t);
}

export function findTheory(list: Theory[], key: string): Theory | undefined {
  const k = norm(key);
  const exact = list.find(
    (t) =>
      norm(t.id) === k ||
      norm(t.name) === k ||
      norm(t.name_en || "") === k ||
      (t.aliases || []).some((a) => norm(a) === k),
  );
  if (exact) return exact;
  // Loose: "大水" -> 大水理论, "the big water" -> "The Big Water Theory"
  const loose = list.filter(
    (t) =>
      norm(t.name).startsWith(k) ||
      norm(t.name_en || "").includes(k) ||
      (t.aliases || []).some((a) => norm(a).startsWith(k)),
  );
  return loose.length === 1 ? loose[0] : undefined;
}

export function searchTheories(list: Theory[], query: string): { t: Theory; score: number }[] {
  const tokens = norm(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  const weighted = (t: Theory): [string, number][] => [
    [t.id, 6],
    [t.name, 10],
    [(t.aliases || []).join(" "), 8],
    [t.name_en || "", 8],
    [(t.tags || []).join(" "), 5],
    [t.proposer || "", 4],
    [t.summary || "", 3],
    [t.summary_en || "", 3],
    [t.quote || "", 2],
    [t.quote_en || "", 2],
    [t.generation || "", 1],
    [t.platform || "", 1],
  ];
  const out: { t: Theory; score: number }[] = [];
  for (const t of list) {
    const fields = weighted(t).map(([s, w]) => [norm(s), w] as const);
    let score = 0;
    let all = true;
    for (const tok of tokens) {
      let s = 0;
      for (const [f, w] of fields) if (f && f.includes(tok)) s += w;
      if (!s) all = false;
      score += s;
    }
    if (all && score) out.push({ t, score });
  }
  return out.sort((a, b) => b.score - a.score);
}

/** Compact one-entry block (for lists / search results). */
export function brief(t: Theory, lang: Lang = "both"): string {
  const zh = lang !== "en";
  const en = lang !== "zh";
  const title = [zh ? t.name : "", en ? t.name_en : ""].filter(Boolean).join(" / ");
  const lines = [`### ${title || t.name}  \`${t.id}\``];
  const meta = [
    t.first_viral && `${zh ? "走红" : "First viral"}: ${t.first_viral}`,
    t.generation && `${zh ? "批次" : "Generation"}: ${t.generation}`,
    t.tags?.length && `${zh ? "标签" : "Tags"}: ${t.tags.join(", ")}`,
  ].filter(Boolean);
  if (meta.length) lines.push(meta.join(" · "));
  if (zh && t.summary) lines.push(`${t.summary}`);
  if (en && t.summary_en) lines.push(`${t.summary_en}`);
  return lines.join("\n");
}

/** Full entry (for get_theory). */
export function full(t: Theory, lang: Lang = "both"): string {
  const zh = lang !== "en";
  const en = lang !== "zh";
  const L = (z: string, e: string) => (zh && en ? `${z} / ${e}` : zh ? z : e);
  const lines = [`## ${[zh ? t.name : "", en ? t.name_en : ""].filter(Boolean).join(" / ") || t.name}`, ""];
  const row = (k: string, v?: string | string[] | null) => {
    if (v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length)) return;
    lines.push(`- **${k}**: ${Array.isArray(v) ? v.join(", ") : v}`);
  };
  row("ID", t.id);
  row(L("别名", "Aliases"), t.aliases);
  row(L("提出者", "Proposer"), t.proposer);
  row(L("平台", "Platform"), t.platform);
  row(L("首次走红", "First viral"), t.first_viral);
  row(L("批次", "Generation"), t.generation);
  row(L("标签", "Tags"), t.tags);
  row(L("状态", "Status"), t.status);
  if (zh) row("简介", t.summary);
  if (en) row("Summary", t.summary_en);
  if (zh) row("原话", t.quote ? `“${t.quote}”` : undefined);
  if (en) row("Quote", t.quote_en ? `"${t.quote_en}"` : undefined);
  row(L("条目", "Entry"), githubUrl(t));
  if (t.sources?.length) {
    lines.push(`- **${L("出处", "Sources")}**:`);
    for (const s of t.sources) lines.push(`  - ${s}`);
  }
  return lines.join("\n");
}
