"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { observer } from "mobx-react-lite";
import { Icon } from "@/components/icons/Icon";
import { Input } from "@/components/ui/Input";
import { useStore } from "@/lib/data/DataProvider";
import { SettingsGlyph } from "./glyphs";
import { SETTINGS_NAV, backToAppHref, settingsHref } from "./nav";
import styles from "./settings.module.css";

/**
 * Settings sidebar (CAPTURED — capture-preferences.md §1/§3):
 * 244px fixed panel, "Back to app" header, "Search…" filter, then the exact
 * groups Personal / Issues / Projects / Features / Your teams, each row a real
 * 28px `<a>` with `data-active`.
 */
export const SettingsSidebar = observer(function SettingsSidebar({
  workspace,
}: {
  workspace: string;
}) {
  const pathname = usePathname();
  const store = useStore();
  const [query, setQuery] = useState("");

  const teams = store
    .all("Team")
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const needle = query.trim().toLowerCase();

  const groups = useMemo(() => {
    const staticGroups = SETTINGS_NAV.map((group) => ({
      title: group.title,
      items: group.items.filter(
        (item) => needle === "" || item.label.toLowerCase().includes(needle),
      ),
    }));
    return staticGroups.filter((group) => group.items.length > 0);
  }, [needle]);

  const teamItems = teams.filter(
    (team) => needle === "" || team.name.toLowerCase().includes(needle),
  );
  const showJoin = needle === "" || "join or create a team".includes(needle);
  const nothingFound = groups.length === 0 && teamItems.length === 0 && !showJoin;

  return (
    <>
      <div className={styles.sidebarSpacer} aria-hidden="true" />
      <div className={styles.sidebar}>
        <nav className={styles.sidebarNav} aria-label="Settings">
          <div className={styles.sidebarHeader}>
            <Link
              href={backToAppHref(workspace)}
              className={styles.backLink}
              aria-label="Back to app"
            >
              <SettingsGlyph name="back" />
              Back to app
            </Link>
          </div>

          <div className={styles.searchRow}>
            <div className={styles.searchWrap} aria-label="Search settings">
              <span className={styles.searchGlyph} aria-hidden="true">
                <SettingsGlyph name="search" />
              </span>
              <Input
                inputSize="sm"
                className={styles.searchInput}
                type="search"
                role="search"
                data-search-input="true"
                aria-label="Search…"
                placeholder="Search…"
                value={query}
                onChange={(e) => setQuery(e.currentTarget.value)}
              />
            </div>
          </div>

          <div className={styles.sidebarScroll} tabIndex={-1} data-scroll-container="true">
            {groups.map((group) => (
              <div key={group.title} className={styles.group}>
                <h2 className={styles.groupTitle}>{group.title}</h2>
                {group.items.map((item) => {
                  const href = settingsHref(workspace, item.path);
                  return (
                    <Link
                      key={item.path}
                      href={href}
                      className={styles.link}
                      data-visible-sidebar-item="true"
                      data-active={pathname === href ? "true" : "false"}
                      draggable={false}
                    >
                      <span className={styles.linkIcon}>
                        <SettingsGlyph name={item.glyph} />
                      </span>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ))}

            {teamItems.length > 0 || showJoin ? (
              <div className={styles.group}>
                <h2 className={styles.groupTitle}>Your teams</h2>
                {teamItems.map((team) => {
                  const href = settingsHref(workspace, `teams/${team.key}`);
                  return (
                    <Link
                      key={team.id}
                      href={href}
                      className={styles.link}
                      data-visible-sidebar-item="true"
                      data-active={pathname === href ? "true" : "false"}
                      draggable={false}
                    >
                      <span className={styles.linkIcon}>
                        <Icon name={team.icon} size={14} color={team.color} />
                      </span>
                      {team.name}
                    </Link>
                  );
                })}
                {showJoin ? (
                  <Link
                    href={settingsHref(workspace, "teams/new")}
                    className={styles.link}
                    aria-label="Join or create a team"
                    data-active={
                      pathname === settingsHref(workspace, "teams/new") ? "true" : "false"
                    }
                    draggable={false}
                  >
                    <span className={styles.linkIcon}>
                      <SettingsGlyph name="plus" />
                    </span>
                    Join or create a team
                  </Link>
                ) : null}
              </div>
            ) : null}

            {nothingFound ? (
              <p className={styles.noResults}>No settings match “{query.trim()}”.</p>
            ) : null}
          </div>
        </nav>
      </div>
    </>
  );
});
