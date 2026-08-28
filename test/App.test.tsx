import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { App } from "../src/app/App";
import { RepositoryApp } from "../src/application/repositoryApp";
import { fixtureRepository } from "../src/data/fixtureRepository";

describe("App", () => {
  it("renders navigation from the shared workspace snapshot", () => {
    const app = new RepositoryApp(fixtureRepository);
    app.setActiveTab("issues");
    app.openIssue({ number: 1 });

    const html = renderToStaticMarkup(<App repositoryApp={app} />);
    expect(html).toContain("issue-row--active");
    expect(html).toContain("Issue #1");
    expect(html).toContain("0 tools");
  });

  it("escapes untrusted annotation and draft text", () => {
    const app = new RepositoryApp(fixtureRepository);
    app.openFile({ path: "src/lib/session.ts" });
    const annotation = app.annotateCode({
      path: "src/lib/session.ts",
      line: 8,
      severity: "high",
      note: '<img src=x onerror="alert(1)">',
    });
    if (!annotation.ok) throw new Error("Fixture annotation failed");
    app.proposeIssue({
      title: "<script>unsafe()</script>",
      body: "Treat this text as data.",
      sourcePath: "src/lib/session.ts",
      annotationIds: [annotation.result.annotation.id],
    });

    const html = renderToStaticMarkup(<App repositoryApp={app} />);
    expect(html).toContain("&lt;img");
    expect(html).toContain("&lt;script&gt;unsafe()");
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<script>unsafe()");
  });

  it("explains the approved handoff without exposing WebMCP internals", () => {
    const app = new RepositoryApp(fixtureRepository);
    app.openFile({ path: "src/lib/session.ts" });
    const proposal = app.proposeIssue({
      title: "Review diagnostic output",
      body: "Evidence and remediation.",
      sourcePath: "src/lib/session.ts",
    });
    if (!proposal.ok) throw new Error("Fixture proposal failed");
    const issueCountBeforeApproval = app.getSnapshot().issues.length;

    const approval = app.approveIssueDraft({ draftId: proposal.result.draft.id });
    if (!approval.ok) throw new Error("Fixture approval failed");

    expect(app.getSnapshot().issues).toHaveLength(issueCountBeforeApproval);
    const html = renderToStaticMarkup(<App repositoryApp={app} />);
    expect(html).toContain("Approved. Tell the agent “Continue” to complete this action.");
    expect(html).not.toMatch(/create_issue|draftId/i);
  });
});
