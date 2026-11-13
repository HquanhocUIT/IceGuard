# IceGuard test cases

All three built-in cases pass through the same `/api/scan` rules used for public GitHub repositories. They contain only synthetic source. Open the links to run each case in the public app.

| Case | Link | Expected result | What it demonstrates |
| --- | --- | --- | --- |
| Security risks | [Open](https://iceguard-icehacks-2026.phudeeptry0501.chatgpt.site/?case=security) | 3 findings: committed environment value, interpolated SQL query, hardcoded server port | Secret value is redacted. The port rule offers a unified diff and verifies that its own rule no longer matches. |
| Deployment drift | [Open](https://iceguard-icehacks-2026.phudeeptry0501.chatgpt.site/?case=deploy) | 2 findings: Docker port contract mismatch and hardcoded server port | Evidence shows `EXPOSE 8080` and `app.listen(3000)`. Auto-patch is withheld because a one-file change could leave a broken configuration. |
| Clean baseline | [Open](https://iceguard-icehacks-2026.phudeeptry0501.chatgpt.site/?case=clean) | 0 findings | `EXPOSE 8080` and `app.listen(process.env.PORT || 8080)` are consistent in this small fixture. This is not a security certification. |

Run `node --test` for automated checks. The suite also covers matching ports, dynamic listeners, multiple exposed ports, an unknown test case, a forged patch request, credential redaction, invalid GitHub hosts, and the GitHub API quota fallback. The fallback labels repository coverage unknown and withholds the readiness score.

Patch verification means only that the relevant detection rule no longer matches the modified file. IceGuard does not execute code or run the target repository's test suite.
