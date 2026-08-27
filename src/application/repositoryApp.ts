import type {
  AppResult,
  FixtureRepository,
  Issue,
  RepositorySnapshot,
} from "../domain/types";

type Listener = () => void;
type Clock = () => Date;

const success = <T>(result: T): AppResult<T> => ({ ok: true, result });
const failure = (code: "INVALID_ARGUMENT" | "NOT_FOUND", message: string) => ({
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

export class RepositoryApp {
  private readonly listeners = new Set<Listener>();
  private snapshot: RepositorySnapshot;

  constructor(
    private readonly fixture: FixtureRepository,
    private readonly clock: Clock = () => new Date(),
  ) {
    this.snapshot = {
      issues: [...fixture.issues].sort((a, b) => b.number - a.number),
      lastCreatedIssue: null,
    };
  }

  readonly subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly getSnapshot = () => this.snapshot;

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

  createIssue(input: { title: string; body: string }): AppResult<{ issue: Issue }> {
    const title = input.title.trim();
    const body = input.body.trim();
    if (title.length === 0 || title.length > 120) {
      return failure("INVALID_ARGUMENT", "Title must contain 1 to 120 characters.");
    }
    if (body.length === 0 || body.length > 4000) {
      return failure("INVALID_ARGUMENT", "Body must contain 1 to 4000 characters.");
    }

    const issue: Issue = {
      number: Math.max(0, ...this.snapshot.issues.map(({ number }) => number)) + 1,
      title,
      body,
      state: "open",
      createdAt: this.clock().toISOString(),
    };

    this.snapshot = {
      issues: [issue, ...this.snapshot.issues],
      lastCreatedIssue: issue,
    };

    // Notifications are synchronous so observers see the mutation before a
    // WebMCP execute callback can resolve with the created issue.
    for (const listener of this.listeners) listener();

    return success({ issue });
  }
}
