import { useState, type FormEvent } from "react";
import type { RepositoryApp } from "../application/repositoryApp";
import type { CodeAnnotation, IssueDraft, ToolActivity } from "../domain/types";

function DraftCard({ app, draft }: { app: RepositoryApp; draft: IssueDraft }) {
  const [title, setTitle] = useState(draft.title);
  const [body, setBody] = useState(draft.body);
  const isDirty = title !== draft.title || body !== draft.body;

  function save(event: FormEvent) {
    event.preventDefault();
    app.editIssueDraft({ draftId: draft.id, title, body });
  }

  return (
    <form className="draft-card" onSubmit={save}>
      <div className="review-heading">
        <div><span className="eyebrow">Issue draft</span><h2>Human review</h2></div>
        <span className={`draft-status draft-status--${draft.status}`}>{draft.status}</span>
      </div>
      <label htmlFor="draft-title">Title</label>
      <input id="draft-title" value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} />
      <label htmlFor="draft-body">Description</label>
      <textarea id="draft-body" value={body} maxLength={4000} rows={6} onChange={(event) => setBody(event.target.value)} />
      <p className="draft-source">From {draft.sourcePath} · revision {draft.revision}</p>
      <div className="draft-actions">
        <button className="secondary-action" disabled={!isDirty} type="submit">Save changes</button>
        <button className="approve-action" disabled={isDirty || draft.status !== "pending"} onClick={() => app.approveIssueDraft({ draftId: draft.id })} type="button">Approve</button>
        <button className="dismiss-action" onClick={() => app.dismissIssueDraft({ draftId: draft.id })} type="button">Dismiss</button>
      </div>
      {draft.status === "approved" && !isDirty && <p className="approval-note" role="status">Approved. The agent can now create this exact issue.</p>}
    </form>
  );
}

function Findings({ annotations }: { annotations: readonly CodeAnnotation[] }) {
  return (
    <section className="review-section" aria-labelledby="findings-title">
      <div className="review-heading"><div><span className="eyebrow">Current file</span><h2 id="findings-title">Findings</h2></div><span className="muted-count">{annotations.length}</span></div>
      {annotations.length === 0 ? <p className="review-empty">Agent annotations will appear here and beside the relevant code line.</p> : (
        <ol className="finding-list">
          {annotations.map((annotation) => <li key={annotation.id}><span className={`severity severity--${annotation.severity}`}>{annotation.severity}</span><strong>Line {annotation.line}</strong><p>{annotation.note}</p></li>)}
        </ol>
      )}
    </section>
  );
}

function ActivityFeed({ activities }: { activities: readonly ToolActivity[] }) {
  return (
    <section className="review-section activity-section" aria-labelledby="activity-title">
      <div className="review-heading"><div><span className="eyebrow">WebMCP</span><h2 id="activity-title">Agent activity</h2></div><span className="muted-count">{activities.length}</span></div>
      <div aria-live="polite" aria-relevant="additions text">
        {activities.length === 0 ? <p className="review-empty">Tool calls will stream here as the agent works.</p> : (
          <ol className="activity-list">
            {activities.map((activity) => <li key={activity.id}><div><strong>{activity.toolName}</strong><span className={`activity-status activity-status--${activity.status}`}>{activity.status}</span></div><p>{activity.argumentSummary}</p>{activity.outcomeSummary && <small>{activity.outcomeSummary}</small>}{activity.durationMs !== null && <time>{activity.durationMs} ms</time>}</li>)}
          </ol>
        )}
      </div>
    </section>
  );
}

export function ReviewRail({ app, annotations, draft, activities }: { app: RepositoryApp; annotations: readonly CodeAnnotation[]; draft: IssueDraft | null; activities: readonly ToolActivity[] }) {
  const actionableDraft = draft?.status === "pending" || draft?.status === "approved" ? draft : null;
  return <aside className="review-rail" aria-label="Agent review"><Findings annotations={annotations} />{actionableDraft && <DraftCard app={app} draft={actionableDraft} key={`${actionableDraft.id}-${actionableDraft.revision}-${actionableDraft.status}`} />}<ActivityFeed activities={activities} /></aside>;
}
