import { describe, expect, it } from "vitest";
import { RepositoryApp } from "../src/application/repositoryApp";
import { fixtureRepository } from "../src/data/fixtureRepository";
import { summarizeToolArguments, summarizeToolOutcome } from "../src/webmcp/activitySummaries";
import type { WebMcpModelContext, WebMcpRegisteredTool, WebMcpTool } from "../src/webmcp/browserTypes";
import { registerRepositoryTools } from "../src/webmcp/registerTools";
import { createDesiredToolDefinitions, createStableToolDefinitions } from "../src/webmcp/toolDefinitions";

interface ModelContextMock extends WebMcpModelContext {
  tools: Map<string, WebMcpTool>;
  omitFromDiscovery: Set<string>;
}

function createModelContextMock(): ModelContextMock {
  const tools = new Map<string, WebMcpTool>();
  const omitFromDiscovery = new Set<string>();
  return {
    tools,
    omitFromDiscovery,
    async registerTool(tool, options) {
      if (tools.has(tool.name)) throw new DOMException("Duplicate tool", "InvalidStateError");
      tools.set(tool.name, tool);
      options?.signal?.addEventListener("abort", () => tools.delete(tool.name), { once: true });
    },
    async getTools() {
      return [...tools.values()]
        .filter(({ name }) => !omitFromDiscovery.has(name))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((tool) => ({
          name: tool.name,
          title: tool.title,
          description: tool.description,
          inputSchema: tool.inputSchema,
          annotations: tool.annotations,
        }) as WebMcpRegisteredTool);
    },
  };
}

async function waitForTools(mock: ModelContextMock, expected: readonly string[]) {
  const sortedExpected = [...expected].sort();
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const actual = (await mock.getTools()).map(({ name }) => name).sort();
    if (JSON.stringify(actual) === JSON.stringify(sortedExpected)) return;
    await Promise.resolve();
  }
  expect((await mock.getTools()).map(({ name }) => name).sort()).toEqual(sortedExpected);
}

async function withMockDocument(run: (mock: ModelContextMock) => Promise<void>) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "document");
  const mock = createModelContextMock();
  Object.defineProperty(globalThis, "document", { configurable: true, value: { modelContext: mock } });
  try { await run(mock); }
  finally {
    if (previous) Object.defineProperty(globalThis, "document", previous);
    else Reflect.deleteProperty(globalThis, "document");
  }
}

describe("WebMCP tool definitions", () => {
  it("defines seven stable tools and contextual tools with exact annotations and schemas", () => {
    const app = new RepositoryApp(fixtureRepository);
    const stable = createStableToolDefinitions(app);
    expect(stable.map(({ name }) => name)).toEqual(["get_repo_info", "list_files", "read_file", "search_code", "list_issues", "get_issue", "get_workspace"]);
    expect(stable.every((tool) => tool.annotations?.readOnlyHint === true && tool.annotations.untrustedContentHint === true)).toBe(true);

    app.openFile({ path: "README.md" });
    const codeTools = createDesiredToolDefinitions(app);
    expect(codeTools.map(({ name }) => name)).toEqual([...stable.map(({ name }) => name), "annotate_code", "propose_issue"]);
    expect(codeTools.slice(7).every((tool) => tool.annotations?.readOnlyHint === false && tool.annotations.untrustedContentHint === true)).toBe(true);
    expect(codeTools.find(({ name }) => name === "annotate_code")?.inputSchema).toMatchObject({ required: ["path", "line", "severity", "note"], additionalProperties: false });
    expect(codeTools.find(({ name }) => name === "propose_issue")?.inputSchema).toMatchObject({ required: ["title", "body", "sourcePath"], additionalProperties: false });
    expect(codeTools.map(({ description }) => description).join(" ")).not.toMatch(/credential|password|vulnerab/i);
  });

  it("only exposes create_issue for the current approved revision", () => {
    const app = new RepositoryApp(fixtureRepository);
    app.openFile({ path: "src/lib/session.ts" });
    const proposal = app.proposeIssue({ title: "Review diagnostic output", body: "Evidence and remediation.", sourcePath: "src/lib/session.ts" });
    if (!proposal.ok) throw new Error("Fixture proposal failed");
    expect(createDesiredToolDefinitions(app).some(({ name }) => name === "create_issue")).toBe(false);
    app.approveIssueDraft({ draftId: proposal.result.draft.id });
    const create = createDesiredToolDefinitions(app).find(({ name }) => name === "create_issue");
    expect(create?.inputSchema).toMatchObject({
      type: "object",
      properties: { draftId: { type: "string", description: expect.stringContaining("proposal reference"), minLength: 1, maxLength: 80 } },
      required: ["draftId"],
      additionalProperties: false,
    });
    app.editIssueDraft({ draftId: proposal.result.draft.id, title: "Changed", body: "Requires approval again." });
    expect(createDesiredToolDefinitions(app).some(({ name }) => name === "create_issue")).toBe(false);
  });

  it("carries the proposal reference into the approval-gated machine contract", async () => {
    const app = new RepositoryApp(fixtureRepository);
    app.openFile({ path: "src/lib/session.ts" });
    const propose = createDesiredToolDefinitions(app).find(({ name }) => name === "propose_issue")!;
    const proposed = await propose.execute({
      title: "Review diagnostic output",
      body: "Evidence and remediation.",
      sourcePath: "src/lib/session.ts",
    }, { signal: new AbortController().signal });
    expect(proposed).toMatchObject({
      ok: true,
      result: {
        draft: { id: "draft-1", status: "pending" },
        continuation: { proposalReference: "draft-1" },
      },
    });

    const approval = app.approveIssueDraft({ draftId: "draft-1" });
    if (!approval.ok) throw new Error("Fixture approval failed");
    const create = createDesiredToolDefinitions(app).find(({ name }) => name === "create_issue")!;
    expect(create.description).toContain("proposal reference returned by propose_issue");
    expect(create.inputSchema).toMatchObject({ required: ["draftId"], additionalProperties: false });
  });

  it("records running activity before resolution and safe terminal summaries", async () => {
    const app = new RepositoryApp(fixtureRepository);
    const times = [10, 24];
    const read = createStableToolDefinitions(app, () => times.shift() ?? 24).find(({ name }) => name === "read_file")!;
    const execution = read.execute({ path: "src/lib/session.ts" }, { signal: new AbortController().signal });
    expect(app.getSnapshot().activities[0]).toMatchObject({ toolName: "read_file", status: "running", argumentSummary: "path=src/lib/session.ts" });
    const result = await execution;
    expect(result).toMatchObject({ ok: true });
    expect(app.getSnapshot().activities[0]).toMatchObject({ status: "succeeded", durationMs: 14, outcomeSummary: "Read src/lib/session.ts (23 lines)" });
    expect(JSON.stringify(app.getSnapshot().activities)).not.toContain("password: payload.password");
  });

  it("marks structured validation failures without rejecting later calls", async () => {
    const app = new RepositoryApp(fixtureRepository);
    const read = createStableToolDefinitions(app).find(({ name }) => name === "read_file")!;
    await expect(read.execute({ path: "../bad" }, { signal: new AbortController().signal })).resolves.toMatchObject({ ok: false });
    expect(app.getSnapshot().activities[0]).toMatchObject({ status: "failed", outcomeSummary: expect.stringContaining("INVALID_ARGUMENT") });
    await expect(read.execute({ path: "README.md" }, { signal: new AbortController().signal })).resolves.toMatchObject({ ok: true });
  });

  it("summarizes untrusted arguments and outcomes without retaining content", () => {
    const secretBody = "do-not-store-this-body";
    const args = summarizeToolArguments("propose_issue", { sourcePath: "src/lib/session.ts", title: "Finding", body: secretBody, annotationIds: ["annotation-1"] });
    expect(args).toContain("bodyLength=22");
    expect(args).not.toContain(secretBody);
    const output = summarizeToolOutcome("read_file", { ok: true, result: { path: "src/lib/session.ts", lineCount: 20, content: secretBody } });
    expect(output).toBe("Read src/lib/session.ts (20 lines)");
    expect(output).not.toContain(secretBody);
  });

  it("commits the approved stored draft and notifies before create_issue resolves", async () => {
    const app = new RepositoryApp(fixtureRepository);
    app.openFile({ path: "src/lib/session.ts" });
    const proposal = app.proposeIssue({ title: "Agent-created finding", body: "Evidence and remediation.", sourcePath: "src/lib/session.ts" });
    if (!proposal.ok) throw new Error("Fixture proposal failed");
    app.approveIssueDraft({ draftId: proposal.result.draft.id });
    const create = createDesiredToolDefinitions(app).find(({ name }) => name === "create_issue")!;
    const execution = create.execute({ draftId: proposal.result.draft.id }, { signal: new AbortController().signal });
    expect(app.getSnapshot().issues[0].title).toBe("Agent-created finding");
    expect(app.getSnapshot().draft?.status).toBe("committed");
    await expect(execution).resolves.toMatchObject({ ok: true, result: { issue: { number: 3 } } });
  });
});

describe("WebMCP browser adapter", () => {
  it("reconciles and verifies tools as live workspace and approval state change", async () => withMockDocument(async (mock) => {
    const app = new RepositoryApp(fixtureRepository);
    const registration = await registerRepositoryTools(app);
    const stable = ["get_repo_info", "list_files", "read_file", "search_code", "list_issues", "get_issue", "get_workspace"];
    await waitForTools(mock, stable);
    expect(registration.status).toBe("ready");
    expect(app.getSnapshot().webMcp.discoveredToolNames).toHaveLength(7);

    app.setActiveTab("issues");
    await waitForTools(mock, stable);
    app.openFile({ path: "src/lib/session.ts" });
    await waitForTools(mock, [...stable, "annotate_code", "propose_issue"]);
    const proposal = app.proposeIssue({ title: "Finding", body: "Evidence", sourcePath: "src/lib/session.ts" });
    if (!proposal.ok) throw new Error("Fixture proposal failed");
    app.approveIssueDraft({ draftId: proposal.result.draft.id });
    await waitForTools(mock, [...stable, "annotate_code", "propose_issue", "create_issue"]);

    const create = mock.tools.get("create_issue")!;
    await create.execute({ draftId: proposal.result.draft.id }, { signal: new AbortController().signal });
    await waitForTools(mock, stable);
    expect(app.getSnapshot().webMcp).toMatchObject({ status: "ready", discoveredToolNames: stable.slice().sort() });
    registration.dispose();
    await waitForTools(mock, []);
  }));

  it("serializes rapid changes without duplicates or stale registrations", async () => withMockDocument(async (mock) => {
    const app = new RepositoryApp(fixtureRepository);
    const registration = await registerRepositoryTools(app);
    app.setActiveTab("issues");
    app.setActiveTab("code");
    app.openFile({ path: "src/App.tsx" });
    app.setActiveTab("issues");
    await waitForTools(mock, ["get_repo_info", "list_files", "read_file", "search_code", "list_issues", "get_issue", "get_workspace"]);
    expect(new Set(mock.tools.keys()).size).toBe(mock.tools.size);
    registration.dispose();
  }));

  it("reports discovery mismatches using the actual browser-visible count", async () => withMockDocument(async (mock) => {
    mock.omitFromDiscovery.add("get_workspace");
    const app = new RepositoryApp(fixtureRepository);
    const registration = await registerRepositoryTools(app);
    expect(registration.status).toBe("failed");
    expect(app.getSnapshot().webMcp).toMatchObject({ status: "failed" });
    expect(app.getSnapshot().webMcp.discoveredToolNames).not.toContain("get_workspace");
    expect(app.getSnapshot().webMcp.discoveredToolNames).toHaveLength(6);
    registration.dispose();
  }));

  it("degrades safely when WebMCP is unavailable and can remount cleanly", async () => {
    const previous = Object.getOwnPropertyDescriptor(globalThis, "document");
    Object.defineProperty(globalThis, "document", { configurable: true, value: {} });
    const unsupportedApp = new RepositoryApp(fixtureRepository);
    const unsupported = await registerRepositoryTools(unsupportedApp);
    expect(unsupported.status).toBe("unavailable");
    expect(unsupportedApp.readFile({ path: "README.md" })).toMatchObject({ ok: true });
    if (previous) Object.defineProperty(globalThis, "document", previous); else Reflect.deleteProperty(globalThis, "document");

    await withMockDocument(async (mock) => {
      const app = new RepositoryApp(fixtureRepository);
      const first = await registerRepositoryTools(app);
      first.dispose();
      await waitForTools(mock, []);
      const second = await registerRepositoryTools(app);
      await waitForTools(mock, ["get_repo_info", "list_files", "read_file", "search_code", "list_issues", "get_issue", "get_workspace"]);
      second.dispose();
    });
  });
});
