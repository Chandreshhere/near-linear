import styles from "./kbd.module.css";

/**
 * Row of keyboard keycap chips — MASTER_PROMPT.md §6.4 (CAPTURED).
 * Used inside tooltips ("Go to my issues" + G M), menu items
 * ("Copy as prompt" + ⌘ ⌥ P) and empty-state primaries ("Create new issue" + C).
 * Font-size is .75em so chips scale with the surrounding label.
 */
export function Kbd({ keys }: { keys: string[] }) {
  return (
    <span className={styles.row}>
      {keys.map((key, i) => (
        <kbd className={styles.key} key={`${i}-${key}`}>
          {key}
        </kbd>
      ))}
    </span>
  );
}
