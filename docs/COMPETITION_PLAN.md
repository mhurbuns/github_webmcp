# Competition Plan

## Objective
Turn the WebMCP repository playground into a competition entry where WebMCP is central to the experience, not decorative.

Keep this app. Change the demo. Do not rebuild.

## Decision
Architecture is competition-ready. The story is not.

The planted `console.log(password)` → `create_issue` flow proves WebMCP works. It does **not** prove live page context matters. A remote MCP server could do the same work without the webpage.

The entry must answer:

> Why is this better as WebMCP than as a direct MCP server or API integration?

**Answer we will demo:** the agent paints the live page from workspace state that only exists in the browser (open file, selection, tab). Findings are visible annotations and a draft issue. The human Approves / Edits / Dismisses. Only then does `create_issue` commit.

## Phase 1 — Prove WebMCP end-to-end (done)
Smallest reliable demo:
- React repository page
- fixture files
- issue UI
- WebMCP discovery
- read tools
- `create_issue`
- visible state update

Success condition met:
A browser agent can inspect a repository and create a meaningful issue without DOM clicking/scraping being the primary integration mechanism.

This remains the learning baseline, not the competition narrative.

## Phase 2 — Make the page the product (implemented)
Agent should paint the UI, not just mutate a list.

Three levers, in build order. Each is independently demoable, so a cut lever does not break the story.

### Lever 1 — Dynamic tool surface (highest wow, lowest cost)
A remote MCP server has one fixed tool list. This page does not have to.

Register and unregister tools as UI state changes:

| UI state | Tools exposed |
| --- | --- |
| Code tab | `annotate_code`, `explain_selection` |
| Issues tab | `triage_issue`, `link_to_code` |
| Selection active | `review_selection` |

The agent literally sees different capabilities depending on what the human is looking at. This is impossible off-page and is the single clearest argument for WebMCP over an MCP server.

Cost is low: `registerRepositoryTools` already disposes registrations through an `AbortController`, so re-registration on state change is a small extension rather than new machinery.

Make the change visible — the tool count on screen must move when the human switches tab or selects a file. An invisible capability change proves nothing on video.

### Lever 2 — Visible agent presence (cheap, large on video)
Add a live tool-call feed to the page. Each call streams in as a row: tool name, arguments, result, timing.

Judges *see* the agent working inside the application instead of trusting a chat transcript. `RepositoryApp` is already an observable store consumed through `useSyncExternalStore`, so this is one more subscribable list rather than a new state mechanism.

### Lever 3 — Approval gating
1. Human opens `src/lib/session.ts`.
2. Agent reads **current open file / tab / selection** — state that only exists in the browser.
3. Findings appear as **inline annotations + a draft card**, not a silent issue.
4. Human **Approve / Edit / Dismiss**.
5. Only then `create_issue` — banner, tab switch, new issue selected.

### Tools that actually need WebMCP
Keep existing read tools. Add context, annotation, and confirmation:

| Tool | Role |
| --- | --- |
| `get_workspace` | Open file, selection, tab, filters |
| `annotate_code` | Line, severity, note — visible in the viewer |
| `propose_issue` | Draft, not commit |
| `create_issue` | Only after human confirm |

A remote MCP server cannot see “this selection on this screen,” and cannot change its own tool list to match it.

### Cut
File-level selection is sufficient. Do not build line-range selection fidelity — it costs about a day for marginal narrative gain. `annotate_code` may target a single line.

### Do not
- Full GitHub clone
- Real GitHub API
- Extra repo features for visual imitation
- A new product from scratch
- Complex infrastructure or production persistence

Spend remaining time on live context, visible agent action, human confirmation, and a reliable 90-second story.

## Phase 3 — Competition narrative
**First human turn:**

> Review the repository starting from the currently open file. Identify the most serious substantiated problem, show it on the relevant line, and prepare an issue proposal. Do not complete the proposed action until I approve it.

**Second human turn, after clicking Approve:**

> Continue.

The 90-second wow is “the page is collaborating,” not “the agent filed a ticket.”

### 90-second demo script
1. Start from a freshly reloaded page showing **7 tools**; open `src/lib/session.ts` and show the count become **9**.
2. Give the first human turn above. The activity feed streams while the agent inspects multiple files.
3. An inline annotation appears on the relevant line and a pending issue draft appears without changing the issue count.
4. Review or edit the draft, then click **Approve**. The issue count stays unchanged, the card explains the next step, and the tool count becomes **10**.
5. Say only **“Continue.”** The agent completes the approved action using its retained machine context.
6. The creation banner fires, the page switches to the new issue, the issue count increases, and the tool count returns to **7**.

The video should establish, in that order:
1. what the human is doing in the web app (open file / tab)
2. that the exposed capabilities change with that state
3. what the agent discovers, visibly, as it works
4. how the human confirms or rejects
5. how the page commits the issue
6. why WebMCP is necessary: the workspace state, and the tool surface itself, live on the page

The human never names a tool, supplies a schema field, or handles a proposal identifier. Approval is authorization, not execution; the separate “Continue” turn makes agent action after human consent visible.

## Judging mindset
Optimize for:
- thoughtful WebMCP leverage (page context, not an API wrapper)
- useful human-agent collaboration (confirm before commit)
- originality of the *interaction*, not the GitHub metaphor
- reliable execution
- immediate visual comprehensibility

Competition filter before any new feature:

> Is this meaningfully better because an AI agent is interacting with the live web application?

If no, deprioritize it.

## Open questions (narrowed)
- Resolved: `create_issue` refuses unless the current exact draft revision is approved and accepts only its `draftId`.
- Resolved: single-line severity markers, a compact findings rail, and one editable review card are sufficient; no modal or new route is needed.
- Resolved: the bounded activity feed renders running, succeeded, and failed states with safe arguments, timing, and structured outcome summaries.

## Verified competition flow

The browser test starts with 7 stable tools, opens a file to discover 9, approves a proposal to discover 10, and returns to 7 after creation. Its canonical trace is:

```text
get_workspace
get_repo_info
list_files
read_file × 4
annotate_code
propose_issue
[human Approve]
[human “Continue”]
create_issue
```

The created issue becomes the active Issues-tab item before the final callback resolves. The canonical human messages contain no tool names, schema fields, proposal identifiers, or hint about the planted finding. Native-browser availability remains dependent on experimental browser and account support; the automated real-browser suite injects a standards-shaped page-local adapter so UI and lifecycle behavior are reproducible without pretending that support is stable. The native rehearsal procedure is in `docs/DEMO_RUNBOOK.md`.
