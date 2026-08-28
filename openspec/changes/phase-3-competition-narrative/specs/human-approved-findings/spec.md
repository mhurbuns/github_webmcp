## MODIFIED Requirements

### Requirement: Humans control the draft lifecycle
The UI SHALL let the human edit, approve, or dismiss the active draft. Editing an approved draft MUST return it to pending status so the changed content requires new approval. Approval MUST NOT itself create an issue. The approved state SHALL explain the next action in ordinary human language and MUST NOT require the human to know or supply WebMCP tool names, schemas, or draft identifiers.

#### Scenario: Human edits a pending draft
- **WHEN** the human changes the draft title or body
- **THEN** the updated content remains pending and no issue is created

#### Scenario: Human approves a draft
- **WHEN** the human approves a valid pending draft
- **THEN** the draft status becomes approved
- **AND** the repository issue count remains unchanged
- **AND** the UI tells the human to ask the agent to continue without naming a tool or identifier
- **AND** the context-specific `create_issue` tool becomes discoverable to the agent

#### Scenario: Human edits an approved draft
- **WHEN** the human modifies the title or body of an approved draft
- **THEN** its status returns to pending
- **AND** `create_issue` is removed from discovery

#### Scenario: Human dismisses a draft
- **WHEN** the human dismisses a pending or approved draft
- **THEN** the draft becomes non-actionable and is removed from the review surface
- **AND** no issue is created

### Requirement: Issue creation requires matching approval
The `create_issue` tool MUST accept an approved draft identifier and MUST reject calls when the draft is absent, pending, dismissed, already committed, or does not match that identifier. It SHALL use the approved draft's stored title and body rather than accepting replacement issue content from the agent. The proposal result and approval-gated tool contract SHALL provide sufficient machine-facing context for a compatible agent that created the proposal to complete it after an ordinary continuation request; the human MUST NOT be required to provide the identifier or name the tool.

#### Scenario: Agent commits an approved draft
- **WHEN** the agent calls `create_issue` with the identifier of the current approved draft
- **THEN** the application creates exactly one open issue from the approved title and body
- **AND** marks the draft committed before the callback resolves
- **AND** increments the issue count, displays the creation banner, and exposes the new issue in existing issue tools

#### Scenario: Human asks the agent to continue after approval
- **WHEN** the same agent context proposed a draft, the human approves it, and the human says only “Continue”
- **THEN** a compatible agent can discover the approval-gated capability and supply the proposal reference it previously received
- **AND** the human is not asked for a tool name, schema argument, or draft identifier

#### Scenario: Agent attempts direct issue creation
- **WHEN** the agent calls `create_issue` without an approved current draft identifier
- **THEN** the tool returns a structured state error explaining that human approval is required
- **AND** repository issue state is unchanged

#### Scenario: Agent retries a committed draft
- **WHEN** the agent calls `create_issue` again with a draft that has already been committed
- **THEN** the tool rejects the call
- **AND** no duplicate issue is created
