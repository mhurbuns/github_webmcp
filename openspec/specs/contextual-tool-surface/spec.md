# contextual-tool-surface Specification

## Purpose

Make the agent's available capabilities and observable activity reflect the transient repository workspace that the human is currently using in the browser.

## Requirements

### Requirement: Workspace context is shared application state
The system SHALL maintain an observable workspace containing the active repository tab, open file when the Code tab is active, active issue when the Issues tab is active, and any active file-level selection or filter. The React UI and WebMCP tools MUST read and update the same workspace state.

#### Scenario: Human opens a repository file
- **WHEN** the human selects a file in the Code tab
- **THEN** the workspace reports the Code tab and exact repository-relative file path
- **AND** `get_workspace` returns that state without scraping the DOM

#### Scenario: Human switches to issues
- **WHEN** the human activates the Issues tab and opens an issue
- **THEN** the workspace reports the Issues tab and active issue number
- **AND** stale Code-tab selection state is not presented as current context

### Requirement: Stable read tools remain available
The system SHALL keep the Phase 1 read-only tools `get_repo_info`, `list_files`, `read_file`, `search_code`, `list_issues`, and `get_issue` registered whenever WebMCP is supported. The system SHALL also register the read-only `get_workspace` tool for live page context.

#### Scenario: Agent discovers base capabilities
- **WHEN** a compatible browser agent discovers tools on either repository tab
- **THEN** all seven stable read-only tools are present
- **AND** each is annotated as read-only and as returning untrusted application content where applicable

### Requirement: Context-specific tools follow live workspace state
The system SHALL register `annotate_code` and `propose_issue` only while the Code tab has an open file. The system SHALL register `create_issue` only while an approved, uncommitted issue draft exists. Context-specific tools MUST be removed when their enabling state no longer applies.

#### Scenario: Code tools appear for an open file
- **WHEN** the human opens a file on the Code tab
- **THEN** discovery includes `annotate_code` and `propose_issue`
- **AND** the page's displayed tool count reflects the discovered tool set

#### Scenario: Code tools disappear on the Issues tab
- **WHEN** the human switches from an open file to the Issues tab
- **THEN** discovery no longer includes `annotate_code` or `propose_issue`
- **AND** the visible tool count decreases after registration settles

#### Scenario: Commit capability follows approval state
- **WHEN** the human approves a pending issue draft
- **THEN** discovery includes `create_issue`
- **AND WHEN** that draft is dismissed, edited, or committed
- **THEN** discovery no longer includes `create_issue`

### Requirement: Registration changes are lifecycle-safe
The system MUST update context-specific registrations without duplicate tool names, leaked callbacks, or stale registrations. Unsupported WebMCP environments SHALL keep the normal repository UI usable.

#### Scenario: Workspace changes repeatedly
- **WHEN** the human repeatedly switches tabs and files
- **THEN** discovery contains each enabled tool exactly once
- **AND** tools disabled by the latest workspace state are absent

#### Scenario: WebMCP is unavailable
- **WHEN** `document.modelContext` is unavailable or registration fails
- **THEN** the page reports the integration status without crashing
- **AND** ordinary file and issue navigation remains usable

### Requirement: Tool activity is visible on the page
The system SHALL record each WebMCP invocation in an in-memory activity feed with a unique identifier, tool name, safe argument summary, start time, status, duration when complete, and success or structured failure outcome. The feed SHALL visibly update as calls begin and settle.

#### Scenario: Tool call succeeds
- **WHEN** an agent invokes a registered tool
- **THEN** a running feed entry appears before the tool callback resolves
- **AND** the same entry changes to successful with elapsed time after the result is available

#### Scenario: Tool call fails validation
- **WHEN** a tool returns a structured validation or state error
- **THEN** its feed entry changes to failed and shows an actionable summary
- **AND** the application remains ready for later tool calls

#### Scenario: Untrusted or lengthy values are recorded
- **WHEN** tool arguments or results contain repository contents, issue text, or long values
- **THEN** the feed stores and displays a bounded summary rather than complete sensitive or untrusted payloads

### Requirement: Browser discovery verifies the active surface
After each registration update, the system SHALL verify the active expected tool names through `document.modelContext.getTools()` and SHALL expose the verified count to the UI.

#### Scenario: Browser registry differs from expected surface
- **WHEN** browser discovery omits an expected active tool
- **THEN** the integration reports a failed verification state
- **AND** it does not claim the missing tool in the visible count
