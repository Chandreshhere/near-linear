"use client";

import * as React from "react";
import { Button, IconButton } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/Kbd";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import { Toggle } from "@/components/ui/Toggle";
import { Checkbox } from "@/components/ui/Checkbox";
import { Select } from "@/components/ui/Select";
import { Tooltip, TooltipProvider } from "@/components/ui/Tooltip";
import { Menu, type MenuItem } from "@/components/ui/Menu";
import { Popover } from "@/components/ui/Popover";
import { AppContextMenu } from "@/components/ui/ContextMenu";
import { Dialog } from "@/components/ui/Dialog";
import { ListRow, RowCheckbox } from "@/components/ui/ListRow";
import { GroupHeader } from "@/components/ui/GroupHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/icons/Icon";
import { StatusIcon } from "@/components/icons/StatusIcon";
import { showToast, showCopyToast } from "@/lib/toast";
import { KeyboardProvider, useShortcut, formatKeys } from "@/lib/keyboard";

/* ================================================================
 * Layout helpers
 * ================================================================ */

function Section({
  label,
  children,
  column = false,
}: {
  label: string;
  children: React.ReactNode;
  column?: boolean;
}) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: "var(--color-text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </h2>
      <div
        style={
          column
            ? { display: "flex", flexDirection: "column", gap: 8 }
            : { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }
        }
      >
        {children}
      </div>
    </section>
  );
}

/**
 * OS-aware keycap chips for a shortcut string ("mod+k", "g m").
 * formatKeys() is OS-dependent, so render after mount (SSR-safe);
 * "then" connectors render as plain text between chips.
 */
function ShortcutChips({ keys }: { keys: string }) {
  const [chips, setChips] = React.useState<string[] | null>(null);
  React.useEffect(() => {
    setChips(formatKeys(keys));
  }, [keys]);
  if (chips === null) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      {chips.map((chip, i) =>
        chip === "then" ? (
          <span
            key={i}
            style={{ fontSize: 11, color: "var(--color-text-muted)" }}
          >
            then
          </span>
        ) : (
          <Kbd key={i} keys={[chip]} />
        ),
      )}
    </span>
  );
}

const mutedNote: React.CSSProperties = {
  fontSize: 13,
  color: "var(--color-text-muted)",
};

/* ================================================================
 * Gallery
 * ================================================================ */

export function PrimitivesGallery() {
  return (
    <KeyboardProvider>
      <TooltipProvider>
        {/* Skip-link target: this route renders outside AppShell. */}
        <div id="skip-nav" tabIndex={-1} />
        <GalleryContent />
      </TooltipProvider>
    </KeyboardProvider>
  );
}

function GalleryContent() {
  const [toggleA, setToggleA] = React.useState(true);
  const [toggleB, setToggleB] = React.useState(false);
  const [checked, setChecked] = React.useState(true);
  const [status, setStatus] = React.useState("in-progress");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [rowChecked, setRowChecked] = React.useState<Record<string, boolean>>({
    "LIN-101": false,
    "LIN-102": true,
    "LIN-103": false,
  });

  useShortcut({
    id: "dev.primitives.demo",
    keys: "mod+k",
    description: "Demo shortcut (primitives gallery)",
    handler: () => showToast("Demo shortcut fired (mod+K)"),
  });

  const menuItems: MenuItem[] = [
    {
      label: "Copy as prompt",
      icon: <Icon name="Copy" size={16} />,
      shortcut: ["⌘", "⌥", "P"],
      onSelect: () => showCopyToast("Copied prompt to clipboard"),
    },
    { type: "separator" },
    {
      label: "Configure coding tools…",
      icon: <Icon name="Chip" size={16} />,
      onSelect: () => showToast("Configure coding tools"),
    },
  ];

  const contextItems: MenuItem[] = [
    {
      label: "Copy link",
      icon: <Icon name="Link" size={16} />,
      shortcut: ["⌘", "C"],
      onSelect: () => showCopyToast("Copied issue link to clipboard"),
    },
    {
      label: "Favorite",
      icon: <Icon name="Favorite" size={16} />,
      onSelect: () => showToast("Added to favorites"),
    },
    { type: "separator" },
    {
      label: "Move to team",
      icon: <Icon name="Team" size={16} />,
      submenu: [
        { label: "Core", onSelect: () => showToast("Moved to Core") },
        { label: "Platform", onSelect: () => showToast("Moved to Platform") },
      ],
    },
  ];

  const setRow = (id: string) => (v: boolean) =>
    setRowChecked((prev) => ({ ...prev, [id]: v }));

  return (
    <div
      data-scroll-container="true"
      style={{
        height: "100%",
        overflowY: "auto",
        background: "var(--bg-base-color)",
      }}
    >
      <main
        style={{
          maxWidth: 720,
          padding: 32,
          display: "flex",
          flexDirection: "column",
          gap: 32,
        }}
      >
        <header style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: "var(--color-text-title)",
            }}
          >
            Primitives
          </h1>
          <p style={mutedNote}>
            Dev gallery — every UI primitive in realistic states. Press{" "}
            <ShortcutChips keys="mod+k" /> for the demo shortcut.
          </p>
        </header>

        <Section label="Buttons — variants">
          <Button variant="primary">Create issue</Button>
          <Button variant="secondary">Duplicate</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
          <Button variant="secondary" icon={<Icon name="Filter" size={14} />}>
            Filter
          </Button>
          <Button variant="secondary" pill={false}>
            Rect
          </Button>
        </Section>

        <Section label="Buttons — sizes">
          <Button variant="secondary" size={24}>
            Size 24
          </Button>
          <Button variant="secondary" size={28}>
            Size 28
          </Button>
          <Button variant="secondary" size={32}>
            Size 32
          </Button>
          <Button variant="primary" size={44}>
            Size 44
          </Button>
          <Button variant="secondary" size={32}>
            Create new issue <Kbd keys={["C"]} />
          </Button>
        </Section>

        <Section label="Icon buttons">
          <IconButton label="Search" size={24}>
            <Icon name="Search" size={14} />
          </IconButton>
          <IconButton label="Filter" size={28}>
            <Icon name="Filter" size={14} />
          </IconButton>
          <IconButton label="More options" size={32}>
            <Icon name="More" size={16} />
          </IconButton>
        </Section>

        <Section label="Keycaps">
          <span style={mutedNote}>Go to my issues</span>
          <ShortcutChips keys="g m" />
          <span style={mutedNote}>Command bar</span>
          <ShortcutChips keys="mod+k" />
          <span style={mutedNote}>Static chips</span>
          <Kbd keys={["⇧", "V"]} />
        </Section>

        <Section label="Avatars 16–44">
          <Avatar initials="MK" size={16} />
          <Avatar initials="AL" size={18} />
          <Avatar initials="JD" size={22} />
          <Avatar initials="PS" size={24} />
          <Avatar initials="RT" size={28} />
          <Avatar initials="CN" size={32} />
          <Avatar initials="VO" size={44} />
          <Avatar initials="ZH" size={28} color="lch(62% 60 250)" />
        </Section>

        <Section label="Inputs" column>
          <Input inputSize="lg" placeholder="Issue title…" defaultValue="" />
          <div style={{ maxWidth: 280 }}>
            <Input
              inputSize="sm"
              placeholder="Filter by keyword"
              defaultValue="onboarding"
              style={{ width: "100%" }}
            />
          </div>
        </Section>

        <Section label="Toggle / Checkbox">
          <Toggle
            checked={toggleA}
            onChange={setToggleA}
            aria-label="Notifications (on)"
          />
          <Toggle
            checked={toggleB}
            onChange={setToggleB}
            aria-label="Auto-archive (off)"
          />
          <Checkbox
            checked={checked}
            onChange={setChecked}
            label="Show sub-issues"
          />
        </Section>

        <Section label="Select">
          <Select
            label="Status"
            value={status}
            onValueChange={setStatus}
            options={[
              { value: "backlog", label: "Backlog" },
              { value: "in-progress", label: "In Progress" },
              { value: "done", label: "Done" },
            ]}
          />
          <span style={mutedNote}>value: {status}</span>
        </Section>

        <Section label="Tooltips">
          <Tooltip content="Search" keys={["/"]}>
            <IconButton label="Search">
              <Icon name="Search" size={14} />
            </IconButton>
          </Tooltip>
          <Tooltip content="Go to inbox" keys={["G", "I"]}>
            <IconButton label="Inbox">
              <Icon name="Inbox" size={14} />
            </IconButton>
          </Tooltip>
          <Tooltip content="Display options">
            <IconButton label="Display options">
              <Icon name="DisplayOptions" size={14} />
            </IconButton>
          </Tooltip>
        </Section>

        <Section label="Menu / Popover">
          <Menu
            trigger={
              <Button variant="secondary" icon={<Icon name="More" size={14} />}>
                Actions
              </Button>
            }
            items={menuItems}
          />
          <Popover
            trigger={<Button variant="secondary">Open popover</Button>}
          >
            <div
              style={{
                padding: 12,
                width: 240,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--color-text-title)",
                }}
              >
                Snooze notifications
              </div>
              <p style={mutedNote}>
                Pause inbox notifications for this issue until tomorrow.
              </p>
              <Input inputSize="sm" placeholder="Until…" />
            </div>
          </Popover>
        </Section>

        <Section label="Context menu" column>
          <AppContextMenu items={contextItems}>
            <div
              style={{
                border: "1px dashed var(--color-border-hover)",
                borderRadius: 8,
                padding: "24px 16px",
                textAlign: "center",
                fontSize: 13,
                color: "var(--color-text-muted)",
              }}
            >
              Right-click this region for the entity menu
            </div>
          </AppContextMenu>
        </Section>

        <Section label="Dialog">
          <Button variant="secondary" onClick={() => setDialogOpen(true)}>
            Delete issue…
          </Button>
          <Dialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            label="Delete issue"
            width={420}
          >
            <div style={{ padding: 24 }}>
              <h3
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--color-text-title)",
                }}
              >
                Delete issue?
              </h3>
              <p style={{ ...mutedNote, lineHeight: 1.6 }}>
                LIN-102 “Polish keyboard shortcuts” will be moved to the
                recycle bin. You can restore it within 30 days.
              </p>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                  marginTop: 16,
                }}
              >
                <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    setDialogOpen(false);
                    showToast("Issue moved to recycle bin");
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          </Dialog>
        </Section>

        <Section label="Toasts">
          <Button
            variant="secondary"
            onClick={() => showCopyToast("Copied issue link to clipboard")}
          >
            Copy toast
          </Button>
          <Button
            variant="secondary"
            onClick={() => showToast("Issue moved to In Progress")}
          >
            Plain toast
          </Button>
        </Section>

        <Section label="List" column>
          <div>
            <GroupHeader
              icon={<StatusIcon category="started" />}
              label="In Progress"
              count={1}
              onAdd={() => showToast("New issue in In Progress")}
            />
            <ListRow listKey="LIN-101" firstInGroup>
              <RowContent
                id="LIN-101"
                title="Refine sidebar resize handle"
                checked={rowChecked["LIN-101"]}
                onCheck={setRow("LIN-101")}
              />
            </ListRow>
            <ListRow listKey="LIN-102" selected>
              <RowContent
                id="LIN-102"
                title="Polish keyboard shortcuts"
                checked={rowChecked["LIN-102"]}
                onCheck={setRow("LIN-102")}
              />
            </ListRow>
            <ListRow listKey="LIN-103" keyboardActive lastInGroup>
              <RowContent
                id="LIN-103"
                title="Toast stacking on rapid copy"
                checked={rowChecked["LIN-103"]}
                onCheck={setRow("LIN-103")}
              />
            </ListRow>
          </div>
        </Section>

        <Section label="Empty state" column>
          <div
            style={{
              border: "1px solid var(--color-border-thin)",
              borderRadius: 8,
              minHeight: 260,
              display: "flex",
            }}
          >
            <EmptyState
              illustration={<Icon name="Inbox" size={40} />}
              heading="No issues in this view"
              primary={
                <Button variant="primary" size={32}>
                  Create new issue <Kbd keys={["C"]} />
                </Button>
              }
              secondary={
                <Button variant="secondary" size={32}>
                  Clear filters
                </Button>
              }
            >
              Issues that match the current filters will show up here as soon
              as they are created.
            </EmptyState>
          </div>
        </Section>
      </main>
    </div>
  );
}

/** Inner flex layout for a 44px issue row. */
function RowContent({
  id,
  title,
  checked,
  onCheck,
}: {
  id: string;
  title: string;
  checked: boolean;
  onCheck: (v: boolean) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        height: "100%",
        padding: "0 16px",
      }}
    >
      <RowCheckbox checked={checked} onChange={onCheck} />
      <StatusIcon category="started" />
      <span
        style={{
          fontSize: 12,
          color: "var(--color-text-muted)",
          fontVariantNumeric: "tabular-nums",
          flexShrink: 0,
        }}
      >
        {id}
      </span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: "var(--color-text-title)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          flex: 1,
          minWidth: 0,
        }}
      >
        {title}
      </span>
      <Avatar initials="MK" size={18} />
    </div>
  );
}
