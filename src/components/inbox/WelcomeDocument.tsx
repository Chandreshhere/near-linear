"use client";

/**
 * The read-only onboarding document rendered in the inbox reading pane
 * (capture-welcome-to-linear.md §6 "Reading pane" + §10 type ramp,
 * MASTER_PROMPT.md §10.4).
 *
 * Structure mirrors the captured ProseMirror node sequence — intro
 * paragraph, embedded media player, "Resources" list, "Key features" list,
 * a paragraph with an inline-code chip, a horizontal rule and a closing
 * paragraph — but every word here is our own. The player is a placeholder:
 * the control-bar anatomy (labels, `aria-keyshortcuts`, timers, seek bars,
 * rate select) is reproduced faithfully while the controls stay inert
 * because there is no media source yet.
 */

import { useState, type CSSProperties } from "react";
import { Icon } from "@/components/icons/Icon";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Tooltip } from "@/components/ui/Tooltip";
import { copyToClipboard } from "@/lib/toast";
import styles from "./inbox.module.css";

/* ================================================================
 * Neutral workspace mark (Splash idiom — never a third-party logo)
 * ================================================================ */

export function WorkspaceMark({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fillRule="evenodd"
        d="M16 2.75a13.25 13.25 0 1 0 0 26.5 13.25 13.25 0 0 0 0-26.5Zm0 2.5a10.75 10.75 0 1 1 0 21.5 10.75 10.75 0 0 1 0-21.5Z"
        fill="currentColor"
      />
      <circle cx="16" cy="16" r="4" fill="currentColor" />
    </svg>
  );
}

/* ================================================================
 * Player glyphs (16px, authored — no sprite equivalents exist yet)
 * ================================================================ */

function Glyph({ path }: { path: string }) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d={path} />
    </svg>
  );
}

const SPEAKER_PATH =
  "M8.4 2.3a.8.8 0 0 1 .5.75v9.9a.8.8 0 0 1-1.32.6L4.9 11.2H3a1.5 1.5 0 0 1-1.5-1.5V6.3A1.5 1.5 0 0 1 3 4.8h1.9l2.68-2.35a.8.8 0 0 1 .82-.15Zm2.7 3.03a.75.75 0 0 1 1.03.26 5 5 0 0 1 0 4.82.75.75 0 1 1-1.3-.74 3.5 3.5 0 0 0 0-3.34.75.75 0 0 1 .27-1Z";

const DOWNLOAD_PATH =
  "M8 1.8c.41 0 .75.34.75.75v6.14l1.97-1.97a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.78a.75.75 0 1 1 1.06-1.06l1.97 1.97V2.55c0-.41.34-.75.75-.75ZM2.75 11.4c.41 0 .75.34.75.75v1.1h9v-1.1a.75.75 0 0 1 1.5 0v1.35c0 .69-.56 1.25-1.25 1.25H3.25C2.56 14.85 2 14.29 2 13.6v-1.45c0-.41.34-.75.75-.75Z";

const PIP_PATH =
  "M2.5 3h11A1.5 1.5 0 0 1 15 4.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 11.5v-7A1.5 1.5 0 0 1 2.5 3Zm0 1.4a.1.1 0 0 0-.1.1v7c0 .06.04.1.1.1h11a.1.1 0 0 0 .1-.1v-7a.1.1 0 0 0-.1-.1h-11Zm5.9 3.2h4.1v3.1H8.4V7.6Z";

const FULL_WINDOW_PATH =
  "M2.7 1.8h3a.75.75 0 0 1 0 1.5H4.56l2.22 2.22a.75.75 0 1 1-1.06 1.06L3.5 4.36V5.5a.75.75 0 0 1-1.5 0v-3c0-.39.31-.7.7-.7Zm7.55 0h3c.39 0 .7.31.7.7v3a.75.75 0 0 1-1.5 0V4.36l-2.22 2.22a.75.75 0 1 1-1.06-1.06l2.22-2.22h-1.14a.75.75 0 0 1 0-1.5ZM2.75 9.75c.41 0 .75.34.75.75v1.14l2.22-2.22a.75.75 0 1 1 1.06 1.06L4.56 12.7H5.7a.75.75 0 0 1 0 1.5h-3a.7.7 0 0 1-.7-.7v-3c0-.41.34-.75.75-.75Zm10.5 0c.41 0 .75.34.75.75v3a.7.7 0 0 1-.7.7h-3a.75.75 0 0 1 0-1.5h1.14L9.22 10.48a.75.75 0 1 1 1.06-1.06l2.22 2.22V10.5c0-.41.34-.75.75-.75Z";

const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

/** Inert control-bar button: hoverable (so its tooltip works) but never fires. */
function PlayerButton({
  label,
  tooltip,
  keys,
  keyshortcuts,
  children,
}: {
  label: string;
  tooltip: string;
  keys?: string[];
  keyshortcuts?: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip content={tooltip} keys={keys} side="top">
      <button
        type="button"
        className={styles.playerBtn}
        aria-label={label}
        aria-keyshortcuts={keyshortcuts}
        aria-disabled="true"
      >
        {children}
      </button>
    </Tooltip>
  );
}

/**
 * Media player. The control-bar anatomy is reproduced faithfully (labels,
 * `aria-keyshortcuts`, timers, seek bars, rate select), but this build ships
 * no media asset, so every transport control is `aria-disabled` — there is
 * genuinely nothing to play, mute or seek. The one control that CAN do
 * something honest is Play: it says so, through the same explainer dialog the
 * document's resource links use.
 */
function MediaPlayer({ onExplain }: { onExplain: (link: DocLink) => void }) {
  const buffered = {
    "--media-player-range-start": "0%",
    "--media-player-range-end": "38%",
  } as CSSProperties;
  const played = {
    "--media-player-range-start": "0%",
    "--media-player-range-end": "0%",
  } as CSSProperties;
  const thumb = { "--media-player-thumb-start": "0%" } as CSSProperties;

  return (
    <div
      className={styles.player}
      role="region"
      aria-label="Media player"
      tabIndex={0}
      data-orbiter-media-player="true"
      data-status="paused"
      data-sound="true"
    >
      <div className={styles.playerStage}>
        <div className={styles.playerPoster} aria-hidden="true" />
        <button
          type="button"
          className={styles.playerBigPlay}
          aria-label="Play the workspace tour"
          onClick={() => onExplain(TOUR_VIDEO)}
        >
          <Icon name="Play" size={20} />
        </button>
      </div>

      <div className={styles.playerBar}>
        <Tooltip content="Play" keys={["K"]} side="top">
          <button
            type="button"
            className={styles.playerBtn}
            aria-label="Play (keyboard shortcut k)"
            aria-keyshortcuts="k"
            onClick={() => onExplain(TOUR_VIDEO)}
          >
            <Icon name="Play" size={14} />
          </button>
        </Tooltip>
        <PlayerButton
          label="Mute (keyboard shortcut m)"
          tooltip="Mute"
          keys={["M"]}
          keyshortcuts="m"
        >
          <Glyph path={SPEAKER_PATH} />
        </PlayerButton>

        <time
          className={styles.playerTime}
          role="timer"
          aria-label="Elapsed"
          dateTime="PT0S"
        >
          00:00
        </time>

        <div
          className={styles.playerSeek}
          role="slider"
          aria-label="Seek slider"
          aria-valuemin={0}
          aria-valuemax={239}
          aria-valuenow={0}
          aria-valuetext="00:00 of 03:59"
          aria-disabled="true"
          tabIndex={-1}
        >
          <span className={styles.playerRange} data-type="buffered" style={buffered} />
          <span className={styles.playerRange} data-type="played" style={played} />
          <span className={styles.playerThumb} style={thumb} />
        </div>

        <time
          className={styles.playerTime}
          role="timer"
          aria-label="Duration"
          dateTime="PT3M59S"
        >
          03:59
        </time>

        <select
          className={styles.playerRate}
          aria-label="Change playback rate (keyboard shortcut > or <)"
          aria-keyshortcuts="Shift+. Shift+,"
          defaultValue="1"
          disabled
        >
          {PLAYBACK_RATES.map((rate) => (
            <option key={rate} value={String(rate)}>
              {rate}&times;
            </option>
          ))}
        </select>

        <PlayerButton label="Download" tooltip="Download">
          <Glyph path={DOWNLOAD_PATH} />
        </PlayerButton>
        <PlayerButton
          label="Picture-in-Picture (keyboard shortcut p)"
          tooltip="Picture-in-Picture"
          keys={["P"]}
          keyshortcuts="p"
        >
          <Glyph path={PIP_PATH} />
        </PlayerButton>
        <PlayerButton
          label="Full window (keyboard shortcut f)"
          tooltip="Full window"
          keys={["F"]}
          keyshortcuts="f"
        >
          <Glyph path={FULL_WINDOW_PATH} />
        </PlayerButton>
      </div>
    </div>
  );
}

/* ================================================================
 * Document body
 * ================================================================ */

interface DocLink {
  title: string;
  description: string;
  /** Where this resource would live; shown verbatim in the explainer dialog. */
  target: string;
  /** What the reader would find there — the dialog's body copy. */
  detail: string;
}

/** The tour video, described the same way the resource links are. */
const TOUR_VIDEO: DocLink = {
  title: "Workspace tour",
  description: "A four-minute walkthrough of the core workflows.",
  target: "media/welcome/workspace-tour.mp4",
  detail:
    "The tour is a hosted video. This build ships no media assets, so the player reproduces the real control bar — labels, timers, seek ranges, playback rates — with nothing behind it. Everything the tour covers is reachable from the sidebar today.",
};

const RESOURCES: DocLink[] = [
  {
    title: "Live onboarding session",
    description:
      "Join a guided walkthrough of the core workflows and bring your questions.",
    target: "events/onboarding-session",
    detail:
      "A scheduled call run by the team: a guided pass through issues, projects, and cycles, then open questions. Booking it needs a calendar service, which this workspace does not talk to.",
  },
  {
    title: "Community chat",
    description:
      "Compare setups with other teams and borrow the patterns that already work.",
    target: "community/chat",
    detail:
      "A shared chat space where other teams post their workflows, filters, and saved views. It lives on a third-party chat host, so there is nothing to open from inside the app.",
  },
  {
    title: "Video walkthroughs",
    description:
      "Short clips covering everything from your first issue to your first release.",
    target: "docs/videos",
    detail:
      "A playlist of short clips, one per surface — creating an issue, filtering a view, running a cycle. Same story as the tour above: hosted media, not bundled here.",
  },
  {
    title: "Agent workflows",
    description:
      "Hand scoping, bug triage, and routine status updates to agents that work alongside you.",
    target: "docs/agents",
    detail:
      "Reference for delegating scoping, triage, and status updates to agents. The Agent surface in the sidebar is real; this link would open its written documentation.",
  },
];

const KEY_FEATURES: DocLink[] = [
  {
    title: "Agents and automation",
    description:
      "Delegate the repetitive half of product operations and keep the judgement calls.",
    target: "settings/ai",
    detail:
      "Where automation rules and agent permissions are configured. The settings surface exists in this workspace; the written guide behind this link does not ship with it.",
  },
  {
    title: "Integration directory",
    description:
      "Wire up the support, design, and code tools your team already lives in.",
    target: "settings/integrations",
    detail:
      "The catalogue of connectors — support inboxes, design files, code hosts. Connecting any of them needs OAuth against a real service, so the directory is not part of this build.",
  },
];

/**
 * Every resource link opens the explainer dialog below rather than a dead
 * `#` anchor: the destination is named, described, and can be copied.
 */
function LinkList({
  items,
  onOpen,
}: {
  items: DocLink[];
  onOpen: (link: DocLink) => void;
}) {
  return (
    <ul className={styles.docList}>
      {items.map((item) => (
        <li key={item.title} className={styles.docListItem}>
          <button
            type="button"
            className={styles.docLink}
            onClick={() => onOpen(item)}
          >
            {item.title}
          </button>
          <span className={styles.docLinkDesc}>{item.description}</span>
        </li>
      ))}
    </ul>
  );
}

/** "About this link" — what the target is and why it is not reachable here. */
function ResourceDialog({
  link,
  onClose,
}: {
  link: DocLink | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={link !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      width={440}
      label={link?.title ?? "Resource"}
    >
      <div className={styles.resourceDialog}>
        <h2 className={styles.resourceTitle}>{link?.title}</h2>
        <p className={styles.resourceBody}>{link?.detail}</p>
        <div className={styles.resourceTarget}>
          <Icon name="Link" size={14} />
          {link?.target}
        </div>
        <div className={styles.resourceActions}>
          <Button
            size={28}
            onClick={() => {
              if (link !== null) {
                void copyToClipboard(link.target, "Copied resource path");
              }
            }}
          >
            Copy path
          </Button>
          <Button variant="primary" size={28} onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export function WelcomeDocument() {
  const [link, setLink] = useState<DocLink | null>(null);

  return (
    <article className={styles.doc}>
      <span className={styles.docTile} aria-hidden="true">
        <WorkspaceMark size={26} />
      </span>
      <h1 className={styles.docTitle}>Welcome to your workspace</h1>

      <div
        className={styles.docBody}
        role="document"
        aria-label="Welcome message content"
      >
        <p>
          Start with the short tour below, then work through the resources we
          have gathered for your first week. Nothing here needs to be kept —
          once you have read it, this notification can be deleted.
        </p>

        <MediaPlayer onExplain={setLink} />

        <h3 className={styles.docHeading}>Resources</h3>
        <LinkList items={RESOURCES} onOpen={setLink} />

        <h3 className={styles.docHeading}>Key features</h3>
        <LinkList items={KEY_FEATURES} onOpen={setLink} />

        <p>
          Anything the interface does not cover yet is reachable from the API
          and the MCP server, which read and write exactly the records you see
          here. Press <code className={styles.docCode}>?</code> at any time for
          the full keyboard map.
        </p>

        <hr className={styles.docRule} />

        <p>
          Still stuck? Open the help menu in the bottom-left corner of the
          sidebar and choose Contact us — someone on the team reads every
          message.
        </p>
      </div>

      <ResourceDialog link={link} onClose={() => setLink(null)} />
    </article>
  );
}
