# Devpost draft

## Project title

IceGuard — Audit before you ship

## One sentence

IceGuard turns a public JavaScript or TypeScript repository into a short, evidence-backed list of issues and a reviewable patch for supported deployment mistakes.

## Inspiration

Fast prototypes can hide security and deployment mistakes. We wanted a fast, accessible first pass that shows exactly why a finding was raised, without claiming to certify a repository as secure.

## What it does

Paste a public GitHub repository URL or run the built-in fixture. IceGuard reads selected source files, flags four narrow patterns, shows the file and line for each result, and reports scan coverage. For a hardcoded server port, it generates a unified diff using the PORT environment variable and re-runs the rule on the modified content. Visitors running Ollama on their own device may request an optional AI explanation of one selected finding. That explanation is explicitly unverified.

## How we built it

The app is one Cloudflare Worker serving a browser interface and a small API. The API allows only public GitHub repository URLs and reads repository metadata, a file tree, and bounded source blobs from the GitHub API. Deterministic rules produce findings. The patcher applies one constrained rewrite and verifies it by re-scanning. The interface uses plain HTML, CSS, and JavaScript, with no client framework. A build script embeds the page in the Worker.

## Challenges

We chose limited, inspectable checks rather than making broad security claims. GitHub's unauthenticated API rate limit can affect arbitrary repository scans, so a labeled built-in fixture is available for a reliable demo. Local AI is optional because a model on one computer cannot serve every public visitor.

## What we learned

Coverage, evidence, and honest confidence labels matter as much as a polished score. A patch is useful only when its verification scope is stated clearly.

## What's next

Add tested dependency advisory checks, stronger parsing for SQL data flow, a hosted inference option, and isolated test execution for proposed patches.

## Built with

JavaScript, Cloudflare Workers, GitHub REST API, Sites hosting, optional local Ollama API, and AI-assisted coding. Sites Worker ESM starter was used as the initial scaffold. Significant AI-assisted contributions are disclosed here.

## Links to fill before submission

- Public GitHub repository: [add URL]
- Live app: [add URL]
- Public demo video under three minutes: [add URL]

## Tracks

Best Deployed / Shipped App and Best Design & UX are appropriate once the live app is public. Select Best AI Hack only if the local Ollama feature is demonstrated working and the submission accurately explains that each visitor needs their own model.

# Video script, target 2:30

| Time | Screen | Narration |
| --- | --- | --- |
| 0:00–0:18 | App home, click built-in demo | "Fast prototypes can hide mistakes. IceGuard gives a quick, inspectable first pass." |
| 0:18–0:50 | Findings and coverage | "The demo fixture is labeled. Here are three issues with file, line, severity, confidence, and source evidence." |
| 0:50–1:20 | Select hardcoded port, generate patch | "This rule supports a constrained fix. We generate a unified diff and re-scan the modified file. The test suite has not been run." |
| 1:20–1:55 | Scan one real public JS repository | "For public repositories, the worker fetches bounded source files directly from GitHub. Coverage shows how much was included." |
| 1:55–2:15 | Optional Ollama, if available | "A visitor can ask their own local model to review a selected finding. The answer is clearly marked as unverified." |
| 2:15–2:30 | README, architecture | "The checks are narrow by design. The code and limits are documented in the public repository." |

Record the real GitHub scan and local AI segment only after they have both been tested on the device used for the recording. Keep the video public and under three minutes.
