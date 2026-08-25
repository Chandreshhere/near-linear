import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { SettingsGlyph, type GlyphName } from "./glyphs";
import styles from "./settings.module.css";

/**
 * Shared settings page furniture — CAPTURED geometry
 * (capture-preferences.md §6, MASTER_PROMPT §7.8):
 * H1 24px/500 ls -.01rem → 32px spacer → sections (gap 48) → h3 15px/500 →
 * cards (r10 + hairline ring + elevated bg) → rows (min-h 60, p16,
 * separators inset 16, 13/500 label + 12/450 description, control right).
 */

export function SettingsPageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <>
      <header>
        <h1 className={styles.pageTitle}>{title}</h1>
        {description !== undefined ? (
          <p className={styles.pageSubtitle}>{description}</p>
        ) : null}
      </header>
      <div className={styles.titleSpacer} />
    </>
  );
}

export function SettingsSections({ children }: { children: ReactNode }) {
  return <div className={styles.sections}>{children}</div>;
}

export function SettingsSection({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  // `-heading`, not `-title`: settings pages also mint control ids like
  // `profile-title`, and a duplicate id breaks both the label and the query.
  const headingId = id !== undefined ? `${id}-heading` : undefined;
  return (
    <section id={id} className={styles.section} aria-labelledby={headingId}>
      {/* h2, not h3: the page's only h1 is SettingsPageHeader's title, so a
          section heading one level down keeps the outline gapless for screen
          readers navigating by heading. */}
      <h2 id={headingId} className={styles.sectionTitle}>
        {title}
      </h2>
      {description !== undefined ? (
        <p className={styles.sectionDescription}>{description}</p>
      ) : null}
      <div className={styles.cards}>{children}</div>
    </section>
  );
}

export function SettingsCard({
  children,
  footer,
}: {
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className={styles.card}>
      <ul className={styles.list}>{children}</ul>
      {footer !== undefined ? <div className={styles.cardFooter}>{footer}</div> : null}
    </div>
  );
}

export function SettingsRow({
  id,
  label,
  description,
  control,
  labelFor,
}: {
  id?: string;
  label: ReactNode;
  description?: ReactNode;
  control?: ReactNode;
  /** Renders the label as a <label for=…> when the control owns an id. */
  labelFor?: string;
}) {
  return (
    <li id={id} className={styles.row}>
      <span className={styles.rowText}>
        {labelFor !== undefined ? (
          <label className={styles.rowLabel} htmlFor={labelFor}>
            {label}
          </label>
        ) : (
          <span className={styles.rowLabel}>{label}</span>
        )}
        {description !== undefined ? (
          <span className={styles.rowDescription}>{description}</span>
        ) : null}
      </span>
      {control !== undefined ? <span className={styles.rowControl}>{control}</span> : null}
    </li>
  );
}

/** Free-form row body (no label/control split) — used by editable lists. */
export function SettingsCustomRow({ children }: { children: ReactNode }) {
  return <li className={styles.row}>{children}</li>;
}

export function SettingsEmptyRow({ children }: { children: ReactNode }) {
  return <li className={styles.emptyRow}>{children}</li>;
}

/**
 * Honest placeholder for a surface this build does not model yet: one
 * sentence of explanation and a disabled primary action. Never lorem.
 */
export function NotConfiguredPanel({
  glyph,
  title,
  body,
  action,
}: {
  glyph: GlyphName;
  title: string;
  body: string;
  action: string;
}) {
  return (
    <div className={styles.panel}>
      <span className={styles.panelIcon}>
        <SettingsGlyph name={glyph} />
      </span>
      <span className={styles.panelTitle}>{title}</span>
      <p className={styles.panelBody}>{body}</p>
      <div className={styles.panelActions}>
        <Button variant="secondary" size={32} disabled>
          {action}
        </Button>
      </div>
    </div>
  );
}
