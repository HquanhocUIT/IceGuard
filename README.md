# IceGuard

**Audit before you ship.** IceGuard scans a public JavaScript or TypeScript GitHub repository, shows evidence-backed findings, and provides a rule-verified patch for a supported deployment issue. Built from scratch for IceHacks 2026.

Live app: https://iceguard-icehacks-2026.phudeeptry0501.chatgpt.site

## What works now

- Enter a public GitHub repository URL, or open the labeled built-in demo fixture.
- Scan up to 45 selected source files, with per-file and total byte limits.
- Flag possible hardcoded credentials, committed environment values, interpolated SQL queries, and hardcoded server ports.
- Show file and line evidence, severity, confidence, category, scan coverage when known, and an indicative score.
- Rewrite a hardcoded server port to use the PORT environment variable, then re-run the detection rule on the patched file.
- Copy a unified diff patch. No repository write permission is requested.

The checks are deliberately narrow. A possible SQL injection is a **review finding**, not a confirmed exploit. The score covers only selected files and is not a security certification. Patch verification means the original rule no longer matches; it does **not** mean the file passed its test suite.

## Architecture

1. A single Cloudflare Worker serves the UI and API.
2. The API validates GitHub repository URLs, reads public repository metadata, the Git tree, and selected blobs through the GitHub API. If its anonymous quota is exhausted, it reads a short list of common paths from GitHub's public raw-file service and marks coverage as unknown.
3. Deterministic rules inspect lines and return evidence with file path and line number. Credential-like values are redacted in responses.
4. A constrained patcher handles the server-port rule. It re-scans the patched content before returning the preview.

The UI is stored in worker/page.html. scripts/build.mjs embeds it into dist/server/index.js for Sites deployment. This keeps the deployed Worker as one ES module without runtime dependencies.

The repository scaffold came from the Sites Worker ESM starter. The application code and interface were written during the IceHacks hacking period.

## Run checks

Requires Node.js 22 or newer.

    npm run build
    npm test
    npm run validate
    npm start

Open http://127.0.0.1:8787 after starting the local server. Rebuild after editing the Worker or page.

There are no npm dependencies. The tests cover the demo scan, patch verification, clean input, invalid hosts, and the API surface.

## AI and third-party disclosure

AI-assisted coding was used to create this project. The primary scan and patch need no model; the patch is deterministic. A local Ollama review is experimental and hidden from the default interface. It can be opened with the query parameter local-ai=1 after a model is installed and tested. Do not describe this version as an autonomous multi-agent auditor or claim it uses Anakin, DeployXA, AST parsing, or OSV until those integrations are added and tested.

The experimental interface has a local Ollama review button. Enter a model name from the locally installed Ollama service. The browser sends the selected finding and its displayed evidence to the local Ollama API and displays the response as an **unverified suggestion**. To use it from the deployed site, configure Ollama to allow that exact site origin via OLLAMA_ORIGINS. Browser security settings may still restrict access to local services. This integration has not been tested with a running model in this environment.

## Limits and safety

- Public GitHub repositories only; no arbitrary URL fetching, login, repository execution, or exploit testing.
- GitHub unauthenticated API limits apply. A limited common-file fallback and built-in fixture keep a useful demo available when GitHub throttles requests. Fallback results have unknown coverage and no readiness score.
- Scans are sampled by file priority, capped at 45 files, 32 KB per file, and 300 KB total.
- Findings are heuristics and may contain false positives or miss real vulnerabilities.
- Use synthetic credentials in demos. Do not paste real secrets into issues, screenshots, or videos.

## IceHacks submission checklist

- [ ] Publish this source to a **public GitHub repository**.
- [ ] Deploy the app to a URL judges can open without signing in.
- [ ] Record a public demo video of **under three minutes** showing a real scan and patch preview.
- [ ] Write the Devpost summary: problem, how it works, challenges, lessons, next steps, and tools used.
- [ ] Disclose significant AI-generated code in the submission.
- [ ] Submit before **15 Nov 2026, 18:00 PST = 16 Nov 2026, 09:00 Vietnam time**.

## Remaining build priorities

1. Add a real model adapter after choosing a reachable inference service.
2. Add a more representative owned demo repository and a clean fixture to show false-positive handling.
3. Add dependency advisory checks and richer parsing only if they can be tested before the deadline.
