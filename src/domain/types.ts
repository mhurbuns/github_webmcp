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
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR";

export type AppResult<T> =
  | { ok: true; result: T }
  | { ok: false; error: { code: ErrorCode; message: string } };

export interface RepositorySnapshot {
  issues: readonly Issue[];
  lastCreatedIssue: Issue | null;
}
