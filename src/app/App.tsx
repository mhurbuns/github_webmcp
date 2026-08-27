import { useMemo, useState, useSyncExternalStore } from "react";
import type { RepositoryApp } from "../application/repositoryApp";
import type { Issue } from "../domain/types";

type Tab = "code" | "issues";

interface AppProps {
  repositoryApp: RepositoryApp;
  webMcpStatus: "checking" | "ready" | "unavailable" | "failed";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function StatusBadge({ status }: { status: AppProps["webMcpStatus"] }) {
  const labels = {
    checking: "Checking WebMCP",
    ready: "WebMCP ready",
    unavailable: "WebMCP unavailable",
    failed: "WebMCP registration failed",
  };
  return (
    <span className={`integration-status integration-status--${status}`}>
      <span className="status-dot" aria-hidden="true" />
      {labels[status]}
    </span>
  );
}

function FileGlyph({ language }: { language: string | null }) {
  const label = language === "Markdown" ? "MD" : language === "JSON" ? "{}" : "TS";
  return <span className="file-glyph" aria-hidden="true">{label}</span>;
}

function CodeView({ content }: { content: string }) {
  return (
    <pre className="code-view" aria-label="File contents">
      {content.split("\n").map((line, index) => (
        <span className="code-line" key={`${index}-${line}`}>
          <span className="line-number" aria-hidden="true">{index + 1}</span>
          <code>{line || " "}</code>
        </span>
      ))}
    </pre>
  );
}

function CodeWorkspace({ repositoryApp }: { repositoryApp: RepositoryApp }) {
  const filesResult = repositoryApp.listFiles();
  const files = filesResult.ok ? filesResult.result.files : [];
  const [selectedPath, setSelectedPath] = useState("README.md");
  const selected = repositoryApp.readFile({ path: selectedPath });

  return (
    <section className="workspace" aria-label="Repository files">
      <aside className="file-panel">
        <div className="panel-heading">
          <span>Files</span>
          <span className="muted-count">{files.length}</span>
        </div>
        <div className="file-list">
          {files.map((file) => (
            <button
              className={`file-row ${selectedPath === file.path ? "file-row--active" : ""}`}
              key={file.path}
              onClick={() => setSelectedPath(file.path)}
              type="button"
            >
              <FileGlyph language={file.language} />
              <span>{file.path}</span>
            </button>
          ))}
        </div>
      </aside>

      <article className="code-panel">
        {selected.ok ? (
          <>
            <header className="code-header">
              <div>
                <span className="eyebrow">main</span>
                <h2>{selected.result.path}</h2>
              </div>
              <div className="file-meta">
                <span>{selected.result.language}</span>
                <span>{selected.result.lineCount} lines</span>
              </div>
            </header>
            <CodeView content={selected.result.content} />
          </>
        ) : (
          <p className="empty-state">This file could not be read.</p>
        )}
      </article>
    </section>
  );
}

function IssueDetail({ issue }: { issue: Issue }) {
  return (
    <article className="issue-detail">
      <div className="issue-detail__heading">
        <span className="open-pill">Open</span>
        <span className="issue-number">Issue #{issue.number}</span>
      </div>
      <h2>{issue.title}</h2>
      <p className="issue-date">Opened {formatDate(issue.createdAt)}</p>
      <div className="issue-body">{issue.body}</div>
    </article>
  );
}

function IssuesWorkspace({ repositoryApp, issues }: { repositoryApp: RepositoryApp; issues: readonly Issue[] }) {
  const [selectedNumber, setSelectedNumber] = useState(issues[0]?.number ?? 1);
  const selectedResult = repositoryApp.getIssue({ number: selectedNumber });
  const selected = selectedResult.ok ? selectedResult.result : issues[0];

  return (
    <section className="workspace issues-workspace" aria-label="Repository issues">
      <aside className="issue-panel">
        <div className="panel-heading">
          <span>Open issues</span>
          <span className="muted-count">{issues.length}</span>
        </div>
        <div className="issue-list">
          {issues.map((issue) => (
            <button
              className={`issue-row ${selected?.number === issue.number ? "issue-row--active" : ""}`}
              key={issue.number}
              onClick={() => setSelectedNumber(issue.number)}
              type="button"
            >
              <span className="issue-icon" aria-hidden="true">○</span>
              <span>
                <strong>{issue.title}</strong>
                <small>#{issue.number} · {formatDate(issue.createdAt)}</small>
              </span>
            </button>
          ))}
        </div>
      </aside>
      {selected ? <IssueDetail issue={selected} /> : <p className="empty-state">No open issues.</p>}
    </section>
  );
}

export function App({ repositoryApp, webMcpStatus }: AppProps) {
  const snapshot = useSyncExternalStore(
    repositoryApp.subscribe,
    repositoryApp.getSnapshot,
    repositoryApp.getSnapshot,
  );
  const [tab, setTab] = useState<Tab>("code");
  const repoInfo = repositoryApp.getRepoInfo();
  const info = repoInfo.ok ? repoInfo.result : null;
  const issueCount = snapshot.issues.length;
  const breadcrumbs = useMemo(() => info?.fullName.split("/") ?? [], [info?.fullName]);

  if (!info) return <main className="fatal-state">Repository information is unavailable.</main>;

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Repository playground home">
          <span className="brand-mark">R</span>
          <span>RepoScope</span>
        </a>
        <StatusBadge status={webMcpStatus} />
      </header>

      <main id="top">
        <section className="repo-hero">
          <div className="repo-title-row">
            <div>
              <div className="breadcrumbs">
                <span>{breadcrumbs[0]}</span><span>/</span><strong>{breadcrumbs[1]}</strong>
                <span className="visibility-pill">Public fixture</span>
              </div>
              <p>{info.description}</p>
            </div>
            <div className="branch-chip"><span aria-hidden="true">⑂</span> {info.defaultBranch}</div>
          </div>

          <nav className="repo-tabs" aria-label="Repository sections">
            <button className={tab === "code" ? "active" : ""} onClick={() => setTab("code")} type="button">
              <span aria-hidden="true">⌘</span> Code
            </button>
            <button className={tab === "issues" ? "active" : ""} onClick={() => setTab("issues")} type="button">
              <span aria-hidden="true">○</span> Issues <span className="tab-count">{issueCount}</span>
            </button>
          </nav>
        </section>

        {snapshot.lastCreatedIssue && (
          <button className="mutation-banner" onClick={() => setTab("issues")} type="button">
            <span className="mutation-check" aria-hidden="true">✓</span>
            <span><strong>Issue #{snapshot.lastCreatedIssue.number} created</strong>{snapshot.lastCreatedIssue.title}</span>
            <span className="mutation-action">View issue →</span>
          </button>
        )}

        <div className="content-wrap">
          {tab === "code" ? (
            <CodeWorkspace repositoryApp={repositoryApp} />
          ) : (
            <IssuesWorkspace repositoryApp={repositoryApp} issues={snapshot.issues} />
          )}
        </div>
      </main>
    </div>
  );
}
