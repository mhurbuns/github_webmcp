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

### Implemented Phase 2 state

`RepositoryApp` now owns one immutable observable snapshot containing:

- live workspace context as a discriminated Code/Issues state
- fixture issues and the last created issue
- single-line annotations
- one current issue draft with pending, approved, dismissed, or committed status
- the newest 50 safe tool-activity summaries
- browser-verified WebMCP status and owned tool names

React has no duplicate tab, file, issue, or filter state. Human handlers and WebMCP callbacks invoke the same synchronous application commands. Successful mutations replace the snapshot and notify all subscribers before returning.

## Phase 2 contextual registration

```text
7 stable tools
├── get_repo_info, list_files, read_file, search_code
├── list_issues, get_issue
└── get_workspace

+ Code tab with open file
├── annotate_code
└── propose_issue

+ current approved revision
└── create_issue
```

The browser adapter reconciles registrations by owned tool name with one `AbortController` per tool. Reconciliation is serialized and revision-aware so rapid workspace changes cannot publish stale verification. After each changed surface it calls `getTools()`, filters to adapter-owned names, and publishes the actual count. Registration, discovery, execution instrumentation, and browser ambient types remain under `src/webmcp/`.

Dynamic absence is not authorization. `RepositoryApp` revalidates live file context and draft approval at execution time. `createIssueFromDraft({ draftId })` reads the approved stored title/body and commits the issue plus draft status in one notification, preventing content substitution and duplicate retries.

## Phase 3 approval handoff

The authorization boundary is unchanged. `propose_issue` returns a machine-facing continuation reference alongside the draft, and the approval-gated tool contract tells the agent to reuse that reference after the human confirms approval. The React review card exposes only human state and the instruction “Tell the agent ‘Approved’”; it does not render tool names, schema fields, or identifiers.

Clicking Approve publishes the approved revision and triggers contextual registration, but does not create an issue or attempt to wake an agent. Browser hosts are not required to resume a completed model turn when `toolchange` fires. The second natural-language turn gives the browser agent a reliable opportunity to rediscover the 10-tool surface and complete the exact approved proposal.

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

Verification includes pure application tests, server-rendered UI escaping and handoff tests, mocked adapter lifecycle tests, and a Playwright Chrome flow with a page-local `document.modelContext` harness. The browser flow verifies `getTools()` at each transition, proposal-reference continuity, the two natural human turns, visible approval, immediate issue rendering, edit/dismiss revocation, narrow-width navigation, and a clean console. Native Site tools still require a compatible account, model, and browser build because the API is experimental.

## Browser compatibility
WebMCP is experimental/evolving. Feature-detect it and make the ordinary React application usable when the API is unavailable. Display a small developer/demo indicator if useful, but do not let unsupported WebMCP crash the app.
