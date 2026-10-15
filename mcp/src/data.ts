import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export interface Theory {
  id: string;
  name: string;
  aliases?: string[];
  name_en?: string;
  generation?: string;
  proposer?: string;
  platform?: string;
  first_viral?: string;
  tags?: string[];
  status?: string;
  file?: string;
  sources?: string[];
  summary?: string;
  summary_en?: string;
  quote?: string;
  quote_en?: string;
}

export const REPO = "grokkkkkk/cn-theories";
export const REPO_URL = `https://github.com/${REPO}`;
export const SITE_URL = "https://grokkkkkk.github.io/cn-theories/";
const BRANCH = process.env.CN_THEORIES_BRANCH || "main";
export const RAW_BASE = (
  process.env.CN_THEORIES_RAW_BASE ||
  `https://raw.githubusercontent.com/${REPO}/${BRANCH}`
).replace(/\/+$/, "");
const OFFLINE = /^(1|true|yes)$/i.test(process.env.CN_THEORIES_OFFLINE || "");
const TTL_MS = 10 * 60 * 1000;
const TIMEOUT_MS = 8000;

const here = dirname(fileURLToPath(import.meta.url));
const BUNDLED_DIR = join(here, "..", "data");

export type DataSource = "remote" | "bundled" | "remote+bundled";

let cache: { at: number; theories: Theory[]; source: DataSource } | null = null;

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { "user-agent": "cn-theories-mcp" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function loadBundled(): Promise<Theory[]> {
  try {
    const txt = await readFile(join(BUNDLED_DIR, "theories.json"), "utf8");
    return JSON.parse(txt) as Theory[];
  } catch {
    return [];
  }
}

/**
 * Loads the dataset. The live copy on GitHub wins; entries that only exist in the
 * bundled copy (e.g. not yet pushed) are appended, so the server never shows fewer
 * entries than it shipped with. Falls back to the bundled copy when offline.
 */
export async function loadTheories(): Promise<{ theories: Theory[]; source: DataSource }> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache;
  const bundled = await loadBundled();
  let theories = bundled;
  let source: DataSource = "bundled";
  if (!OFFLINE) {
    try {
      const remote = JSON.parse(await fetchText(`${RAW_BASE}/data/theories.json`));
      if (!Array.isArray(remote)) throw new Error("dataset is not an array");
      const ids = new Set(remote.map((t: Theory) => t.id));
      const extra = bundled.filter((t) => !ids.has(t.id));
      theories = [...remote, ...extra];
      source = extra.length ? "remote+bundled" : "remote";
    } catch (err) {
      console.error(`[cn-theories-mcp] remote fetch failed, using bundled data: ${String(err)}`);
    }
  }
  if (!theories.length) throw new Error("No theory data available (remote fetch failed and no bundled copy).");
  cache = { at: Date.now(), theories, source };
  return cache;
}

export async function loadMarkdown(t: Theory): Promise<string | null> {
  if (!t.file) return null;
  if (!OFFLINE) {
    try {
      return await fetchText(`${RAW_BASE}/${t.file}`);
    } catch (err) {
      console.error(`[cn-theories-mcp] markdown fetch failed for ${t.file}: ${String(err)}`);
    }
  }
  try {
    return await readFile(join(BUNDLED_DIR, t.file), "utf8");
  } catch {
    return null;
  }
}

export function githubUrl(t: Theory): string | undefined {
  return t.file ? `${REPO_URL}/blob/${BRANCH}/${t.file}` : undefined;
}
