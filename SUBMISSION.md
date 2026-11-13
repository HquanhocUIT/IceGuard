# Devpost draft

## Project title

IceGuard — Audit before you ship

## One sentence

IceGuard turns a public JavaScript or TypeScript repository into a short, evidence-backed list of issues and a reviewable patch for supported deployment mistakes.

## Inspiration

Fast prototypes can hide security and deployment mistakes. We wanted a fast, accessible first pass that shows exactly why a finding was raised, without claiming to certify a repository as secure.

## What it does

Paste a public GitHub repository URL or run one of three built-in test cases. IceGuard reads selected source files, flags four narrow source patterns, and compares a Dockerfile's exposed port with a fixed server listener. Each result shows file and line evidence; the cross-file mismatch shows both sides. For an unambiguous hardcoded server port, it generates a unified diff using the PORT environment variable and re-runs the rule. When the Dockerfile and server disagree, it withholds the auto-patch for human review.

## How we built it

The app is one Cloudflare Worker serving a browser interface and a small API. The API allows only public GitHub repository URLs and reads repository metadata, a file tree, and bounded source blobs from the GitHub API. When the anonymous quota is exhausted, a limited fallback reads common public source paths and labels coverage unknown. Deterministic rules produce findings, including a cross-file port check. The patcher applies one constrained rewrite only when the Dockerfile and server are not in conflict, then verifies it by re-scanning. The interface uses plain HTML, CSS, and JavaScript, with no client framework. A build script embeds the page in the Worker.

## Challenges

We chose limited, inspectable checks rather than making broad security claims. A single-file patch could hide a Dockerfile/server conflict, so we made the app refuse that patch. GitHub's unauthenticated API rate limit affected the public deployment, so we added a labeled common-file fallback and three built-in test cases. An experimental local AI option is hidden by default because a model on one computer cannot serve every public visitor.

## What we learned

Coverage, evidence from both sides of a conflict, and honest confidence labels matter as much as a polished score. Refusing an unsafe automatic patch can be more useful than producing a misleading one.

## What's next

Add tested dependency advisory checks, stronger parsing for SQL data flow, a hosted inference option, and isolated test execution for proposed patches.

## Built with

JavaScript, Cloudflare Workers, GitHub REST API, Sites hosting, and AI-assisted coding. Sites Worker ESM starter was used as the initial scaffold. Significant AI-assisted contributions are disclosed here. Local Ollama integration is experimental and should only be listed if it is demonstrated working.

## Links to fill before submission

- Public GitHub repository: https://github.com/HquanhocUIT/IceGuard
- Live app: https://iceguard-icehacks-2026.phudeeptry0501.chatgpt.site
- Public demo video under three minutes: [add URL]

## Tracks

Best Deployed / Shipped App and Best Design & UX are appropriate once the live app is public. Select Best AI Hack only if the local Ollama feature is demonstrated working and the submission accurately explains that each visitor needs their own model.

# Video script, target 2:30

| Time | Screen | Narration |
| --- | --- | --- |
| 0:00–0:18 | App home, click Security risks | "Fast prototypes can hide mistakes. IceGuard gives a quick, inspectable first pass." |
| 0:18–0:45 | Findings and redacted evidence | "This case shows a committed environment value, a query worth reviewing, and a fixed port. Values resembling secrets are hidden." |
| 0:45–1:10 | Select hardcoded port, generate patch | "For an unambiguous case, we create a unified diff and re-scan the rule. The file has not been run." |
| 1:10–1:40 | Click Deployment drift, inspect both files | "Dockerfile exposes 8080, but the server listens on 3000. IceGuard shows both lines and refuses an unsafe one-file patch." |
| 1:40–1:55 | Click Clean baseline | "A matching, configurable port produces no findings in this small fixture." |
| 1:55–2:15 | Scan one real public JS repository | "For public repos, the worker reads bounded source files. If GitHub limits its API, a partial scan is labeled with unknown coverage." |
| 2:15–2:30 | README, architecture | "The checks are narrow by design. The code and limits are documented in the public repository." |

Record the real GitHub scan only after it has been tested on the device used for the recording. Keep the video public and under three minutes.
