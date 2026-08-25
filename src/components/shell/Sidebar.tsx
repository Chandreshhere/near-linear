"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { observer } from "mobx-react-lite";
import { Icon } from "@/components/icons/Icon";
import { openCreateIssue } from "@/components/issues/CreateIssueModal";
import { HelpMenu } from "@/components/nav/HelpMenu";
import { JoinTeamMenu } from "@/components/nav/JoinTeamMenu";
import { SidebarMoreMenu } from "@/components/nav/MoreMenu";
import { openCreateTeamDialog } from "@/components/teams/CreateTeamDialog";
import { WorkspaceMenu } from "@/components/nav/WorkspaceMenu";
import { openInviteDialog } from "@/components/members/InvitePeopleDialog";
import { useHiddenSidebarItems } from "@/components/settings/sidebarConfig";
import { SyncStatus, useSyncClient } from "@/lib/data/DataProvider";
import { CURRENT_USER_ID } from "@/lib/issues/viewPrefs";
import { workspaceDisplay } from "@/lib/workspace/active";
import { isTriageSnoozed } from "@/lib/triage/snooze";
import { isTeamMember } from "@/lib/workspace/teams";
import styles from "./sidebar.module.css";
import shell from "./shell.module.css";

const MIN_W = 200;
const MAX_W = 330;

function persistSidebarWidth(w: number) {
  try {
    const raw = localStorage.getItem("splashScreenConfig");
    const cfg = raw ? JSON.parse(raw) : {};
    cfg.sidebarWidth = w;
    localStorage.setItem("splashScreenConfig", JSON.stringify(cfg));
  } catch {}
}

/** One team row of the sidebar list. */
interface SidebarTeam {
  id: string;
  key: string;
  name: string;
  icon: string;
  color: string;
  /** §22 per-team enables — the Cycles / Triage children are gated on them. */
  cyclesEnabled: boolean;
  triageEnabled: boolean;
}

export const Sidebar = observer(function Sidebar({
  workspace,
}: {
  workspace: string;
}) {
  const pathname = usePathname();
  const client = useSyncClient();
  const store = client.store;
  const ready = client.status !== "booting";
  const [resizing, setResizing] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(true);
  const [teamsOpen, setTeamsOpen] = useState(true);
  const [tryOpen, setTryOpen] = useState(true);
  /** Explicit user toggles only; the default is computed per team below. */
  const [teamToggles, setTeamToggles] = useState<Record<string, boolean>>({});
  const panelRef = useRef<HTMLDivElement>(null);
  /* Settings → Preferences → App sidebar → Customize (§10.9). */
  const hidden = useHiddenSidebarItems();

  /*
   * Store-driven, and ONLY store-driven: a team created from the + menu (or in
   * another tab) shows up the moment its row lands in the pool, and a browser
   * whose workspace has one team shows exactly one team. There is deliberately
   * no fixture fallback here — that is what used to show every user the same
   * seven invented teams before hydration.
   */
  const teams: SidebarTeam[] = store
    .all("Team")
    .filter((team) => isTeamMember(team, CURRENT_USER_ID))
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((team) => ({
      id: team.id,
      key: team.key,
      name: team.name,
      icon: team.icon,
      color: team.color,
      cyclesEnabled: team.cyclesEnabled,
      triageEnabled: team.triageEnabled,
    }));

  /*
   * Workspace identity: the row once the pool has it, otherwise a name derived
   * from the slug in the URL. Both agree ("acme-labs" → "Acme Labs"), so the
   * name never changes under the user and SSR and hydration match.
   */
  const identity = workspaceDisplay(
    workspace,
    store.all("Workspace")[0]?.name,
  );

  const ws = `/${workspace}`;
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  /*
   * §22 triage badge: how many of the team's triage-state issues are still
   * waiting. Snoozed rows hide here exactly as they hide in the inbox, so the
   * badge always matches the list it links to.
   */
  const now = Date.now();
  const triageCount = (teamId: string): number => {
    const triageStates = new Set(
      store
        .statesForTeam(teamId)
        .filter((state) => state.category === "triage")
        .map((state) => state.id),
    );
    if (triageStates.size === 0) return 0;
    return store
      .issuesForTeam(teamId)
      .filter(
        (issue) =>
          triageStates.has(issue.stateId) && !isTriageSnoozed(issue.id, now),
      ).length;
  };

  const onResizeStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setResizing(true);
    const html = document.documentElement;
    const onMove = (ev: PointerEvent) => {
      const w = Math.min(MAX_W, Math.max(MIN_W, Math.round(ev.clientX)));
      html.style.setProperty("--sidebar-width", `${w}px`);
    };
    const onUp = (ev: PointerEvent) => {
      const w = Math.min(MAX_W, Math.max(MIN_W, Math.round(ev.clientX)));
      persistSidebarWidth(w);
      setResizing(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, []);

  /**
   * Default: the team you are looking at is open, otherwise the first one.
   * (This used to be a hardcoded fixture id, so any workspace whose team was
   * not "t-trendzo" rendered every team collapsed.)
   */
  const isTeamExpanded = (team: SidebarTeam, index: number): boolean =>
    teamToggles[team.id] ??
    (isActive(`${ws}/team/${team.key}`) ||
      (index === 0 && !teams.some((t) => isActive(`${ws}/team/${t.key}`))));

  const toggleTeam = (team: SidebarTeam, index: number) =>
    setTeamToggles((prev) => ({
      ...prev,
      [team.id]: !isTeamExpanded(team, index),
    }));

  return (
    <>
      <div className={styles.spacer} aria-hidden="true" />
      <div className={styles.panel} ref={panelRef}>
        <nav className={styles.nav} aria-label="Primary">
          <div className={styles.topRow}>
            <WorkspaceMenu
              trigger={
                <button
                  type="button"
                  className={styles.workspaceBtn}
                  aria-label={`${identity.name} Workspace Menu`}
                  aria-haspopup="menu"
                  aria-expanded="false"
                >
                  <span
                    className={styles.workspaceAvatar}
                    style={{ background: identity.avatarColor }}
                  >
                    {identity.initials}
                  </span>
                  <span className={styles.workspaceName}>{identity.name}</span>
                  <Icon name="WorkspaceChevron" size={8} />
                </button>
              }
            />
            <SyncStatus />
            <span className={styles.topRowSpacer} />
            <button
              type="button"
              className={styles.topIconBtn}
              aria-label="Search workspace"
            >
              <Icon name="Search" size={14} />
            </button>
            <button
              type="button"
              className={`${styles.topIconBtn} ${styles.composeBtn}`}
              aria-label="Create new issue"
              onClick={() => openCreateIssue()}
            >
              <Icon name="Compose" size={14} />
            </button>
          </div>

          <div className={styles.scroll} tabIndex={-1} data-scroll-container="true">
            {/* CAPTURED: sticky scroll-fade strip (h26, mt −39) nets the
                13px effective top inset and paints the scrolled-under fade */}
            <div className={styles.scrollFade} aria-hidden="true" />
            {/* primary nav */}
            {hidden.has("inbox") ? null : (
              <SidebarLink
                href={`${ws}/inbox`}
                icon="Inbox"
                label="Inbox"
                active={isActive(`${ws}/inbox`) || isActive(`${ws}/welcome-message`)}
              />
            )}
            {hidden.has("my-issues") ? null : (
              <SidebarLink
                href={`${ws}/my-issues/assigned`}
                icon="MyIssues"
                label="My issues"
                active={isActive(`${ws}/my-issues`)}
              />
            )}
            {hidden.has("reviews") ? null : (
              <SidebarLink
                href={`${ws}/reviews`}
                icon="Review"
                label="Reviews"
                active={isActive(`${ws}/reviews`)}
              />
            )}
            {hidden.has("agent") ? null : (
              <SidebarLink
                href={`${ws}/agent`}
                icon="Agent"
                label="Agent"
                active={isActive(`${ws}/agent`)}
              />
            )}

            {/* Workspace section */}
            <div className={styles.section}>
              <div className={styles.sectionRow}>
                <button
                  type="button"
                  className={styles.sectionHeader}
                  aria-expanded={workspaceOpen}
                  aria-controls="sidebarWorkspace"
                  onClick={() => setWorkspaceOpen((v) => !v)}
                >
                  Workspace
                  <span className={styles.sectionChevron}>
                    <Icon name="Disclosure" size={12} />
                  </span>
                </button>
              </div>
              <div
                id="sidebarWorkspace"
                className={styles.sectionBody}
                style={
                  workspaceOpen
                    ? { height: "auto", opacity: 1 }
                    : { height: 0, opacity: 0 }
                }
                aria-hidden={!workspaceOpen}
              >
                {hidden.has("projects") ? null : (
                  <SidebarLink
                    href={`${ws}/projects/all`}
                    icon="Project"
                    label="Projects"
                    active={isActive(`${ws}/projects`)}
                  />
                )}
                {hidden.has("views") ? null : (
                  <SidebarLink
                    href={`${ws}/views/issues`}
                    icon="CustomView"
                    label="Views"
                    active={isActive(`${ws}/views`)}
                  />
                )}
                {hidden.has("loops") ? null : (
                  <SidebarLink
                    href={`${ws}/loops`}
                    icon="Loops"
                    label="Loops"
                    active={isActive(`${ws}/loops`)}
                  />
                )}
                {/* video-timeline-1 finding 3: More opens a click-anchored
                    popover over the team list, no route change. */}
                <SidebarMoreMenu
                  trigger={
                    <div
                      role="button"
                      tabIndex={0}
                      className={styles.link}
                      aria-label="Show more links"
                      aria-haspopup="menu"
                    >
                      <span className={styles.linkIcon}>
                        <Icon name="More" size={14} />
                      </span>
                      More
                    </div>
                  }
                />
              </div>
            </div>

            {/* Your teams section */}
            <div className={styles.section}>
              <div className={styles.sectionRow}>
                <button
                  type="button"
                  className={styles.sectionHeader}
                  aria-expanded={teamsOpen}
                  aria-controls="sidebarMyTeams"
                  onClick={() => setTeamsOpen((v) => !v)}
                >
                  Your teams
                  <span className={styles.sectionChevron}>
                    <Icon name="Disclosure" size={12} />
                  </span>
                </button>
                <JoinTeamMenu
                  workspace={workspace}
                  trigger={
                    <button
                      type="button"
                      className={styles.sectionAction}
                      aria-label="Create or join a team"
                      aria-haspopup="menu"
                    >
                      <Icon name="Plus" size={14} />
                    </button>
                  }
                />
              </div>
              <div
                id="sidebarMyTeams"
                className={styles.sectionBody}
                style={
                  teamsOpen
                    ? { height: "auto", opacity: 1 }
                    : { height: 0, opacity: 0 }
                }
                aria-hidden={!teamsOpen}
              >
                <ul>
                  {teams.map((team, index) => {
                    const expanded = isTeamExpanded(team, index);
                    return (
                      <li key={team.id}>
                        <button
                          type="button"
                          className={styles.teamRow}
                          aria-expanded={expanded}
                          aria-controls={`team-${team.id}`}
                          onClick={() => toggleTeam(team, index)}
                          title={team.name}
                        >
                          <span className={styles.teamIcon}>
                            <Icon name={team.icon} size={14} color={team.color} />
                          </span>
                          <span className={styles.teamName}>{team.name}</span>
                          <span className={styles.teamChevron}>
                            <Icon name="Disclosure" size={12} />
                          </span>
                        </button>
                        <div
                          id={`team-${team.id}`}
                          className={styles.teamChildren}
                          style={
                            expanded
                              ? { height: "auto", opacity: 1 }
                              : { height: 0, opacity: 0 }
                          }
                          aria-hidden={!expanded}
                        >
                          <TeamChild href={`${ws}/team/${team.key}/overview`} icon="HomeOutline" label="Home" active={isActive(`${ws}/team/${team.key}/overview`)} />
                          {/* §22: Triage and Cycles are per-team enables. */}
                          {team.triageEnabled && (
                            <TeamChild href={`${ws}/team/${team.key}/triage`} icon="Triage" label="Triage" active={isActive(`${ws}/team/${team.key}/triage`)} count={triageCount(team.id)} />
                          )}
                          <TeamChild href={`${ws}/team/${team.key}/all`} icon="Issues" label="Issues" active={isActive(`${ws}/team/${team.key}/all`)} />
                          {team.cyclesEnabled && (
                            <TeamChild href={`${ws}/team/${team.key}/cycles`} icon="Cycle" label="Cycles" active={isActive(`${ws}/team/${team.key}/cycles`) || isActive(`${ws}/team/${team.key}/cycle`)} />
                          )}
                          <TeamChild href={`${ws}/team/${team.key}/projects/all`} icon="Project" label="Projects" active={isActive(`${ws}/team/${team.key}/projects`)} />
                          <TeamChild href={`${ws}/team/${team.key}/views/issues`} icon="CustomView" label="Views" active={isActive(`${ws}/team/${team.key}/views`)} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {/* Belonging to no team is a real (if rare) state — booting,
                    or every team left. Never a dead end. */}
                {teams.length === 0 && ready ? (
                  <button
                    type="button"
                    className={styles.link}
                    onClick={() => openCreateTeamDialog()}
                  >
                    <span className={styles.linkIcon}>
                      <Icon name="Plus" size={14} />
                    </span>
                    Create a team
                  </button>
                ) : null}
              </div>
            </div>

            {/* Try section — the reference's onboarding group under the teams */}
            {hidden.has("try") ? null : (
              <div className={styles.section}>
                <div className={styles.sectionRow}>
                  <button
                    type="button"
                    className={styles.sectionHeader}
                    aria-expanded={tryOpen}
                    aria-controls="sidebarTry"
                    onClick={() => setTryOpen((v) => !v)}
                  >
                    Try
                    <span className={styles.sectionChevron}>
                      <Icon name="Disclosure" size={12} />
                    </span>
                  </button>
                </div>
                <div
                  id="sidebarTry"
                  className={styles.sectionBody}
                  style={
                    tryOpen
                      ? { height: "auto", opacity: 1 }
                      : { height: 0, opacity: 0 }
                  }
                  aria-hidden={!tryOpen}
                >
                  <SidebarLink
                    href={`${ws}/import`}
                    icon="Import"
                    label="Import issues"
                    active={isActive(`${ws}/import`)}
                  />
                  {/* Opens the shared invite dialog — the same one the
                      workspace menu and the Members page use. */}
                  <button
                    type="button"
                    className={styles.link}
                    onClick={() => openInviteDialog()}
                  >
                    <span className={styles.linkIcon}>
                      <Icon name="Invite" size={14} />
                    </span>
                    Invite people
                  </button>
                  <SidebarLink
                    href={`${ws}/initiatives`}
                    icon="Initiative"
                    label="Initiatives"
                    active={isActive(`${ws}/initiatives`)}
                  />
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* floating help (CAPTURED: bottom 0, 24×20, transparent at rest) */}
        <div className={shell.helpFloat}>
          <HelpMenu
            trigger={
              <button
                type="button"
                className={shell.helpBtn}
                aria-label="Open Help menu"
                aria-haspopup="menu"
              >
                <Icon name="QuestionMark" size={14} />
              </button>
            }
          />
        </div>

        <div
          className={styles.resizeHandle}
          data-resizing={resizing || undefined}
          onPointerDown={onResizeStart}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
        />
      </div>
    </>
  );
});

function SidebarLink({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={styles.link}
      data-active={active ? "true" : "false"}
    >
      <span className={styles.linkIcon}>
        <Icon name={icon} size={14} />
      </span>
      {label}
    </Link>
  );
}

function TeamChild({
  href,
  icon,
  label,
  active,
  count,
}: {
  href: string;
  icon: string;
  label: string;
  active: boolean;
  /** Optional trailing count pill (§22 Triage inbox depth). Hidden at 0. */
  count?: number;
}) {
  return (
    <Link
      href={href}
      className={styles.teamChildLink}
      data-active={active ? "true" : "false"}
    >
      <span className={styles.linkIcon}>
        <Icon name={icon} size={14} />
      </span>
      {label}
      {count !== undefined && count > 0 && (
        <span className={styles.childCount} aria-label={`${count} in ${label}`}>
          {count}
        </span>
      )}
    </Link>
  );
}
