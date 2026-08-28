function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function textLength(value: unknown) {
  return typeof value === "string" ? value.length : 0;
}

function bounded(value: unknown, limit = 80) {
  if (typeof value !== "string") return "";
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= limit ? normalized : `${normalized.slice(0, limit - 1)}…`;
}

export function summarizeToolArguments(toolName: string, input: Record<string, unknown>) {
  switch (toolName) {
    case "read_file":
      return `path=${bounded(input.path)}`;
    case "search_code":
      return `query=${bounded(input.query)}`;
    case "get_issue":
      return `number=${String(input.number ?? "")}`;
    case "annotate_code":
      return `path=${bounded(input.path)} line=${String(input.line ?? "")} severity=${bounded(input.severity)} noteLength=${textLength(input.note)}`;
    case "propose_issue":
      return `sourcePath=${bounded(input.sourcePath)} titleLength=${textLength(input.title)} bodyLength=${textLength(input.body)} annotations=${Array.isArray(input.annotationIds) ? input.annotationIds.length : 0}`;
    case "create_issue":
      return `draftId=${bounded(input.draftId)}`;
    default:
      return "no arguments";
  }
}

export function summarizeToolOutcome(toolName: string, value: unknown) {
  if (!isRecord(value)) return "Invalid tool result";
  if (value.ok === false && isRecord(value.error)) {
    return `${bounded(value.error.code, 40)}: ${bounded(value.error.message, 160)}`;
  }
  if (value.ok !== true || !isRecord(value.result)) return "Invalid tool result";

  const result = value.result;
  switch (toolName) {
    case "list_files":
      return `${Array.isArray(result.files) ? result.files.length : 0} files`;
    case "read_file":
      return `Read ${bounded(result.path)} (${String(result.lineCount ?? 0)} lines)`;
    case "search_code":
      return `${String(result.totalMatches ?? 0)} matches`;
    case "list_issues":
      return `${String(result.total ?? 0)} issues`;
    case "get_issue":
      return `Loaded issue #${String(result.number ?? "")}`;
    case "get_workspace":
      return `Workspace: ${bounded(result.activeTab, 20)}`;
    case "annotate_code":
      return isRecord(result.annotation)
        ? `Added ${bounded(result.annotation.id, 40)} on line ${String(result.annotation.line ?? "")}`
        : "Annotation added";
    case "propose_issue":
      return isRecord(result.draft) ? `Proposed ${bounded(result.draft.id, 40)}` : "Draft proposed";
    case "create_issue":
      return isRecord(result.issue) ? `Created issue #${String(result.issue.number ?? "")}` : "Issue created";
    default:
      return "Completed";
  }
}
