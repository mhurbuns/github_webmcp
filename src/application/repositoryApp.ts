import type {
  AnnotationSeverity,
  AppResult,
  ErrorCode,
  FixtureRepository,
  Issue,
  RepositorySnapshot,
  Workspace,
} from "../domain/types";

type Listener = () => void;
type Clock = () => Date;

const success = <T>(result: T): AppResult<T> => ({ ok: true, result });
const failure = (code: ErrorCode, message: string) => ({
  ok: false as const,
  error: { code, message },
});

function sizeBytes(value: string) {
  return new TextEncoder().encode(value).byteLength;
}

function validRepositoryPath(path: string) {
  return (
    path.length > 0 &&
    path.length <= 512 &&
    !path.startsWith("/") &&
    !path.startsWith("./") &&
    !path.split("/").some((segment) => segment === "" || segment === "..")
  );
}

const annotationSeverities: readonly AnnotationSeverity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
];

function validateIssueText(titleValue: string, bodyValue: string) {
  const title = titleValue.trim();
  const body = bodyValue.trim();
  if (title.length === 0 || title.length > 120) {
    return failure("INVALID_ARGUMENT", "Title must contain 1 to 120 characters.");
  }
  if (body.length === 0 || body.length > 4000) {
    return failure("INVALID_ARGUMENT", "Body must contain 1 to 4000 characters.");
  }
  return success({ title, body });
}

export class RepositoryApp {
  private readonly listeners = new Set<Listener>();
  private snapshot: RepositorySnapshot;
  private nextAnnotationId = 1;
  private nextDraftId = 1;
  private nextActivityId = 1;

  constructor(
    private readonly fixture: FixtureRepository,
    private readonly clock: Clock = () => new Date(),
  ) {
    this.snapshot = {
      issues: [...fixture.issues].sort((a, b) => b.number - a.number),
      lastCreatedIssue: null,
      workspace: {
        activeTab: "code",
        openFilePath: null,
        activeIssueNumber: null,
        issueFilter: null,
      },
      annotations: [],
      draft: null,
      activities: [],
      webMcp: {
        status: "checking",
        discoveredToolNames: [],
        message: null,
      },
    };
  }

  readonly subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly getSnapshot = () => this.snapshot;

  private publish(next: RepositorySnapshot) {
    this.snapshot = next;
    for (const listener of this.listeners) listener();
  }

  getWorkspace() {
    return success({ ...this.snapshot.workspace });
  }

  setActiveTab(tab: Workspace["activeTab"]) {
    if (this.snapshot.workspace.activeTab === tab) {
      return success(this.snapshot.workspace);
    }
    const workspace: Workspace = tab === "code"
      ? {
          activeTab: "code",
          openFilePath: null,
          activeIssueNumber: null,
          issueFilter: null,
        }
      : {
          activeTab: "issues",
          openFilePath: null,
          activeIssueNumber: this.snapshot.issues[0]?.number ?? null,
          issueFilter: "open",
        };
    this.publish({ ...this.snapshot, workspace });
    return success(workspace);
  }

  openFile(input: { path: string }) {
    const path = input.path.trim();
    if (!validRepositoryPath(path)) {
      return failure("INVALID_ARGUMENT", "Path must be a valid repository-relative path.");
    }
    if (!this.fixture.files.some((file) => file.path === path)) {
      return failure("NOT_FOUND", `File not found: ${path}`);
    }
    const workspace: Workspace = {
      activeTab: "code",
      openFilePath: path,
      activeIssueNumber: null,
      issueFilter: null,
    };
    this.publish({ ...this.snapshot, workspace });
    return success(workspace);
  }

  openIssue(input: { number: number }) {
    const found = this.getIssue(input);
    if (!found.ok) return found;
    const workspace: Workspace = {
      activeTab: "issues",
      openFilePath: null,
      activeIssueNumber: input.number,
      issueFilter: this.snapshot.workspace.activeTab === "issues"
        ? this.snapshot.workspace.issueFilter
        : "open",
    };
    this.publish({ ...this.snapshot, workspace });
    return success(workspace);
  }

  setIssueFilter(issueFilter: "open" | "all") {
    if (this.snapshot.workspace.activeTab !== "issues") {
      return {
        ok: false as const,
        error: { code: "INVALID_STATE" as const, message: "Issue filters require the Issues tab." },
      };
    }
    const workspace: Workspace = { ...this.snapshot.workspace, issueFilter };
    this.publish({ ...this.snapshot, workspace });
    return success(workspace);
  }

  annotateCode(input: {
    path: string;
    line: number;
    severity: AnnotationSeverity;
    note: string;
  }) {
    const workspace = this.snapshot.workspace;
    if (workspace.activeTab !== "code" || workspace.openFilePath !== input.path) {
      return failure("INVALID_STATE", "Annotations must target the file currently open on the Code tab.");
    }
    const file = this.fixture.files.find(({ path }) => path === input.path);
    const lineCount = file?.content === "" ? 0 : file?.content.split("\n").length ?? 0;
    if (!Number.isInteger(input.line) || input.line < 1 || input.line > lineCount) {
      return failure("INVALID_ARGUMENT", `Line must be between 1 and ${lineCount}.`);
    }
    if (!annotationSeverities.includes(input.severity)) {
      return failure("INVALID_ARGUMENT", "Severity is not supported.");
    }
    const note = input.note.trim();
    if (note.length === 0 || note.length > 500) {
      return failure("INVALID_ARGUMENT", "Annotation note must contain 1 to 500 characters.");
    }
    const annotation = {
      id: `annotation-${this.nextAnnotationId++}`,
      path: input.path,
      line: input.line,
      severity: input.severity,
      note,
      createdAt: this.clock().toISOString(),
    };
    this.publish({
      ...this.snapshot,
      annotations: [...this.snapshot.annotations, annotation],
    });
    return success({ annotation });
  }

  proposeIssue(input: {
    title: string;
    body: string;
    sourcePath: string;
    annotationIds?: readonly string[];
  }) {
    const workspace = this.snapshot.workspace;
    if (workspace.activeTab !== "code" || workspace.openFilePath !== input.sourcePath) {
      return failure("INVALID_STATE", "Issue proposals must reference the file currently open on the Code tab.");
    }
    const text = validateIssueText(input.title, input.body);
    if (!text.ok) return text;
    const annotationIds = [...new Set(input.annotationIds ?? [])];
    if (annotationIds.length > 20) {
      return failure("INVALID_ARGUMENT", "A proposal can reference at most 20 annotations.");
    }
    const validIds = new Set(
      this.snapshot.annotations
        .filter(({ path }) => path === input.sourcePath)
        .map(({ id }) => id),
    );
    if (annotationIds.some((id) => !validIds.has(id))) {
      return failure("INVALID_ARGUMENT", "Every annotation must exist on the proposal source file.");
    }
    const draft = {
      id: `draft-${this.nextDraftId++}`,
      revision: 1,
      approvedRevision: null,
      status: "pending" as const,
      title: text.result.title,
      body: text.result.body,
      sourcePath: input.sourcePath,
      annotationIds,
    };
    this.publish({ ...this.snapshot, draft });
    return success({ draft });
  }

  editIssueDraft(input: { draftId: string; title: string; body: string }) {
    const draft = this.snapshot.draft;
    if (!draft || draft.id !== input.draftId) {
      return failure("NOT_FOUND", "The requested issue draft is not current.");
    }
    if (draft.status === "dismissed" || draft.status === "committed") {
      return failure("INVALID_STATE", `A ${draft.status} draft cannot be edited.`);
    }
    const text = validateIssueText(input.title, input.body);
    if (!text.ok) return text;
    const updated = {
      ...draft,
      revision: draft.revision + 1,
      approvedRevision: null,
      status: "pending" as const,
      title: text.result.title,
      body: text.result.body,
    };
    this.publish({ ...this.snapshot, draft: updated });
    return success({ draft: updated });
  }

  approveIssueDraft(input: { draftId: string }) {
    const draft = this.snapshot.draft;
    if (!draft || draft.id !== input.draftId) {
      return failure("NOT_FOUND", "The requested issue draft is not current.");
    }
    if (draft.status !== "pending") {
      return failure("INVALID_STATE", "Only a pending draft can be approved.");
    }
    const approved = {
      ...draft,
      status: "approved" as const,
      approvedRevision: draft.revision,
    };
    this.publish({ ...this.snapshot, draft: approved });
    return success({ draft: approved });
  }

  dismissIssueDraft(input: { draftId: string }) {
    const draft = this.snapshot.draft;
    if (!draft || draft.id !== input.draftId) {
      return failure("NOT_FOUND", "The requested issue draft is not current.");
    }
    if (draft.status !== "pending" && draft.status !== "approved") {
      return failure("INVALID_STATE", "Only a pending or approved draft can be dismissed.");
    }
    const dismissed = { ...draft, status: "dismissed" as const };
    this.publish({ ...this.snapshot, draft: dismissed });
    return success({ draft: dismissed });
  }

  startToolActivity(input: { toolName: string; argumentSummary: string }) {
    const toolName = input.toolName.trim();
    if (!/^[a-z][a-z0-9_]{0,63}$/.test(toolName)) {
      return failure("INVALID_ARGUMENT", "Tool activity requires a valid tool name.");
    }
    const activity = {
      id: `activity-${this.nextActivityId++}`,
      toolName,
      argumentSummary: input.argumentSummary.slice(0, 240),
      startedAt: this.clock().toISOString(),
      status: "running" as const,
      durationMs: null,
      outcomeSummary: null,
    };
    this.publish({
      ...this.snapshot,
      activities: [activity, ...this.snapshot.activities].slice(0, 50),
    });
    return success({ activity });
  }

  finishToolActivity(input: {
    activityId: string;
    status: "succeeded" | "failed";
    durationMs: number;
    outcomeSummary: string;
  }) {
    const activity = this.snapshot.activities.find(({ id }) => id === input.activityId);
    if (!activity) return failure("NOT_FOUND", "Tool activity was not found.");
    if (activity.status !== "running") {
      return failure("CONFLICT", "Tool activity has already finished.");
    }
    const completed = {
      ...activity,
      status: input.status,
      durationMs: Math.max(0, Math.round(input.durationMs)),
      outcomeSummary: input.outcomeSummary.slice(0, 240),
    };
    this.publish({
      ...this.snapshot,
      activities: this.snapshot.activities.map((candidate) =>
        candidate.id === activity.id ? completed : candidate),
    });
    return success({ activity: completed });
  }

  setWebMcpIntegration(input: {
    status: RepositorySnapshot["webMcp"]["status"];
    discoveredToolNames: readonly string[];
    message?: string | null;
  }) {
    const webMcp = {
      status: input.status,
      discoveredToolNames: [...input.discoveredToolNames].sort(),
      message: input.message ?? null,
    };
    const current = this.snapshot.webMcp;
    if (
      current.status === webMcp.status &&
      current.message === webMcp.message &&
      current.discoveredToolNames.join("\0") === webMcp.discoveredToolNames.join("\0")
    ) return success({ webMcp: current });
    this.publish({ ...this.snapshot, webMcp });
    return success({ webMcp });
  }

  getRepoInfo() {
    return success({
      ...this.fixture.info,
      fileCount: this.fixture.files.length,
      openIssueCount: this.snapshot.issues.length,
    });
  }

  listFiles() {
    return success({
      files: [...this.fixture.files]
        .sort((a, b) => a.path.localeCompare(b.path))
        .map(({ path, language, content }) => ({
          path,
          kind: "file" as const,
          language,
          sizeBytes: sizeBytes(content),
        })),
    });
  }

  readFile(input: { path: string }) {
    const path = input.path.trim();
    if (!validRepositoryPath(path)) {
      return failure("INVALID_ARGUMENT", "Path must be a valid repository-relative path.");
    }

    const file = this.fixture.files.find((candidate) => candidate.path === path);
    if (!file) return failure("NOT_FOUND", `File not found: ${path}`);

    return success({
      path: file.path,
      language: file.language,
      content: file.content,
      lineCount: file.content === "" ? 0 : file.content.split("\n").length,
      sizeBytes: sizeBytes(file.content),
    });
  }

  searchCode(input: { query: string }) {
    const query = input.query.trim();
    if (query.length === 0 || query.length > 200) {
      return failure("INVALID_ARGUMENT", "Query must contain 1 to 200 non-whitespace characters.");
    }

    const needle = query.toLocaleLowerCase();
    const allMatches = this.fixture.files
      .flatMap((file) =>
        file.content.split("\n").flatMap((preview, index) => {
          const matches = [];
          const haystack = preview.toLocaleLowerCase();
          let from = 0;

          while (from <= haystack.length - needle.length) {
            const column = haystack.indexOf(needle, from);
            if (column === -1) break;
            matches.push({ path: file.path, line: index + 1, column: column + 1, preview });
            from = column + Math.max(needle.length, 1);
          }

          return matches;
        }),
      )
      .sort((a, b) =>
        a.path.localeCompare(b.path) || a.line - b.line || a.column - b.column,
      );

    return success({
      query,
      matches: allMatches.slice(0, 50),
      totalMatches: allMatches.length,
      truncated: allMatches.length > 50,
    });
  }

  listIssues() {
    return success({
      issues: this.snapshot.issues.map(({ number, title, state, createdAt }) => ({
        number,
        title,
        state,
        createdAt,
      })),
      total: this.snapshot.issues.length,
    });
  }

  getIssue(input: { number: number }) {
    if (!Number.isInteger(input.number) || input.number < 1) {
      return failure("INVALID_ARGUMENT", "Issue number must be a positive integer.");
    }
    const issue = this.snapshot.issues.find((candidate) => candidate.number === input.number);
    return issue ? success(issue) : failure("NOT_FOUND", `Issue #${input.number} was not found.`);
  }

  createIssueFromDraft(input: { draftId: string }): AppResult<{ issue: Issue }> {
    const draft = this.snapshot.draft;
    if (!draft || draft.id !== input.draftId) {
      return failure("INVALID_STATE", "Human approval of the current issue draft is required.");
    }
    if (draft.status !== "approved") {
      return failure("INVALID_STATE", `The current issue draft is ${draft.status}, not approved.`);
    }
    if (draft.approvedRevision !== draft.revision) {
      return failure("INVALID_STATE", "The approved issue draft changed and must be approved again.");
    }
    const issue: Issue = {
      number: Math.max(0, ...this.snapshot.issues.map(({ number }) => number)) + 1,
      title: draft.title,
      body: draft.body,
      state: "open",
      createdAt: this.clock().toISOString(),
    };

    this.publish({
      ...this.snapshot,
      issues: [issue, ...this.snapshot.issues],
      lastCreatedIssue: issue,
      workspace: {
        activeTab: "issues",
        openFilePath: null,
        activeIssueNumber: issue.number,
        issueFilter: "open",
      },
      draft: { ...draft, status: "committed" },
    });

    return success({ issue });
  }

}
