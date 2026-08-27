import { describe, expect, it, vi } from "vitest";
import { RepositoryApp } from "../src/application/repositoryApp";
import { fixtureRepository } from "../src/data/fixtureRepository";
import type { WebMcpModelContext, WebMcpRegisteredTool, WebMcpTool } from "../src/webmcp/browserTypes";
import { registerRepositoryTools } from "../src/webmcp/registerTools";
import { createToolDefinitions } from "../src/webmcp/toolDefinitions";

function createModelContextMock(): WebMcpModelContext {
  const tools = new Map<string, WebMcpTool>();
  return {
    async registerTool(tool, options) {
      if (tools.has(tool.name)) throw new DOMException("Duplicate tool", "InvalidStateError");
      tools.set(tool.name, tool);
      options?.signal?.addEventListener("abort", () => tools.delete(tool.name), { once: true });
    },
    async getTools() {
      return [...tools.values()].map((tool) => ({
        name: tool.name,
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: tool.annotations,
      }) as WebMcpRegisteredTool);
    },
  };
}

describe("WebMCP tool definitions", () => {
  it("defines exactly the seven milestone tools with correct annotations", () => {
    const tools = createToolDefinitions(new RepositoryApp(fixtureRepository));
    expect(tools.map(({ name }) => name)).toEqual([
      "get_repo_info",
      "list_files",
      "read_file",
      "search_code",
      "list_issues",
      "get_issue",
      "create_issue",
    ]);
    expect(tools.slice(0, 6).every((tool) => tool.annotations?.readOnlyHint === true)).toBe(true);
    expect(tools.at(-1)?.annotations?.readOnlyHint).toBe(false);
    expect(tools.every((tool) => tool.annotations?.untrustedContentHint === true)).toBe(true);
    expect(tools.map(({ description }) => description).join(" ")).not.toMatch(
      /credential|password|vulnerab/i,
    );
  });

  it("mutates and notifies before create_issue execution resolves", async () => {
    const app = new RepositoryApp(fixtureRepository);
    const notified = vi.fn();
    app.subscribe(notified);
    const tool = createToolDefinitions(app).find(({ name }) => name === "create_issue");
    expect(tool).toBeDefined();

    const execution = tool!.execute(
      { title: "Agent-created finding", body: "Evidence and remediation." },
      { signal: new AbortController().signal },
    );

    expect(notified).toHaveBeenCalledOnce();
    expect(app.getSnapshot().issues[0].title).toBe("Agent-created finding");
    await expect(execution).resolves.toMatchObject({ ok: true, result: { issue: { number: 3 } } });
  });

  it("supports the canonical inspect-reason-act tool trace", async () => {
    const app = new RepositoryApp(
      fixtureRepository,
      () => new Date("2026-08-27T09:30:00.000Z"),
    );
    const tools = new Map(createToolDefinitions(app).map((tool) => [tool.name, tool]));
    const call = (name: string, input: Record<string, unknown> = {}) =>
      tools.get(name)!.execute(input, { signal: new AbortController().signal });

    await call("get_repo_info");
    const listed = await call("list_files");
    expect(listed).toMatchObject({ ok: true });
    await call("read_file", { path: "README.md" });
    await call("read_file", { path: "src/App.tsx" });
    await call("read_file", { path: "src/components/LoginForm.tsx" });
    await call("read_file", { path: "src/lib/api.ts" });
    const session = await call("read_file", { path: "src/lib/session.ts" });
    expect(JSON.stringify(session)).toContain("password: payload.password");
    await call("list_issues");

    const created = await call("create_issue", {
      title: "Stop logging passwords during sign-in",
      body: "src/lib/session.ts records payload.password in the login-attempt console event. This exposes user secrets to browser consoles and any connected log collection. Remove the password field, retain only non-sensitive metadata needed for diagnostics, audit existing logs, and add a regression test that rejects secret-bearing telemetry.",
    });

    expect(created).toMatchObject({
      ok: true,
      result: { issue: { number: 3, title: "Stop logging passwords during sign-in" } },
    });
    await expect(call("get_issue", { number: 3 })).resolves.toMatchObject({
      ok: true,
      result: { number: 3, title: "Stop logging passwords during sign-in" },
    });
  });
});

describe("WebMCP browser adapter", () => {
  it("registers discoverable tools and removes them on dispose", async () => {
    const previous = Object.getOwnPropertyDescriptor(globalThis, "document");
    const mock = createModelContextMock();
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: { modelContext: mock },
    });

    try {
      const registration = await registerRepositoryTools(new RepositoryApp(fixtureRepository));
      expect(registration.status).toBe("ready");
      expect(registration.registeredToolNames).toEqual([
        "get_repo_info",
        "list_files",
        "read_file",
        "search_code",
        "list_issues",
        "get_issue",
        "create_issue",
      ]);
      await expect(mock.getTools()).resolves.toHaveLength(7);
      registration.dispose();
      await expect(mock.getTools()).resolves.toHaveLength(0);
    } finally {
      if (previous) Object.defineProperty(globalThis, "document", previous);
      else Reflect.deleteProperty(globalThis, "document");
    }
  });
});
