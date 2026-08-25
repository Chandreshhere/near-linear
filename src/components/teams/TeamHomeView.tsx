"use client";

/**
 * Team Home (`/:ws/team/:KEY/overview`) — MASTER_PROMPT.md §10.6,
 * docs/analysis/video-timeline-1.md f0030: breadcrumb chip + favorite star +
 * ⋯; tab strip Overview | Documents | Loops | Members; hero (team icon + H1)
 * with an editable description; a "Team resources" section; a right rail with
 * Members and a "Go to" link list; copy-link icon top-right.
 *
 * Every control writes through the local-first engine (§6.8):
 *   · the star   → a `Favorite` row (useFavorite — same hook the issue and
 *                  project headers use, so the sidebar's favorites menu picks
 *                  the team up immediately)
 *   · the ⋯ menu → Team settings (a real route), a per-team notification
 *                  subscription (`Team.notifySubscriberIds`) and Join/Leave
 *                  (`Team.memberIds`, the field the sidebar renders)
 *   · description → `Team.description`, debounced like the issue editors
 *   · resources   → `Team.resources`, the same {id,title,url} rows and the
 *                  same dialog the project overview uses
 *
 * Overview is the only routed tab: Documents renders the team's resources,
 * Loops and Members render live workspace data rather than inventing routes
 * the sidebar does not link to yet.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { observer } from "mobx-react-lite";
import { useStore, useSyncClient } from "@/lib/data/DataProvider";
import { copyToClipboard, showToast } from "@/lib/toast";
import { CURRENT_USER_ID } from "@/lib/issues/viewPrefs";
import { isTeamMember, setTeamMembership } from "@/lib/workspace/teams";
import { useFavorite } from "@/components/nav/Favorites";
import { useDebouncedSave } from "@/components/issues/detail/useDebouncedSave";
import { ResourceDialog } from "@/components/projects/ResourceDialog";
import { CrossGlyph } from "@/components/projects/glyphs";
import { Header } from "@/components/shell/Header";
import { Button, IconButton } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Menu, type MenuItem } from "@/components/ui/Menu";
import { Icon } from "@/components/icons/Icon";
import type { ResourceLink, TeamData } from "@/lib/data/types";
import shellStyles from "@/components/shell/shell.module.css";
import styles from "./teamhome.module.css";

/* ================================================================
 * Tabs (client-side only — Overview is the route)
 * ================================================================ */

const TABS = ["overview", "documents", "loops", "members"] as const;
type TeamHomeTab = (typeof TABS)[number];

const TAB_LABELS: Record<TeamHomeTab, string> = {
  overview: "Overview",
  documents: "Documents",
  loops: "Loops",
  members: "Members",
};

/** Description edits are committed one write per pause, like the issue body. */
const DESCRIPTION_SAVE_MS = 800;

/* ================================================================
 * Description — a real editable field on the Team row
 * ================================================================ */

/**
 * Click (or Enter/Space on the placeholder) swaps in a textarea seeded from
 * `Team.description`; typing mutates locally and pushes one update per pause,
 * and blur flushes. Not a rich editor — a plain field, honestly labelled.
 */
const TeamDescription = observer(function TeamDescription({
  team,
}: {
  team: TeamData;
}) {
  const client = useSyncClient();
  const stored = team.description ?? "";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(stored);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  const save = useDebouncedSave((value: string) => {
    const next = value.trim();
    if (next === (team.description ?? "")) return;
    client.queue.enqueue("update", "Team", team.id, {
      // Wire `null` clears the field (JSON cannot carry undefined).
      description: next === "" ? null : next,
    });
  }, DESCRIPTION_SAVE_MS);

  // Adopt inbound edits (another tab, a delta) while this copy is idle.
  useEffect(() => {
    if (!editing && !save.hasPending()) setDraft(stored);
  }, [stored, editing, save]);

  useEffect(() => {
    if (!editing) return;
    const el = areaRef.current;
    if (el === null) return;
    el.focus();
    el.selectionStart = el.value.length;
    el.selectionEnd = el.value.length;
  }, [editing]);

  // Grow with content — the field has no scrollbar of its own.
  useEffect(() => {
    const el = areaRef.current;
    if (el === null) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft, editing]);

  if (!editing) {
    return (
      <button
        type="button"
        className={clsx(
          styles.descriptionPlaceholder,
          stored !== "" && styles.descriptionFilled,
        )}
        aria-label={
          stored === "" ? "Add a description" : "Edit the team description"
        }
        onClick={() => setEditing(true)}
      >
        {stored === "" ? "Add a description…" : stored}
      </button>
    );
  }

  return (
    <textarea
      ref={areaRef}
      className={styles.descriptionInput}
      value={draft}
      rows={1}
      aria-label="Team description"
      placeholder="Add a description…"
      onChange={(event) => {
        setDraft(event.currentTarget.value);
        save.schedule(event.currentTarget.value);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          save.flush();
          setEditing(false);
        }
      }}
      onBlur={() => {
        save.flush();
        setEditing(false);
      }}
    />
  );
});

/* ================================================================
 * Resource list (shared shape with a project's Resources section)
 * ================================================================ */

function ResourceRows({
  items,
  onRemove,
}: {
  items: readonly ResourceLink[];
  onRemove: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <ul className={styles.resourceList} aria-label="Team resources">
      {items.map((resource) => (
        <li key={resource.id} className={styles.resourceRow}>
          <Icon name="Link" size={14} />
          <a
            className={styles.resourceLink}
            href={resource.url}
            target="_blank"
            rel="noreferrer noopener"
            title={resource.url}
          >
            {resource.title}
          </a>
          <IconButton
            label={`Remove ${resource.title}`}
            size={24}
            onClick={() => onRemove(resource.id)}
          >
            <CrossGlyph />
          </IconButton>
        </li>
      ))}
    </ul>
  );
}

/* ================================================================
 * View
 * ================================================================ */

export const TeamHomeView = observer(function TeamHomeView({
  workspace,
  teamKey,
}: {
  workspace: string;
  teamKey: string;
}) {
  const store = useStore();
  const client = useSyncClient();
  const [tab, setTab] = useState<TeamHomeTab>("overview");
  const [resourceOpen, setResourceOpen] = useState(false);

  const team = store.teamByKey(teamKey);
  const notFound = team === undefined && client.status === "ready";
  const key = team?.key ?? teamKey.toUpperCase();

  // The star is a real Favorite row. The hook is unconditional (rules of
  // hooks) and keys off "" until the team row arrives — a favorite for the
  // empty id is never created because the button only renders with a team.
  const favorite = useFavorite("team", team?.id ?? "");

  const resources = team?.resources ?? [];
  const notifySubscribers = team?.notifySubscriberIds ?? [];
  const subscribed = notifySubscribers.includes(CURRENT_USER_ID);
  const joined = team !== undefined && isTeamMember(team, CURRENT_USER_ID);

  const members = store
    .all("User")
    .filter((user) => team === undefined || isTeamMember(team, user.id));

  const addResource = (resource: ResourceLink): void => {
    if (team === undefined) return;
    client.queue.enqueue("update", "Team", team.id, {
      resources: [...resources, resource],
    });
  };

  const removeResource = (id: string): void => {
    if (team === undefined) return;
    client.queue.enqueue("update", "Team", team.id, {
      resources: resources.filter((resource) => resource.id !== id),
    });
  };

  const toggleNotifications = (): void => {
    if (team === undefined) return;
    const next = subscribed
      ? notifySubscribers.filter((id) => id !== CURRENT_USER_ID)
      : [...notifySubscribers, CURRENT_USER_ID];
    client.queue.enqueue("update", "Team", team.id, { notifySubscriberIds: next });
    showToast(
      subscribed
        ? `Notifications off for ${team.name}`
        : `Notifications on for ${team.name}`,
    );
  };

  /* ---------------- header row A ---------------- */

  const menuItems: MenuItem[] = [
    {
      label: "Team settings",
      icon: <Icon name="DisplayOptions" size={14} />,
      href: `/${workspace}/settings/teams/${key}`,
    },
    {
      label: "Team notifications",
      icon: <Icon name="Subscribe" size={14} />,
      checked: subscribed,
      // Multi-toggle rows keep the menu open elsewhere in the app; this one
      // is a single switch, so closing on select matches the other ⋯ menus.
      onSelect: toggleNotifications,
      disabled: team === undefined,
    },
    { type: "separator" },
    joined
      ? {
          label: "Leave team",
          onSelect: () => {
            if (team === undefined) return;
            setTeamMembership(client, team, CURRENT_USER_ID, false);
            showToast(`Left ${team.name}`);
          },
          disabled: team === undefined,
        }
      : {
          label: "Join team",
          onSelect: () => {
            if (team === undefined) return;
            setTeamMembership(client, team, CURRENT_USER_ID, true);
            showToast(`Joined ${team.name}`);
          },
          disabled: team === undefined,
        },
  ];

  const breadcrumb = (
    <div className={styles.crumbRow}>
      <span className={styles.crumbChip}>
        {team !== undefined ? (
          <>
            <span className={styles.crumbIcon}>
              <Icon name={team.icon} size={14} color={team.color} />
            </span>
            <span className={styles.crumbName}>{team.name}</span>
          </>
        ) : (
          <span className={styles.crumbSkeleton} aria-hidden="true" />
        )}
      </span>
      {team !== undefined ? (
        <button
          type="button"
          role="switch"
          aria-checked={favorite.isFavorite}
          aria-label={
            favorite.isFavorite ? "Remove from favorites" : "Add to favorites"
          }
          className={styles.starBtn}
          data-on={favorite.isFavorite ? "true" : undefined}
          onClick={favorite.toggle}
        >
          <Icon
            name={favorite.isFavorite ? "FavoriteFilled" : "Favorite"}
            size={14}
          />
        </button>
      ) : null}
      <Menu
        items={menuItems}
        trigger={
          <button
            type="button"
            className={styles.crumbAction}
            aria-label="Team options"
            aria-haspopup="menu"
          >
            <Icon name="More" size={14} />
          </button>
        }
      />
    </div>
  );

  const copyLink = (
    <IconButton
      label="Copy team link"
      onClick={() => {
        void copyToClipboard(
          `${window.location.origin}/${workspace}/team/${key}/overview`,
          "Copied team link to clipboard",
        );
      }}
    >
      <Icon name="Link" size={14} />
    </IconButton>
  );

  /* ---------------- header row B ---------------- */

  const tabsRow = (
    <div className={shellStyles.tabStrip}>
      {TABS.map((id) => (
        <button
          key={id}
          type="button"
          className={shellStyles.tab}
          data-active={tab === id ? "true" : undefined}
          aria-current={tab === id ? "page" : undefined}
          onClick={() => setTab(id)}
        >
          {TAB_LABELS[id]}
        </button>
      ))}
    </div>
  );

  /* ---------------- right rail ---------------- */

  const goTo: { label: string; icon: string; href: string }[] = [
    { label: "Issues", icon: "MyIssues", href: `/${workspace}/team/${key}/all` },
    { label: "Projects", icon: "Project", href: `/${workspace}/team/${key}/projects/all` },
    { label: "Views", icon: "CustomView", href: `/${workspace}/team/${key}/views/issues` },
    {
      label: "Team settings",
      icon: "DisplayOptions",
      href: `/${workspace}/settings/teams/${key}`,
    },
  ];

  const rail = (
    <aside className={styles.rail} aria-label="Team details">
      <section className={styles.card}>
        <h3 className={styles.cardTitle}>Members</h3>
        <ul className={styles.memberList}>
          {members.map((user) => (
            <li key={user.id} className={styles.memberRow}>
              <Avatar
                initials={user.initials}
                color={user.avatarColor}
                size={24}
                src={user.avatarUrl}
              />
              <span className={styles.memberName}>{user.displayName}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.card}>
        <h3 className={styles.cardTitle}>Go to</h3>
        <div className={styles.goList}>
          {goTo.map((item) => (
            <Link key={item.label} href={item.href} className={styles.goRow}>
              <span className={styles.goIcon}>
                <Icon name={item.icon} size={14} />
              </span>
              <span className={styles.goLabel}>{item.label}</span>
            </Link>
          ))}
        </div>
      </section>
    </aside>
  );

  /* ---------------- content ---------------- */

  let content: React.ReactNode;
  if (team === undefined) {
    content = notFound ? (
      <EmptyState heading="Team not found">
        No team with the key “{teamKey.toUpperCase()}” exists in this workspace.
      </EmptyState>
    ) : null;
  } else if (tab === "documents") {
    content = (
      <div className={styles.column}>
        <h2 className={styles.sectionTitle}>Documents</h2>
        <p className={styles.sectionHint}>
          Every document and link pinned to this team. The same list the
          Overview tab keeps — adding one here adds it there.
        </p>
        <ResourceRows items={resources} onRemove={removeResource} />
        {resources.length === 0 ? (
          <p className={styles.sectionHint}>Nothing pinned yet.</p>
        ) : null}
        <div className={styles.sectionActions}>
          <Button
            size={28}
            icon={<Icon name="Plus" size={14} />}
            onClick={() => setResourceOpen(true)}
          >
            Add document or link
          </Button>
        </div>
      </div>
    );
  } else if (tab === "loops") {
    content = (
      <div className={styles.column}>
        <h2 className={styles.sectionTitle}>Loops</h2>
        <p className={styles.sectionHint}>
          Loops run the agent on a schedule, or when an issue is created or
          updated. They are workspace-scoped and are built on the Loops page —
          add a “Team is {team.name}” condition to point one at this team.
        </p>
        <div className={styles.sectionActions}>
          <Link href={`/${workspace}/loops`} className={styles.linkButton}>
            <Icon name="Loop" size={14} />
            Open Loops
          </Link>
        </div>
      </div>
    );
  } else if (tab === "members") {
    content = (
      <div className={styles.column}>
        <h2 className={styles.sectionTitle}>Members</h2>
        <p className={styles.sectionHint}>
          {members.length} {members.length === 1 ? "person" : "people"} in{" "}
          {team.name}. Roles and invitations live in the workspace member
          directory.
        </p>
        <ul className={styles.memberGrid}>
          {members.map((user) => (
            <li key={user.id} className={styles.memberCard}>
              <Avatar
                initials={user.initials}
                color={user.avatarColor}
                size={28}
                src={user.avatarUrl}
              />
              <span className={styles.memberCardText}>
                <span className={styles.memberCardName}>{user.displayName}</span>
                <span className={styles.memberCardSub}>{user.email}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className={styles.sectionActions}>
          <Link href={`/${workspace}/members`} className={styles.linkButton}>
            <Icon name="Invite" size={14} />
            Open member directory
          </Link>
          <Button
            size={28}
            onClick={() => {
              setTeamMembership(client, team, CURRENT_USER_ID, !joined);
              showToast(joined ? `Left ${team.name}` : `Joined ${team.name}`);
            }}
          >
            {joined ? "Leave team" : "Join team"}
          </Button>
        </div>
      </div>
    );
  } else {
    content = (
      <div className={styles.column}>
        <div className={styles.hero}>
          <span className={styles.heroIcon}>
            <Icon name={team.icon} size={40} color={team.color} />
          </span>
          <h1 className={styles.heroTitle}>{team.name}</h1>
        </div>

        <TeamDescription team={team} />

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Team resources</h2>
          <p className={styles.sectionHint}>
            Documents and links worth keeping next to the work.
          </p>
          <ResourceRows items={resources} onRemove={removeResource} />
          <div className={styles.sectionActions}>
            <Button
              size={28}
              icon={<Icon name="Compose" size={14} />}
              onClick={() => setResourceOpen(true)}
            >
              Add document
            </Button>
            <Button
              size={28}
              icon={<Icon name="Link" size={14} />}
              onClick={() => setResourceOpen(true)}
            >
              Add link
            </Button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <>
      <Header left={breadcrumb} right={copyLink} tabs={tabsRow} />
      <div className={styles.body}>
        <div
          className={clsx(shellStyles.contentScroller, styles.scroller)}
          tabIndex={0}
          data-scroll-container="true"
        >
          {content}
        </div>
        {rail}
      </div>

      <ResourceDialog
        open={resourceOpen}
        onOpenChange={setResourceOpen}
        onAdd={addResource}
      />
    </>
  );
});
