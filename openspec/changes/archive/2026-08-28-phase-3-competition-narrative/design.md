## Context

Phase 2 already implements the secure state machine and dynamic WebMCP surface: proposal returns a draft reference, human approval exposes `create_issue`, and committing requires the exact approved revision. A native ChatGPT Site tools run verified that flow but also exposed an expectation gap: clicking Approve leaves the issue count unchanged, and our recovery guidance made the human aware of the tool name and `draftId`.

This change crosses UI copy, WebMCP metadata/results, tests, and the competition runbook, but it does not require a new state model. WebMCP remains experimental, compatible agents choose when to invoke tools, and a page cannot assume that a browser agent will autonomously resume when a human clicks an in-page control.

## Goals / Non-Goals

**Goals:**

- Make the approval handoff obvious using ordinary language.
- Give the agent enough machine-facing continuity to act after “Approved.”
- Preserve exact-revision authorization and duplicate protection.
- Make one clean native Site tools demonstration repeatable in 90 seconds.
- Ensure the recorded story demonstrates page tools rather than terminal or filesystem access.

**Non-Goals:**

- Automatically creating an issue when the human clicks Approve.
- Automatically waking or driving a browser agent from page state changes.
- Removing the draft identifier from the machine contract.
- Adding persistence, authentication, GitHub APIs, a backend, or more repository features.
- Guaranteeing a particular model's discretionary tool choice outside a documented compatibility run.

## Decisions

### Keep approval and commit as two distinct actions

Approve changes the draft state and exposes the commit capability; it does not create the issue. The approved card will use concise copy such as “Approval recorded. Tell the agent ‘Approved’ to complete this action.” This preserves a visible human checkpoint and accurately sets expectations.

Alternative considered: commit immediately on Approve. Rejected because it collapses the agent/human handoff, weakens the WebMCP demonstration, and changes approval from authorization into execution.

### Hide implementation details from humans, not from the machine contract

The exact draft identifier remains required by `create_issue`. `propose_issue` already returns the created draft, and the approval-gated tool description/schema can tell the agent to use that returned reference. Human-facing copy, canonical prompts, and runbook steps will never instruct a person to name `create_issue` or provide `draftId`.

Alternative considered: make `create_issue` argumentless and implicitly commit the current approved draft. Rejected because an explicit reference better protects against stale context, retries, and future expansion beyond one draft while costing the agent nothing when it retains its own prior result.

### Treat “Approved” as the canonical second human turn

The demonstration uses two human utterances: a natural review request and, after approval, “Approved.” Tests will assert that neither utterance contains tool names or identifiers. The browser harness will model the agent's resulting discovery and invocation, while the native ChatGPT checklist verifies actual model behavior separately.

Alternative considered: say only “Continue.” A native ChatGPT rehearsal showed that this was too ambiguous: the agent reused stale pending state instead of rediscovering the approved capability. “Approved” succeeded while remaining natural and implementation-free. “Create the approved issue” remains unnecessary recovery language.

### Make the UI explain state, not WebMCP mechanics

Pending, approved, and committed states will describe what has happened and what the human can do next. Accessibility text will announce the approved transition. The existing header count and activity feed remain the technical proof; the review card will not explain schemas or identifiers.

Alternative considered: add a WebMCP tutorial panel. Rejected because it adds visual noise and makes the competition story feel like developer tooling rather than a product interaction.

### Use reload as the demo reset boundary

Transient fixture state already resets on reload. The runbook will make reload, Code-tab/file selection, tool-count readiness, Site tools enablement, and Full access/terminal avoidance explicit. No new reset control or persistence mechanism is needed.

Alternative considered: add a dedicated Reset demo button. Rejected for now because reload is deterministic, visible setup occurs before recording, and another control does not improve the core agent-page collaboration.

### Verify at three levels

- Pure/component tests validate status copy, escaping, and unchanged approval semantics.
- Adapter/browser tests validate the 7 → 9 → 10 → 7 tool lifecycle, proposal-reference continuity, and immediate issue rendering.
- A manual native ChatGPT Site tools checklist records app version/model, discovered tools, natural-language transcript, and visible outcome. It explicitly disables or forbids terminal/filesystem fallback for the competition run.

## Risks / Trade-offs

- **A compatible model may retain stale pending state after the first turn.** → Use the explicit confirmation “Approved,” strengthen machine-facing tool descriptions/results, test the target model before recording, and document the natural recovery phrase “The proposal is approved” without exposing internals.
- **Dynamic registration may settle after the human's next message.** → Keep visible verified tool count, wait for 10 tools in the runbook, and retain serialized discovery verification.
- **Codex Full access can bypass WebMCP through the terminal.** → Use ChatGPT Work or disable Full access; canonical instructions explicitly forbid terminal/filesystem inspection.
- **Native Site tools availability depends on account, model, and desktop build.** → Preserve Chrome/harness checks for development and capture the known-good native environment before recording.
- **More explanatory copy could clutter the review card.** → Limit changes to one short status sentence and accessible announcement; do not add a tutorial surface.

## Migration Plan

1. Update the existing approved-state presentation and tool metadata without changing stored draft or issue shapes.
2. Extend tests before changing documentation so the natural-language contract is executable.
3. Update the competition runbook and canonical prompts from the verified behavior.
4. Run static checks, unit/component tests, Playwright, and one native ChatGPT Site tools rehearsal.

Rollback is limited to reverting copy, metadata, tests, and documentation; no persisted data or API migration is involved.
