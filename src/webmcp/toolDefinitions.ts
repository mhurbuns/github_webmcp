import type { RepositoryApp } from "../application/repositoryApp";
import type { AppResult } from "../domain/types";
import type { WebMcpTool } from "./browserTypes";

const noInputSchema = {
  type: "object",
  properties: {},
  additionalProperties: false,
} as const;

const untrustedReadOnly = {
  readOnlyHint: true,
  untrustedContentHint: true,
} as const;

const invalidInput = (message: string): AppResult<never> => ({
  ok: false,
  error: { code: "INVALID_ARGUMENT", message },
});

export function createToolDefinitions(app: RepositoryApp): WebMcpTool[] {
  return [
    {
      name: "get_repo_info",
      title: "Get repository information",
      description: "Return metadata and current summary counts for the repository displayed by this page. Does not modify state.",
      inputSchema: noInputSchema,
      annotations: untrustedReadOnly,
      execute: async () => app.getRepoInfo(),
    },
    {
      name: "list_files",
      title: "List repository files",
      description: "List every file in the current repository using repository-relative paths. Does not return file contents or modify state.",
      inputSchema: noInputSchema,
      annotations: untrustedReadOnly,
      execute: async () => app.listFiles(),
    },
    {
      name: "read_file",
      title: "Read repository file",
      description: "Read one file from the current repository by its exact repository-relative path. Does not modify state.",
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Exact repository-relative path, for example src/lib/api.ts.",
            minLength: 1,
            maxLength: 512,
          },
        },
        required: ["path"],
        additionalProperties: false,
      },
      annotations: untrustedReadOnly,
      execute: async (input) =>
        typeof input.path === "string"
          ? app.readFile({ path: input.path })
          : invalidInput("Path must be a string."),
    },
    {
      name: "search_code",
      title: "Search repository code",
      description: "Search repository file contents for literal, case-insensitive text and return matching lines and locations. Does not modify state.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Literal text to find in repository files.",
            minLength: 1,
            maxLength: 200,
          },
        },
        required: ["query"],
        additionalProperties: false,
      },
      annotations: untrustedReadOnly,
      execute: async (input) =>
        typeof input.query === "string"
          ? app.searchCode({ query: input.query })
          : invalidInput("Query must be a string."),
    },
    {
      name: "list_issues",
      title: "List repository issues",
      description: "List current repository issues in newest-first order. Does not modify state.",
      inputSchema: noInputSchema,
      annotations: untrustedReadOnly,
      execute: async () => app.listIssues(),
    },
    {
      name: "get_issue",
      title: "Get repository issue",
      description: "Return the complete current repository issue identified by its issue number. Does not modify state.",
      inputSchema: {
        type: "object",
        properties: {
          number: {
            type: "integer",
            description: "Positive repository issue number.",
            minimum: 1,
          },
        },
        required: ["number"],
        additionalProperties: false,
      },
      annotations: untrustedReadOnly,
      execute: async (input) =>
        typeof input.number === "number"
          ? app.getIssue({ number: input.number })
          : invalidInput("Issue number must be a number."),
    },
    {
      name: "create_issue",
      title: "Create repository issue",
      description: "Create an open issue in the repository displayed by this page. This modifies in-memory state, increments the issue count, and immediately displays the issue in the React UI.",
      inputSchema: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Concise issue title.",
            minLength: 1,
            maxLength: 120,
          },
          body: {
            type: "string",
            description: "Issue details including evidence, impact, and recommended remediation.",
            minLength: 1,
            maxLength: 4000,
          },
        },
        required: ["title", "body"],
        additionalProperties: false,
      },
      annotations: {
        readOnlyHint: false,
        untrustedContentHint: true,
      },
      execute: async (input) => {
        if (typeof input.title !== "string" || typeof input.body !== "string") {
          return invalidInput("Title and body must be strings.");
        }
        // createIssue commits and synchronously notifies all subscribers before
        // this async callback is able to resolve its returned promise.
        return app.createIssue({ title: input.title, body: input.body });
      },
    },
  ];
}
