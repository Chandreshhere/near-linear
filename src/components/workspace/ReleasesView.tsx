"use client";

/**
 * `/:ws/releases` — the destination of the sidebar's More → Releases row.
 *
 * There is no Release entity in this reconstruction's data model
 * (src/lib/data/types.ts §18 has no Release / ReleaseIssue rows) and inventing
 * fake releases would be worse than saying so, therefore this page is an
 * honest empty state: what the surface is, why it is empty, and a primary
 * that is disabled WITH its reason rather than a button that lies.
 *
 * ── SEAM ─────────────────────────────────────────────────────────────────
 * Enabling it needs (a) a `ReleaseData` model (name, target date, state,
 * issue ids) added to types.ts + MODEL_NAMES, and (b) the deploy-tracking
 * integration that populates it from GitHub/GitLab tags.
 */

import type { JSX } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Header } from "@/components/shell/Header";
import { ReleaseStackMark } from "./glyphs";
import styles from "./directory.module.css";

export function ReleasesView(): JSX.Element {
  return (
    <>
      <Header title="Releases" />

      <div className={styles.scroller} tabIndex={0} data-scroll-container="true">
        <EmptyState
          illustration={
            <span className={styles.emptyIllustration}>
              <ReleaseStackMark size={96} />
            </span>
          }
          heading="Track what ships, and when"
          primary={
            <Button
              variant="primary"
              size={32}
              disabled
              aria-describedby="releases-disabled-reason"
            >
              New release
            </Button>
          }
        >
          A release groups the issues that go out together — a version name, a
          target date and the deploy that closes it.
          <div id="releases-disabled-reason" className={styles.reason}>
            Disabled because this build has no Release model or deploy
            integration yet: nothing would be tracking the shipped commits.
          </div>
        </EmptyState>
      </div>
    </>
  );
}
