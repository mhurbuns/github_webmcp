## Why

Phase 1 proves that a browser agent can inspect fixture code and create an issue, but the same workflow could be delivered by a remote MCP server. Phase 2 must make live, transient page state central to the collaboration so the competition demo visibly answers why WebMCP belongs in the webpage.

## What Changes

- Add an observable workspace model for the active tab, open file, file-level selection, active issue, and filters.
- Expose live workspace context through `get_workspace` and change the registered WebMCP tool surface as the human changes tabs or selects a file.
- Display the current tool count and a live tool-call feed containing invocation status, safe argument summaries, result status, and timing.
- Let agents add single-line code annotations that render in the current code viewer.
- Introduce proposed issues as editable drafts that humans can approve or dismiss before any issue is committed.
- **BREAKING**: Require `create_issue` to reference a matching approved draft; reject direct issue creation without approval.
- Keep Phase 1 read tools and the existing client-only fixture architecture; do not add persistence, authentication, a backend, GitHub API integration, or line-range selection.

## Capabilities

### New Capabilities

- `contextual-tool-surface`: Live workspace state, context-aware WebMCP registration, visible tool discovery, and an observable tool-call feed.
- `human-approved-findings`: Agent-authored code annotations and issue proposals with edit, approve, dismiss, and enforced commit behavior.

### Modified Capabilities

None. This project does not yet have archived OpenSpec capability specifications; the Phase 1 behavior affected by this change is captured as a breaking requirement in the new `human-approved-findings` capability.

## Impact

- Extends the framework-independent `RepositoryApp` snapshot and operations used by both React and WebMCP.
- Changes React tab/file navigation to update shared workspace state and adds tool-count, activity-feed, annotation, and draft-review UI.
- Reworks `src/webmcp/` registration to combine stable read tools with context-specific tools while preserving abort-controlled cleanup and feature detection.
- Changes the `create_issue` input contract and validation semantics to enforce human approval.
- Adds application, registration, lifecycle, and browser-level tests; no production dependencies or external services are required.
