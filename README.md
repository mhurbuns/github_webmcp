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

## Phase 2 manual demo

1. Open the app in a compatible Chrome build. With no file open, the status shows 7 stable tools.
2. Open `src/lib/session.ts`. The status changes to 9 tools because `annotate_code` and `propose_issue` are now relevant to the live page.
3. Give the browser agent this canonical prompt:

   > I’m looking at this login code — find the worst problem, show it on the page, and only file it if I approve.

4. Confirm the agent activity feed updates, a single-line annotation appears, and a pending draft appears without changing the issue count.
5. Edit or approve the draft. Approval makes `create_issue` discoverable and changes the count to 10.
6. Let the agent call `create_issue` with the approved `draftId`. The issue appears immediately, the page switches to it, and discovery returns to 7 tools.

To inspect or manually execute the experimental surface from DevTools, pass a JSON string to the currently documented Chrome `executeTool()` form:

```js
const tools = await document.modelContext.getTools();
const tool = tools.find(({ name }) => name === "get_workspace");
const raw = await document.modelContext.executeTool(tool, JSON.stringify({}));
JSON.parse(raw);
```

Direct `create_issue(title, body)` calls are intentionally rejected. A pending draft must be approved in the page, and the tool accepts only `{ draftId }`.
