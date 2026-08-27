import { describe, expect, it, vi } from "vitest";
import { RepositoryApp } from "../src/application/repositoryApp";
import { fixtureRepository } from "../src/data/fixtureRepository";

describe("RepositoryApp", () => {
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

  it("commits and notifies synchronously before returning a created issue", () => {
    const app = new RepositoryApp(fixtureRepository, () => new Date("2026-08-27T08:00:00.000Z"));
    const subscriber = vi.fn(() => {
      expect(app.getSnapshot().issues[0].number).toBe(3);
    });
    app.subscribe(subscriber);

    const result = app.createIssue({ title: "  Review finding  ", body: "  Details  " });

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
  });
});
