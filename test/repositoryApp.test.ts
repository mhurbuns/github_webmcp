import { describe, expect, it, vi } from "vitest";
import { RepositoryApp } from "../src/application/repositoryApp";
import { fixtureRepository } from "../src/data/fixtureRepository";

describe("RepositoryApp", () => {
  it("starts with an immutable shared workspace and empty transient state", () => {
    const app = new RepositoryApp(fixtureRepository);
    const initial = app.getSnapshot();

    expect(initial).toMatchObject({
      workspace: { activeTab: "code", openFilePath: null },
      annotations: [],
      draft: null,
      activities: [],
      webMcp: { status: "checking", discoveredToolNames: [] },
    });
    expect(app.getSnapshot()).toBe(initial);
  });

  it("publishes workspace navigation once per successful command", () => {
    const app = new RepositoryApp(fixtureRepository);
    const initial = app.getSnapshot();
    const subscriber = vi.fn();
    app.subscribe(subscriber);

    expect(app.openFile({ path: "src/App.tsx" })).toMatchObject({
      ok: true,
      result: { activeTab: "code", openFilePath: "src/App.tsx" },
    });
    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(app.setActiveTab("code")).toMatchObject({ ok: true });
    expect(app.getSnapshot().workspace).toMatchObject({ openFilePath: "src/App.tsx" });
    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(initial.workspace.openFilePath).toBeNull();
    expect(app.getSnapshot()).not.toBe(initial);

    expect(app.setActiveTab("issues")).toMatchObject({
      ok: true,
      result: { activeTab: "issues", activeIssueNumber: 2, issueFilter: "open" },
    });
    expect(app.openIssue({ number: 1 })).toMatchObject({ ok: true });
    expect(app.setIssueFilter("all")).toMatchObject({ ok: true });
    expect(subscriber).toHaveBeenCalledTimes(4);
    expect(app.getWorkspace()).toMatchObject({
      ok: true,
      result: { activeTab: "issues", openFilePath: null, activeIssueNumber: 1, issueFilter: "all" },
    });
  });

  it("does not publish invalid workspace changes", () => {
    const app = new RepositoryApp(fixtureRepository);
    const subscriber = vi.fn();
    app.subscribe(subscriber);

    expect(app.openFile({ path: "missing.ts" })).toMatchObject({ ok: false });
    expect(app.openIssue({ number: 99 })).toMatchObject({ ok: false });
    expect(app.setIssueFilter("all")).toMatchObject({
      ok: false,
      error: { code: "INVALID_STATE" },
    });
    expect(subscriber).not.toHaveBeenCalled();
  });

  it("validates annotations against the live file and notifies before returning", () => {
    const app = new RepositoryApp(fixtureRepository);
    app.openFile({ path: "src/lib/session.ts" });
    const subscriber = vi.fn(() => {
      expect(app.getSnapshot().annotations).toHaveLength(1);
    });
    app.subscribe(subscriber);

    const result = app.annotateCode({
      path: "src/lib/session.ts",
      line: 8,
      severity: "critical",
      note: "  Sensitive value reaches diagnostic output.  ",
    });
    expect(result).toMatchObject({
      ok: true,
      result: { annotation: { id: "annotation-1", line: 8, note: "Sensitive value reaches diagnostic output." } },
    });
    expect(subscriber).toHaveBeenCalledOnce();
    expect(app.annotateCode({ path: "README.md", line: 1, severity: "low", note: "Stale" }))
      .toMatchObject({ ok: false, error: { code: "INVALID_STATE" } });
    expect(app.annotateCode({ path: "src/lib/session.ts", line: 999, severity: "low", note: "Bad line" }))
      .toMatchObject({ ok: false, error: { code: "INVALID_ARGUMENT" } });
  });

  it("enforces the complete draft lifecycle and monotonic revisions", () => {
    const app = new RepositoryApp(fixtureRepository);
    app.openFile({ path: "src/lib/session.ts" });
    const annotation = app.annotateCode({
      path: "src/lib/session.ts",
      line: 8,
      severity: "high",
      note: "Review this data flow.",
    });
    if (!annotation.ok) throw new Error("Fixture annotation failed");

    const proposed = app.proposeIssue({
      title: "  Review diagnostic data  ",
      body: "  Sensitive input reaches the diagnostic event.  ",
      sourcePath: "src/lib/session.ts",
      annotationIds: [annotation.result.annotation.id],
    });
    expect(proposed).toMatchObject({
      ok: true,
      result: { draft: { id: "draft-1", revision: 1, status: "pending" } },
    });
    expect(app.getSnapshot().issues).toHaveLength(2);
    expect(app.approveIssueDraft({ draftId: "draft-1" })).toMatchObject({
      ok: true,
      result: { draft: { status: "approved", approvedRevision: 1 } },
    });
    expect(app.editIssueDraft({ draftId: "draft-1", title: "Edited title", body: "Edited body" }))
      .toMatchObject({
        ok: true,
        result: { draft: { revision: 2, status: "pending", approvedRevision: null } },
      });
    expect(app.approveIssueDraft({ draftId: "draft-1" })).toMatchObject({ ok: true });
    expect(app.dismissIssueDraft({ draftId: "draft-1" })).toMatchObject({
      ok: true,
      result: { draft: { status: "dismissed" } },
    });
    expect(app.editIssueDraft({ draftId: "draft-1", title: "No", body: "No" }))
      .toMatchObject({ ok: false, error: { code: "INVALID_STATE" } });
  });

  it("replaces the single actionable draft with a new monotonic identifier", () => {
    const app = new RepositoryApp(fixtureRepository);
    app.openFile({ path: "src/App.tsx" });
    app.proposeIssue({ title: "First", body: "First body", sourcePath: "src/App.tsx" });
    app.proposeIssue({ title: "Second", body: "Second body", sourcePath: "src/App.tsx" });
    expect(app.getSnapshot().draft).toMatchObject({ id: "draft-2", title: "Second" });
  });

  it("returns repository metadata with live counts", () => {
    const app = new RepositoryApp(fixtureRepository);
    expect(app.getRepoInfo()).toMatchObject({
      ok: true,
      result: { fullName: "northstar-labs/customer-portal", fileCount: 11, openIssueCount: 2 },
    });
  });

  it("lists files in stable path order without content", () => {
    const app = new RepositoryApp(fixtureRepository);
    const result = app.listFiles();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.files[0].path).toBe("package.json");
    expect(result.result.files.at(-1)?.path).toBe("vite.config.ts");
    expect(result.result.files[0]).not.toHaveProperty("content");
  });

  it("reads exact files and rejects unsafe or missing paths", () => {
    const app = new RepositoryApp(fixtureRepository);
    expect(app.readFile({ path: "README.md" })).toMatchObject({ ok: true });
    expect(app.readFile({ path: "../README.md" })).toMatchObject({
      ok: false,
      error: { code: "INVALID_ARGUMENT" },
    });
    expect(app.readFile({ path: "missing.ts" })).toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND" },
    });
  });

  it("searches literally, case-insensitively, with one-based locations", () => {
    const app = new RepositoryApp(fixtureRepository);
    const result = app.searchCode({ query: "ProfileForm" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.totalMatches).toBeGreaterThan(1);
    expect(result.result.matches[0]).toMatchObject({
      path: "src/App.tsx",
      line: 2,
      column: 10,
    });
  });

  it("lists and gets issues with structured errors", () => {
    const app = new RepositoryApp(fixtureRepository);
    expect(app.listIssues()).toMatchObject({ ok: true, result: { total: 2 } });
    expect(app.getIssue({ number: 1 })).toMatchObject({ ok: true, result: { number: 1 } });
    expect(app.getIssue({ number: 99 })).toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND" },
    });
  });

  it("commits an approved draft exactly once and notifies synchronously", () => {
    const app = new RepositoryApp(fixtureRepository, () => new Date("2026-08-27T08:00:00.000Z"));
    app.openFile({ path: "src/lib/session.ts" });
    const proposal = app.proposeIssue({
      title: "  Review finding  ",
      body: "  Details  ",
      sourcePath: "src/lib/session.ts",
    });
    if (!proposal.ok) throw new Error("Fixture proposal failed");
    app.approveIssueDraft({ draftId: proposal.result.draft.id });
    const subscriber = vi.fn(() => {
      expect(app.getSnapshot().issues[0].number).toBe(3);
      expect(app.getSnapshot().draft?.status).toBe("committed");
    });
    app.subscribe(subscriber);

    const result = app.createIssueFromDraft({ draftId: proposal.result.draft.id });

    expect(subscriber).toHaveBeenCalledOnce();
    expect(result).toEqual({
      ok: true,
      result: {
        issue: {
          number: 3,
          title: "Review finding",
          body: "Details",
          state: "open",
          createdAt: "2026-08-27T08:00:00.000Z",
        },
      },
    });
    expect(app.getSnapshot().workspace).toMatchObject({
      activeTab: "issues",
      activeIssueNumber: 3,
    });
    expect(app.createIssueFromDraft({ draftId: proposal.result.draft.id })).toMatchObject({
      ok: false,
      error: { code: "INVALID_STATE" },
    });
    expect(app.getSnapshot().issues).toHaveLength(3);
    expect(subscriber).toHaveBeenCalledOnce();
  });

  it("rejects missing, stale, pending, and dismissed issue creation", () => {
    const app = new RepositoryApp(fixtureRepository);
    expect(app.createIssueFromDraft({ draftId: "draft-1" })).toMatchObject({ ok: false });
    app.openFile({ path: "src/App.tsx" });
    const proposal = app.proposeIssue({ title: "Finding", body: "Evidence", sourcePath: "src/App.tsx" });
    if (!proposal.ok) throw new Error("Fixture proposal failed");
    expect(app.createIssueFromDraft({ draftId: proposal.result.draft.id })).toMatchObject({
      ok: false,
      error: { code: "INVALID_STATE" },
    });
    expect(app.createIssueFromDraft({ draftId: "draft-999" })).toMatchObject({ ok: false });
    app.dismissIssueDraft({ draftId: proposal.result.draft.id });
    expect(app.createIssueFromDraft({ draftId: proposal.result.draft.id })).toMatchObject({ ok: false });
    expect(app.getSnapshot().issues).toHaveLength(2);
  });

  it("records a bounded newest-first tool activity feed", () => {
    const app = new RepositoryApp(fixtureRepository);
    const first = app.startToolActivity({ toolName: "read_file", argumentSummary: "path=README.md" });
    if (!first.ok) throw new Error("Fixture activity failed");
    expect(app.getSnapshot().activities[0]).toMatchObject({
      id: "activity-1",
      status: "running",
      durationMs: null,
    });
    expect(app.finishToolActivity({
      activityId: first.result.activity.id,
      status: "succeeded",
      durationMs: 12.6,
      outcomeSummary: "Read README.md (13 lines)",
    })).toMatchObject({
      ok: true,
      result: { activity: { status: "succeeded", durationMs: 13 } },
    });
    expect(app.finishToolActivity({
      activityId: first.result.activity.id,
      status: "failed",
      durationMs: 15,
      outcomeSummary: "Do not overwrite",
    })).toMatchObject({ ok: false, error: { code: "CONFLICT" } });

    for (let index = 0; index < 52; index += 1) {
      app.startToolActivity({ toolName: "list_files", argumentSummary: "x".repeat(300) });
    }
    expect(app.getSnapshot().activities).toHaveLength(50);
    expect(app.getSnapshot().activities[0]).toMatchObject({ id: "activity-53" });
    expect(app.getSnapshot().activities[0].argumentSummary).toHaveLength(240);
    expect(new Set(app.getSnapshot().activities.map(({ id }) => id)).size).toBe(50);
  });
});
