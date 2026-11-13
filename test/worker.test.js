import test from "node:test";
import assert from "node:assert/strict";
import worker, { scanFiles, patchPort } from "../worker/index.js";
import { readFile } from "node:fs/promises";
import { Script } from "node:vm";

const post = (path, body) => worker.fetch(new Request("https://example.test" + path, {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body)
}));

test("demo scan yields prioritized evidence and redacts synthetic values", async () => {
  const response = await post("/api/scan", { source: "sample" });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.repo, "built-in/demo-fixture");
  assert.deepEqual(data.findings.map((issue) => issue.title), ["Committed environment value", "Interpolated SQL query", "Hardcoded server port"]);
  assert.equal(data.findings[0].evidence, "SAMPLE_API_KEY=[REDACTED]");
  assert.ok(!JSON.stringify(data).includes("synthetic_fixture_value_123456"));
  assert.equal(data.summary.coverage, 100);
});

test("port patch is produced and its rule is checked again", async () => {
  const scanned = await (await post("/api/scan", { source: "sample" })).json();
  const issue = scanned.findings.find((entry) => entry.patchable);
  const response = await post("/api/patch", { source: "sample", issue });
  assert.equal(response.status, 200);
  const patch = await response.json();
  assert.equal(patch.verified, true);
  assert.match(patch.after, /process\.env\.PORT \|\| 3000/);
  assert.match(patch.diff, /@@ -3,1 \+3,1 @@/);
});

test("unsupported patch is refused", () => {
  assert.throws(() => patchPort([{ path: "a.js", content: "db.query('x')" }], {
    title: "Interpolated SQL query", file: "a.js", line: 1
  }), /human-reviewed/);
});

test("clean source has no findings", () => {
  assert.deepEqual(scanFiles([{ path: "server.js", content: "app.listen(process.env.PORT || 3000);" }]), []);
});

test("GitHub URL validation rejects other hosts without fetching", async () => {
  const response = await post("/api/scan", { source: "github", repoUrl: "https://example.com/owner/repo" });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /github.com/);
});

test("home page serves the application", async () => {
  const html = await readFile(new URL("../worker/page.html", import.meta.url), "utf8");
  assert.match(html, /ShipGuard/);
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script);
  assert.doesNotThrow(() => new Script(script));
});

test("public GitHub repository is fetched through the restricted API path", async () => {
  const originalFetch = globalThis.fetch;
  const source = "app.listen(4000);\n";
  const requested = [];
  globalThis.fetch = async (url) => {
    requested.push(url);
    if (url.endsWith("/repos/demo/repo")) return new Response(JSON.stringify({ default_branch: "main", private: false }));
    if (url.includes("/git/trees/main")) return new Response(JSON.stringify({ truncated: false, tree: [{ type: "blob", path: "server.js", size: source.length, sha: "abc" }] }));
    if (url.endsWith("/git/blobs/abc")) return new Response(JSON.stringify({ content: Buffer.from(source).toString("base64") }));
    throw new Error("Unexpected URL: " + url);
  };
  try {
    const response = await post("/api/scan", { source: "github", repoUrl: "https://github.com/demo/repo" });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.findings[0].title, "Hardcoded server port");
    assert.equal(data.summary.coverage, 100);
    assert.ok(requested.every((url) => url.startsWith("https://api.github.com/repos/demo/repo")));
  } finally { globalThis.fetch = originalFetch; }
});
