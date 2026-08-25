"use client";

/**
 * Loops list (`/:ws/loops`) — MASTER_PROMPT.md §10.7 (empty state: knot
 * illustration + agent-automation copy + "Create new loop" / "Docs and
 * Examples") and §21 (list rows with trigger summary, status badge, last-run
 * time and an Enable/Disable/Duplicate/Delete menu).
 */

import { useEffect, useState, type JSX } from "react";
import { useRouter } from "next/navigation";
import { observer } from "mobx-react-lite";
import { Header } from "@/components/shell/Header";
import { Icon } from "@/components/icons/Icon";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Menu, type MenuItem } from "@/components/ui/Menu";
import { LoopKnot } from "@/components/agent/glyphs";
import { describeTrigger, useAgentLoops, type LoopData } from "@/lib/agent/loops";
import { showToast } from "@/lib/toast";
import styles from "./loops.module.css";

/** "just now" → "5m ago" → "2h ago" → "Aug 24" (§10.3 relative-time contract). */
function lastRunLabel(iso: string | undefined, now: number): string {
  if (iso === undefined) return "Never run";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "Never run";
  const minutes = Math.floor(Math.max(0, now - t) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const STATUS_LABELS: Record<LoopData["status"], string> = {
  draft: "Draft",
  published: "Published",
  disabled: "Disabled",
};

export const LoopsView = observer(function LoopsView({
  workspace,
}: {
  workspace: string;
}): JSX.Element {
  const loops = useAgentLoops();
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());

  // Age the "last run" column without a reload.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const create = (): void => {
    const loop = loops.create();
    router.push(`/${workspace}/loops/${loop.id}`);
  };

  const rows = loops.byRecency();

  const menuFor = (loop: LoopData): MenuItem[] => [
    loop.status === "disabled"
      ? {
          label: "Enable",
          onSelect: () => {
            loops.setStatus(loop.id, loop.versions.length > 0 ? "published" : "draft");
            showToast(`Enabled ${loop.name}`);
          },
        }
      : {
          label: "Disable",
          onSelect: () => {
            loops.setStatus(loop.id, "disabled");
            showToast(`Disabled ${loop.name}`);
          },
        },
    {
      label: "Duplicate",
      onSelect: () => {
        const copy = loops.duplicate(loop.id);
        if (copy !== undefined) showToast(`Duplicated as ${copy.name}`);
      },
    },
    { type: "separator" },
    {
      label: "Delete",
      onSelect: () => {
        loops.remove(loop.id);
        showToast(`Deleted ${loop.name}`);
      },
    },
  ];

  return (
    <>
      <Header
        title="Loops"
        right={
          <Button variant="secondary" size={28} onClick={create}>
            New loop
          </Button>
        }
      />

      <div className={styles.listScroller} tabIndex={0} data-scroll-container="true">
        {!loops.hydrated ? null : rows.length === 0 ? (
          <EmptyState
            illustration={
              <span className={styles.emptyIllustration}>
                <LoopKnot size={96} />
              </span>
            }
            heading="Automate recurring work with loops"
            primary={
              <Button variant="primary" size={32} onClick={create}>
                Create new loop
              </Button>
            }
            secondary={
              <a
                href="https://linear.app/docs/loops"
                target="_blank"
                rel="noreferrer noopener"
              >
                <Button variant="secondary" size={32}>
                  Docs and Examples
                </Button>
              </a>
            }
          >
            Loops let you define scheduled or event-driven operations for the agent
            to run across your workspace. Each time a loop runs it reviews its
            instructions and decides what should happen next, using context from
            your issues, connected services and previous runs.
          </EmptyState>
        ) : (
          <div className={styles.list}>
            {rows.map((loop) => (
              <div key={loop.id} className={styles.row}>
                <span className={styles.rowIcon} aria-hidden="true">
                  <Icon name="Loop" size={16} />
                </span>
                <a
                  className={styles.rowMain}
                  href={`/${workspace}/loops/${loop.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    router.push(`/${workspace}/loops/${loop.id}`);
                  }}
                >
                  <span className={styles.rowName}>{loop.name}</span>
                  <span className={styles.rowTrigger}>{describeTrigger(loop)}</span>
                </a>
                <span className={styles.badge} data-status={loop.status}>
                  {STATUS_LABELS[loop.status]}
                </span>
                <span className={styles.rowMeta}>
                  {lastRunLabel(loop.lastRunAt, now)}
                </span>
                <span className={styles.rowMenuSlot}>
                  <Menu
                    align="end"
                    items={menuFor(loop)}
                    trigger={
                      <button
                        type="button"
                        className={styles.backLink}
                        aria-label={`Loop options: ${loop.name}`}
                      >
                        <Icon name="More" size={14} />
                      </button>
                    }
                  />
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
});
