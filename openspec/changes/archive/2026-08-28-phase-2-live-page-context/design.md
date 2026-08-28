## Context

See `proposal.md` for motivation. The current client-only app has one observable `RepositoryApp` snapshot for issues, but tab, file, and issue selection live inside React components. WebMCP registers a fixed array once at startup, and tool callbacks directly delegate to application methods. Registration already uses abort signals and verifies discovery with `document.modelContext.getTools()`.

Phase 2 crosses the application store, React UI, and experimental browser adapter. It must preserve the ordinary non-WebMCP experience, synchronous subscriber notification before mutation callbacks resolve, minimal dependencies, and deterministic fixture-backed tests.

## Goals / Non-Goals

**Goals:**

- Make current tab/file/issue context authoritative outside React so agents and humans share it.
- Reconcile the browser's registered tools safely as workspace and approval state changes.
- Make agent calls, annotations, proposals, approval, and final issue creation immediately legible in the page.
- Enforce approval below the WebMCP layer so stale or direct invocations cannot bypass it.
- Keep new behavior testable without depending exclusively on an experimental browser.

**Non-Goals:**

- Persisting workspace, findings, activities, or issues across reloads.
- Supporting multiple concurrent actionable drafts, collaborative users, authentication, or authorization roles.
- Adding line-range selection, code editing, PR workflows, a backend, or GitHub API access.
- Adding every candidate contextual tool from the competition brainstorm; Phase 2 uses the smallest surface needed for the 90-second demo.

## Decisions

### 1. Move all context that affects tools into `RepositoryApp`

Extend the immutable snapshot with:

- `workspace`: active tab, open file, active issue, and optional filters.
- `annotations`: ordered annotation records with stable IDs.
- `draft`: the single latest draft, including lifecycle status and revision.
- `activities`: a bounded newest-first list of tool calls.
- `webMcp`: integration status plus browser-verified owned tool names.

React event handlers call application commands such as `setActiveTab`, `openFile`, and `openIssue`; components no longer own duplicate selection state. Every successful command replaces the snapshot and synchronously notifies subscribers.

Alternative considered: expose React state to registration hooks. Rejected because tool callbacks would depend on component lifecycle and closures, duplicate business state, and make non-React tests harder.

### 2. Reconcile registrations by tool name instead of rebuilding everything

Split definitions into:

- Stable read tools: the six Phase 1 reads plus `get_workspace`.
- Code-context tools: `annotate_code` and `propose_issue` when Code has an open file.
- Approval-context tool: `create_issue` only for an approved, uncommitted draft.

The browser adapter owns a controller per registered tool name and subscribes to application snapshots. A serialized, revision-aware reconciliation loop compares desired and active names, aborts removed registrations, registers additions, and then calls `getTools()` to verify the latest desired set. Rapid workspace changes supersede older verification results rather than publishing stale counts. Final disposal unsubscribes and aborts every controller.

Only names owned by this adapter contribute to the displayed page-tool count, so unrelated same-origin tools cannot inflate it.

Alternative considered: abort and re-register the full surface on every state change. Rejected because stable tools would flicker, duplicate-name races become more likely, and activity would be noisier.

### 3. Keep authorization checks in application commands

Dynamic absence is a discoverability aid, not an authorization boundary. `annotateCode`, `proposeIssue`, and `createIssueFromDraft` independently validate the current workspace and draft state at execution time. This protects against a tool call already in flight while the human changes tabs or edits a draft.

`create_issue` changes from `{title, body}` to `{draftId}`. The application reads the approved stored title/body, creates one issue, and marks that draft committed in a single synchronous snapshot update. A repeated call sees `committed` and fails without creating a duplicate.

Alternative considered: retain the Phase 1 parameters and compare them with the approved draft. Rejected because it needlessly lets the agent resubmit content after approval and creates normalization edge cases.

### 4. Use a small explicit draft state machine

One draft record is retained with status:

```text
none --> pending --> approved --> committed
           |            |
           +--> dismissed
           ^            |
           +--- edit ---+
```

`propose_issue` replaces any current uncommitted draft with a new pending record. Editing increments its revision and sets pending. Approval records the approved revision. Creation succeeds only if status is approved and the approved revision equals the current revision. Dismissed and committed records remain long enough to produce deterministic retry errors but are not shown as actionable cards.

IDs and revisions use monotonic application-local counters, which are sufficient for in-memory state and deterministic tests.

### 5. Instrument tool callbacks through one wrapper

Every registered definition is wrapped at the WebMCP boundary:

1. Summarize arguments using a per-tool safe formatter.
2. Synchronously add a running activity record.
3. Execute the ordinary application callback.
4. Mark the record successful or failed with elapsed time and a bounded outcome summary.
5. Preserve the original structured result for the agent.

The feed stores no complete file contents or issue bodies. Paths, issue numbers, line numbers, severities, bounded titles/queries, field lengths, and error codes are sufficient for the visual narrative. Keep the newest 50 records.

Alternative considered: instrument inside every application operation. Rejected because UI-originated commands are not agent tool calls and should not appear in the agent activity feed.

### 6. Render findings as additions to the existing repository workspace

Keep the current primary layout and add a compact review rail/feed rather than introducing a new route. Code lines with annotations receive a severity marker; selecting or focusing the marker reveals the note. A single draft card provides editable title/body and Approve/Dismiss controls. The top integration badge includes the verified page-tool count so tab-driven changes remain visible on video.

The UI uses semantic buttons, labels, live regions for tool/draft status, keyboard-accessible controls, non-color severity text, and responsive stacking at narrow widths.

Alternative considered: auto-switch tabs or open modal dialogs on every agent action. Rejected because it wrests navigation from the human and makes concurrent tool calls disruptive.

### 7. Preserve experimental API isolation

All `document.modelContext`, registration, annotation hints, discovery, and browser error mapping remain under `src/webmcp/`. The application layer knows desired domain capabilities and integration display state but does not import browser types. Native-browser verification supplements, rather than replaces, mock-adapter and pure application tests.

## Risks / Trade-offs

- **Rapid workspace changes race asynchronous registration** → Serialize reconciliation, tag each pass with a revision, and publish only the latest verified result.
- **An agent invokes a tool just as it disappears** → Revalidate workspace and approval in application commands; return structured state errors.
- **Activity logging leaks untrusted code or issue bodies** → Use per-tool bounded summaries and never store complete payloads.
- **Hard-gating breaks the Phase 1 manual `create_issue(title, body)` test** → Update documentation and tests to demonstrate propose → approve → create with `draftId`; retain the Phase 1 tag as the old contract reference.
- **Too much UI competes with the code viewer** → Use one compact review rail, bounded feed, and responsive stacking; do not add a dashboard or new route.
- **Browser implementations differ while WebMCP evolves** → Keep ambient types and lifecycle code isolated, feature-detect, and report unavailable/failed status without affecting normal UI.
- **Single-draft replacement can discard an uncommitted proposal** → Make replacement visible in the feed and accept it as an intentional milestone constraint.

## Migration Plan

1. Extend domain types and `RepositoryApp` while preserving Phase 1 reads and fixture issues.
2. Move current React tab/file/issue selection into shared workspace commands.
3. Add finding and draft UI against application state before exposing new WebMCP tools.
4. Split and instrument tool definitions, then replace one-shot registration with reconciliation.
5. Change `create_issue` to the approved-draft contract and update automated/manual test instructions.
6. Run static checks, application tests, adapter tests, and a real-browser demo from a clean reload.

Rollback is a revert to the tagged Phase 1 implementation. No persisted data or server migration is involved.
