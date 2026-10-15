#!/usr/bin/env node
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createRequire } from "node:module";
import { REPO_URL, SITE_URL, loadMarkdown, loadTheories } from "./data.js";
import { Lang, brief, findTheory, full, searchTheories, sortLatest, yearOf } from "./logic.js";

const VERSION: string = createRequire(import.meta.url)("../package.json").version;

const server = new McpServer(
  { name: "cn-theories", title: "中文互联网理论库 · CN Internet Theories", version: VERSION },
  {
    instructions:
      "A curated, sourced catalog of viral Chinese-internet 'theories' (e.g. 大水理论 The Big Water Theory, 薄肌理论, 黄毛思维). " +
      "Use search_theories for keywords in Chinese or English, get_theory for a single entry (optionally with its full markdown write-up), " +
      "list_theories to browse by year/generation/tag, and latest_theories for the newest ones. " +
      `Data: ${REPO_URL} (CC BY-SA 4.0).`,
  },
);

const langSchema = z
  .enum(["zh", "en", "both"])
  .optional()
  .describe("Output language: zh (中文), en (English) or both (default)");

const text = (s: string) => ({ content: [{ type: "text" as const, text: s }] });
const footer = (source: string) =>
  `\n\n---\n数据 / Data: ${REPO_URL} · ${SITE_URL} (source: ${source})`;

server.registerTool(
  "search_theories",
  {
    title: "Search theories / 搜索理论",
    description:
      "Search Chinese-internet theories by keyword in Chinese or English (name, alias, tag, proposer, summary, quote). " +
      "按关键词搜索理论，支持中英文。Multiple space-separated words must all match.",
    inputSchema: {
      query: z.string().min(1).describe("Keyword(s), e.g. 大水, 喝水, water, 健康"),
      lang: langSchema,
      limit: z.number().int().min(1).max(50).optional().describe("Max results (default 10)"),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ query, lang, limit }) => {
    const { theories, source } = await loadTheories();
    const hits = searchTheories(theories, query).slice(0, limit ?? 10);
    if (!hits.length) {
      return text(
        `没有找到与「${query}」相关的理论。No theories matched "${query}". ` +
          `Try list_theories to browse all ${theories.length} entries.` + footer(source),
      );
    }
    const body = hits.map((h) => brief(h.t, (lang ?? "both") as Lang)).join("\n\n");
    return text(`找到 ${hits.length} 条 / ${hits.length} result(s) for "${query}":\n\n${body}${footer(source)}`);
  },
);

server.registerTool(
  "get_theory",
  {
    title: "Get a theory / 查看理论详情",
    description:
      "Get one theory's full entry: meaning, proposer, platform, first-viral date, tags, original quote and sources. " +
      "Look up by id (e.g. dashui-lilun), Chinese name (大水理论), alias or English name. " +
      "Set include_markdown to also return the full write-up from the repo.",
    inputSchema: {
      id_or_name: z.string().min(1).describe("id, 中文名, alias or English name, e.g. 薄肌理论 / baoji-lilun"),
      include_markdown: z.boolean().optional().describe("Also return the entry's full markdown (default false)"),
      lang: langSchema,
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ id_or_name, include_markdown, lang }) => {
    const { theories, source } = await loadTheories();
    const t = findTheory(theories, id_or_name);
    if (!t) {
      const sugg = searchTheories(theories, id_or_name).slice(0, 5);
      const hint = sugg.length
        ? `\n可能是 / Did you mean: ${sugg.map((s) => `${s.t.name} (${s.t.id})`).join(", ")}`
        : "";
      return { ...text(`未找到「${id_or_name}」。No theory found for "${id_or_name}".${hint}`), isError: true };
    }
    let out = full(t, (lang ?? "both") as Lang);
    if (include_markdown) {
      const md = await loadMarkdown(t);
      out += md
        ? `\n\n---\n\n<!-- ${t.file} -->\n${md.trim()}`
        : `\n\n(全文暂不可用 / full markdown unavailable for ${t.file ?? t.id})`;
    }
    return text(out + footer(source));
  },
);

server.registerTool(
  "list_theories",
  {
    title: "List theories / 列出理论",
    description:
      "List theories, optionally filtered by year (e.g. 2025, 2026), generation (e.g. 2025三大理论, 2026新理论) or tag (e.g. 健康, 饮食). " +
      "按年份、批次或标签列出理论，按走红时间从新到旧排列。",
    inputSchema: {
      year: z.number().int().min(2000).max(2100).optional().describe("Year the theory went viral"),
      generation: z.string().optional().describe("Generation label (substring match), e.g. 三大理论"),
      tag: z.string().optional().describe("Tag (substring match), e.g. 健康"),
      lang: langSchema,
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ year, generation, tag, lang }) => {
    const { theories, source } = await loadTheories();
    let list = theories;
    if (year) list = list.filter((t) => yearOf(t) === year);
    if (generation) list = list.filter((t) => (t.generation || "").includes(generation));
    if (tag) {
      const k = tag.toLowerCase();
      list = list.filter((t) => (t.tags || []).some((x) => x.toLowerCase().includes(k)));
    }
    if (!list.length) return text(`没有符合条件的理论。No theories match these filters.${footer(source)}`);
    const tags = [...new Set(theories.flatMap((t) => t.tags || []))].join(", ");
    const gens = [...new Set(theories.map((t) => t.generation).filter(Boolean))].join(", ");
    const body = sortLatest(list).map((t) => brief(t, (lang ?? "both") as Lang)).join("\n\n");
    return text(
      `共 ${list.length} 条 / ${list.length} of ${theories.length} theories\n` +
        `可用批次 / generations: ${gens}\n可用标签 / tags: ${tags}\n\n${body}${footer(source)}`,
    );
  },
);

server.registerTool(
  "latest_theories",
  {
    title: "Latest theories / 最新理论",
    description: "The most recently viral theories, newest first. 最近走红的理论，从新到旧。",
    inputSchema: {
      limit: z.number().int().min(1).max(50).optional().describe("How many (default 5)"),
      lang: langSchema,
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ limit, lang }) => {
    const { theories, source } = await loadTheories();
    const list = sortLatest(theories).slice(0, limit ?? 5);
    const body = list.map((t) => brief(t, (lang ?? "both") as Lang)).join("\n\n");
    return text(`最新 ${list.length} 条 / Latest ${list.length}:\n\n${body}${footer(source)}`);
  },
);

server.registerResource(
  "theories-dataset",
  "cn-theories://theories.json",
  {
    title: "Full dataset / 完整数据",
    description: "All theory entries as JSON (data/theories.json).",
    mimeType: "application/json",
  },
  async (uri) => {
    const { theories } = await loadTheories();
    return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(theories, null, 2) }] };
  },
);

server.registerResource(
  "theory-markdown",
  new ResourceTemplate("cn-theories://theory/{id}", {
    list: async () => {
      const { theories } = await loadTheories();
      return {
        resources: theories.map((t) => ({
          uri: `cn-theories://theory/${t.id}`,
          name: `${t.name}${t.name_en ? ` / ${t.name_en}` : ""}`,
          mimeType: "text/markdown",
        })),
      };
    },
  }),
  { title: "Theory write-up / 理论条目全文", description: "Full markdown entry for one theory.", mimeType: "text/markdown" },
  async (uri, { id }) => {
    const { theories } = await loadTheories();
    const t = findTheory(theories, String(id));
    if (!t) throw new Error(`Unknown theory id: ${id}`);
    const md = (await loadMarkdown(t)) ?? full(t);
    return { contents: [{ uri: uri.href, mimeType: "text/markdown", text: md }] };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[cn-theories-mcp] v${VERSION} running on stdio`);
}

main().catch((err) => {
  console.error("[cn-theories-mcp] fatal:", err);
  process.exit(1);
});
