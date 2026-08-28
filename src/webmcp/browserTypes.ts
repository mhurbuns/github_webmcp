// This module is the only source of experimental WebMCP browser types.
// It intentionally mirrors the current document.modelContext draft surface
// used by this application and can be replaced as the specification evolves.
export interface WebMcpAnnotations {
  readOnlyHint?: boolean;
  untrustedContentHint?: boolean;
}

export interface WebMcpTool {
  name: string;
  title?: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  annotations?: WebMcpAnnotations;
  execute(
    input: Record<string, unknown>,
    options: { signal: AbortSignal },
  ): Promise<unknown>;
}

export interface WebMcpRegisteredTool {
  name: string;
  title?: string;
  description: string;
  inputSchema?: Record<string, unknown> | string;
  annotations?: WebMcpAnnotations;
  origin?: string;
}

export interface WebMcpModelContext {
  registerTool(tool: WebMcpTool, options?: { signal?: AbortSignal; exposedTo?: string[] }): Promise<void>;
  getTools(options?: { fromOrigins?: string[] }): Promise<WebMcpRegisteredTool[]>;
  executeTool?(
    tool: WebMcpRegisteredTool,
    inputArguments?: Record<string, unknown> | string,
    options?: { signal?: AbortSignal },
  ): Promise<string | null>;
}

declare global {
  interface Document {
    readonly modelContext?: WebMcpModelContext;
  }
}
