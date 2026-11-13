import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const worker = await readFile(resolve(root, "worker/index.js"), "utf8");
const page = await readFile(resolve(root, "worker/page.html"), "utf8");
const manifest = await readFile(resolve(root, ".openai/hosting.json"), "utf8");
if (!worker.includes('"__PAGE__"')) throw new Error("Page placeholder missing");
await mkdir(resolve(root, "dist/server"), { recursive: true });
await mkdir(resolve(root, "dist/.openai"), { recursive: true });
await writeFile(resolve(root, "dist/server/index.js"), worker.replace('"__PAGE__"', JSON.stringify(page)));
await writeFile(resolve(root, "dist/.openai/hosting.json"), manifest);
console.log("Built dist/server/index.js");
