"use client";

/**
 * `/:ws/reviews` — the Reviews surface reached from the sidebar's primary nav
 * (between "My issues" and "Agent").
 *
 * Reviews read code from a connected git host, so with no integrations
 * backend the page is the reference's setup banner: what reviews are, what
 * you get, and the two honest actions — connect an account (explains the seam
 * it needs) or dismiss the banner (persisted per browser, restorable).
 */

import { useEffect, useState, type JSX } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Header } from "@/components/shell/Header";
import { showToast } from "@/lib/toast";
import { ReviewDiffMark } from "./glyphs";
import styles from "./directory.module.css";

const DISMISS_KEY = "linearReviewsBannerDismissed";

function readDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DISMISS_KEY) === "true";
  } catch {
    return false;
  }
}

function writeDismissed(value: boolean): void {
  try {
    if (value) window.localStorage.setItem(DISMISS_KEY, "true");
    else window.localStorage.removeItem(DISMISS_KEY);
  } catch {
    /* private mode — the banner simply comes back next session */
  }
}

const FEATURES: { text: string; pill?: string }[] = [
  {
    text: "Guided reviews that walk a diff file by file, with the issue and project context attached.",
    pill: "Available on Business",
  },
  { text: "Follow-ups from a coding session land back on the issue that started it." },
  { text: "Review requests and replies arrive as notifications in your inbox." },
];

export function ReviewsView(): JSX.Element {
  // Empty on the server and on the first client render (no hydration
  // mismatch), then reconciled from localStorage.
  const [dismissed, setDismissed] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);

  useEffect(() => {
    setDismissed(readDismissed());
  }, []);

  const dismiss = (): void => {
    setDismissed(true);
    writeDismissed(true);
    showToast("Hid the reviews setup banner");
  };

  const restore = (): void => {
    setDismissed(false);
    writeDismissed(false);
  };

  return (
    <>
      <Header title="Reviews" />

      <div className={styles.scroller} tabIndex={0} data-scroll-container="true">
        {dismissed ? (
          <EmptyState
            heading="No reviews"
            primary={
              <Button variant="secondary" size={32} onClick={restore}>
                Show setup guide
              </Button>
            }
          >
            Nothing is waiting on your review. Connect a git host to see diffs
            from your workspace here.
          </EmptyState>
        ) : (
          <EmptyState
            illustration={
              <span className={styles.emptyIllustration}>
                <ReviewDiffMark size={96} />
              </span>
            }
            heading="Review diffs in your workspace"
            primary={
              <Button
                variant="primary"
                size={32}
                onClick={() => setConnectOpen(true)}
              >
                Connect your GitHub account
              </Button>
            }
            secondary={
              <Button variant="secondary" size={32} onClick={dismiss}>
                Dismiss
              </Button>
            }
          >
            Reviews bring the pull requests attached to your issues into Linear,
            so a change and the work that asked for it stay in one place.
            <ul className={styles.featureList}>
              {FEATURES.map((feature) => (
                <li className={styles.featureItem} key={feature.text}>
                  <span className={styles.bullet} aria-hidden="true" />
                  <span>
                    {feature.text}
                    {feature.pill !== undefined ? (
                      <span className={styles.pill}>{feature.pill}</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </EmptyState>
        )}
      </div>

      <Dialog
        open={connectOpen}
        onOpenChange={setConnectOpen}
        width={520}
        label="Connect your GitHub account"
      >
        <div className={styles.dialogHeader}>
          <span className={styles.dialogTitle}>Connect your GitHub account</span>
          <span className={styles.dialogSub}>
            Reviews read diffs from a git host, so this button needs a server on
            the other end — it is the one part of this build that cannot run
            locally.
          </span>
        </div>
        <div className={styles.dialogBody}>
          <div className={styles.notice}>
            <span className={styles.noticeTitle}>What connecting requires</span>
            <span className={styles.noticeBody}>
              1. An OAuth app: redirect to <code>github.com/login/oauth/authorize</code>{" "}
              with the <code>repo</code> + <code>read:user</code> scopes, then exchange
              the code server-side (the client secret can never live in the
              browser).
              <br />
              2. A webhook endpoint (<code>POST /integrations/github/events</code>)
              subscribed to <code>pull_request</code> and{" "}
              <code>pull_request_review</code>, which turns each event into the
              Review rows this page would list.
              <br />
              3. A token store keyed by workspace + user, refreshed on expiry.
            </span>
          </div>
          <span className={styles.hint}>
            The seam is documented next to the sync transport contract
            (src/lib/data/transport.ts): everything else in this app runs
            against the local engine, and this surface will too once those rows
            arrive over the same delta stream.
          </span>
        </div>
        <div className={styles.dialogFooter}>
          <Button variant="secondary" size={32} onClick={() => setConnectOpen(false)}>
            Close
          </Button>
        </div>
      </Dialog>
    </>
  );
}
