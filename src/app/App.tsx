import { useMemo, useSyncExternalStore } from "react";
import type { RepositoryApp } from "../application/repositoryApp";
import type { CodeAnnotation, Issue, WebMcpIntegration } from "../domain/types";
import { ReviewRail } from "./ReviewRail";

interface AppProps { repositoryApp: RepositoryApp }

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function StatusBadge({ integration }: { integration: WebMcpIntegration }) {
  const labels = { checking: "Checking WebMCP", ready: "WebMCP ready", unavailable: "WebMCP unavailable", failed: "WebMCP verification failed" };
  return <span className={`integration-status integration-status--${integration.status}`} role="status"><span className="status-dot" aria-hidden="true" />{labels[integration.status]}<span className="tool-count">{integration.discoveredToolNames.length} tools</span></span>;
}

function FileGlyph({ language }: { language: string | null }) {
  const label = language === "Markdown" ? "MD" : language === "JSON" ? "{}" : "TS";
  return <span className="file-glyph" aria-hidden="true">{label}</span>;
}

function CodeView({ content, annotations }: { content: string; annotations: readonly CodeAnnotation[] }) {
  return <pre className="code-view" aria-label="File contents">{content.split("\n").map((line, index) => {
    const lineNumber = index + 1;
    const findings = annotations.filter((annotation) => annotation.line === lineNumber);
    return <span className={`code-line ${findings.length ? "code-line--annotated" : ""}`} key={`${index}-${line}`}><span className="line-number" aria-hidden="true">{lineNumber}</span><code>{line || " "}</code>{findings.map((annotation) => <span className={`line-annotation severity-border--${annotation.severity}`} key={annotation.id}><strong>{annotation.severity}</strong> {annotation.note}</span>)}</span>;
  })}</pre>;
}

function CodeWorkspace({ repositoryApp, path, annotations }: { repositoryApp: RepositoryApp; path: string | null; annotations: readonly CodeAnnotation[] }) {
  const filesResult = repositoryApp.listFiles();
  const files = filesResult.ok ? filesResult.result.files : [];
  const selected = path ? repositoryApp.readFile({ path }) : null;
  return <section className="workspace" aria-label="Repository files">
    <aside className="file-panel"><div className="panel-heading"><span>Files</span><span className="muted-count">{files.length}</span></div><div className="file-list">{files.map((file) => <button className={`file-row ${path === file.path ? "file-row--active" : ""}`} key={file.path} onClick={() => repositoryApp.openFile({ path: file.path })} type="button"><FileGlyph language={file.language} /><span>{file.path}</span></button>)}</div></aside>
    <article className="code-panel">{selected?.ok ? <><header className="code-header"><div><span className="eyebrow">main</span><h2>{selected.result.path}</h2></div><div className="file-meta"><span>{selected.result.language}</span><span>{selected.result.lineCount} lines</span></div></header><CodeView content={selected.result.content} annotations={annotations} /></> : <p className="empty-state">Select a file to inspect its contents.</p>}</article>
  </section>;
}

function IssueDetail({ issue }: { issue: Issue }) {
  return <article className="issue-detail"><div className="issue-detail__heading"><span className="open-pill">Open</span><span className="issue-number">Issue #{issue.number}</span></div><h2>{issue.title}</h2><p className="issue-date">Opened {formatDate(issue.createdAt)}</p><div className="issue-body">{issue.body}</div></article>;
}

function IssuesWorkspace({ repositoryApp, issues, activeNumber, filter }: { repositoryApp: RepositoryApp; issues: readonly Issue[]; activeNumber: number | null; filter: "open" | "all" }) {
  const selectedResult = activeNumber ? repositoryApp.getIssue({ number: activeNumber }) : null;
  const selected = selectedResult?.ok ? selectedResult.result : issues[0];
  return <section className="workspace issues-workspace" aria-label="Repository issues">
    <aside className="issue-panel"><div className="panel-heading"><span>Issues</span><label className="issue-filter">Show <select value={filter} onChange={(event) => repositoryApp.setIssueFilter(event.target.value as "open" | "all")}><option value="open">Open</option><option value="all">All</option></select></label></div><div className="issue-list">{issues.map((issue) => <button className={`issue-row ${selected?.number === issue.number ? "issue-row--active" : ""}`} key={issue.number} onClick={() => repositoryApp.openIssue({ number: issue.number })} type="button"><span className="issue-icon" aria-hidden="true">○</span><span><strong>{issue.title}</strong><small>#{issue.number} · {formatDate(issue.createdAt)}</small></span></button>)}</div></aside>
    {selected ? <IssueDetail issue={selected} /> : <p className="empty-state">No open issues.</p>}
  </section>;
}

export function App({ repositoryApp }: AppProps) {
  const snapshot = useSyncExternalStore(repositoryApp.subscribe, repositoryApp.getSnapshot, repositoryApp.getSnapshot);
  const repoInfo = repositoryApp.getRepoInfo();
  const info = repoInfo.ok ? repoInfo.result : null;
  const breadcrumbs = useMemo(() => info?.fullName.split("/") ?? [], [info?.fullName]);
  if (!info) return <main className="fatal-state">Repository information is unavailable.</main>;

  const { workspace } = snapshot;
  const annotations = workspace.activeTab === "code" && workspace.openFilePath ? snapshot.annotations.filter(({ path }) => path === workspace.openFilePath) : [];
  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="#top" aria-label="Repository playground home"><span className="brand-mark">R</span><span>RepoScope</span></a><StatusBadge integration={snapshot.webMcp} /></header>
    <main id="top">
      <section className="repo-hero"><div className="repo-title-row"><div><div className="breadcrumbs"><span>{breadcrumbs[0]}</span><span>/</span><strong>{breadcrumbs[1]}</strong><span className="visibility-pill">Public fixture</span></div><p>{info.description}</p></div><div className="branch-chip"><span aria-hidden="true">⑂</span> {info.defaultBranch}</div></div><nav className="repo-tabs" aria-label="Repository sections"><button className={workspace.activeTab === "code" ? "active" : ""} onClick={() => repositoryApp.setActiveTab("code")} type="button"><span aria-hidden="true">⌘</span> Code</button><button className={workspace.activeTab === "issues" ? "active" : ""} onClick={() => repositoryApp.setActiveTab("issues")} type="button"><span aria-hidden="true">○</span> Issues <span className="tab-count">{snapshot.issues.length}</span></button></nav></section>
      {snapshot.lastCreatedIssue && <button className="mutation-banner" onClick={() => repositoryApp.openIssue({ number: snapshot.lastCreatedIssue!.number })} type="button"><span className="mutation-check" aria-hidden="true">✓</span><span><strong>Issue #{snapshot.lastCreatedIssue.number} created</strong>{snapshot.lastCreatedIssue.title}</span><span className="mutation-action">View issue →</span></button>}
      <div className="content-wrap content-grid">{workspace.activeTab === "code" ? <CodeWorkspace repositoryApp={repositoryApp} path={workspace.openFilePath} annotations={annotations} /> : <IssuesWorkspace repositoryApp={repositoryApp} issues={snapshot.issues} activeNumber={workspace.activeIssueNumber} filter={workspace.issueFilter} />}<ReviewRail app={repositoryApp} annotations={annotations} draft={snapshot.draft} activities={snapshot.activities} /></div>
    </main>
  </div>;
}
