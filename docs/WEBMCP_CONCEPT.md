# WebMCP Concept

## The simplest definition
WebMCP lets a webpage explicitly expose structured tools that an AI/browser agent can discover and call.

Instead of forcing an agent to infer application functionality from pixels, buttons, and DOM structure, the application describes supported actions and their inputs.

## Mental model

```text
Human
  |
  | natural-language request
  v
AI browser agent
  |
  | discovers/calls structured tools
  v
WebMCP interface exposed by current page
  |
  | invokes shared application functions
  v
React application state/services
  |
  v
UI updates and/or backend/API calls
```

The AI is the reasoning layer. WebMCP is the structured bridge. The web application remains responsible for permissions, validation, state, and business behavior.

## Example
The page exposes:

```text
read_file(path)
create_issue(title, body)
```

The user says:

> There is a security problem in auth.ts. Create an issue for it.

The agent may call `read_file("src/auth.ts")`, reason about the returned code, formulate an issue, then call `create_issue(...)`.

The page's normal application logic creates the issue and React displays it.

## WebMCP vs REST API
A REST/API layer is an application/service interface for software clients.

WebMCP does not need to replace an API. A WebMCP tool can call the same service functions or HTTP APIs already used by the UI.

```text
AI agent -> WebMCP page tool -> application service -> REST API
```

If an agent only needs direct programmatic access to a remote service and the live webpage/context adds nothing, a direct API or MCP server may be the better abstraction.

## WebMCP vs MCP server
A useful shorthand:

```text
MCP server:
AI agent -> MCP -> service

WebMCP:
AI browser agent -> current webpage -> application capabilities
```

The compelling WebMCP cases use context/state from the application the human is actively using.

## WebMCP vs webhook
A webhook is event delivery:

```text
Something happened -> service sends notification -> your server
```

WebMCP is agent-invoked capability:

```text
Agent wants to do something -> calls page tool -> application acts
```

They solve different problems and can coexist.

## Why current page context matters
A WebMCP-enabled application can potentially make capabilities relevant to:
- the current document/repository/item
- the user's current authenticated session
- current selections or filters
- unsaved/local application state
- the screen/workflow the human is actively using

This is where WebMCP can be more compelling than merely wrapping a remote API.

## Implementation principle
Keep experimental WebMCP API usage in an adapter/module. Application functions should remain ordinary TypeScript functions usable by both React UI and WebMCP tools.

Conceptually:

```ts
// application service
createIssue(input)

// UI
onSubmit -> createIssue(input)

// WebMCP adapter
webMcpCreateIssue -> createIssue(input)
```

Do not duplicate business logic inside the WebMCP layer.

## API freshness
WebMCP is evolving. Before implementing or changing registration code, check current official documentation rather than relying on old examples. Isolate browser-specific API calls so changes are cheap.
