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

test("credential evidence redacts every credential-like value on a line", () => {
  const value = "synthetic_fixture_value_123456";
  const findings = scanFiles([{ path: "config.js", content: `const note = "${value}"; const api_key = "${value}"; const password = "another_private_value";` }]);
  assert.equal(findings.length, 1);
  assert.ok(!findings[0].evidence.includes(value));
  assert.ok(!findings[0].evidence.includes("another_private_value"));
  assert.match(findings[0].evidence, /api_key = "\[REDACTED\]"/);
});

test("GitHub URL validation rejects other hosts without fetching", async () => {
  const response = await post("/api/scan", { source: "github", repoUrl: "https://example.com/owner/repo" });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /github.com/);
});

test("home page serves the application", async () => {
  const html = await readFile(new URL("../worker/page.html", import.meta.url), "utf8");
  assert.match(html, /IceGuard/);
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

test("API quota fallback scans common files and reports unknown coverage", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (url.startsWith("https://api.github.com/")) return new Response("rate limited", { status: 403 });
    if (url === "https://raw.githubusercontent.com/demo/repo/HEAD/index.js") return new Response("app.listen(4000);\n");
    if (url.startsWith("https://raw.githubusercontent.com/demo/repo/HEAD/")) return new Response("not found", { status: 404 });
    throw new Error("Unexpected URL: " + url);
  };
  try {
    const response = await post("/api/scan", { source: "github", repoUrl: "https://github.com/demo/repo" });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.limited, true);
    assert.equal(data.summary.coverage, null);
    assert.equal(data.summary.score, null);
    assert.equal(data.summary.eligible, null);
    assert.equal(data.summary.filesScanned, 1);
    assert.equal(data.findings[0].title, "Hardcoded server port");
  } finally { globalThis.fetch = originalFetch; }
});
