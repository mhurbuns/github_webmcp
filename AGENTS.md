# AGENTS.md

## Project
This repository is a WebMCP experimentation and OpenAI WebMCP Challenge project.

Before making architectural or product changes, read:
- `docs/PRODUCT_BRIEF.md`
- `docs/WEBMCP_CONCEPT.md`
- `docs/ARCHITECTURE.md`
- `docs/COMPETITION_PLAN.md`

## Goal
Build a small GitHub-like repository web application that we control, then expose meaningful capabilities from the live page through WebMCP.

This is not a GitHub clone. The repo-browser metaphor is a test bed for learning WebMCP and creating a strong competition demo.

## Stack
- React
- TypeScript
- Vite by default
- Minimal dependencies
- Local fixture data for milestone 1

## Priorities
1. Correct, current WebMCP integration.
2. Make agent-to-page interaction obvious and useful.
3. Excellent human + agent workflow.
4. Small, understandable architecture.
5. Visual polish sufficient for a competition demo.

## Architecture rules
- The React UI and WebMCP tools should call the same underlying application/service functions where practical.
- Keep WebMCP registration isolated behind a small adapter so experimental browser APIs can change without contaminating application logic.
- Separate read-only tools from state-changing tools.
- State-changing calls must visibly update the UI.
- Do not put core business logic inside WebMCP registration callbacks.
- Do not add a backend until a real requirement needs one.
- Do not add GitHub API integration for milestone 1.

## Initial WebMCP capabilities
Read-only:
- `get_repo_info`
- `list_files`
- `read_file`
- `search_code`
- `list_issues`
- `get_issue`

State-changing:
- `create_issue`

## Initial demo
A deliberately vulnerable fixture repository contains a serious problem such as logging credentials.

The user asks an agent:
> Review this repository. Find the most serious problem and deal with it appropriately.

The agent should discover the page tools, inspect files, identify the problem, and create an issue. The new issue should immediately appear in the React UI.

## Development workflow
For substantial tasks:
1. Inspect the existing code and these docs.
2. Verify experimental WebMCP API details against current official documentation when relevant.
3. State a concise implementation plan.
4. Implement the smallest coherent change.
5. Run typecheck, lint, and tests that exist.
6. Verify the user-visible workflow.
7. Update docs when architecture or product decisions change.

## Competition filter
Before adding a substantial feature, ask:
> Is this meaningfully better because an AI agent is interacting with the live web application?

If the answer is no, deprioritize it.

## Avoid
- Building a full GitHub clone.
- Hiding important reasoning inside fake deterministic demo code.
- Creating tools that merely mirror every UI button without improving agent interaction.
- Treating WebMCP as a replacement for REST APIs, MCP servers, or webhooks.
- Over-engineering authentication, persistence, or infrastructure before the WebMCP experience works.
