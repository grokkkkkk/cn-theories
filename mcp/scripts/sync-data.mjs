// Copies the repo's dataset + entry markdown into mcp/data/ so the npm package
// ships an offline fallback copy. Run automatically by `npm run build`.
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..", "..");
const out = join(here, "..", "data");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(repo, "data", "theories.json"), join(out, "theories.json"));
cpSync(join(repo, "theories"), join(out, "theories"), { recursive: true });
console.log("synced dataset ->", out);
