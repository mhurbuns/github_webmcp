# Product Brief

## Working concept
A lightweight GitHub-like repository explorer designed specifically to demonstrate and experiment with WebMCP.

The application gives a human a familiar repository interface while giving an AI browser agent structured capabilities for understanding and acting on the repository through the current webpage.

## Why we are building it
There are two goals:

1. Learn WebMCP by building a concrete, observable example.
2. Develop the prototype into a compelling entry for the OpenAI WebMCP Challenge.

## Core mental model
The application is not valuable because it resembles GitHub. The GitHub-like UI gives us an intuitive environment in which the difference between browser automation and WebMCP is easy to see.

Without WebMCP, an agent may need to inspect the DOM, navigate tabs, click files, and fill forms.

With WebMCP, the page explicitly exposes capabilities such as `read_file` and `create_issue`.

## Milestone 1 UI
Keep it intentionally small:
- Repository header/name and description
- Code tab
- Issues tab
- README view
- File tree
- Code viewer
- Issue list/detail

## Fixture repository
Start with local fixture data, for example:

```text
my-react-app/
├── src/
│   ├── App.tsx
│   ├── auth.ts
│   └── api.ts
├── package.json
└── README.md
```

Include at least one deliberately meaningful defect. A simple first example is credential logging in `auth.ts`:

```ts
console.log(username, password);
```

The vulnerability exists to make agent exploration and action easy to demonstrate. Do not hard-code the agent to find it.

## Initial tool surface

### Read-only
- `get_repo_info()`
- `list_files()`
- `read_file(path)`
- `search_code(query)`
- `list_issues()`
- `get_issue(number)`

### State-changing
- `create_issue(title, body)`

## Canonical demo
Prompt the browser agent:

> Review this repository. Find the most serious problem and deal with it appropriately.

Expected interaction:
1. Agent discovers WebMCP tools exposed by the page.
2. Agent inspects repository metadata/tree.
3. Agent reads/searches relevant files.
4. Agent identifies the security issue.
5. Agent decides an issue should be created.
6. Agent calls `create_issue`.
7. React state changes and the issue appears visibly on screen.

The agent provides the reasoning; WebMCP provides structured capabilities; the app owns the state and behavior.

This is the Phase 1 learning demo. The competition narrative is in `docs/COMPETITION_PLAN.md`: the agent reads live workspace state, annotates the page, and files an issue only after human approval.

## Phase 2 experience
Phase 2 is implemented as an extension of the original page:
- Dynamic tool surface: registered tools change with tab/file/draft state, and the verified count is visible on screen
- Live tool-call feed so agent activity is watchable in the page
- Workspace context (`get_workspace`: open file, selection, tab)
- Visible code annotations from the agent
- Proposed issues as drafts the human Approves / Edits / Dismisses
- `create_issue({ draftId })` only for the exact approved draft revision

Selection is file-level. Line-range selection is explicitly cut.

The canonical Phase 2 prompt is:

> I’m looking at this login code — find the worst problem, show it on the page, and only file it if I approve.

Repository files, annotation notes, issue drafts, and issue text are untrusted model/application input. The UI renders them as text, tool annotations declare untrusted output, and the activity feed stores bounded metadata rather than complete content.

Do not add real GitHub API, PR workflows, or extra GitHub-clone features before that story is demoable.

## Non-goals for the first milestone
- GitHub visual fidelity
- Complete Git support
- Authentication
- Real commits/branches
- Production persistence
- A general-purpose code-hosting platform
