# WebMCP Repository Playground

A small React and TypeScript repository explorer built to test agent-to-page workflows through WebMCP. Milestone 1 uses local fixture data and in-memory issues; it has no backend or GitHub API integration.

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
npm run build
```

## WebMCP browser setup

The app uses the current experimental `document.modelContext.registerTool()` API and verifies registration through `document.modelContext.getTools()`. When that API is absent, the repository UI remains usable and displays an unavailable status.

At the time of implementation, Chrome documents local testing through `chrome://flags/#enable-webmcp-testing`. WebMCP also requires a secure, origin-isolated context and permission to use the `tools` Permissions Policy.

The browser surface is isolated under `src/webmcp/`. Reloading the page resets issues because milestone 1 is intentionally in-memory.
