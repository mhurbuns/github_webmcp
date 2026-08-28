# Native ChatGPT Site Tools Demo Runbook

This runbook rehearses and records the competition flow without requiring the presenter to know WebMCP tool names or identifiers.

## Before recording

1. Start RepoScope with `npm run dev -- --host 127.0.0.1`.
2. In the ChatGPT desktop app, enable **Browser → Permissions → Enable site tools**.
3. Use the built-in browser and open `http://127.0.0.1:5173`.
4. Use ChatGPT Work, or turn off Codex **Full access**, so the agent cannot bypass the page through a terminal or local filesystem.
5. Reload RepoScope. Reload is the reset: fixture issues return to 2 and transient findings, drafts, and activity are cleared.
6. Confirm the page says **WebMCP ready** and shows **7 tools**. Do not begin while it says unavailable, checking, or a different count.

## The 90-second run

1. Open `src/lib/session.ts` and wait for the page to show **9 tools**.
2. Send this first message:

   > Review the repository starting from the currently open file. Identify the most serious substantiated problem, show it on the relevant line, and prepare an issue proposal. Do not complete the proposed action until I approve it.

3. Watch for activity entries, an inline annotation, and a pending draft. The issue count must remain 2.
4. Review the draft. Edit and save it if useful, then click **Approve**.
5. Confirm the card says **Approved**, the issue count is still 2, and the page shows **10 tools**.
6. Send the second message:

   > Continue.

7. Confirm the page switches to Issues, shows the creation banner and the new issue, increments the issue count to 3, and returns to **7 tools**.

## Evidence to capture

Record the following for the rehearsal or submission notes:

- ChatGPT desktop app version and selected model
- Whether Full access/terminal fallback was disabled
- Discovered counts: 7 before opening a file, 9 while reviewing, 10 after approval, 7 after completion
- Ordered page activity trace
- Annotation file and line
- Proposed and created issue title
- Total elapsed time
- Console errors or warnings
- Any account, model, localhost, or experimental-browser limitation

## Recovery without implementation language

- If the page shows 0 tools, confirm Site tools is enabled, fully restart ChatGPT, and reload the page.
- If the page stays at 7 after opening a file, select another file and return, then wait for discovery to settle.
- If approval leaves the issue count at 2, that is expected. Wait for 10 tools and say **“Continue.”**
- If the agent stops again, say **“Continue with the approved action.”** Do not provide a tool name or identifier.
- If the agent uses a terminal or filesystem, stop the run, disable Full access, reload, and start a fresh conversation.
- If a run becomes inconsistent, reload the page and start again rather than editing hidden state.

## Development fallback

When native Site tools are unavailable, use the Playwright harness or a compatible Chrome build with WebMCP testing enabled. These prove registration, discovery, mutation timing, and UI behavior, but the final competition rehearsal must also record one native ChatGPT Site tools run.

## Latest automated verification

Recorded on 2026-08-28:

- TypeScript typecheck: passed
- ESLint: passed
- Vitest: 3 files, 28 tests passed
- Production build: passed, 22 modules transformed
- Playwright: 3 real-browser scenarios passed in 2.7 seconds
- Strict OpenSpec validation: passed
- Browser page console: no errors in the competition and state-revocation scenarios
- Visual evidence: approved 10-tool handoff and created 7-tool issue states captured under ignored `test-results/`
