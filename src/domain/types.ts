export interface RepositoryInfo {
  owner: string;
  name: string;
  fullName: string;
  description: string;
  defaultBranch: string;
}

export interface RepositoryFile {
  path: string;
  language: string | null;
  content: string;
}

export interface Issue {
  number: number;
  title: string;
  body: string;
  state: "open";
  createdAt: string;
}

export interface FixtureRepository {
  info: RepositoryInfo;
  files: readonly RepositoryFile[];
  issues: readonly Issue[];
}

export type ErrorCode =
  | "INVALID_ARGUMENT"
  | "INVALID_STATE"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR";

export type AppResult<T> =
  | { ok: true; result: T }
  | { ok: false; error: { code: ErrorCode; message: string } };

export type Workspace =
  | {
      activeTab: "code";
      openFilePath: string | null;
      activeIssueNumber: null;
      issueFilter: null;
    }
  | {
      activeTab: "issues";
      openFilePath: null;
      activeIssueNumber: number | null;
      issueFilter: "open" | "all";
    };

export type AnnotationSeverity = "critical" | "high" | "medium" | "low" | "info";

export interface CodeAnnotation {
  id: string;
  path: string;
  line: number;
  severity: AnnotationSeverity;
  note: string;
  createdAt: string;
}

export type IssueDraftStatus = "pending" | "approved" | "dismissed" | "committed";

export interface IssueDraft {
  id: string;
  revision: number;
  approvedRevision: number | null;
  status: IssueDraftStatus;
  title: string;
  body: string;
  sourcePath: string;
  annotationIds: readonly string[];
}

export type ToolActivityStatus = "running" | "succeeded" | "failed";

export interface ToolActivity {
  id: string;
  toolName: string;
  argumentSummary: string;
  startedAt: string;
  status: ToolActivityStatus;
  durationMs: number | null;
  outcomeSummary: string | null;
}

export type WebMcpIntegrationStatus = "checking" | "ready" | "unavailable" | "failed";

export interface WebMcpIntegration {
  status: WebMcpIntegrationStatus;
  discoveredToolNames: readonly string[];
  message: string | null;
}

export interface RepositorySnapshot {
  issues: readonly Issue[];
  lastCreatedIssue: Issue | null;
  workspace: Workspace;
  annotations: readonly CodeAnnotation[];
  draft: IssueDraft | null;
  activities: readonly ToolActivity[];
  webMcp: WebMcpIntegration;
}
