# First Codex Prompt

Read `AGENTS.md` and every file under `docs/` before doing anything else.

We are starting this project from scratch.

Do not implement code yet.

First:

1. Explain your understanding of the product and why we are using a GitHub-like repository UI as the WebMCP test bed.
2. Check the current official WebMCP documentation and identify the current browser API for registering tools. Flag experimental/deprecated details.
3. Propose the smallest React + TypeScript + Vite architecture for milestone 1.
4. Define the exact tool contracts for:
   - `get_repo_info`
   - `list_files`
   - `read_file`
   - `search_code`
   - `list_issues`
   - `get_issue`
   - `create_issue`
5. Explain how React UI and WebMCP calls will share application state without duplicating business logic.
6. Define acceptance criteria for an end-to-end demo where an agent can inspect the fixture repository, identify a deliberately planted security problem, create an issue, and have that issue immediately appear in the UI.
7. Identify uncertainties, risks, and anything that should be isolated because WebMCP is experimental.
8. Produce a staged implementation plan with small checkpoints that can each be tested.

Do not start coding until the plan is complete. Keep milestone 1 intentionally small; do not build a full GitHub clone or add real GitHub API integration yet.
