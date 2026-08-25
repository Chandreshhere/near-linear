/**
 * In-memory MobX object pool for the local-first engine (MASTER_PROMPT.md §19).
 *
 * One observable Map per model. The UI reads ONLY from this pool; the sync
 * layer (bootstrap, delta socket, transaction queue) writes into it via
 * `hydrate` / `applyAction` / `upsert`. Upserts MERGE field-by-field into the
 * existing stored object so MobX reactions stay granular — objects are never
 * deleted-and-reinserted on update.
 *
 * No singleton here: the client facade owns the instance. This module touches
 * no browser APIs, so it is safe to import during SSR.
 */

import { observable, runInAction, type ObservableMap } from "mobx";
import {
  MODEL_NAMES,
  type ActivityData,
  type AnyModelData,
  type CommentData,
  type CycleData,
  type IssueData,
  type MilestoneData,
  type ModelDataMap,
  type ModelName,
  type NotificationData,
  type ProjectData,
  type StateCategory,
  type SyncAction,
  type TeamData,
  type UUID,
  type WorkflowStateData,
} from "@/lib/data/types";

/** Workflow-state category ordering used for board columns / grouped lists. */
export const CATEGORY_ORDER: StateCategory[] = [
  "triage",
  "backlog",
  "unstarted",
  "started",
  "completed",
  "canceled",
];

const CATEGORY_RANK: Record<StateCategory, number> = CATEGORY_ORDER.reduce(
  (acc, category, index) => {
    acc[category] = index;
    return acc;
  },
  {} as Record<StateCategory, number>,
);

/** Models whose storage shape carries `archivedAt` (archive = soft delete). */
const ARCHIVABLE_MODELS: ReadonlySet<ModelName> = new Set<ModelName>(["Issue"]);

/**
 * Merge a patch into the stored observable object property-by-property
 * (LWW per property, §19). `id` never changes. Wire `null` (JSON cannot
 * encode undefined) is normalized to `undefined` so in-memory objects match
 * the optional-field contract in types.ts. Must run inside an action.
 */
function mergeInto(target: AnyModelData, patch: Partial<AnyModelData> & { id: UUID }): void {
  const t = target as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(patch)) {
    if (key === "id") continue;
    t[key] = value === null ? undefined : value;
  }
}

function readArchivedAt(obj: AnyModelData): unknown {
  return (obj as unknown as Record<string, unknown>)["archivedAt"];
}

function byCreatedAtAsc(a: { createdAt: string }, b: { createdAt: string }): number {
  return Date.parse(a.createdAt) - Date.parse(b.createdAt);
}

export class SyncStore {
  private readonly pools: ReadonlyMap<ModelName, ObservableMap<UUID, AnyModelData>>;

  constructor() {
    const pools = new Map<ModelName, ObservableMap<UUID, AnyModelData>>();
    for (const name of MODEL_NAMES) {
      // Deep observable map: values become observable objects on insert, so
      // field-level mutation triggers granular re-renders.
      pools.set(name, observable.map<UUID, AnyModelData>(undefined, { name: `pool:${name}`, deep: true }));
    }
    this.pools = pools;
  }

  // ---------- pool access ----------

  private pool<N extends ModelName>(model: N): ObservableMap<UUID, ModelDataMap[N]> {
    // Constructed for every MODEL_NAMES entry, so the lookup never misses.
    return this.pools.get(model) as unknown as ObservableMap<UUID, ModelDataMap[N]>;
  }

  /**
   * Core merge-or-insert. Returns the stored observable object.
   * Must be called inside an action (runInAction in the public wrappers).
   */
  private upsertInto<N extends ModelName>(
    model: N,
    data: Partial<ModelDataMap[N]> & { id: UUID },
  ): ModelDataMap[N] {
    const pool = this.pool(model);
    const existing = pool.get(data.id);
    if (existing) {
      mergeInto(existing, data);
      return existing;
    }
    // Insert a shell first so the object stored (and returned) is the
    // observable proxy, then merge fields through the same normalizing path.
    pool.set(data.id, { id: data.id } as ModelDataMap[N]);
    const stored = pool.get(data.id) as ModelDataMap[N];
    mergeInto(stored, data);
    return stored;
  }

  // ---------- writes ----------

  /** Merge `data` into the existing stored object (granular), or insert it. */
  upsert<N extends ModelName>(model: N, data: ModelDataMap[N]): void {
    runInAction(() => {
      this.upsertInto(model, data);
    });
  }

  remove(model: ModelName, id: UUID): void {
    runInAction(() => {
      this.pool(model).delete(id);
    });
  }

  /**
   * Apply one server sync action (§19 delta path).
   * I/U/V → upsert-merge (V additionally clears `archivedAt` on archivable
   * shapes unless the payload sets it); A → set `archivedAt` when the shape
   * has it, otherwise remove; D → remove.
   */
  applyAction(action: SyncAction): void {
    const { modelName, modelId } = action;
    runInAction(() => {
      switch (action.action) {
        case "I":
        case "U": {
          if (action.data) this.upsertInto(modelName, action.data);
          break;
        }
        case "V": {
          const target = action.data
            ? this.upsertInto(modelName, action.data)
            : this.pool(modelName).get(modelId);
          if (
            target !== undefined &&
            (ARCHIVABLE_MODELS.has(modelName) || "archivedAt" in target) &&
            !(action.data && "archivedAt" in action.data)
          ) {
            (target as unknown as Record<string, unknown>)["archivedAt"] = undefined;
          }
          break;
        }
        case "A": {
          const pool = this.pool(modelName);
          const existing = pool.get(modelId);
          if (existing === undefined) break;
          if (ARCHIVABLE_MODELS.has(modelName) || "archivedAt" in existing) {
            if (action.data) mergeInto(existing, action.data);
            const current = readArchivedAt(existing);
            if (current === undefined || current === null) {
              (existing as unknown as Record<string, unknown>)["archivedAt"] = new Date().toISOString();
            }
          } else {
            pool.delete(modelId);
          }
          break;
        }
        case "D": {
          this.pool(modelName).delete(modelId);
          break;
        }
      }
    });
  }

  /** Bulk load (bootstrap NDJSON rows / IndexedDB warm start) in one action. */
  hydrate(lines: { model: ModelName; data: AnyModelData }[]): void {
    runInAction(() => {
      for (const line of lines) {
        this.upsertInto(line.model, line.data);
      }
    });
  }

  clear(): void {
    runInAction(() => {
      for (const pool of this.pools.values()) pool.clear();
    });
  }

  // ---------- reads ----------

  get<N extends ModelName>(model: N, id: UUID): ModelDataMap[N] | undefined {
    return this.pool(model).get(id);
  }

  /** Fresh array per call; observable reads inside track granularly. */
  all<N extends ModelName>(model: N): ModelDataMap[N][] {
    return Array.from(this.pool(model).values());
  }

  // ---------- derived helpers ----------

  /** Non-archived issues of a team, by manual sortOrder. */
  issuesForTeam(teamId: UUID): IssueData[] {
    return this.all("Issue")
      .filter((issue) => issue.teamId === teamId && !issue.archivedAt)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /** Team workflow states in category order (CATEGORY_ORDER), then position. */
  statesForTeam(teamId: UUID): WorkflowStateData[] {
    return this.all("WorkflowState")
      .filter((state) => state.teamId === teamId)
      .sort((a, b) => {
        const byCategory = CATEGORY_RANK[a.category] - CATEGORY_RANK[b.category];
        return byCategory !== 0 ? byCategory : a.position - b.position;
      });
  }

  /** Non-archived issues in a workflow state (board column), by sortOrder. */
  issuesForState(stateId: UUID): IssueData[] {
    return this.all("Issue")
      .filter((issue) => issue.stateId === stateId && !issue.archivedAt)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /** Team cycles in sequential order (§22 — numbering is per team). */
  cyclesForTeam(teamId: UUID): CycleData[] {
    return this.all("Cycle")
      .filter((cycle) => cycle.teamId === teamId)
      .sort((a, b) => a.number - b.number);
  }

  /** Non-archived issues planned into a cycle, by sortOrder. */
  issuesForCycle(cycleId: UUID): IssueData[] {
    return this.all("Issue")
      .filter((issue) => issue.cycleId === cycleId && !issue.archivedAt)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /** Non-archived issues of a project, by sortOrder. */
  issuesForProject(projectId: UUID): IssueData[] {
    return this.all("Issue")
      .filter((issue) => issue.projectId === projectId && !issue.archivedAt)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  milestonesForProject(projectId: UUID): MilestoneData[] {
    return this.all("Milestone")
      .filter((milestone) => milestone.projectId === projectId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /** Issue activity feed, oldest first. */
  activitiesForIssue(issueId: UUID): ActivityData[] {
    return this.all("Activity")
      .filter((activity) => activity.issueId === issueId)
      .sort(byCreatedAtAsc);
  }

  /** Issue comments, oldest first (threading is resolved by the UI). */
  commentsForIssue(issueId: UUID): CommentData[] {
    return this.all("Comment")
      .filter((comment) => comment.issueId === issueId)
      .sort(byCreatedAtAsc);
  }

  /** Inbox notifications, newest first. */
  notificationsForUser(userId: UUID): NotificationData[] {
    return this.all("Notification")
      .filter((notification) => notification.userId === userId)
      .sort((a, b) => byCreatedAtAsc(b, a));
  }

  /** Case-insensitive team key lookup (route params may differ in case). */
  teamByKey(key: string): TeamData | undefined {
    const needle = key.toLowerCase();
    return this.all("Team").find((team) => team.key.toLowerCase() === needle);
  }

  projectBySlug(slug: string): ProjectData | undefined {
    return this.all("Project").find((project) => project.slug === slug);
  }

  /** Case-insensitive identifier lookup ("TRENDZO-37"). */
  issueByIdentifier(identifier: string): IssueData | undefined {
    const needle = identifier.toLowerCase();
    return this.all("Issue").find((issue) => issue.identifier.toLowerCase() === needle);
  }
}
