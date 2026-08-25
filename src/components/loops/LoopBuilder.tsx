"use client";

/**
 * Loop builder (`/:ws/loops/:id`) — MASTER_PROMPT.md §21.
 * Sections: Trigger (schedule cadence | issue created | issue updated, plus
 * "property is value" conditions built from the live store), Instructions,
 * Connectors (placeholder MCP seam), Permissions (the documented toggle set),
 * footer Save draft / Publish. Publishing snapshots a restorable version.
 *
 * The Run history tab is real: "Run now" drives the SAME AgentAdapter the
 * chat uses over the issues that match the conditions and records what it
 * actually changed.
 */

import { useMemo, useState, type JSX } from "react";
import Link from "next/link";
import { observer } from "mobx-react-lite";
import { Header } from "@/components/shell/Header";
import { Icon } from "@/components/icons/Icon";
import { GlyphClose } from "@/components/agent/glyphs";
import { Button } from "@/components/ui/Button";
import { Menu, type MenuItem } from "@/components/ui/Menu";
import { Select, type SelectOption } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { useStore, useSyncClient } from "@/lib/data/DataProvider";
import { LocalAgentAdapter } from "@/lib/agent/engine";
import {
  LOOP_CADENCES,
  LOOP_CONDITION_PROPERTIES,
  LOOP_CONNECTORS,
  LOOP_PERMISSIONS,
  LOOP_TRIGGERS,
  matchingIssues,
  runLoop,
  useAgentLoops,
  type LoopCondition,
  type LoopConditionProperty,
  type LoopData,
} from "@/lib/agent/loops";
import { showToast } from "@/lib/toast";
import type { SyncStore } from "@/lib/data/store";
import shellStyles from "@/components/shell/shell.module.css";
import styles from "./loops.module.css";

const PRIORITY_LABELS = ["No priority", "Urgent", "High", "Medium", "Low"];

const STATUS_LABELS: Record<LoopData["status"], string> = {
  draft: "Draft",
  published: "Published",
  disabled: "Disabled",
};

function newConditionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `cond-${Math.random().toString(36).slice(2, 10)}`;
}

/** Value choices for a condition property, read from the live store. */
function valueOptions(
  property: LoopConditionProperty,
  store: SyncStore,
): SelectOption[] {
  switch (property) {
    case "team":
      return store
        .all("Team")
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((team) => ({ value: team.id, label: team.name }));
    case "status": {
      const teams = new Map(store.all("Team").map((team) => [team.id, team.key]));
      return store
        .all("WorkflowState")
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((state) => ({
          value: state.id,
          label: `${teams.get(state.teamId) ?? "?"} · ${state.name}`,
        }));
    }
    case "priority":
      return PRIORITY_LABELS.map((label, index) => ({
        value: String(index),
        label,
      }));
    case "label":
      return store
        .all("Label")
        .filter((label) => !label.isGroup)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((label) => ({ value: label.id, label: label.name }));
    case "assignee":
      return [
        { value: "unassigned", label: "Unassigned" },
        ...store
          .all("User")
          .slice()
          .sort((a, b) => a.displayName.localeCompare(b.displayName))
          .map((user) => ({ value: user.id, label: user.displayName })),
      ];
    default:
      return [];
  }
}

function formatTime(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  return new Date(t).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export const LoopBuilder = observer(function LoopBuilder({
  workspace,
  loopId,
}: {
  workspace: string;
  loopId: string;
}): JSX.Element {
  const loops = useAgentLoops();
  const store = useStore();
  const client = useSyncClient();
  // ADAPTER SEAM: loop runs go through the same adapter interface as chat.
  const adapter = useMemo(() => new LocalAgentAdapter(client), [client]);

  const [tab, setTab] = useState<"builder" | "runs">("builder");
  const [running, setRunning] = useState(false);

  const loop = loops.get(loopId);

  if (!loops.hydrated) {
    return (
      <>
        <Header title="Loop" />
        <div className={styles.builderScroller} />
      </>
    );
  }

  if (loop === undefined) {
    return (
      <>
        <Header title="Loop" />
        <div className={styles.builderScroller}>
          <div className={styles.builder}>
            <p className={styles.sectionHint}>
              This loop no longer exists.{" "}
              <Link href={`/${workspace}/loops`}>Back to Loops</Link>
            </p>
          </div>
        </div>
      </>
    );
  }

  const matches = matchingIssues(loop, store);

  const setCondition = (id: string, patch: Partial<LoopCondition>): void => {
    loops.update(loopId, {
      conditions: loop.conditions.map((condition) =>
        condition.id === id ? { ...condition, ...patch } : condition,
      ),
    });
  };

  const addCondition = (): void => {
    const property: LoopConditionProperty = "team";
    const first = valueOptions(property, store)[0];
    loops.update(loopId, {
      conditions: [
        ...loop.conditions,
        { id: newConditionId(), property, value: first?.value ?? "" },
      ],
    });
  };

  const removeCondition = (id: string): void => {
    loops.update(loopId, {
      conditions: loop.conditions.filter((condition) => condition.id !== id),
    });
  };

  const toggleConnector = (id: string, on: boolean): void => {
    loops.update(loopId, {
      connectors: on
        ? [...loop.connectors, id]
        : loop.connectors.filter((connector) => connector !== id),
    });
  };

  const togglePermission = (id: string, on: boolean): void => {
    loops.update(loopId, { permissions: { ...loop.permissions, [id]: on } });
  };

  const runNow = async (): Promise<void> => {
    setRunning(true);
    try {
      const record = await runLoop(loop, store, adapter, workspace);
      loops.recordRun(loopId, record);
      showToast(
        record.outcome === "success"
          ? `Run finished — ${record.detail}`
          : `Run ${record.outcome === "noMatches" ? "skipped" : "failed"} — ${record.detail}`,
      );
      setTab("runs");
    } finally {
      setRunning(false);
    }
  };

  const versionItems: MenuItem[] =
    loop.versions.length === 0
      ? [{ label: "No published versions", disabled: true }]
      : loop.versions
          .slice()
          .reverse()
          .map((version) => ({
            label: `Version ${version.version} · ${formatTime(version.publishedAt)}`,
            onSelect: () => {
              loops.restoreVersion(loopId, version.id);
              showToast(`Restored version ${version.version}`);
            },
          }));

  return (
    <>
      <Header
        left={
          <>
            <Link
              href={`/${workspace}/loops`}
              className={styles.backLink}
              aria-label="Back to Loops"
            >
              <Icon name="ChevronRight" size={14} style={{ transform: "rotate(180deg)" }} />
            </Link>
            <h2 className={shellStyles.headerTitle}>{loop.name}</h2>
            <span className={styles.badge} data-status={loop.status}>
              {STATUS_LABELS[loop.status]}
            </span>
          </>
        }
        right={
          <Menu
            align="end"
            items={versionItems}
            trigger={
              <button
                type="button"
                className={shellStyles.iconBtn}
                aria-label="Versions"
                style={{ paddingInline: 10, fontSize: "var(--font-size-mini)" }}
              >
                Versions
              </button>
            }
          />
        }
        tabs={
          <div className={shellStyles.tabStrip}>
            <button
              type="button"
              className={shellStyles.tab}
              data-active={tab === "builder" ? "true" : undefined}
              onClick={() => setTab("builder")}
            >
              Builder
            </button>
            <button
              type="button"
              className={shellStyles.tab}
              data-active={tab === "runs" ? "true" : undefined}
              onClick={() => setTab("runs")}
            >
              Run history
            </button>
          </div>
        }
      />

      <div className={styles.builderScroller} tabIndex={0} data-scroll-container="true">
        <div className={styles.builder}>
          {tab === "builder" ? (
            <>
              {/* ---- name ---- */}
              <div className={styles.section}>
                <div className={styles.sectionHead}>
                  <span className={styles.sectionTitle}>Name</span>
                </div>
                <input
                  className={styles.nameInput}
                  value={loop.name}
                  aria-label="Loop name"
                  onChange={(e) => loops.update(loopId, { name: e.currentTarget.value })}
                />
              </div>

              {/* ---- trigger ---- */}
              <div className={styles.section}>
                <div className={styles.sectionHead}>
                  <span className={styles.sectionTitle}>Trigger</span>
                  <span className={styles.sectionHint}>
                    When this loop should run. Conditions are evaluated before the
                    instructions run.
                  </span>
                </div>
                <div className={styles.triggerGrid}>
                  {LOOP_TRIGGERS.map((option) => (
                    <button
                      key={option.kind}
                      type="button"
                      className={styles.triggerCard}
                      data-selected={loop.trigger.kind === option.kind ? "true" : undefined}
                      aria-pressed={loop.trigger.kind === option.kind}
                      onClick={() =>
                        loops.update(loopId, {
                          trigger: {
                            kind: option.kind,
                            cadence:
                              option.kind === "schedule"
                                ? loop.trigger.cadence ?? LOOP_CADENCES[0]
                                : undefined,
                          },
                        })
                      }
                    >
                      {option.label}
                      <span className={styles.triggerHint}>{option.hint}</span>
                    </button>
                  ))}
                </div>

                {loop.trigger.kind === "schedule" ? (
                  <Select
                    label="Cadence"
                    value={loop.trigger.cadence ?? LOOP_CADENCES[0]}
                    onValueChange={(cadence) =>
                      loops.update(loopId, { trigger: { kind: "schedule", cadence } })
                    }
                    options={LOOP_CADENCES.map((cadence) => ({
                      value: cadence,
                      label: cadence,
                    }))}
                  />
                ) : null}

                {loop.conditions.length === 0 ? (
                  <span className={styles.conditionEmpty}>
                    No conditions — every issue qualifies.
                  </span>
                ) : (
                  loop.conditions.map((condition) => {
                    const options = valueOptions(condition.property, store);
                    return (
                      <div key={condition.id} className={styles.conditionRow}>
                        <Select
                          label="Property"
                          value={condition.property}
                          onValueChange={(next) => {
                            const property = next as LoopConditionProperty;
                            const first = valueOptions(property, store)[0];
                            setCondition(condition.id, {
                              property,
                              value: first?.value ?? "",
                            });
                          }}
                          options={LOOP_CONDITION_PROPERTIES.map((row) => ({
                            value: row.property,
                            label: row.label,
                          }))}
                        />
                        <span className={styles.conditionIs}>is</span>
                        <Select
                          label="Value"
                          value={condition.value}
                          onValueChange={(value) => setCondition(condition.id, { value })}
                          options={options}
                          placeholder="Select"
                        />
                        <button
                          type="button"
                          className={styles.backLink}
                          aria-label="Remove condition"
                          onClick={() => removeCondition(condition.id)}
                        >
                          <GlyphClose size={14} />
                        </button>
                      </div>
                    );
                  })
                )}
                <div>
                  <Button variant="ghost" size={24} onClick={addCondition}>
                    + Add condition
                  </Button>
                </div>
                <span className={styles.sectionHint}>
                  {matches.length}{" "}
                  {matches.length === 1 ? "issue matches" : "issues match"} right
                  now.
                </span>
              </div>

              {/* ---- instructions ---- */}
              <div className={styles.section}>
                <div className={styles.sectionHead}>
                  <span className={styles.sectionTitle}>Instructions</span>
                  <span className={styles.sectionHint}>
                    What the agent should do on each run. Issue-scoped loops apply
                    these to every matching issue.
                  </span>
                </div>
                <textarea
                  className={styles.instructions}
                  value={loop.instructions}
                  aria-label="Loop instructions"
                  placeholder="Set priority to high&#10;Summarize the backlog"
                  onChange={(e) =>
                    loops.update(loopId, { instructions: e.currentTarget.value })
                  }
                />
              </div>

              {/* ---- connectors ---- */}
              <div className={styles.section}>
                <div className={styles.sectionHead}>
                  <span className={styles.sectionTitle}>Connectors</span>
                  <span className={styles.sectionHint}>
                    Services the agent may reach while the loop runs. Your
                    selection is saved with the loop, but connecting to any of
                    them needs an OAuth grant against that service — this build
                    has no server to hold one, so runs stay inside the
                    workspace.
                  </span>
                </div>
                {LOOP_CONNECTORS.map((connector) => (
                  <div key={connector.id} className={styles.toggleRow}>
                    <div className={styles.toggleMain}>
                      <span className={styles.toggleLabel}>{connector.name}</span>
                      <span className={styles.toggleHint}>{connector.hint}</span>
                    </div>
                    <Toggle
                      checked={loop.connectors.includes(connector.id)}
                      onChange={(on) => toggleConnector(connector.id, on)}
                      aria-label={connector.name}
                    />
                  </div>
                ))}
              </div>

              {/* ---- permissions ---- */}
              <div className={styles.section}>
                <div className={styles.sectionHead}>
                  <span className={styles.sectionTitle}>Permissions</span>
                  <span className={styles.sectionHint}>
                    Scope this loop can act within. Everything write-shaped is
                    opt-in.
                  </span>
                </div>
                {LOOP_PERMISSIONS.map((permission) => (
                  <div key={permission.id} className={styles.toggleRow}>
                    <div className={styles.toggleMain}>
                      <span className={styles.toggleLabel}>{permission.label}</span>
                      <span className={styles.toggleHint}>{permission.hint}</span>
                    </div>
                    <Toggle
                      checked={loop.permissions[permission.id] === true}
                      onChange={(on) => togglePermission(permission.id, on)}
                      aria-label={permission.label}
                    />
                  </div>
                ))}
              </div>

              {/* ---- footer ---- */}
              <div className={styles.footer}>
                <span className={styles.footerNote}>
                  {loop.versions.length === 0
                    ? "Not published yet — drafts never run on their own."
                    : `Last published version ${loop.versions.length}.`}
                </span>
                <span className={styles.footerSpacer} />
                <Button
                  variant="secondary"
                  size={28}
                  onClick={() => {
                    loops.setStatus(loopId, "draft");
                    showToast("Draft saved");
                  }}
                >
                  Save draft
                </Button>
                <Button
                  variant="primary"
                  size={28}
                  onClick={() => {
                    const version = loops.publish(loopId);
                    if (version !== undefined) {
                      showToast(`Published version ${version.version}`);
                    }
                  }}
                >
                  Publish
                </Button>
              </div>
            </>
          ) : (
            /* ---- run history ---- */
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <span className={styles.sectionTitle}>Run history</span>
                <span className={styles.sectionHint}>
                  Every run records its timing and the changes it applied.
                </span>
              </div>
              <div className={styles.footer} style={{ borderTop: "none", paddingTop: 0 }}>
                <span className={styles.footerNote}>
                  {loop.runs.length} {loop.runs.length === 1 ? "run" : "runs"} recorded
                </span>
                <span className={styles.footerSpacer} />
                <Button
                  variant="primary"
                  size={28}
                  disabled={running}
                  onClick={() => void runNow()}
                >
                  {running ? "Running…" : "Run now"}
                </Button>
              </div>

              {loop.runs.length === 0 ? (
                <span className={styles.conditionEmpty}>
                  No runs yet. Use “Run now” to execute the instructions against the
                  matching issues.
                </span>
              ) : (
                <div className={styles.runList} data-testid="loop-runs">
                  {loop.runs.map((run) => (
                    <div key={run.id} className={styles.runRow}>
                      <div className={styles.runHead}>
                        <span className={styles.runOutcome}>
                          <span
                            className={styles.runDot}
                            data-outcome={run.outcome}
                            aria-hidden="true"
                          />
                          {run.outcome === "success"
                            ? "Completed"
                            : run.outcome === "noMatches"
                              ? "No matches"
                              : "Failed"}
                        </span>
                        <span className={styles.runMeta}>
                          {formatTime(run.startedAt)} · {run.durationMs}ms
                        </span>
                      </div>
                      <span className={styles.runDetail}>{run.detail}</span>
                      {run.actions.length > 0 ? (
                        <div className={styles.runActions}>
                          {run.actions.map((action, index) => (
                            <span key={index} className={styles.runAction}>
                              <span className={styles.runActionDot} aria-hidden="true" />
                              {action.summary}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
});
