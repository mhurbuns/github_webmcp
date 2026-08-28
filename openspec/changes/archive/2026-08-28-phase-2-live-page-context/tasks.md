## 1. Shared application state

- [x] 1.1 Extend the repository application snapshot and domain types with workspace context, line annotations, issue-draft state, tool activity, and WebMCP integration status. Verify with focused type-level/unit tests covering initial state and immutable snapshots.
- [x] 1.2 Add repository application commands for changing the active tab, open file, active issue, and issue filters, and migrate existing UI selection state to those commands. Verify that both commands and UI interactions publish exactly one subscriber update with the expected workspace snapshot.
- [x] 1.3 Add application commands for annotating the currently open file, proposing an issue draft, editing it, approving it, and dismissing it, including path/line validation and monotonic IDs/revisions. Verify every allowed and rejected draft-state transition with unit tests.
- [x] 1.4 Replace unrestricted issue creation with an application-level command that accepts an approved draft ID, commits that draft exactly once, and notifies subscribers before returning. Verify rejection of missing, stale, pending, dismissed, and already committed drafts, plus notification ordering and idempotent failure behavior.
- [x] 1.5 Add bounded tool-activity recording commands and safe argument/outcome summarizers that never retain repository file contents or issue bodies. Verify running, succeeded, and failed entries, unique IDs, duration capture, maximum history length, and content redaction with unit tests.

## 2. Context-aware human interface

- [x] 2.1 Render the active tab, open file, active issue, and issue filters entirely from the shared repository application snapshot while preserving the existing Code and Issues workflows. Verify with component tests and a manual navigation pass in a browser without WebMCP support.
- [x] 2.2 Add single-line annotation markers and a compact findings view for the open file, including severity and note text treated as untrusted content. Verify valid markers render on the correct line, stale-file annotations are not accepted, and text is rendered without HTML interpretation.
- [x] 2.3 Add an editable issue-draft review card with explicit Approve and Dismiss actions, clear pending/approved/committed states, and an approval reset after edits. Verify the issue count does not change before creation and each UI action produces the specified draft transition.
- [x] 2.4 Add a compact WebMCP status area showing the currently discovered tool count and a bounded activity feed with running/success/failure states. Verify tool calls become visible before completion, feed entries remain readable at narrow widths, and controls/status changes are keyboard and screen-reader accessible.

## 3. Isolated WebMCP adapter

- [x] 3.1 Define stable and contextual WebMCP tool factories inside the browser adapter for `get_workspace`, `annotate_code`, and `propose_issue`, and update `create_issue` to accept only an approved `draftId`. Verify exact input schemas, safe descriptions, untrusted-input handling, and read-only versus mutating annotations with adapter tests.
- [x] 3.2 Wrap every WebMCP execute callback with shared activity instrumentation that records a running entry before business logic and finalizes it on success or structured failure. Verify callback results remain protocol-compatible and neither arguments nor outcomes leak full file or issue content into the feed.
- [x] 3.3 Implement a serialized, revision-aware registration reconciler that keeps stable tools registered, adds or removes contextual tools from repository application state, and owns cleanup by tool name. Verify rapid tab/file/draft transitions cannot leave stale registrations or duplicate tools.
- [x] 3.4 After each registration reconciliation, call `document.modelContext.getTools()` to verify the expected owned tool names and publish the actual discovered count/status into shared application state. Verify discovery mismatches and unsupported/failed browser APIs degrade visibly without breaking normal UI use.
- [x] 3.5 Wire adapter startup, repository application subscription, reconciliation, and teardown through the existing application boundary without placing browser API calls in domain or React components. Verify remount/cleanup behavior leaves no duplicate registrations or subscriptions.

## 4. End-to-end verification and documentation

- [x] 4.1 Update existing tests and manual verification helpers for the breaking `create_issue` contract and the human-approval workflow. Verify no test or documented command can create an issue without an approved draft.
- [x] 4.2 Add a real-browser end-to-end test that discovers the stable tools, opens a file through normal UI state, observes contextual tool discovery, records an annotation, proposes and approves a draft, creates the issue, and observes the committed issue and tool removal immediately in the UI. Verify discovery at each transition with `document.modelContext.getTools()` and preserve a tool trace for the canonical demo.
- [x] 4.3 Run the complete typecheck, lint, unit/component test, browser test, and production build suite, fixing only Phase 2 regressions. Verify every command exits successfully and record any browser/WebMCP limitations encountered.
- [x] 4.4 Update the product, architecture, WebMCP, and competition documentation to describe the shared workspace model, contextual discovery, approval boundary, activity feed, experimental-adapter isolation, and revised canonical demo. Verify documented tool names/contracts and acceptance criteria match the implemented behavior.
