## 1. Lock the Human-Facing Contract

- [x] 1.1 Add component tests proving Approve leaves the issue count unchanged, displays an approved state, and gives a natural-language continuation cue; verify the tests fail before the UI change and contain no human-facing `create_issue` or `draftId` instruction.
- [x] 1.2 Add adapter contract tests proving `propose_issue` returns the proposal reference and the approval-gated tool schema/description gives the agent enough context to reuse it; verify exact-revision, missing-approval, and duplicate-commit tests remain covered.

## 2. Implement the Approval Handoff

- [x] 2.1 Update the review card's approved-state copy and accessible announcement to tell the human to ask the agent to continue, and verify the focused component tests pass without exposing tool names or identifiers in UI instructions.
- [x] 2.2 Refine `propose_issue` results and approval-gated tool metadata inside the WebMCP adapter so the machine-facing reference and intended continuation are explicit, and verify adapter tests pass without changing the application authorization API.

## 3. Prove the Natural-Language End-to-End Flow

- [x] 3.1 Update the Playwright competition scenario to model a natural review request, proposal, human approval, and the single follow-up “Continue”; verify discovery transitions 7 → 9 → 10 → 7 and the human messages contain no tool names, schemas, or identifiers.
- [x] 3.2 Verify the approved continuation creates exactly one issue, switches to its Issues detail before the callback resolves, and rejects a retry; confirm the activity feed and browser console remain clean.
- [x] 3.3 Verify editing or dismissing an approved draft removes the commit capability and requires a new approval where applicable; confirm no issue is created on either path.

## 4. Package the Competition Narrative

- [x] 4.1 Update `docs/COMPETITION_PLAN.md` with the final 90-second two-turn script and observable checkpoints, and verify neither canonical human prompt reveals the planted finding, a tool name, or a draft identifier.
- [x] 4.2 Add a concise native ChatGPT Site tools runbook covering Site tools enablement, reload-based reset, expected 7/9/10/7 counts, disabling terminal/filesystem fallback, approval timing, recovery language, and evidence capture; verify a new user can follow it without WebMCP implementation knowledge.
- [x] 4.3 Update product, architecture, WebMCP, and README documentation only where the final handoff or compatibility boundary changed; verify all documentation agrees that approval authorizes but does not commit.

## 5. Final Verification

- [x] 5.1 Run typecheck, lint, unit/component tests, production build, Playwright, and strict OpenSpec validation; verify every command passes and record the exact results.
- [ ] 5.2 Rehearse one native ChatGPT Site tools run with Full access/terminal fallback disabled, using only the canonical review prompt and “Continue”; record the discovered tools, activity trace, created issue, app/model version, elapsed time, and any experimental-browser limitation.
- [x] 5.3 Review the finished experience against the competition filter and remove any Phase 3 addition that does not make live human-agent page collaboration clearer; verify no backend, persistence, GitHub integration, or unrelated repository feature was added.
