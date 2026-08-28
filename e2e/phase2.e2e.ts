import { expect, test } from "@playwright/test";

const canonicalHumanMessages = {
  review: "Review the repository starting from the currently open file. Identify the most serious substantiated problem, show it on the relevant line, and prepare an issue proposal. Do not complete the proposed action until I approve it.",
  approval: "Approved.",
} as const;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (location.search.includes("no-webmcp")) return;
    const registered = new Map<string, {
      name: string;
      title?: string;
      description: string;
      inputSchema?: Record<string, unknown>;
      annotations?: Record<string, boolean>;
      execute(input: Record<string, unknown>, options: { signal: AbortSignal }): Promise<unknown>;
    }>();
    const trace: string[] = [];
    const modelContext = {
      async registerTool(tool: (typeof registered extends Map<string, infer T> ? T : never), options?: { signal?: AbortSignal }) {
        if (registered.has(tool.name)) throw new DOMException("Duplicate tool", "InvalidStateError");
        registered.set(tool.name, tool);
        options?.signal?.addEventListener("abort", () => registered.delete(tool.name), { once: true });
      },
      async getTools() {
        return [...registered.values()].sort((left, right) => left.name.localeCompare(right.name)).map((tool) => ({
          name: tool.name,
          title: tool.title,
          description: tool.description,
          inputSchema: tool.inputSchema,
          annotations: tool.annotations,
        }));
      },
      async executeTool(tool: { name: string }, inputArguments: string) {
        const implementation = registered.get(tool.name);
        if (!implementation) throw new DOMException("Tool is no longer registered", "InvalidStateError");
        trace.push(tool.name);
        const output = await implementation.execute(JSON.parse(inputArguments), { signal: new AbortController().signal });
        return JSON.stringify(output);
      },
    };
    Object.defineProperty(document, "modelContext", { configurable: true, value: modelContext });
    Object.defineProperty(window, "__webMcpTrace", { configurable: true, value: trace });
  });
});

async function discoveredNames(page: import("@playwright/test").Page) {
  return page.evaluate(async () => (await document.modelContext!.getTools()).map(({ name }) => name));
}

async function executeTool(page: import("@playwright/test").Page, name: string, input: Record<string, unknown> = {}) {
  return page.evaluate(async ({ name: toolName, input: toolInput }) => {
    const context = document.modelContext!;
    const tool = (await context.getTools()).find(({ name }) => name === toolName);
    if (!tool || !context.executeTool) throw new Error(`Tool not found: ${toolName}`);
    const output = await context.executeTool(tool, JSON.stringify(toolInput));
    return output ? JSON.parse(output) : null;
  }, { name, input });
}

test("live page context gates an agent finding through human approval", async ({ page }) => {
  expect(Object.values(canonicalHumanMessages).join(" ")).not.toMatch(/create_issue|draftId|schema|tool name/i);
  expect(canonicalHumanMessages.review).not.toMatch(/password|credential|vulnerab/i);
  const browserErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") browserErrors.push(message.text()); });
  page.on("pageerror", (error) => browserErrors.push(error.message));
  await page.goto("/");
  const integrationStatus = page.locator(".integration-status");
  await expect(integrationStatus).toContainText("WebMCP ready");
  await expect(integrationStatus).toContainText("7 tools");
  expect(await discoveredNames(page)).toEqual(["get_issue", "get_repo_info", "get_workspace", "list_files", "list_issues", "read_file", "search_code"]);

  await page.getByRole("button", { name: "src/lib/session.ts" }).click();
  await expect(page.getByRole("heading", { name: "src/lib/session.ts" })).toBeVisible();
  await expect(integrationStatus).toContainText("9 tools");
  expect(await discoveredNames(page)).toContain("annotate_code");

  await executeTool(page, "get_workspace");
  await executeTool(page, "get_repo_info");
  await executeTool(page, "list_files");
  await executeTool(page, "read_file", { path: "README.md" });
  await executeTool(page, "read_file", { path: "src/components/LoginForm.tsx" });
  await executeTool(page, "read_file", { path: "src/lib/api.ts" });
  const inspected = await executeTool(page, "read_file", { path: "src/lib/session.ts" });
  expect(JSON.stringify(inspected)).toContain("payload.password");
  const annotated = await executeTool(page, "annotate_code", {
    path: "src/lib/session.ts",
    line: 8,
    severity: "critical",
    note: "Sensitive authentication input is emitted to diagnostic output.",
  });
  const annotationId = annotated.result.annotation.id;
  await expect(page.getByText("Sensitive authentication input is emitted to diagnostic output.").first()).toBeVisible();

  const proposed = await executeTool(page, "propose_issue", {
    title: "Stop emitting sensitive authentication input",
    body: "The sign-in diagnostic event includes a secret-bearing field. Remove it, retain only non-sensitive metadata, audit collected diagnostics, and add a regression test.",
    sourcePath: "src/lib/session.ts",
    annotationIds: [annotationId],
  });
  expect(proposed.result.draft.status).toBe("pending");
  await expect(page.getByRole("heading", { name: "Human review" })).toBeVisible();
  await expect(integrationStatus).toContainText("9 tools");
  await page.getByRole("textbox", { name: "Title" }).fill("Stop emitting sensitive sign-in input");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("button", { name: /Issues 2/ })).toBeVisible();
  await expect(integrationStatus).toContainText("9 tools");
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("Approval recorded. Tell the agent “Approved” to complete this action.")).toBeVisible();
  await expect(integrationStatus).toContainText("10 tools");
  expect(await discoveredNames(page)).toContain("create_issue");
  await page.screenshot({ path: "test-results/phase3-approved-handoff.png", fullPage: true });

  expect(canonicalHumanMessages.approval).toBe("Approved.");
  const created = await executeTool(page, "create_issue", { draftId: proposed.result.continuation.proposalReference });
  expect(created.result.issue.number).toBe(3);
  expect(created.result.issue.title).toBe("Stop emitting sensitive sign-in input");
  await expect(page.getByText("Issue #3 created")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Stop emitting sensitive sign-in input" })).toBeVisible();
  await expect(integrationStatus).toContainText("7 tools");
  expect(await discoveredNames(page)).not.toContain("create_issue");

  const trace = await page.evaluate(() => (window as Window & { __webMcpTrace: string[] }).__webMcpTrace);
  expect(trace).toEqual(["get_workspace", "get_repo_info", "list_files", "read_file", "read_file", "read_file", "read_file", "annotate_code", "propose_issue", "create_issue"]);
  await page.screenshot({ path: "test-results/phase2-demo.png", fullPage: true });
  await page.setViewportSize({ width: 320, height: 800 });
  await expect(page.getByRole("heading", { name: "Agent activity" })).toBeVisible();
  expect(browserErrors).toEqual([]);
});

test("editing and dismissing approved drafts revoke completion until reapproval", async ({ page }) => {
  const browserErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") browserErrors.push(message.text()); });
  page.on("pageerror", (error) => browserErrors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "src/App.tsx" }).click();
  const proposed = await executeTool(page, "propose_issue", {
    title: "Review navigation state",
    body: "Confirm this proposal can be dismissed without creating an issue.",
    sourcePath: "src/App.tsx",
  });
  await expect(page.getByRole("heading", { name: "Human review" })).toBeVisible();
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.locator(".integration-status")).toContainText("10 tools");

  await page.getByRole("textbox", { name: "Title" }).fill("Review saved navigation state");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator(".draft-status")).toHaveText("pending");
  await expect(page.locator(".integration-status")).toContainText("9 tools");
  expect(await discoveredNames(page)).not.toContain("create_issue");

  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.locator(".integration-status")).toContainText("10 tools");
  await page.getByRole("button", { name: "Dismiss" }).click();
  await expect(page.getByRole("heading", { name: "Human review" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Issues 2/ })).toBeVisible();
  expect(await discoveredNames(page)).not.toContain("create_issue");
  expect(proposed.result.continuation.proposalReference).toBe("draft-1");
  expect(browserErrors).toEqual([]);
});

test("normal navigation remains usable without WebMCP at narrow width", async ({ page }) => {
  const browserErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") browserErrors.push(message.text()); });
  page.on("pageerror", (error) => browserErrors.push(error.message));
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/?no-webmcp=1");
  await expect(page.locator(".integration-status")).toContainText("0 tools");
  await page.getByRole("button", { name: "README.md" }).click();
  await expect(page.getByRole("heading", { name: "README.md" })).toBeVisible();
  await page.getByRole("button", { name: /Issues/ }).click();
  await expect(page.getByRole("heading", { name: "Show a retry action for transient sign-in failures" })).toBeVisible();
  expect(browserErrors).toEqual([]);
});
