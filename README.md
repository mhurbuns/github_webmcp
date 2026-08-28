# WebMCP Repository Playground

A small React and TypeScript repository explorer built to test agent-to-page workflows through WebMCP. Phase 2 adds live workspace context, dynamic tool discovery, visible agent activity, and human-approved issue creation. Data remains local and in memory; there is no backend or GitHub API integration.

## Run locally

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

## WebMCP browser setup

The app uses the current experimental `document.modelContext.registerTool()` API, unregisters each tool with its registration `AbortSignal`, and verifies every contextual update through `document.modelContext.getTools()`. When that API is absent, the repository UI remains usable and displays an unavailable status.

At the time of implementation, Chrome documents local testing through `chrome://flags/#enable-webmcp-testing`. WebMCP also requires a secure, origin-isolated context and permission to use the `tools` Permissions Policy.

The browser surface is isolated under `src/webmcp/`. Reloading resets issues, workspace, findings, and activity because the demo is intentionally in-memory.

## Competition demo

1. Open the app in ChatGPT's built-in browser with Site tools enabled and terminal/filesystem fallback disabled. After a reload, the status shows 7 tools.
2. Open `src/lib/session.ts`. The status changes to 9 tools because the live file enables relevant review capabilities.
3. Give the browser agent this canonical prompt:

   > Review the repository starting from the currently open file. Identify the most serious substantiated problem, show it on the relevant line, and prepare an issue proposal. Do not complete the proposed action until I approve it.

4. Confirm the agent activity feed updates, a single-line annotation appears, and a pending draft appears without changing the issue count.
5. Edit or approve the draft. Approval leaves the issue count unchanged, changes the tool count to 10, and tells you what to say next.
6. Tell the agent: **Continue.** The issue appears immediately, the page switches to it, and discovery returns to 7 tools.

See [docs/DEMO_RUNBOOK.md](docs/DEMO_RUNBOOK.md) for setup, reset, evidence capture, and recovery guidance.

To inspect or manually execute the experimental surface from DevTools, pass a JSON string to the currently documented Chrome `executeTool()` form:

```js
const tools = await document.modelContext.getTools();
const tool = tools.find(({ name }) => name === "get_workspace");
const raw = await document.modelContext.executeTool(tool, JSON.stringify({}));
JSON.parse(raw);
```

At the machine boundary, direct issue content is intentionally rejected. A pending draft must be approved in the page, and only its exact machine-facing proposal reference can be committed. People never need to know that reference.
