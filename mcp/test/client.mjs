// End-to-end test: spawns the built server over stdio with the official SDK client,
// lists tools/resources and calls every tool. Usage: npm test  (set OFFLINE=1 to test bundled data)
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import assert from "node:assert/strict";

const transport = new StdioClientTransport({
  command: "node",
  args: [new URL("../dist/index.js", import.meta.url).pathname],
  env: { ...process.env, ...(process.env.OFFLINE ? { CN_THEORIES_OFFLINE: "1" } : {}) },
  stderr: "inherit",
});
const client = new Client({ name: "cn-theories-test", version: "0.0.0" });
await client.connect(transport);

const info = client.getServerVersion();
console.log("server:", info);
const { tools } = await client.listTools();
console.log("tools:", tools.map((t) => t.name).join(", "));
assert.deepEqual(tools.map((t) => t.name).sort(), ["get_theory", "latest_theories", "list_theories", "search_theories"]);

const call = async (name, args, expectError = false) => {
  const r = await client.callTool({ name, arguments: args });
  const txt = r.content.map((c) => c.text).join("\n");
  console.log(`\n===== ${name} ${JSON.stringify(args)} ${r.isError ? "(isError)" : ""}\n${txt.slice(0, 1500)}${txt.length > 1500 ? "\n…[truncated]" : ""}`);
  assert.equal(!!r.isError, expectError, `${name} isError`);
  return txt;
};

let t = await call("search_theories", { query: "大水" });
assert.match(t, /dashui-lilun/);
t = await call("search_theories", { query: "water", lang: "en", limit: 3 });
assert.match(t, /Water/i);
t = await call("search_theories", { query: "zzzznotfound" });
assert.match(t, /No theories matched/);
t = await call("get_theory", { id_or_name: "薄肌理论" });
assert.match(t, /baoji-lilun/);
t = await call("get_theory", { id_or_name: "dazhan-lilun", include_markdown: true, lang: "zh" });
assert.match(t, /dazhan-lilun\.md/);
await call("get_theory", { id_or_name: "不存在的理论" }, true);
t = await call("list_theories", { year: 2025 });
assert.match(t, /共 3 条/);
t = await call("list_theories", { tag: "饮食", lang: "en" });
t = await call("list_theories", { generation: "2026新理论" });
t = await call("latest_theories", { limit: 3 });
assert.match(t, /Latest 3/);

const { resources } = await client.listResources();
console.log(`\nresources: ${resources.length} (first: ${resources.slice(0, 3).map((r) => r.uri).join(", ")})`);
const ds = await client.readResource({ uri: "cn-theories://theories.json" });
const n = JSON.parse(ds.contents[0].text).length;
console.log("dataset entries via resource:", n);
assert.ok(n >= 14);
const md = await client.readResource({ uri: "cn-theories://theory/caijiao-lilun" });
console.log("caijiao markdown chars:", md.contents[0].text.length);

await client.close();
console.log("\nALL TESTS PASSED");
