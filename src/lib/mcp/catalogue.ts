/**
 * The MCP tool catalogue as DATA - server identity, endpoint path and one
 * documented entry per tool.
 *
 * Why it is not in `src/server/mcp/tools.ts`: that module imports
 * `node:crypto` and the server store, so it can never reach the browser. The
 * Settings -> Integrations page has to list the same tools with the same
 * words, and a second hand-written copy of that list would drift within a
 * week. This file is pure data with no imports, so both sides read it:
 * `tools.ts` registers each tool under its entry here, and the settings page
 * renders the same entries.
 *
 * Adding a tool means adding it here AND implementing it there - `toolDoc`
 * throws if an implementation has no entry, so the mismatch cannot ship
 * quietly.
 */

export const MCP_SERVER_NAME = "synquic";
export const MCP_SERVER_VERSION = "1.0.0";

/** Path of the Streamable HTTP endpoint, relative to the app's origin. */
export const MCP_ENDPOINT_PATH = "/api/mcp";

export interface ToolDoc {
  /** Tool name as `tools/list` reports it. */
  name: string;
  /** Human title for client UIs. */
  title: string;
  /** What the tool does - shown to the model AND on the settings page. */
  description: string;
  /** Whether calling it changes workspace data. */
  writes: boolean;
}

export const TOOL_DOCS: readonly ToolDoc[] = [
  {
    name: "list_teams",
    title: "List teams",
    description:
      "List every team in the workspace with its key, issue count and workflow states. Start here when you do not know which team to file against.",
    writes: false,
  },
  {
    name: "list_projects",
    title: "List projects",
    description: "List projects, optionally only those a given team works on.",
    writes: false,
  },
  {
    name: "list_issues",
    title: "List issues",
    description:
      "List issues filtered by team, workflow state or state category, assignee and project. Each line carries the identifier the other tools take.",
    writes: false,
  },
  {
    name: "get_issue",
    title: "Get an issue",
    description:
      "Fetch one issue by its identifier, with description, labels, project and comment count.",
    writes: false,
  },
  {
    name: "search_issues",
    title: "Search issues",
    description:
      "Case-insensitive substring search over issue titles and descriptions. Title matches rank first.",
    writes: false,
  },
  {
    name: "create_issue",
    title: "Create an issue",
    description:
      "Create an issue on a team. The identifier is allocated from the team's counter and the issue lands at the top of the team's backlog state unless another state is named.",
    writes: true,
  },
  {
    name: "update_issue",
    title: "Update an issue",
    description:
      "Change an existing issue's state, priority, assignee, title, description or project. Only the fields you pass are touched.",
    writes: true,
  },
  {
    name: "add_comment",
    title: "Comment on an issue",
    description: "Append a comment to an issue and record it in the activity feed.",
    writes: true,
  },
  {
    name: "create_project",
    title: "Create a project",
    description:
      "Create a project and attach it to one or more teams. The slug matches the app's route shape so the returned link resolves.",
    writes: true,
  },
];

/** The entry for a tool name. Throws when an implementation has no entry. */
export function toolDoc(name: string): ToolDoc {
  const doc = TOOL_DOCS.find((entry) => entry.name === name);
  if (doc === undefined) {
    throw new Error(`No catalogue entry for MCP tool "${name}" (src/lib/mcp/catalogue.ts)`);
  }
  return doc;
}
