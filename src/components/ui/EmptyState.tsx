import styles from "./emptystate.module.css";

/**
 * Centered empty-state column — MASTER_PROMPT.md §10.5/§10.6.
 * Illustration slot, 15px/600 heading, 13px/450 muted body (lh 1.6),
 * and a primary/secondary button row (buttons supplied by the caller,
 * e.g. "Create new issue" with a `C` keycap chip).
 */
export function EmptyState({
  illustration,
  heading,
  children,
  primary,
  secondary,
}: {
  illustration?: React.ReactNode;
  heading: string;
  children?: React.ReactNode;
  primary?: React.ReactNode;
  secondary?: React.ReactNode;
}) {
  return (
    <div className={styles.root}>
      {illustration != null && (
        <div className={styles.illustration}>{illustration}</div>
      )}
      <h2 className={styles.heading}>{heading}</h2>
      {children != null && <div className={styles.body}>{children}</div>}
      {(primary != null || secondary != null) && (
        <div className={styles.actions}>
          {primary}
          {secondary}
        </div>
      )}
    </div>
  );
}
