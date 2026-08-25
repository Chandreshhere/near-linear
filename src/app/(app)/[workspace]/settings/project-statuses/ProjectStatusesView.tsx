"use client";

import { observer } from "mobx-react-lite";
import {
  SettingsCard,
  SettingsCustomRow,
  SettingsPageHeader,
  SettingsSection,
  SettingsSections,
} from "@/components/settings/SettingsPage";
import { useStore } from "@/lib/data/DataProvider";
import type { ProjectStatusCategory } from "@/lib/data/types";
import styles from "@/components/settings/settings.module.css";

/**
 * Settings → Projects → Statuses. The project status ladder every project in
 * the workspace moves through, with live membership read from the pool.
 */

const CATEGORIES: {
  key: ProjectStatusCategory;
  name: string;
  color: string;
  description: string;
}[] = [
  {
    key: "backlog",
    name: "Backlog",
    color: "#d7d8db",
    description: "Ideas and requests that have not been committed to yet",
  },
  {
    key: "planned",
    name: "Planned",
    color: "lch(80% 90 85)",
    description: "Scoped and scheduled, but work has not begun",
  },
  {
    key: "started",
    name: "In Progress",
    color: "#f2994a",
    description: "Actively being worked on — counted in progress rollups",
  },
  {
    key: "completed",
    name: "Completed",
    color: "#5e6ad2",
    description: "Delivered; contributes to completion percentages",
  },
  {
    key: "canceled",
    name: "Canceled",
    color: "#8a8f98",
    description: "Dropped before completion and excluded from progress",
  },
];

export const ProjectStatusesView = observer(function ProjectStatusesView() {
  const store = useStore();
  const projects = store.all("Project");

  return (
    <>
      <SettingsPageHeader
        title="Statuses"
        description="The status ladder shared by every project in this workspace."
      />

      <SettingsSections>
        <SettingsSection
          id="project-statuses"
          title="Project statuses"
          description={`${projects.length} ${projects.length === 1 ? "project" : "projects"} are distributed across these statuses.`}
        >
          <SettingsCard>
            {CATEGORIES.map((category) => {
              const members = projects.filter((p) => p.statusCategory === category.key);
              return (
                <SettingsCustomRow key={category.key}>
                  <span className={styles.rowText}>
                    <span className={styles.rowLabel}>
                      <span
                        className={styles.dot}
                        style={{
                          background: category.color,
                          display: "inline-block",
                          marginRight: 8,
                          verticalAlign: -1,
                        }}
                        aria-hidden="true"
                      />
                      {category.name}
                    </span>
                    <span className={styles.rowDescription}>
                      {members.length === 0
                        ? category.description
                        : members.map((p) => p.name).join(", ")}
                    </span>
                  </span>
                  <span className={styles.rowControl}>
                    <span className={styles.count}>{members.length}</span>
                  </span>
                </SettingsCustomRow>
              );
            })}
          </SettingsCard>
        </SettingsSection>

        <SettingsSection
          id="health"
          title="Health"
          description="Health is set on a project update, separately from status."
        >
          <SettingsCard>
            {[
              { key: "onTrack", name: "On track", color: "#4cb782" },
              { key: "atRisk", name: "At risk", color: "#f2c94c" },
              { key: "offTrack", name: "Off track", color: "#eb5757" },
              { key: "noUpdate", name: "No update", color: "#8a8f98" },
            ].map((health) => {
              const count = projects.filter((p) => p.health === health.key).length;
              return (
                <SettingsCustomRow key={health.key}>
                  <span className={styles.rowText}>
                    <span className={styles.rowLabel}>
                      <span
                        className={styles.dot}
                        style={{
                          background: health.color,
                          display: "inline-block",
                          marginRight: 8,
                          verticalAlign: -1,
                        }}
                        aria-hidden="true"
                      />
                      {health.name}
                    </span>
                  </span>
                  <span className={styles.rowControl}>
                    <span className={styles.count}>{count}</span>
                  </span>
                </SettingsCustomRow>
              );
            })}
          </SettingsCard>
        </SettingsSection>
      </SettingsSections>
    </>
  );
});
