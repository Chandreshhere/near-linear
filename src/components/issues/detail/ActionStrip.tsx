"use client";

/**
 * The floating copy-action strip under the issue header — CAPTURED order
 * (capture-trendzo-37-research-work.md §3): Copy issue URL · Copy issue ID ·
 * Copy branch name · Work on issue · ⌄.
 *
 * Two menus hang off it:
 *  · the play button ("Work on issue", §12 `W O`) — copy branch name, copy as
 *    prompt, and "Mark as started", which moves the issue into the team's
 *    first `started` workflow state optimistically (§6.8);
 *  · the ⌄ overflow — the captured two rows "Copy as prompt ⌘⌥P" and
 *    "Configure coding tools…", the latter opening the dialog below.
 *
 * The chosen coding tool is a local preference (there is no per-user settings
 * model for it yet, §17), stored beside the create-modal draft in
 * localStorage and read back on every mount.
 */

import * as React from "react";
import { observer } from "mobx-react-lite";
import { useStore, useSyncClient } from "@/lib/data/DataProvider";
import type { IssueData } from "@/lib/data/types";
import { Dialog } from "@/components/ui/Dialog";
import { Button, IconButton } from "@/components/ui/Button";
import { Menu } from "@/components/ui/Menu";
import { Tooltip } from "@/components/ui/Tooltip";
import { Icon } from "@/components/icons/Icon";
import { StatusIcon } from "@/components/icons/StatusIcon";
import { copyToClipboard, showToast } from "@/lib/toast";
import { CURRENT_USER_ID } from "./constants";
import styles from "./detail.module.css";

/* ================================================================
 * Coding tool preference
 * ================================================================ */

const CODING_TOOL_KEY = "codingTool";

export interface CodingTool {
  id: string;
  name: string;
  /** How this tool opens a branch — shown as the dialog's helper line. */
  hint: string;
}

export const CODING_TOOLS: CodingTool[] = [
  { id: "vscode", name: "VS Code", hint: "vscode://vscode.git/clone" },
  { id: "cursor", name: "Cursor", hint: "cursor://file" },
  { id: "zed", name: "Zed", hint: "zed://open" },
  { id: "jetbrains", name: "JetBrains", hint: "jetbrains://idea/navigate" },
  { id: "terminal", name: "Terminal", hint: "git checkout -b <branch>" },
  { id: "none", name: "None", hint: "Copy the branch name and switch by hand" },
];

function readCodingTool(): string {
  if (typeof window === "undefined") return "none";
  try {
    return window.localStorage.getItem(CODING_TOOL_KEY) ?? "none";
  } catch {
    return "none";
  }
}

function writeCodingTool(id: string): void {
  try {
    window.localStorage.setItem(CODING_TOOL_KEY, id);
  } catch {
    /* storage unavailable — the choice still applies for this session */
  }
}

export function codingToolName(id: string): string {
  return CODING_TOOLS.find((tool) => tool.id === id)?.name ?? "None";
}

/* ================================================================
 * Coding tools dialog
 * ================================================================ */

function CodingToolsDialog({
  open,
  onOpenChange,
  value,
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onChange: (id: string) => void;
}) {
  // Local until Save, so cancelling really cancels.
  const [draft, setDraft] = React.useState(value);
  React.useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const selected = CODING_TOOLS.find((tool) => tool.id === draft);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      width={420}
      label="Configure coding tools"
    >
      <div className={styles.toolsDialog}>
        <h2 className={styles.toolsTitle}>Configure coding tools</h2>
        <p className={styles.toolsBody}>
          Pick where &ldquo;Work on issue&rdquo; hands off. The choice is
          remembered on this device and shown in the issue&rsquo;s work menu.
        </p>
        <div
          className={styles.toolsList}
          role="radiogroup"
          aria-label="Coding tool"
        >
          {CODING_TOOLS.map((tool) => (
            <button
              key={tool.id}
              type="button"
              role="radio"
              aria-checked={draft === tool.id}
              className={styles.toolRow}
              data-selected={draft === tool.id ? "true" : undefined}
              onClick={() => setDraft(tool.id)}
            >
              <span className={styles.toolRadio} aria-hidden="true" />
              <span className={styles.toolName}>{tool.name}</span>
              <span className={styles.toolHint}>{tool.hint}</span>
            </button>
          ))}
        </div>
        <div className={styles.toolsActions}>
          <Button size={28} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size={28}
            onClick={() => {
              onChange(draft);
              onOpenChange(false);
              showToast(
                selected === undefined || selected.id === "none"
                  ? "Coding tool cleared"
                  : `Coding tool set to ${selected.name}`,
              );
            }}
          >
            Save
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

/* ================================================================
 * The strip
 * ================================================================ */

/** "Research Work" → "research-work" (branch/permalink slug form). */
function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "issue"
  );
}

export const ActionStrip = observer(function ActionStrip({
  issue,
}: {
  issue: IssueData;
}) {
  const store = useStore();
  const client = useSyncClient();
  const [toolsOpen, setToolsOpen] = React.useState(false);
  const [tool, setTool] = React.useState("none");

  // localStorage is browser-only — read after mount so SSR and the first
  // client render agree.
  React.useEffect(() => {
    setTool(readCodingTool());
  }, []);

  const branchName = (): string => {
    const user = store.get("User", CURRENT_USER_ID);
    return `${user?.displayName ?? "user"}/${issue.identifier.toLowerCase()}-${slugify(issue.title)}`;
  };

  const copyUrl = (): void => {
    void copyToClipboard(window.location.href, "Copied issue link to clipboard");
  };
  const copyId = (): void => {
    void copyToClipboard(issue.identifier, `Copied ${issue.identifier}`);
  };
  const copyBranch = (): void => {
    void copyToClipboard(branchName(), "Copied branch name");
  };
  const copyPrompt = (): void => {
    const markdown =
      `# ${issue.identifier} ${issue.title}\n\n${issue.description ?? ""}`.trimEnd() +
      "\n";
    void copyToClipboard(markdown, "Prompt copied to clipboard");
  };

  // "Mark as started": the team's first `started` workflow state (§10.3).
  const startedState = store
    .statesForTeam(issue.teamId)
    .find((state) => state.category === "started");
  const alreadyStarted =
    startedState !== undefined && issue.stateId === startedState.id;

  const markAsStarted = (): void => {
    if (startedState === undefined) return;
    client.mutate.updateIssue(issue.id, { stateId: startedState.id });
    showToast(`${issue.identifier} moved to ${startedState.name}`);
  };

  return (
    <div className={styles.actionStrip}>
      <Tooltip content="Copy issue URL">
        <IconButton label="Copy issue URL" size={28} onClick={copyUrl}>
          <Icon name="Link" size={14} />
        </IconButton>
      </Tooltip>
      <Tooltip content="Copy issue ID">
        <IconButton label="Copy issue ID" size={28} onClick={copyId}>
          <Icon name="Hash" size={14} />
        </IconButton>
      </Tooltip>
      <Tooltip content="Copy branch name">
        <IconButton label="Copy branch name" size={28} onClick={copyBranch}>
          <Icon name="GitBranch" size={14} />
        </IconButton>
      </Tooltip>

      <Menu
        align="end"
        items={[
          {
            label: "Copy branch name",
            icon: <Icon name="GitBranch" size={14} />,
            onSelect: copyBranch,
          },
          {
            label: "Copy as prompt",
            icon: <Icon name="Copy" size={14} />,
            shortcut: ["⌘", "⌥", "P"],
            onSelect: copyPrompt,
          },
          {
            label: alreadyStarted
              ? `Already ${startedState?.name ?? "started"}`
              : "Mark as started",
            icon:
              startedState !== undefined ? (
                <StatusIcon
                  category={startedState.category}
                  color={startedState.color}
                  size={14}
                />
              ) : undefined,
            disabled: startedState === undefined || alreadyStarted,
            onSelect: markAsStarted,
          },
          { type: "separator" },
          {
            label: `Coding tool: ${codingToolName(tool)}`,
            onSelect: () => setToolsOpen(true),
          },
        ]}
        trigger={
          <IconButton label="Work on issue" size={28}>
            <Icon name="Play" size={14} />
          </IconButton>
        }
      />

      <Menu
        align="end"
        items={[
          {
            label: "Copy as prompt",
            shortcut: ["⌘", "⌥", "P"],
            onSelect: copyPrompt,
          },
          {
            label: "Configure coding tools…",
            onSelect: () => setToolsOpen(true),
          },
        ]}
        trigger={
          <IconButton label="Copy actions" size={28}>
            <Icon name="ChevronDown" size={14} />
          </IconButton>
        }
      />

      <CodingToolsDialog
        open={toolsOpen}
        onOpenChange={setToolsOpen}
        value={tool}
        onChange={(id) => {
          setTool(id);
          writeCodingTool(id);
        }}
      />
    </div>
  );
});
