import type { RepositoryApp } from "../application/repositoryApp";
import type { WebMcpModelContext } from "./browserTypes";
import { createToolDefinitions } from "./toolDefinitions";

export type WebMcpStatus = "checking" | "ready" | "unavailable" | "failed";

export interface RegistrationResult {
  status: Exclude<WebMcpStatus, "checking">;
  registeredToolNames: string[];
  dispose: () => void;
  error?: unknown;
}

async function verifyBrowserDiscovery(
  modelContext: WebMcpModelContext,
  expectedNames: readonly string[],
) {
  // This intentionally verifies the browser-visible registry rather than the
  // definitions array used to register it.
  const discovered = await modelContext.getTools();
  const discoveredNames = discovered.map(({ name }) => name);
  const missing = expectedNames.filter((name) => !discoveredNames.includes(name));
  if (missing.length > 0) {
    throw new Error(`WebMCP discovery did not return: ${missing.join(", ")}`);
  }
  return discoveredNames;
}

function currentModelContext(): WebMcpModelContext | undefined {
  if (typeof document === "undefined") return undefined;
  const context = document.modelContext;
  return context && typeof context.registerTool === "function" ? context : undefined;
}

export async function registerRepositoryTools(app: RepositoryApp): Promise<RegistrationResult> {
  const modelContext = currentModelContext();
  if (!modelContext) {
    return { status: "unavailable", registeredToolNames: [], dispose: () => undefined };
  }

  const controller = new AbortController();
  const tools = createToolDefinitions(app);

  try {
    await Promise.all(
      tools.map((tool) => modelContext.registerTool(tool, { signal: controller.signal })),
    );
    const discoveredToolNames = await verifyBrowserDiscovery(
      modelContext,
      tools.map(({ name }) => name),
    );
    return {
      status: "ready",
      registeredToolNames: discoveredToolNames,
      dispose: () => controller.abort(),
    };
  } catch (error) {
    controller.abort();
    return { status: "failed", registeredToolNames: [], dispose: () => undefined, error };
  }
}
