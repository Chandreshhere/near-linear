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
import { WorkspaceMenu } from "@/components/nav/WorkspaceMenu";
import { openInviteDialog } from "@/components/members/InvitePeopleDialog";
import { useHiddenSidebarItems } from "@/components/settings/sidebarConfig";
import { SyncStatus, useStore } from "@/lib/data/DataProvider";
import { CURRENT_USER_ID } from "@/lib/issues/viewPrefs";
import { TEAMS, WORKSPACE } from "@/lib/seed";
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

/** One team row of the sidebar list (store row, or the pre-boot seed shape). */
interface SidebarTeam {
  id: string;
  key: string;
  name: string;
  icon: string;
  color: string;
  /** §22 per-team enables — the Cycles / Triage children are gated on them.
      The pre-boot seed shape knows neither, so both default to off until the
      real rows land in the pool. */
  cyclesEnabled: boolean;
  triageEnabled: boolean;
}

export const Sidebar = observer(function Sidebar({
  workspace,
}: {
  workspace: string;
}) {
  const pathname = usePathname();
  const store = useStore();
  const [resizing, setResizing] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(true);
  const [teamsOpen, setTeamsOpen] = useState(true);
  const [tryOpen, setTryOpen] = useState(true);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(
    () => new Set(["t-trendzo"])
  );
  const panelRef = useRef<HTMLDivElement>(null);
  /* Settings → Preferences → App sidebar → Customize (§10.9). */
  const hidden = useHiddenSidebarItems();

  /*
   * Store-driven: a team created from the + menu (or in another tab) shows up
   * here the moment its row lands in the pool. The seed list is only the
   * pre-bootstrap fallback, so the first paint is never empty.
   */
  const storeTeams = store.all("Team");
  const teams: SidebarTeam[] =
    storeTeams.length > 0
      ? storeTeams
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
          }))
      : TEAMS.map((team) => ({
          ...team,
          cyclesEnabled: false,
          triageEnabled: false,
        }));

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

  const toggleTeam = (id: string) =>
    setExpandedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

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
                  aria-label={`${WORKSPACE.name} Workspace Menu`}
                  aria-haspopup="menu"
                  aria-expanded="false"
                >
                  <span
                    className={styles.workspaceAvatar}
                    style={{ background: WORKSPACE.avatarColor }}
                  >
                    {WORKSPACE.initials}
                  </span>
                  <span className={styles.workspaceName}>{WORKSPACE.name}</span>
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
                  {teams.map((team) => {
                    const expanded = expandedTeams.has(team.id);
                    return (
                      <li key={team.id}>
                        <button
                          type="button"
                          className={styles.teamRow}
                          aria-expanded={expanded}
                          aria-controls={`team-${team.id}`}
                          onClick={() => toggleTeam(team.id)}
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
