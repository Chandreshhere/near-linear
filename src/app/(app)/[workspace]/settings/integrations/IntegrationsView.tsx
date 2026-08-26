"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { observer } from "mobx-react-lite";
import { Button, IconButton } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Select, type SelectOption } from "@/components/ui/Select";
import {
  SettingsCard,
  SettingsCustomRow,
  SettingsEmptyRow,
  SettingsPageHeader,
  SettingsRow,
  SettingsSection,
  SettingsSections,
} from "@/components/settings/SettingsPage";
import { useStore, useSyncClient } from "@/lib/data/DataProvider";
import {
  PROVIDER_LABELS,
  useIntegrations,
  type InboundMessage,
  type IntegrationConnection,
  type IntegrationProvider,
  type IntegrationsStore,
  type RoutingRule,
  type TriggerMode,
} from "@/lib/integrations/store";
import type { SyncStore } from "@/lib/data/store";
import type { TeamData } from "@/lib/data/types";
import { copyToClipboard, showToast } from "@/lib/toast";
import {
  MCP_ENDPOINT_PATH,
  MCP_SERVER_NAME,
  TOOL_DOCS,
} from "@/lib/mcp/catalogue";
import settings from "@/components/settings/settings.module.css";
import s from "./integrations.module.css";

/**
 * Settings → Features → Integrations (Phase 15 — FRONTEND ONLY, one seam).
 *
 * Everything on this page is real: connections/rules/log persist in the
 * integrations store (localStorage "integrations") and the simulator drives
 * the SAME `ingest()` pipeline a webhook receiver would, creating issues
 * through the optimistic sync engine. The only simulated parts are the OAuth
 * grant (a dialog instead of a provider redirect) and message delivery (the
 * simulator instead of POST /api/integrations/inbound — the receiver a real
 * backend implements; its contract lives in that route's doc comment).
 */

/* ================================================================
 * Provider metadata + ORIGINAL neutral glyphs (not provider logos)
 * ================================================================ */

const PROVIDERS: {
  key: IntegrationProvider;
  description: string;
}[] = [
  {
    key: "slack",
    description: "Turn channel messages into issues with @linear mentions or /task commands.",
  },
  {
    key: "msteams",
    description: "Create issues from team channels — mention the bot or use /task in a post.",
  },
];

/** Slack-like: a plain channel hash on a grid — deliberately not the real logo. */
function HashGlyph({ size = 20 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="currentColor"
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="4.7" y="2" width="1.5" height="12" rx="0.75" />
      <rect x="9.8" y="2" width="1.5" height="12" rx="0.75" />
      <rect x="2" y="4.7" width="12" height="1.5" rx="0.75" />
      <rect x="2" y="9.8" width="12" height="1.5" rx="0.75" />
    </svg>
  );
}

/** Teams-like: four rounded tiles, one hollow — deliberately not the real logo. */
function TilesGlyph({ size = 20 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="currentColor"
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="2.2" y="2.2" width="5.4" height="5.4" rx="1.4" />
      <rect x="8.4" y="2.2" width="5.4" height="5.4" rx="1.4" />
      <rect x="2.2" y="8.4" width="5.4" height="5.4" rx="1.4" />
      <path
        fillRule="evenodd"
        d="M9.8 8.4h2.6c.77 0 1.4.63 1.4 1.4v2.6c0 .77-.63 1.4-1.4 1.4H9.8a1.4 1.4 0 0 1-1.4-1.4V9.8c0-.77.63-1.4 1.4-1.4Zm-.1 1.4v2.6c0 .06.04.1.1.1h2.6a.1.1 0 0 0 .1-.1V9.8a.1.1 0 0 0-.1-.1H9.8a.1.1 0 0 0-.1.1Z"
      />
    </svg>
  );
}

function ProviderGlyph({
  provider,
  size = 20,
}: {
  provider: IntegrationProvider;
  size?: number;
}) {
  return provider === "slack" ? <HashGlyph size={size} /> : <TilesGlyph size={size} />;
}

/* ================================================================
 * Small helpers
 * ================================================================ */

const CONNECTED_AT_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});
const LOG_TIME_FORMAT = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatDate(iso: string, format: Intl.DateTimeFormat): string {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? "" : format.format(time);
}

function slugifyTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug === "" ? "issue" : slug;
}

/** Link target for a created issue; plain chip when it no longer exists. */
function IssueChip({
  workspace,
  identifier,
  syncStore,
}: {
  workspace: string;
  identifier: string;
  syncStore: SyncStore;
}) {
  const issue = syncStore.issueByIdentifier(identifier);
  if (issue === undefined) {
    return <span className={s.issueChip}>{identifier}</span>;
  }
  return (
    <Link
      className={s.issueChip}
      href={`/${workspace}/issue/${issue.identifier}/${slugifyTitle(issue.title)}`}
    >
      {identifier}
    </Link>
  );
}

const TRIGGER_OPTIONS: SelectOption[] = [
  { value: "mention", label: "@linear mention" },
  { value: "command", label: "/task command" },
  { value: "all", label: "Every message" },
];

const PRIORITY_OPTIONS: SelectOption[] = [
  { value: "none", label: "No default" },
  { value: "1", label: "Urgent" },
  { value: "2", label: "High" },
  { value: "3", label: "Medium" },
  { value: "4", label: "Low" },
];

function isTriggerMode(value: string): value is TriggerMode {
  return value === "mention" || value === "command" || value === "all";
}

function channelOptions(connection: IntegrationConnection, withAll: boolean): SelectOption[] {
  const channels = connection.channels.map((channel) => ({
    value: channel.id,
    label: `#${channel.name}`,
  }));
  return withAll ? [{ value: "*", label: "All channels" }, ...channels] : channels;
}

function teamOptions(teams: TeamData[]): SelectOption[] {
  return teams.map((team) => ({ value: team.id, label: team.name }));
}

/* ================================================================
 * Simulated OAuth dialog
 * ================================================================ */

function ConnectDialog({
  provider,
  defaultWorkspaceName,
  onCancel,
  onAuthorize,
}: {
  provider: IntegrationProvider;
  defaultWorkspaceName: string;
  onCancel: () => void;
  onAuthorize: (workspaceName: string) => void;
}) {
  const label = PROVIDER_LABELS[provider];
  const [name, setName] = useState(defaultWorkspaceName);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onAuthorize(name);
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      width={440}
      label={`Connect ${label}`}
    >
      <form onSubmit={submit}>
        <div className={settings.dialogHeader}>
          <span className={settings.dialogTitle}>Connect {label}</span>
        </div>
        <div className={settings.dialogBody}>
          <p className={settings.panelBody}>
            Simulated OAuth — nothing leaves this browser. A production backend
            redirects to {label} for consent, stores the bot token, and
            subscribes this workspace to message webhooks.
          </p>
          <div className={settings.fieldStack}>
            <label className={settings.fieldLabel} htmlFor="integration-workspace-name">
              {provider === "slack" ? "Slack workspace" : "Teams organization"}
            </label>
            <Input
              id="integration-workspace-name"
              inputSize="sm"
              value={name}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              placeholder={provider === "slack" ? "acme-inc" : "Acme Inc"}
              onChange={(event) => setName(event.target.value)}
            />
            <span className={settings.fieldHint}>
              The {label} workspace the bot is installed into.
            </span>
          </div>
        </div>
        <div className={settings.dialogFooter}>
          <Button variant="ghost" size={28} onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" size={28} type="submit" disabled={name.trim() === ""}>
            Authorize
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/* ================================================================
 * Provider directory card
 * ================================================================ */

const ProviderCard = observer(function ProviderCard({
  provider,
  description,
  integrations,
}: {
  provider: IntegrationProvider;
  description: string;
  integrations: IntegrationsStore;
}) {
  const label = PROVIDER_LABELS[provider];
  const connection = integrations.connectionFor(provider);
  const connected = connection !== undefined && connection.status === "connected";
  const [dialogOpen, setDialogOpen] = useState(false);
  const syncStore = useStore();

  const authorize = (workspaceName: string) => {
    const next = integrations.connect(provider, workspaceName);
    setDialogOpen(false);
    showToast(`Connected ${label} — ${next.channels.length} channels found`);
  };

  return (
    <div className={s.providerCard} data-provider={provider}>
      <div className={s.providerHead}>
        <span className={s.providerTile}>
          <ProviderGlyph provider={provider} />
        </span>
        <span className={s.providerText}>
          <span className={s.providerName}>
            {label}
            {connected ? (
              <span className={settings.pillTag} data-tone="on">
                Connected
              </span>
            ) : null}
          </span>
          <span className={s.providerDescription}>
            {connected && connection !== undefined
              ? `${connection.workspaceName} · ${connection.channels.length} channels · connected ${formatDate(connection.connectedAt, CONNECTED_AT_FORMAT)}`
              : description}
          </span>
        </span>
      </div>
      <div className={s.providerActions}>
        {connected && connection !== undefined ? (
          <>
            <Button
              variant="secondary"
              size={28}
              onClick={() => {
                document
                  .getElementById(`connection-${connection.id}`)
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              Configure
            </Button>
            <Button
              variant="ghost"
              size={28}
              onClick={() => {
                integrations.disconnect(connection.id);
                showToast(`Disconnected ${label} — rules and activity are kept`);
              }}
            >
              Disconnect
            </Button>
          </>
        ) : (
          <Button variant="secondary" size={28} onClick={() => setDialogOpen(true)}>
            Connect
          </Button>
        )}
      </div>
      {dialogOpen ? (
        <ConnectDialog
          provider={provider}
          defaultWorkspaceName={
            connection?.workspaceName ?? syncStore.all("Workspace")[0]?.name ?? ""
          }
          onCancel={() => setDialogOpen(false)}
          onAuthorize={authorize}
        />
      ) : null}
    </div>
  );
});

/* ================================================================
 * Routing rules
 * ================================================================ */

function CrossGlyph() {
  return (
    <svg
      viewBox="0 0 16 16"
      width={14}
      height={14}
      fill="currentColor"
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4.28 3.22a.75.75 0 0 0-1.06 1.06L6.94 8l-3.72 3.72a.75.75 0 1 0 1.06 1.06L8 9.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L9.06 8l3.72-3.72a.75.75 0 0 0-1.06-1.06L8 6.94 4.28 3.22Z" />
    </svg>
  );
}

const RuleRow = observer(function RuleRow({
  rule,
  connection,
  teams,
  integrations,
}: {
  rule: RoutingRule;
  connection: IntegrationConnection;
  teams: TeamData[];
  integrations: IntegrationsStore;
}) {
  return (
    <li className={settings.row}>
      <div className={s.ruleGrid}>
        <Select
          className={s.ruleSelect}
          label="Channel"
          value={rule.channelId}
          options={channelOptions(connection, true)}
          onValueChange={(value) => integrations.updateRule(rule.id, { channelId: value })}
        />
        <Select
          className={s.ruleSelect}
          label="Team"
          value={rule.teamId}
          options={teamOptions(teams)}
          onValueChange={(value) => integrations.updateRule(rule.id, { teamId: value })}
        />
        <Select
          className={s.ruleSelect}
          label="Trigger mode"
          value={rule.triggerMode}
          options={TRIGGER_OPTIONS}
          onValueChange={(value) => {
            if (isTriggerMode(value)) integrations.updateRule(rule.id, { triggerMode: value });
          }}
        />
        <Select
          className={s.ruleSelect}
          label="Default priority"
          value={rule.defaultPriority === undefined ? "none" : String(rule.defaultPriority)}
          options={PRIORITY_OPTIONS}
          onValueChange={(value) =>
            integrations.updateRule(rule.id, {
              defaultPriority: value === "none" ? undefined : Number(value),
            })
          }
        />
        <IconButton label="Delete rule" size={28} onClick={() => integrations.removeRule(rule.id)}>
          <CrossGlyph />
        </IconButton>
      </div>
    </li>
  );
});

const RulesCard = observer(function RulesCard({
  connection,
  teams,
  integrations,
}: {
  connection: IntegrationConnection;
  teams: TeamData[];
  integrations: IntegrationsStore;
}) {
  const rules = integrations.rulesFor(connection.id);
  return (
    <div className={settings.card}>
      {rules.length > 0 ? (
        <div className={s.rulesHead} aria-hidden="true">
          <span className={s.colLabel}>Channel</span>
          <span className={s.colLabel}>Team</span>
          <span className={s.colLabel}>Trigger</span>
          <span className={s.colLabel}>Priority</span>
          <span />
        </div>
      ) : null}
      <ul className={settings.list}>
        {rules.length === 0 ? (
          <SettingsEmptyRow>
            No routing rules yet — every message from {connection.workspaceName} is
            ignored until one exists.
          </SettingsEmptyRow>
        ) : (
          rules.map((rule) => (
            <RuleRow
              key={rule.id}
              rule={rule}
              connection={connection}
              teams={teams}
              integrations={integrations}
            />
          ))
        )}
      </ul>
      <div className={settings.cardFooter}>
        <span className={s.explainer}>
          mention — messages that include @linear · command — messages starting
          with /task · every message — no trigger needed
        </span>
        <Button
          variant="secondary"
          size={28}
          disabled={teams.length === 0}
          onClick={() => {
            const first = teams[0];
            if (first !== undefined) integrations.addRule(connection.id, first.id);
          }}
        >
          Add rule
        </Button>
      </div>
    </div>
  );
});

/* ================================================================
 * Message simulator — drives the exact webhook pipeline
 * ================================================================ */

const Simulator = observer(function Simulator({
  connection,
  integrations,
  workspace,
}: {
  connection: IntegrationConnection;
  integrations: IntegrationsStore;
  workspace: string;
}) {
  const client = useSyncClient();
  const syncStore = useStore();
  const firstChannel = connection.channels[0]?.id ?? "";
  const [channelId, setChannelId] = useState(firstChannel);
  const [author, setAuthor] = useState("");
  const [text, setText] = useState("");
  const [result, setResult] = useState<InboundMessage | null>(null);

  const send = () => {
    const outcome = integrations.ingest(
      { connectionId: connection.id, channelId, author, text },
      client,
    );
    setResult(outcome);
  };

  return (
    <div className={settings.card}>
      <div className={s.simWrap}>
        <div className={s.simGrid}>
          <div className={s.simHead}>
            <span className={settings.rowLabel}>Test the pipeline</span>
            <span className={s.simBadge}>
              Simulates the webhook your backend will call
            </span>
          </div>
          <div className={s.simControls}>
            <Select
              label="Channel"
              value={channelId}
              options={channelOptions(connection, false)}
              onValueChange={setChannelId}
            />
            <Input
              inputSize="sm"
              className={s.simAuthor}
              value={author}
              placeholder="Author"
              autoComplete="off"
              spellCheck={false}
              aria-label="Author"
              onChange={(event) => setAuthor(event.target.value)}
            />
          </div>
          <textarea
            className={`${settings.textarea} ${s.simTextarea}`}
            value={text}
            placeholder={'Try: /task Fix retailer login priority high — or "@linear …" depending on the rule'}
            aria-label="Message text"
            onChange={(event) => setText(event.target.value)}
          />
          <div className={s.simFooter}>
            <span className={s.simResult} aria-live="polite">
              {result === null ? (
                <span className={s.simHint}>
                  Hints: “priority urgent/high/medium/low” · “assign me”
                </span>
              ) : result.outcome.kind === "created" ? (
                <>
                  Created{" "}
                  <IssueChip
                    workspace={workspace}
                    identifier={result.outcome.identifier}
                    syncStore={syncStore}
                  />{" "}
                  <span className={s.simResultReason}>
                    from #{integrations.channelName(result.connectionId, result.channelId)}
                  </span>
                </>
              ) : (
                <>
                  <span className={s.ignoredChip}>Ignored</span>
                  <span className={s.simResultReason}>{result.outcome.reason}</span>
                </>
              )}
            </span>
            <Button variant="primary" size={28} disabled={text.trim() === ""} onClick={send}>
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

/* ================================================================
 * Activity log
 * ================================================================ */

const ActivityLog = observer(function ActivityLog({
  integrations,
  workspace,
}: {
  integrations: IntegrationsStore;
  workspace: string;
}) {
  const syncStore = useStore();
  const entries = integrations.log;
  return (
    <div className={settings.card}>
      <ul className={settings.list}>
        {entries.length === 0 ? (
          <SettingsEmptyRow>
            No messages yet — connect a workspace and use the simulator, or point
            the provider webhook at /api/integrations/inbound.
          </SettingsEmptyRow>
        ) : (
          entries.map((entry) => {
            const connection = integrations.connections.find(
              (c) => c.id === entry.connectionId,
            );
            return (
              <li key={entry.id} className={settings.row}>
                <div className={s.logRow}>
                  <span className={s.logTile}>
                    {connection !== undefined ? (
                      <ProviderGlyph provider={connection.provider} size={14} />
                    ) : (
                      <CrossGlyph />
                    )}
                  </span>
                  <span className={s.logMain}>
                    <span className={s.logHeadline}>
                      <span className={s.logChannel}>
                        #{integrations.channelName(entry.connectionId, entry.channelId)}
                      </span>
                      <span className={s.logAuthor}>{entry.author}</span>
                      <span className={s.logTime}>
                        {formatDate(entry.receivedAt, LOG_TIME_FORMAT)}
                      </span>
                    </span>
                    <span className={s.logText} title={entry.text}>
                      {entry.text}
                    </span>
                  </span>
                  <span className={s.logOutcome}>
                    {entry.outcome.kind === "created" ? (
                      <IssueChip
                        workspace={workspace}
                        identifier={entry.outcome.identifier}
                        syncStore={syncStore}
                      />
                    ) : (
                      <span className={s.ignoredChip} title={entry.outcome.reason}>
                        Ignored
                      </span>
                    )}
                  </span>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
});

/* ================================================================
 * MCP server + webhook reference
 * ================================================================ */

/** The deployment's own origin, read after mount so SSR stays deterministic. */
function useOrigin(): string {
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  return origin;
}

function CopyButton({ value, message }: { value: string; message: string }) {
  return (
    <Button
      variant="secondary"
      size={24}
      disabled={value === ""}
      onClick={() => {
        void copyToClipboard(value, message);
      }}
    >
      Copy
    </Button>
  );
}

/** A labelled, copyable code block. */
function ReferenceBlock({
  label,
  note,
  value,
  copyMessage,
}: {
  label: string;
  note?: ReactNode;
  value: string;
  copyMessage: string;
}) {
  return (
    <SettingsCustomRow>
      <div className={s.refRow}>
        <div className={s.refHead}>
          <span className={s.refLabel}>{label}</span>
          <CopyButton value={value} message={copyMessage} />
        </div>
        <pre className={s.code}>{value === "" ? "…" : value}</pre>
        {note !== undefined ? <span className={s.refNote}>{note}</span> : null}
      </div>
    </SettingsCustomRow>
  );
}

/**
 * Settings -> Integrations -> MCP server.
 *
 * The endpoint is real: `src/app/api/mcp/route.ts` speaks MCP over Streamable
 * HTTP using the official SDK. What it operates on is stated plainly below
 * rather than glossed - it serves the SERVER-side store, which is what the
 * app itself reads only when it runs with the http transport.
 */
function McpSection() {
  const origin = useOrigin();
  const endpoint = origin === "" ? "" : `${origin}${MCP_ENDPOINT_PATH}`;
  const clientConfig =
    endpoint === ""
      ? ""
      : JSON.stringify(
          {
            mcpServers: {
              [MCP_SERVER_NAME]: {
                url: endpoint,
                headers: { Authorization: "Bearer <MCP_TOKEN>" },
              },
            },
          },
          null,
          2,
        );

  return (
    <SettingsSection
      id="mcp"
      title="MCP server"
      description="Let an AI client read and change this workspace over the Model Context Protocol."
    >
      <SettingsCard>
        <ReferenceBlock
          label="Endpoint (Streamable HTTP)"
          value={endpoint}
          copyMessage="Copied the MCP endpoint"
          note="POST JSON-RPC 2.0 here. Responses come back as application/json; there is no GET event stream."
        />
        <ReferenceBlock
          label="Client configuration — Claude Desktop / Cursor"
          value={clientConfig}
          copyMessage="Copied the MCP client configuration"
          note={
            <>
              Paste into <span className={s.codeInline}>claude_desktop_config.json</span> or
              Cursor&rsquo;s <span className={s.codeInline}>mcp.json</span>. Drop the{" "}
              <span className={s.codeInline}>headers</span> block when{" "}
              <span className={s.codeInline}>MCP_TOKEN</span> is unset; otherwise replace{" "}
              <span className={s.codeInline}>&lt;MCP_TOKEN&gt;</span> with its value.
            </>
          }
        />
        <SettingsRow
          label="Authentication"
          description={
            <>
              Set <span className={s.codeInline}>MCP_TOKEN</span> and every request must carry{" "}
              <span className={s.codeInline}>Authorization: Bearer &lt;token&gt;</span>. Unset, the
              endpoint is open — fine on localhost, never on a deployment: these tools create and
              change work.
            </>
          }
        />
        <SettingsRow
          label="What it reads and writes"
          description={
            <>
              The server-side store (<span className={s.codeInline}>src/server/syncStore.ts</span>),
              not this browser tab. This app is local-first: your workspace lives in this
              browser&rsquo;s IndexedDB, which no server route can reach. Run with{" "}
              <span className={s.codeInline}>NEXT_PUBLIC_SYNC_TRANSPORT=http</span> — or point the
              app at a real backend — and MCP writes land in the same store the app reads, arriving
              live over the existing delta stream.
            </>
          }
        />
      </SettingsCard>

      <SettingsCard>
        <SettingsCustomRow>
          <div className={s.toolList}>
            {TOOL_DOCS.map((tool) => (
              <span key={tool.name} className={s.toolRow}>
                <span className={s.toolName}>
                  {tool.name}
                  {tool.writes ? <span className={s.writeChip}>writes</span> : null}
                </span>
                <span className={s.toolDescription}>{tool.description}</span>
              </span>
            ))}
          </div>
        </SettingsCustomRow>
      </SettingsCard>
    </SettingsSection>
  );
}

const WEBHOOK_BODY = JSON.stringify(
  {
    provider: "slack",
    workspaceName: "synquic",
    channel: "eng",
    author: "sana",
    text: "/task Fix retailer login priority high",
    messageId: "Ev09ABCDEF",
  },
  null,
  2,
);

const RULES_EXAMPLE = JSON.stringify(
  [{ provider: "slack", channel: "eng", team: "TRENDZO", trigger: "command" }],
);

/**
 * Settings -> Integrations -> Webhook. The receiver is real
 * (`src/app/api/integrations/inbound/route.ts`): it verifies the signature,
 * resolves a rule from INTEGRATIONS_RULES, extracts the task with the same
 * code the simulator above runs, and creates the issue.
 */
function WebhookSection() {
  const origin = useOrigin();
  const endpoint = origin === "" ? "" : `${origin}/api/integrations/inbound`;

  return (
    <SettingsSection
      id="webhook"
      title="Webhook"
      description="Where a provider adapter POSTs a normalized chat message. The receiver runs the same pipeline the simulator above does."
    >
      <SettingsCard>
        <ReferenceBlock
          label="Inbound URL"
          value={endpoint}
          copyMessage="Copied the webhook URL"
          note="Answers 202 once the request is well-formed and authentic — a rule or trigger miss is a pipeline outcome, not a transport error."
        />
        <ReferenceBlock
          label="Request body"
          value={WEBHOOK_BODY}
          copyMessage="Copied the example webhook body"
          note={
            <>
              <span className={s.codeInline}>messageId</span> is optional and makes provider retries
              safe: a repeat answers <span className={s.codeInline}>202</span> with{" "}
              <span className={s.codeInline}>duplicate: true</span> instead of creating a second
              issue. A created message answers{" "}
              <span className={s.codeInline}>{'{ "accepted": true, "identifier": "TRENDZO-41" }'}</span>.
            </>
          }
        />
        <SettingsRow
          label="Signing secret"
          description={
            <>
              Set <span className={s.codeInline}>INTEGRATIONS_SIGNING_SECRET</span> and every request
              must carry <span className={s.codeInline}>X-Signature: sha256=&lt;hex&gt;</span> —
              HMAC-SHA256 over the raw body, or over{" "}
              <span className={s.codeInline}>&lt;timestamp&gt;.&lt;rawBody&gt;</span> when{" "}
              <span className={s.codeInline}>X-Timestamp</span> (unix seconds) is sent. Compared in
              constant time; a timestamp more than 300s off is rejected.
            </>
          }
        />
        <SettingsRow
          label="Routing rules"
          description={
            <>
              The rules above live in this browser. The server reads its own from{" "}
              <span className={s.codeInline}>INTEGRATIONS_RULES</span>, e.g.{" "}
              <span className={s.codeInline}>{RULES_EXAMPLE}</span>. Unset, one built-in rule routes
              every channel to the first team on the <span className={s.codeInline}>/task</span>{" "}
              command.
            </>
          }
        />
      </SettingsCard>
    </SettingsSection>
  );
}

/* ================================================================
 * The page
 * ================================================================ */

export const IntegrationsView = observer(function IntegrationsView() {
  const params = useParams<{ workspace: string }>();
  const workspace = params.workspace;
  const integrations = useIntegrations();
  const syncStore = useStore();

  const teams = syncStore
    .all("Team")
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const connectedConnections = integrations.connections.filter(
    (connection) => connection.status === "connected",
  );

  return (
    <>
      <SettingsPageHeader
        title="Integrations"
        description="Connect the chat tools this workspace works alongside and route their messages into team backlogs."
      />
      <SettingsSections>
        <SettingsSection
          id="directory"
          title="Directory"
          description="Connecting simulates the OAuth grant locally; the webhook receiver is the one piece a backend adds."
        >
          <div className={s.providerGrid}>
            {PROVIDERS.map((provider) => (
              <ProviderCard
                key={provider.key}
                provider={provider.key}
                description={provider.description}
                integrations={integrations}
              />
            ))}
          </div>
        </SettingsSection>

        {connectedConnections.map((connection) => (
          <SettingsSection
            key={connection.id}
            id={`connection-${connection.id}`}
            title={`${PROVIDER_LABELS[connection.provider]} · ${connection.workspaceName}`}
            description="Routing rules decide which team a channel's tasks land in. The first rule matching the exact channel wins; an “All channels” rule catches the rest."
          >
            <RulesCard connection={connection} teams={teams} integrations={integrations} />
            <Simulator
              connection={connection}
              integrations={integrations}
              workspace={workspace}
            />
          </SettingsSection>
        ))}

        <McpSection />

        <WebhookSection />

        <SettingsSection
          id="activity"
          title="Activity"
          description="Every inbound message and what became of it — the debugging surface for “why didn't my message become an issue?”"
        >
          <ActivityLog integrations={integrations} workspace={workspace} />
        </SettingsSection>
      </SettingsSections>
    </>
  );
});
