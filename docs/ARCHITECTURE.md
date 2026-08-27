# Architecture

## Milestone 1
Use a client-only React + TypeScript application with fixture data and in-memory state.

```text
Browser
├── React UI
│   ├── Repo header
│   ├── File tree / code viewer
│   └── Issues UI
│
├── Application layer
│   ├── repositoryService
│   └── issueService / store
│
├── WebMCP adapter
│   ├── tool definitions
│   ├── registration lifecycle
│   └── result/error mapping
│
└── Fixture data
    ├── repository metadata
    ├── files
    └── initial issues
```

## Suggested source layout

```text
src/
├── app/
│   └── App.tsx
├── components/
│   ├── RepoHeader.tsx
│   ├── RepoTabs.tsx
│   ├── FileTree.tsx
│   ├── CodeViewer.tsx
│   └── IssuesView.tsx
├── data/
│   └── fixtureRepo.ts
├── domain/
│   ├── repository.ts
│   └── issue.ts
├── services/
│   ├── repositoryService.ts
│   └── issueService.ts
├── webmcp/
│   ├── registerTools.ts
│   ├── toolSchemas.ts
│   └── types.ts
└── main.tsx
```

Adjust this if implementation reality suggests a simpler shape.

## State
For milestone 1:
- Repository/file data may be immutable fixture data.
- Issues should be mutable in-memory React/application state.
- `create_issue` must update the same state observed by the Issues UI.

Avoid Redux/global state libraries unless needed. React context or a small external store is acceptable only if it materially simplifies sharing state between the UI and WebMCP adapter.

### Implemented state boundary

`RepositoryApp` is a small framework-independent observable store. React reads it with `useSyncExternalStore`, while WebMCP callbacks invoke the same methods directly. Issue creation commits a new immutable snapshot and synchronously notifies subscribers before the tool callback resolves.

The experimental browser surface is isolated under `src/webmcp/`. It uses `document.modelContext.registerTool()` with abort-controlled registration and verifies browser-visible discovery with `document.modelContext.getTools()`. The ordinary React application remains usable when this API is unavailable.

## Service boundary
WebMCP callbacks should not directly manipulate React DOM or components.

Prefer:

```text
WebMCP tool
   -> application/service function
      -> state/store
         -> React observes update
```

This lets a future GitHub API implementation replace fixture-backed services without changing the tool contract unnecessarily.

## Tool contract principles
- Names should describe meaningful capabilities, not UI gestures.
- Inputs should be explicit and schema-validatable.
- Results should be concise but contain enough information for agent reasoning.
- Errors should be actionable and structured where possible.
- Do not expose unnecessary data.
- State-changing tools should be clearly distinguishable.

## Potential future GitHub integration
If real GitHub data is later useful:

```text
AI agent
  -> WebMCP tool
    -> application service
      -> backend/auth boundary if needed
        -> GitHub API
```

Do not make the WebMCP adapter itself a GitHub API client.

## Testing
At minimum test the pure application/service functions:
- listing files
- reading valid/invalid paths
- searching code
- listing/getting issues
- creating issues

Where feasible, add a lightweight test around WebMCP tool registration/mapping using a mock browser interface.

## Browser compatibility
WebMCP is experimental/evolving. Feature-detect it and make the ordinary React application usable when the API is unavailable. Display a small developer/demo indicator if useful, but do not let unsupported WebMCP crash the app.
