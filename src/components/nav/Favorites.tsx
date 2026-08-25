"use client";

/**
 * Favorites — MASTER_PROMPT.md §12 ("`O then F` favorites menu",
 * "`Alt/Option+F` toggle favorite") and §18 (the `Favorite` model:
 * one row per user × entity, `sortOrder` for manual ordering).
 *
 * Three public pieces:
 *   useFavorite()  — read + toggle one entity's favorite state
 *   FavoriteStar   — the star toggle (issue breadcrumb, project header…)
 *   FavoritesMenu  — the anchored list of the current user's favorites
 *   FavoritesHost  — mount-once host that owns the `O F` shortcut
 *
 * Writes go through the optimistic pipeline (§6.8): enqueue → the MobX pool
 * mutates instantly → the transaction syncs in the background. Nothing here
 * waits on the network, and nothing here spins.
 *
 * Favorite ids are DETERMINISTIC (`${userId}:${entityType}:${entityId}`) so
 * the same star pressed twice in two tabs converges on one row instead of
 * two competing inserts.
 */

import {
  cloneElement,
  useCallback,
  useState,
  type JSX,
  type ReactElement,
  type ReactNode,
} from "react";
import { useParams, useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { observer } from "mobx-react-lite";
import { Icon } from "@/components/icons/Icon";
import { StatusIcon } from "@/components/icons/StatusIcon";
import { projectIconFor } from "@/components/projects/glyphs";
import { IconButton } from "@/components/ui/Button";
import { Tooltip, TooltipProvider } from "@/components/ui/Tooltip";
import { useStore, useSyncClient } from "@/lib/data/DataProvider";
import { KeyboardProvider, useShortcut } from "@/lib/keyboard";
import { CURRENT_USER_ID } from "@/lib/issues/viewPrefs";
import type { SyncStore } from "@/lib/data/store";
import type { FavoriteData } from "@/lib/data/types";
import styles from "./favorites.module.css";

export type FavoriteEntityType = FavoriteData["entityType"];

const OPEN_KEYS = "o f";

/* ================================================================
 * Pure helpers
 * ================================================================ */

/** Stable row id — the same (user, entity) pair always maps to one row. */
function favoriteId(entityType: FavoriteEntityType, entityId: string): string {
  return `${CURRENT_USER_ID}:${entityType}:${entityId}`;
}

/** The signed-in user's favorites in manual order (§18 sortOrder). */
function myFavorites(store: SyncStore): FavoriteData[] {
  return store
    .all("Favorite")
    .filter((favorite) => favorite.userId === CURRENT_USER_ID)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function slugifyTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug === "" ? "issue" : slug;
}

/* ================================================================
 * useFavorite
 * ================================================================ */

/**
 * Favorite state for one entity. The `isFavorite` read is an observable
 * read — call this from inside an `observer()` component so un/favoriting
 * elsewhere (another star, an inbound delta) repaints this one.
 */
export function useFavorite(
  entityType: FavoriteEntityType,
  entityId: string,
): { isFavorite: boolean; toggle: () => void } {
  const store = useStore();
  const client = useSyncClient();

  const isFavorite = myFavorites(store).some(
    (favorite) =>
      favorite.entityType === entityType && favorite.entityId === entityId,
  );

  const toggle = useCallback((): void => {
    // Re-read at call time: an event handler runs outside the render pass,
    // so a render closure could be stale.
    const mine = myFavorites(store);
    const existing = mine.find(
      (favorite) =>
        favorite.entityType === entityType && favorite.entityId === entityId,
    );
    if (existing !== undefined) {
      client.queue.enqueue("delete", "Favorite", existing.id);
      return;
    }
    const maxSortOrder = mine.reduce(
      (max, favorite) => Math.max(max, favorite.sortOrder),
      0,
    );
    const row: FavoriteData = {
      id: favoriteId(entityType, entityId),
      userId: CURRENT_USER_ID,
      entityType,
      entityId,
      sortOrder: maxSortOrder + 1,
    };
    client.queue.enqueue(
      "create",
      "Favorite",
      row.id,
      row as unknown as Record<string, unknown>,
    );
  }, [store, client, entityType, entityId]);

  return { isFavorite, toggle };
}

/* ================================================================
 * FavoriteStar
 * ================================================================ */

/**
 * The star toggle (issue breadcrumb f0045, project header). A `switch`
 * rather than a button: it has an on/off state screen readers must hear,
 * and its label names the ACTION, matching the tooltip.
 */
export const FavoriteStar = observer(function FavoriteStar({
  entityType,
  entityId,
  size = 16,
}: {
  entityType: FavoriteEntityType;
  entityId: string;
  size?: number;
}): JSX.Element {
  const { isFavorite, toggle } = useFavorite(entityType, entityId);
  const label = isFavorite ? "Remove from favorites" : "Add to favorites";

  return (
    // Self-sufficient provider: the star is dropped into headers that do not
    // all own one, and nesting Radix tooltip providers is harmless.
    <TooltipProvider>
      <Tooltip content={label}>
        <IconButton
          label={label}
          size={28}
          className={styles.star}
          role="switch"
          aria-checked={isFavorite}
          onClick={toggle}
        >
          {isFavorite ? (
            <Icon name="FavoriteFilled" size={size} color="var(--color-yellow)" />
          ) : (
            <Icon name="Favorite" size={size} className={styles.starOff} />
          )}
        </IconButton>
      </Tooltip>
    </TooltipProvider>
  );
});

/* ================================================================
 * FavoritesMenu
 * ================================================================ */

interface FavoriteEntry {
  key: string;
  icon: ReactNode;
  /** Muted leading token (the issue identifier), when the entity has one. */
  prefix?: string;
  label: string;
  href: string;
}

/**
 * Resolve favorite rows to the entities they point at, dropping rows whose
 * target has not arrived yet (or no longer exists) rather than rendering a
 * dead row. `view` favorites resolve once custom views land.
 */
function resolveFavorites(
  store: SyncStore,
  workspace: string,
): FavoriteEntry[] {
  const entries: FavoriteEntry[] = [];
  for (const favorite of myFavorites(store)) {
    switch (favorite.entityType) {
      case "issue": {
        const issue = store.get("Issue", favorite.entityId);
        if (issue === undefined) break;
        const state = store.get("WorkflowState", issue.stateId);
        entries.push({
          key: favorite.id,
          icon: (
            <StatusIcon
              category={state?.category ?? "backlog"}
              color={state?.color}
            />
          ),
          prefix: issue.identifier,
          label: issue.title,
          href: `/${workspace}/issue/${issue.identifier}/${slugifyTitle(issue.title)}`,
        });
        break;
      }
      case "project": {
        const project = store.get("Project", favorite.entityId);
        if (project === undefined) break;
        entries.push({
          key: favorite.id,
          icon: projectIconFor(project),
          label: project.name,
          href: `/${workspace}/project/${project.slug}/overview`,
        });
        break;
      }
      case "team": {
        const team = store.get("Team", favorite.entityId);
        if (team === undefined) break;
        entries.push({
          key: favorite.id,
          icon: <Icon name={team.icon} size={14} color={team.color} />,
          label: team.name,
          href: `/${workspace}/team/${team.key}/all`,
        });
        break;
      }
      default:
        break;
    }
  }
  return entries;
}

/**
 * The favorites list, anchored to `trigger` (§6.3 — anchored, never a
 * centered modal). Uncontrolled by default; pass `open`/`onOpenChange` to
 * drive it from a shortcut, the way the property pickers are driven.
 */
export const FavoritesMenu = observer(function FavoritesMenu({
  trigger,
  open,
  onOpenChange,
}: {
  trigger: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}): JSX.Element {
  const store = useStore();
  const router = useRouter();
  const { workspace } = useParams<{ workspace: string }>();
  const [localOpen, setLocalOpen] = useState(false);
  const isOpen = open ?? localOpen;
  const setOpen = onOpenChange ?? setLocalOpen;

  const entries = resolveFavorites(store, workspace);

  return (
    <DropdownMenu.Root open={isOpen} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        {cloneElement(trigger as ReactElement<Record<string, unknown>>, {
          "data-menu-open": isOpen ? "true" : undefined,
        })}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={styles.content}
          side="bottom"
          align="start"
          sideOffset={4}
          collisionPadding={8}
          aria-label="Favorites"
          loop
        >
          {entries.length === 0 ? (
            <DropdownMenu.Item className={styles.item} disabled>
              <span className={styles.itemLabel}>No favorites yet</span>
            </DropdownMenu.Item>
          ) : (
            entries.map((entry) => (
              <DropdownMenu.Item
                key={entry.key}
                className={styles.item}
                onSelect={() => router.push(entry.href)}
              >
                <span className={styles.itemIcon} aria-hidden="true">
                  {entry.icon}
                </span>
                <span className={styles.itemLabel}>
                  {entry.prefix !== undefined ? (
                    <span className={styles.itemPrefix}>{entry.prefix}</span>
                  ) : null}
                  {entry.label}
                </span>
              </DropdownMenu.Item>
            ))
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
});

/* ================================================================
 * Host
 * ================================================================ */

/**
 * Mount-once host (workspace layout). Owns `O then F` and the invisible
 * anchor the menu hangs from — favorites have no permanent chrome trigger
 * yet, so the keyboard path needs a point in the layout to anchor to.
 */
export function FavoritesHost(): JSX.Element {
  const [open, setOpen] = useState(false);

  useShortcut({
    id: "favorites.open",
    keys: OPEN_KEYS,
    scope: "global",
    description: "Open favorites",
    handler: () => setOpen(true),
  });

  return (
    // KeyboardProvider mounts the single window keydown listener the registry
    // needs; duplicate providers never double-fire (handleKeydown bails on
    // e.defaultPrevented), matching CreateIssueHost and PeekHost.
    <KeyboardProvider>
      <FavoritesMenu
        open={open}
        onOpenChange={setOpen}
        trigger={<span className={styles.anchor} aria-hidden="true" />}
      />
    </KeyboardProvider>
  );
}
