# human-approved-findings Specification

## Purpose

Let an agent place review findings directly into the live code workspace while preserving explicit human control over whether a proposed issue becomes committed application state.

## Requirements

### Requirement: Agents can annotate the open file
The `annotate_code` tool SHALL add an annotation to one valid line of the currently open file. An annotation MUST contain a severity, concise note, file path, and one-based line number, and MUST become visible in the code viewer before the callback resolves.

#### Scenario: Agent adds a valid annotation
- **WHEN** the Code tab is active, a file is open, and the agent annotates a line within that file
- **THEN** the matching code line receives a visible severity marker and note
- **AND** the application notifies React subscribers before the tool result resolves

#### Scenario: Agent targets stale workspace context
- **WHEN** the requested path is not the currently open file or the requested line is outside that file
- **THEN** the tool returns a structured state or validation error
- **AND** no annotation is created

### Requirement: Agents propose issues without committing them
The `propose_issue` tool SHALL create or replace one active pending draft containing a title, body, source file, and related annotation identifiers. Creating a proposal MUST NOT increment the repository issue count or add an issue.

#### Scenario: Agent proposes a finding
- **WHEN** the agent submits a valid proposal for the currently open file
- **THEN** a pending draft card appears with editable title and body
- **AND** the repository issue list and count remain unchanged

#### Scenario: Agent proposes another finding while one is pending
- **WHEN** an uncommitted draft already exists and the agent submits a new proposal
- **THEN** the system replaces the active pending draft with the new proposal
- **AND** does not retain a second simultaneously actionable draft

### Requirement: Humans control the draft lifecycle
The UI SHALL let the human edit, approve, or dismiss the active draft. Editing an approved draft MUST return it to pending status so the changed content requires new approval.

#### Scenario: Human edits a pending draft
- **WHEN** the human changes the draft title or body
- **THEN** the updated content remains pending and no issue is created

#### Scenario: Human approves a draft
- **WHEN** the human approves a valid pending draft
- **THEN** the draft status becomes approved
- **AND** the context-specific `create_issue` tool becomes discoverable

#### Scenario: Human edits an approved draft
- **WHEN** the human modifies the title or body of an approved draft
- **THEN** its status returns to pending
- **AND** `create_issue` is removed from discovery

#### Scenario: Human dismisses a draft
- **WHEN** the human dismisses a pending or approved draft
- **THEN** the draft becomes non-actionable and is removed from the review surface
- **AND** no issue is created

### Requirement: Issue creation requires matching approval
The `create_issue` tool MUST accept an approved draft identifier and MUST reject calls when the draft is absent, pending, dismissed, already committed, or does not match that identifier. It SHALL use the approved draft's stored title and body rather than accepting replacement issue content from the agent.

#### Scenario: Agent commits an approved draft
- **WHEN** the agent calls `create_issue` with the identifier of the current approved draft
- **THEN** the application creates exactly one open issue from the approved title and body
- **AND** marks the draft committed before the callback resolves
- **AND** increments the issue count, displays the creation banner, and exposes the new issue in existing issue tools

#### Scenario: Agent attempts direct issue creation
- **WHEN** the agent calls `create_issue` without an approved current draft identifier
- **THEN** the tool returns a structured state error explaining that human approval is required
- **AND** repository issue state is unchanged

#### Scenario: Agent retries a committed draft
- **WHEN** the agent calls `create_issue` again with a draft that has already been committed
- **THEN** the tool rejects the call
- **AND** no duplicate issue is created

### Requirement: Finding state is in-memory and shared
Annotations and drafts SHALL live in the same observable client-side application state as issues and workspace context. Reloading the page MAY reset them, and the UI SHALL make no persistence claim.

#### Scenario: UI observes agent mutation
- **WHEN** a WebMCP callback creates an annotation or draft
- **THEN** React subscribers observe the updated snapshot before the callback resolves

#### Scenario: Page reloads
- **WHEN** the browser reloads the application
- **THEN** fixture issues return to their initial state and transient findings are cleared
