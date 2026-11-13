const page = "__PAGE__";
const demoFiles = [
  { path: "src/server.js", content: "import express from 'express';\nconst app = express();\napp.listen(3000);\n" },
  { path: "src/users.js", content: "export async function getUser(db, id) {\n  return db.query(\x60SELECT * FROM users WHERE id = '\x24{id}'\x60);\n}\n" },
  { path: ".env", content: "SAMPLE_API_KEY=synthetic_fixture_value_123456\n" }
];
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

function parseRepo(input) {
  let url;
  try { url = new URL(input); } catch { throw new Error("Enter a GitHub repository URL."); }
  if (url.protocol !== "https:" || url.hostname !== "github.com") throw new Error("Only https://github.com URLs are supported.");
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length !== 2 || !parts.every((part) => /^[\w.-]{1,100}$/.test(part))) throw new Error("Use https://github.com/owner/repo.");
  return { owner: parts[0], repo: parts[1].replace(/\.git$/, "") };
}
function supported(path) {
  const name = path.toLowerCase();
  if (/(^|\/)(node_modules|dist|build|coverage|vendor|\.next|\.git)\//.test(name)) return false;
  if (/(\.min\.js|\.map|\.lock|\.svg|\.png|\.jpg|\.gif)$/.test(name)) return false;
  return /(^|\/)(\.env|dockerfile|package\.json)$/.test(name) || /\.(js|jsx|ts|tsx|mjs|cjs)$/.test(name);
}
function priority(path) {
  if (/(^|\/)\.env$/.test(path)) return 0;
  if (/(auth|login|user|route|api|db|server)/i.test(path)) return 1;
  if (/(package\.json|dockerfile|config)/i.test(path)) return 2;
  return 3;
}
async function githubGet(path) {
  const response = await fetch("https://api.github.com" + path, { headers: { accept: "application/vnd.github+json", "user-agent": "IceGuard-IceHacks-2026", "x-github-api-version": "2022-11-28" } });
  if (response.status === 404) throw new Error("Public repository or file not found.");
  if (response.status === 403 || response.status === 429) throw new Error("GitHub rate limit reached. Retry later or use the demo fixture.");
  if (!response.ok) throw new Error("GitHub error: HTTP " + response.status);
  return response.json();
}
function decodeUtf8(base64) {
  const binary = atob(base64.replace(/\s/g, ""));
  return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}
async function readRepo(input) {
  const { owner, repo } = parseRepo(input);
  const base = "/repos/" + encodeURIComponent(owner) + "/" + encodeURIComponent(repo);
  const metadata = await githubGet(base);
  if (metadata.private) throw new Error("Only public repositories are supported.");
  const tree = await githubGet(base + "/git/trees/" + encodeURIComponent(metadata.default_branch) + "?recursive=1");
  if (tree.truncated) throw new Error("Repository tree is too large for this preview scanner.");
  const eligible = tree.tree.filter((item) => item.type === "blob" && item.size <= 32000 && supported(item.path));
  eligible.sort((a, b) => priority(a.path) - priority(b.path) || a.path.localeCompare(b.path));
  const selected = []; let bytes = 0;
  for (const item of eligible) { if (selected.length >= 45 || bytes + item.size > 300000) continue; selected.push(item); bytes += item.size; }
  if (!selected.length) throw new Error("No supported JavaScript or TypeScript files found.");
  const files = [];
  for (let offset = 0; offset < selected.length; offset += 6) {
    const batch = await Promise.all(selected.slice(offset, offset + 6).map(async (item) => {
      try { const blob = await githubGet(base + "/git/blobs/" + encodeURIComponent(item.sha)); return { path: item.path, content: decodeUtf8(blob.content) }; }
      catch { return null; }
    }));
    files.push(...batch.filter(Boolean));
  }
  if (!files.length) throw new Error("GitHub files could not be read.");
  return { files, repo: owner + "/" + repo, eligible: eligible.length };
}
function issue(category, severity, confidence, file, line, title, explanation, evidence, patchable = false) {
  return { category, severity, confidence, file, line, title, explanation, evidence, patchable };
}
export function scanFiles(files) {
  const results = [];
  for (const file of files) {
    const isEnv = /(^|\/)\.env$/.test(file.path);
    for (const [index, line] of file.content.split(/\r?\n/).entries()) {
      const number = index + 1;
      if (isEnv && /^\s*[A-Za-z_]\w*\s*=\s*\S+/.test(line) && !/demo|example|placeholder|changeme/i.test(line))
        results.push(issue("Security", "high", "high", file.path, number, "Committed environment value", "A populated .env file is present. Rotate any real credential and remove it from Git history.", line.replace(/=.*/, "=[REDACTED]")));
      const secret = /\b(api[_-]?key|secret|password|access[_-]?token)\b\s*[:=]\s*["']([^"']{10,})["']/i.exec(line);
      if (!isEnv && secret && !/demo|example|placeholder|changeme/i.test(secret[2]))
        results.push(issue("Security", "high", "medium", file.path, number, "Possible hardcoded credential", "Review this credential-like value. Rotate it if real, then use an environment variable.", line.replace(secret[2], "[REDACTED]")));
      if (/\.query\s*\(\s*\x60/.test(line) && /\$\{[^}]+\}/.test(line))
        results.push(issue("Security", "medium", "medium", file.path, number, "Interpolated SQL query", "A value is inserted into SQL. Check whether it comes from user input; parameterized queries are safer.", line.trim()));
      if (/\.listen\s*\(\s*\d{2,5}\s*\)/.test(line))
        results.push(issue("Deployability", "low", "high", file.path, number, "Hardcoded server port", "Many hosts supply a PORT environment variable. Support it while retaining a local default.", line.trim(), true));
    }
  }
  const rank = { high: 0, medium: 1, low: 2 };
  return results.sort((a, b) => rank[a.severity] - rank[b.severity] || a.file.localeCompare(b.file) || a.line - b.line);
}
export function patchPort(files, finding) {
  if (!finding || finding.title !== "Hardcoded server port") throw new Error("This finding needs a human-reviewed fix.");
  const file = files.find((item) => item.path === finding.file);
  if (!file) throw new Error("Source file unavailable.");
  const lines = file.content.split(/\r?\n/);
  const before = lines[finding.line - 1];
  if (!before || !/\.listen\s*\(\s*\d{2,5}\s*\)/.test(before)) throw new Error("Source changed. Re-scan the repository.");
  const after = before.replace(/\.listen\s*\(\s*(\d{2,5})\s*\)/, ".listen(process.env.PORT || $1)");
  lines[finding.line - 1] = after;
  const patched = lines.join("\n");
  const verified = !scanFiles([{ path: file.path, content: patched }]).some((item) => item.title === finding.title && item.line === finding.line);
  if (!verified) throw new Error("Patch re-scan failed.");
  const diff = "--- a/" + file.path + "\n+++ b/" + file.path + "\n@@ -" + finding.line + ",1 +" + finding.line + ",1 @@\n-" + before + "\n+" + after + "\n";
  return { file: file.path, before, after, diff, verified, method: "Deterministic rewrite and rule re-scan", note: "The patched file has not been executed. Review and test it before merging." };
}
function summarize(files, findings, eligible) {
  const counts = { high: 0, medium: 0, low: 0 };
  for (const item of findings) counts[item.severity]++;
  return { filesScanned: files.length, eligible, coverage: Math.round(100 * files.length / eligible), counts, score: Math.max(0, 100 - counts.high * 20 - counts.medium * 10 - counts.low * 4) };
}
export default {
  async fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/" && request.method === "GET") return new Response(page, { headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self' http://127.0.0.1:11434; base-uri 'none'; form-action 'self'", "x-content-type-options": "nosniff" } });
    if ((path === "/api/scan" || path === "/api/patch") && request.method === "POST") {
      try {
        if (Number(request.headers.get("content-length") || 0) > 10000) return json({ error: "Request too large." }, 413);
        const body = await request.json();
        const repo = body.source === "sample" ? { files: demoFiles, repo: "built-in/demo-fixture", eligible: demoFiles.length } : await readRepo(body.repoUrl);
        const findings = scanFiles(repo.files);
        if (path === "/api/scan") return json({ repo: repo.repo, source: body.source, repoUrl: body.repoUrl || "", findings, summary: summarize(repo.files, findings, repo.eligible) });
        const finding = findings.find((item) => item.file === body.issue?.file && item.line === body.issue?.line && item.title === body.issue?.title);
        return json(patchPort(repo.files, finding));
      } catch (error) { return json({ error: error instanceof Error ? error.message : "Request failed." }, 400); }
    }
    return new Response("Not found", { status: 404 });
  }
};
