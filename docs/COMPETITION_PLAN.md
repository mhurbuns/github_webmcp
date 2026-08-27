# Competition Plan

## Objective
Turn the WebMCP repository playground into a competition entry where WebMCP is central to the experience, not decorative.

## Current hypothesis
A GitHub-like repository explorer is an excellent learning prototype, but a competition entry must answer:

> Why is this better as WebMCP than as a direct MCP server or API integration?

The eventual entry should exploit live webpage/application context in a way that matters to the human-agent collaboration.

## Phase 1 — Prove WebMCP end-to-end
Build the smallest reliable demo:
- React repository page
- fixture files
- issue UI
- WebMCP discovery
- read tools
- `create_issue`
- visible state update

Success condition:
A browser agent can inspect a repository and create a meaningful issue without DOM clicking/scraping being the primary integration mechanism.

## Phase 2 — Make page context matter
Explore interactions such as:
- user highlights/selects a file or code region and asks the agent to investigate "this"
- user filters/compares issues and agent operates on the current view
- user assembles a review workspace and the agent acts on that transient state
- human and agent collaboratively triage findings before actions are committed

Prefer concepts where a direct server integration would lose useful context that exists in the live application.

## Phase 3 — Competition narrative
The demo should quickly establish:
1. what the human is doing in the web app
2. what capabilities the page exposes
3. what the agent discovers/decides
4. how the page changes as a result
5. why WebMCP is necessary or materially better

## Candidate first demo
User:
> Review this repository. Find the most serious problem and deal with it appropriately.

Agent:
- explores files via tools
- finds credential logging
- determines severity
- creates an issue

UI:
- issue count increments
- new security issue appears

This is a learning/demo baseline, not necessarily the final competition concept.

## Judging mindset
Optimize for:
- thoughtful WebMCP leverage
- useful human-agent collaboration
- originality
- reliable execution
- immediate visual comprehensibility

## Scope discipline
Do not spend competition time on:
- full GitHub parity
- complex infrastructure
- production-grade persistence before needed
- features whose only purpose is visual imitation

Spend it on:
- the agent interaction
- live context
- clear state changes
- safety/confirmation for meaningful actions
- a polished demo story

## Open questions
Revisit after milestone 1:
- What is the strongest live-page-context interaction?
- Should real GitHub data be introduced, or would it distract from WebMCP?
- Which action best demonstrates human confirmation/agency?
- What workflow is hard with a conventional MCP server but natural with WebMCP?
- What should the final 2–3 minute demo show?
