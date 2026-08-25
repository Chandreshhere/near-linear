"use client";

/**
 * `/:ws/import` — "Import issues" from the sidebar's Try section.
 *
 * The CSV path is REAL end to end: the file is parsed in the browser (no
 * upload, no server), mapped rows are previewed, and "Create N issues" writes
 * every row through the local-first engine in one batch — same transaction
 * queue, same optimistic apply, same IndexedDB persistence as the create
 * modal. Jira and GitHub need their APIs, so those sources say so instead of
 * pretending.
 */

import { useRef, useState, type JSX } from "react";
import { useRouter } from "next/navigation";
import { observer } from "mobx-react-lite";
import { Icon } from "@/components/icons/Icon";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Header } from "@/components/shell/Header";
import { useSyncClient } from "@/lib/data/DataProvider";
import { CURRENT_USER_ID } from "@/lib/issues/viewPrefs";
import { showToast } from "@/lib/toast";
import type { IssueData, Priority } from "@/lib/data/types";
import { ImportSheetMark } from "./glyphs";
import styles from "./directory.module.css";

type Source = "csv" | "jira" | "github";

interface ParsedIssue {
  title: string;
  description?: string;
  priority: Priority;
  stateName?: string;
}

const PRIORITY_BY_NAME: Record<string, Priority> = {
  "": 0,
  none: 0,
  "no priority": 0,
  urgent: 1,
  highest: 1,
  high: 2,
  medium: 3,
  normal: 3,
  low: 4,
  lowest: 4,
};

const PRIORITY_LABEL: Record<Priority, string> = {
  0: "No priority",
  1: "Urgent",
  2: "High",
  3: "Medium",
  4: "Low",
};

/**
 * RFC-4180-ish CSV reader: double-quoted fields, "" escapes, embedded commas
 * and newlines, CRLF or LF. Returns rows of raw cell strings.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let i = 0;
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text; // strip BOM

  const endCell = (): void => {
    row.push(cell);
    cell = "";
  };
  const endRow = (): void => {
    endCell();
    if (row.length > 1 || row[0].trim() !== "") rows.push(row);
    row = [];
  };

  while (i < input.length) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i += 1;
        continue;
      }
      cell += ch;
      i += 1;
      continue;
    }
    if (ch === '"' && cell === "") {
      quoted = true;
      i += 1;
      continue;
    }
    if (ch === ",") {
      endCell();
      i += 1;
      continue;
    }
    if (ch === "\r") {
      i += 1;
      continue;
    }
    if (ch === "\n") {
      endRow();
      i += 1;
      continue;
    }
    cell += ch;
    i += 1;
  }
  if (cell !== "" || row.length > 0) endRow();
  return rows;
}

/** Map header names → the fields we understand (case/space insensitive). */
function columnIndexes(header: string[]): {
  title: number;
  description: number;
  priority: number;
  state: number;
} {
  const norm = header.map((h) => h.trim().toLowerCase());
  const find = (...names: string[]): number =>
    norm.findIndex((h) => names.includes(h));
  return {
    title: find("title", "summary", "name", "issue"),
    description: find("description", "body", "details", "notes"),
    priority: find("priority"),
    state: find("status", "state", "workflow state"),
  };
}

export function csvToIssues(rows: string[][]): ParsedIssue[] {
  if (rows.length === 0) return [];
  const [header, ...body] = rows;
  const cols = columnIndexes(header);
  // No recognizable header → treat the first column of every row as the title.
  const titleIndex = cols.title === -1 ? 0 : cols.title;
  const dataRows = cols.title === -1 ? rows : body;

  const out: ParsedIssue[] = [];
  for (const row of dataRows) {
    const title = (row[titleIndex] ?? "").trim();
    if (title === "") continue; // rows without a title are skipped
    const rawPriority =
      cols.priority === -1 ? "" : (row[cols.priority] ?? "").trim().toLowerCase();
    const numeric = Number.parseInt(rawPriority, 10);
    const priority: Priority =
      Number.isInteger(numeric) && numeric >= 0 && numeric <= 4
        ? (numeric as Priority)
        : (PRIORITY_BY_NAME[rawPriority] ?? 0);
    const description =
      cols.description === -1 ? "" : (row[cols.description] ?? "").trim();
    const stateName = cols.state === -1 ? "" : (row[cols.state] ?? "").trim();
    out.push({
      title,
      description: description === "" ? undefined : description,
      priority,
      stateName: stateName === "" ? undefined : stateName,
    });
  }
  return out;
}

const SOURCES: { id: Source; label: string; icon: string; hint: string }[] = [
  { id: "csv", label: "CSV", icon: "Import", hint: "A file exported from any tracker" },
  { id: "jira", label: "Jira", icon: "Chip", hint: "Projects, issues and comments" },
  { id: "github", label: "GitHub", icon: "GitBranch", hint: "Issues from a repository" },
];

export const ImportView = observer(function ImportView({
  workspace,
}: {
  workspace: string;
}): JSX.Element {
  const client = useSyncClient();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [source, setSource] = useState<Source>("csv");
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [issues, setIssues] = useState<ParsedIssue[]>([]);
  const [teamId, setTeamId] = useState<string>("");

  const teams = client.store
    .all("Team")
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const targetTeamId = teamId !== "" ? teamId : (teams[0]?.id ?? "");
  const targetTeam = targetTeamId === "" ? undefined : client.store.get("Team", targetTeamId);

  const onFile = (file: File | undefined): void => {
    if (file === undefined) return;
    setFileName(file.name);
    setParseError(null);
    const reader = new FileReader();
    reader.onerror = () => setParseError("That file could not be read.");
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const parsed = csvToIssues(parseCsv(text));
      if (parsed.length === 0) {
        setIssues([]);
        setParseError(
          "No importable rows found. The file needs a title column (title, summary or name) — or a first column of titles.",
        );
        return;
      }
      setIssues(parsed);
    };
    reader.readAsText(file);
  };

  const createIssues = (): void => {
    const team = targetTeam;
    if (team === undefined || issues.length === 0) return;
    const store = client.store;
    const states = store.statesForTeam(team.id);
    const fallbackState =
      states.find((s) => s.category === "unstarted") ??
      states.find((s) => s.category === "backlog") ??
      states[0];
    if (fallbackState === undefined) {
      showToast(`${team.name} has no workflow states to import into`);
      return;
    }
    let number = store
      .issuesForTeam(team.id)
      .reduce((max, issue) => Math.max(max, issue.number), 0);
    let sortOrder =
      store
        .issuesForTeam(team.id)
        .reduce((max, issue) => Math.max(max, issue.sortOrder), 0) + 100;
    const now = new Date().toISOString();

    for (const parsed of issues) {
      number += 1;
      sortOrder += 1;
      const state =
        parsed.stateName !== undefined
          ? (states.find(
              (s) => s.name.toLowerCase() === parsed.stateName?.toLowerCase(),
            ) ?? fallbackState)
          : fallbackState;
      const row: IssueData = {
        id: crypto.randomUUID(),
        identifier: `${team.key}-${number}`,
        number,
        teamId: team.id,
        title: parsed.title,
        description: parsed.description,
        stateId: state.id,
        priority: parsed.priority,
        creatorId: CURRENT_USER_ID,
        labelIds: [],
        subscriberIds: [CURRENT_USER_ID],
        sortOrder,
        createdAt: now,
        updatedAt: now,
      };
      client.mutate.createIssue(row);
    }

    showToast(
      `Imported ${issues.length} ${issues.length === 1 ? "issue" : "issues"} into ${team.name}`,
    );
    setIssues([]);
    setFileName(null);
    if (fileRef.current !== null) fileRef.current.value = "";
    router.push(`/${workspace}/team/${team.key}/all`);
  };

  return (
    <>
      <Header title="Import issues" />

      <div className={styles.scroller} tabIndex={0} data-scroll-container="true">
        <div className={styles.page}>
          <p className={styles.lead}>
            Bring existing work into a team. Pick where the issues are coming
            from — a CSV export is read in your browser, nothing is uploaded.
          </p>

          <div className={styles.sourceGrid} role="group" aria-label="Import source">
            {SOURCES.map((option) => (
              <button
                key={option.id}
                type="button"
                className={styles.sourceCard}
                aria-pressed={source === option.id}
                onClick={() => setSource(option.id)}
              >
                <span className={styles.sourceName}>
                  <Icon name={option.icon} size={16} />
                  {option.label}
                </span>
                <span className={styles.sourceHint}>{option.hint}</span>
              </button>
            ))}
          </div>

          {source === "csv" ? (
            <>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <span className={styles.label}>File</span>
                  <div className={styles.fileRow}>
                    <input
                      ref={fileRef}
                      id="import-csv-file"
                      type="file"
                      accept=".csv,text/csv"
                      className={styles.fileInput}
                      aria-label="Choose a CSV file"
                      onChange={(e) => onFile(e.currentTarget.files?.[0])}
                    />
                    {fileName !== null ? (
                      <span className={styles.fileName}>{fileName}</span>
                    ) : null}
                  </div>
                </div>
                <div className={`${styles.field} ${styles.fieldMedium}`}>
                  <span className={styles.label}>Team</span>
                  <Select
                    label="Import into team"
                    value={targetTeamId}
                    onValueChange={setTeamId}
                    options={teams.map((team) => ({
                      value: team.id,
                      label: `${team.name} (${team.key})`,
                    }))}
                  />
                </div>
              </div>

              <p className={styles.hint}>
                Recognized columns: <strong>title</strong> (or summary/name),
                description, priority (urgent/high/medium/low or 0–4) and status
                — a status that matches one of the team&rsquo;s workflow states
                is used, anything else starts in the team&rsquo;s first
                unstarted state. Rows without a title are skipped.
              </p>

              {parseError !== null ? (
                <p className={styles.error}>{parseError}</p>
              ) : null}

              {issues.length > 0 ? (
                <>
                  <div className={styles.previewWrap}>
                    <div className={styles.previewScroll}>
                      <table className={styles.previewTable}>
                        <thead>
                          <tr>
                            <th scope="col">#</th>
                            <th scope="col">Title</th>
                            <th scope="col">Priority</th>
                            <th scope="col">Status</th>
                            <th scope="col">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {issues.map((issue, index) => (
                            <tr key={`${issue.title}-${index}`}>
                              <td>{index + 1}</td>
                              <td>{issue.title}</td>
                              <td>{PRIORITY_LABEL[issue.priority]}</td>
                              <td>{issue.stateName ?? "—"}</td>
                              <td>{issue.description ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className={styles.actionsRow}>
                    <Button
                      variant="primary"
                      size={32}
                      onClick={createIssues}
                      disabled={targetTeam === undefined}
                    >
                      {`Create ${issues.length} ${issues.length === 1 ? "issue" : "issues"}`}
                    </Button>
                    <span className={styles.skipNote}>
                      They are created in{" "}
                      {targetTeam !== undefined ? targetTeam.name : "the selected team"}{" "}
                      and appear in its issue list immediately.
                    </span>
                  </div>
                </>
              ) : (
                <div className={styles.emptyMark}>
                  <ImportSheetMark size={96} />
                </div>
              )}
            </>
          ) : (
            <div className={styles.notice}>
              <span className={styles.noticeTitle}>
                Importing from {source === "jira" ? "Jira" : "GitHub"} needs its API
              </span>
              <span className={styles.noticeBody}>
                {source === "jira" ? (
                  <>
                    A Jira import authenticates against your site (
                    <code>/rest/api/3/search</code> with an API token), pages
                    through every issue, then maps Jira statuses and priorities
                    onto the target team&rsquo;s workflow states. The credential
                    exchange has to happen server-side, so it cannot run in this
                    build.
                  </>
                ) : (
                  <>
                    A GitHub import lists issues through{" "}
                    <code>GET /repos/:owner/:repo/issues</code> with an OAuth
                    token and keeps the two in sync through a webhook. Both need
                    a server holding the client secret.
                  </>
                )}{" "}
                Export to CSV and use the CSV source — that path is complete.
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
});
