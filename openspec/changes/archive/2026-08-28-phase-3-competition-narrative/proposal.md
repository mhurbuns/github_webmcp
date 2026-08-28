## Why

The Phase 2 workflow works in a native ChatGPT Site tools run, but the approval handoff is not yet self-explanatory: a human can reasonably expect clicking Approve to create the issue or believe they must know `create_issue` and a draft identifier. Phase 3 must remove those implementation details from the human experience and package the proven workflow as a reliable, immediately understandable 90-second competition story.

## What Changes

- Make the approved-draft state explain the next human action in natural language: the human confirms “Approved,” while tool names, schemas, and draft identifiers remain machine-facing.
- Refine tool descriptions and results so a compatible agent can retain the proposal reference, rediscover the approval-gated capability, and finish after a simple “Approved” without asking the human for internal arguments.
- Preserve the existing security boundary: approval authorizes only the exact stored draft revision, and approval itself does not silently commit an issue.
- Add an end-to-end competition acceptance path whose human messages contain no WebMCP tool names or identifiers.
- Add a concise demo runbook, readiness checks, recovery guidance, and a reset procedure for repeatable recording and judging.
- Keep the implementation limited to narrative polish, contracts, tests, and documentation; do not add persistence, a backend, real GitHub integration, or further repository-clone features.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `human-approved-findings`: Make the approval-to-commit handoff understandable and completable through ordinary human language without exposing WebMCP tool names, schemas, or draft identifiers.

## Impact

- Review-draft UI copy and accessible status messaging in `src/app/`.
- Existing approval and issue-creation tool descriptions/results under the isolated `src/webmcp/` adapter; the application authorization contract remains unchanged.
- Component, adapter, and real-browser acceptance tests for the natural-language handoff and exact-revision approval boundary.
- Competition, product, architecture, and testing documentation, including a repeatable native ChatGPT Site tools runbook.
- No new runtime dependencies, backend, authentication, persistence, or external API integration.
