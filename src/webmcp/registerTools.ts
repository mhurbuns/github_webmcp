import type { RepositoryApp } from "../application/repositoryApp";
import type { WebMcpIntegrationStatus } from "../domain/types";
import type { WebMcpModelContext } from "./browserTypes";
import { createDesiredToolDefinitions, ownedToolNames } from "./toolDefinitions";

export type WebMcpStatus = WebMcpIntegrationStatus;

export interface RegistrationResult {
  status: Exclude<WebMcpStatus, "checking">;
  registeredToolNames: string[];
  dispose: () => void;
  error?: unknown;
}

const ownedNames = new Set<string>(ownedToolNames);

function currentModelContext(): WebMcpModelContext | undefined {
  if (typeof document === "undefined") return undefined;
  const context = document.modelContext;
  return context && typeof context.registerTool === "function" && typeof context.getTools === "function"
    ? context
    : undefined;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 200) : "WebMCP registration failed.";
}

export async function registerRepositoryTools(app: RepositoryApp): Promise<RegistrationResult> {
  const modelContext = currentModelContext();
  if (!modelContext) {
    app.setWebMcpIntegration({ status: "unavailable", discoveredToolNames: [], message: "This browser does not expose document.modelContext." });
    return { status: "unavailable", registeredToolNames: [], dispose: () => undefined };
  }
  const context = modelContext;

  const activeControllers = new Map<string, AbortController>();
  let disposed = false;
  let requestedRevision = 0;
  let desiredSignature = "";
  let lastError: unknown;
  let queue = Promise.resolve();

  async function reconcile(revision: number) {
    if (disposed || revision !== requestedRevision) return;
    const definitions = createDesiredToolDefinitions(app);
    const desired = new Map(definitions.map((tool) => [tool.name, tool]));

    for (const [name, controller] of activeControllers) {
      if (!desired.has(name)) {
        controller.abort();
        activeControllers.delete(name);
      }
    }

    try {
      for (const [name, tool] of desired) {
        if (activeControllers.has(name)) continue;
        const controller = new AbortController();
        await context.registerTool(tool, { signal: controller.signal });
        if (disposed) {
          controller.abort();
          return;
        }
        activeControllers.set(name, controller);
      }

      const discovered = await context.getTools();
      if (disposed || revision !== requestedRevision) return;
      const actual = discovered.map(({ name }) => name).filter((name) => ownedNames.has(name)).sort();
      const expected = [...desired.keys()].sort();
      const missing = expected.filter((name) => !actual.includes(name));
      const unexpected = actual.filter((name) => !expected.includes(name));
      if (missing.length || unexpected.length) {
        const details = [missing.length ? `missing ${missing.join(", ")}` : "", unexpected.length ? `unexpected ${unexpected.join(", ")}` : ""].filter(Boolean).join("; ");
        lastError = new Error(`WebMCP discovery mismatch: ${details}`);
        app.setWebMcpIntegration({ status: "failed", discoveredToolNames: actual, message: errorMessage(lastError) });
        return;
      }
      lastError = undefined;
      app.setWebMcpIntegration({ status: "ready", discoveredToolNames: actual });
    } catch (error) {
      lastError = error;
      if (disposed || revision !== requestedRevision) return;
      app.setWebMcpIntegration({
        status: "failed",
        discoveredToolNames: [...activeControllers.keys()].sort(),
        message: errorMessage(error),
      });
    }
  }

  function requestReconciliation() {
    const signature = createDesiredToolDefinitions(app).map(({ name }) => name).sort().join("\0");
    if (signature === desiredSignature) return queue;
    desiredSignature = signature;
    const revision = ++requestedRevision;
    queue = queue.then(() => reconcile(revision));
    return queue;
  }

  const unsubscribe = app.subscribe(() => { void requestReconciliation(); });
  await requestReconciliation();

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    unsubscribe();
    for (const controller of activeControllers.values()) controller.abort();
    activeControllers.clear();
  };
  const integration = app.getSnapshot().webMcp;
  return {
    status: integration.status === "checking" ? "failed" : integration.status,
    registeredToolNames: [...integration.discoveredToolNames],
    dispose,
    ...(lastError === undefined ? {} : { error: lastError }),
  };
}
