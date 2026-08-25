"use client";

/**
 * Dev-only inspector for the local-first engine (§19). Boots a SyncClient for
 * whichever workspace this browser is in (localStorage.linearWorkspace — the
 * same slug the app routes on) and shows live pool contents + two optimistic
 * mutation buttons that exercise the full round-trip:
 * enqueue → MobX pool → durable queue → POST /api/sync/mutation → SSE delta.
 *
 * With no workspace yet there is nothing to inspect, so it points at
 * onboarding rather than conjuring one.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import {
  DataProvider,
  useStore,
  useSyncClient,
} from "@/lib/data/DataProvider";
import { MODEL_NAMES } from "@/lib/data/types";
import { readActiveWorkspace } from "@/lib/workspace/active";

const wrap: React.CSSProperties = {
  minHeight: "100vh",
  padding: "32px 40px",
  background: "#0f1011",
  color: "#e6e6e6",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 13,
  lineHeight: 1.6,
};

const h2: React.CSSProperties = {
  fontSize: 13,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#8a8f98",
  margin: "24px 0 8px",
};

const td: React.CSSProperties = {
  padding: "2px 16px 2px 0",
  borderBottom: "1px solid #23252a",
  textAlign: "left",
};

const btn: React.CSSProperties = {
  padding: "6px 12px",
  marginRight: 8,
  background: "#5e6ad2",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  font: "inherit",
  cursor: "pointer",
};

const Inspector = observer(function Inspector() {
  const client = useSyncClient();
  const store = useStore();

  const issue = store.issueByIdentifier("TRENDZO-37");
  const state = issue ? store.get("WorkflowState", issue.stateId) : undefined;
  const projects = store
    .all("Project")
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div style={wrap}>
      <h1 style={{ fontSize: 16, margin: 0 }}>Sync engine inspector</h1>

      <h2 style={h2}>Client</h2>
      <div>
        status: <strong>{client.status}</strong> · lastSyncId:{" "}
        <strong>{client.lastSyncId}</strong> · pending:{" "}
        <strong>{client.queue.pendingCount}</strong>
        {client.queue.syncing ? " (syncing…)" : ""}
      </div>

      <h2 style={h2}>Entity counts</h2>
      <table style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={td}>model</th>
            <th style={td}>rows</th>
          </tr>
        </thead>
        <tbody>
          {MODEL_NAMES.map((model) => (
            <tr key={model}>
              <td style={td}>{model}</td>
              <td style={td}>{store.all(model).length}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={h2}>TRENDZO-37</h2>
      {issue ? (
        <div>
          title: <strong>{issue.title}</strong> · state:{" "}
          <strong>{state?.name ?? "?"}</strong> · priority:{" "}
          <strong>{issue.priority}</strong>
        </div>
      ) : (
        <div>not loaded{client.status === "booting" ? " (booting…)" : ""}</div>
      )}

      <h2 style={h2}>Projects ({projects.length})</h2>
      <ol style={{ margin: 0, paddingLeft: 20 }}>
        {projects.map((p) => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ol>

      <h2 style={h2}>Optimistic mutations</h2>
      <button
        type="button"
        style={btn}
        disabled={!issue}
        onClick={() => {
          if (issue) client.mutate.updateIssue(issue.id, { title: `${issue.title}!` });
        }}
      >
        Rename TRE-37
      </button>
      <button
        type="button"
        style={btn}
        disabled={!issue}
        onClick={() => {
          if (issue) {
            client.mutate.updateIssue(issue.id, {
              priority: issue.priority === 0 ? 1 : 0,
            });
          }
        }}
      >
        Toggle priority
      </button>
    </div>
  );
});

export function DataInspector() {
  // localStorage is browser-only — resolve after mount, like every other
  // active-workspace consumer.
  const [slug, setSlug] = useState<string | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    setSlug(readActiveWorkspace());
    setResolved(true);
  }, []);

  if (!resolved) return <div style={wrap} />;

  if (slug === null) {
    return (
      <div style={wrap}>
        <div id="skip-nav" tabIndex={-1} />
        <h2 style={h2}>Data Inspector</h2>
        <p style={{ color: "#8a8f98" }}>
          This browser has no workspace yet — nothing is stored to inspect.{" "}
          <Link href="/onboarding/workspace" style={{ color: "#7b8cff" }}>
            Create one
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <DataProvider workspace={slug}>
      {/* Skip-link target: this route renders outside AppShell. */}
      <div id="skip-nav" tabIndex={-1} />
      <Inspector />
    </DataProvider>
  );
}
