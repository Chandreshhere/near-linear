import { Header } from "./Header";
import styles from "./shell.module.css";

/**
 * Phase-1 placeholder page body: real header band, empty content scroller.
 * Replaced surface-by-surface in later phases.
 */
export function PagePlaceholder({
  title,
  headerTitle,
  noBorder,
  children,
}: {
  title: string;
  headerTitle?: string;
  noBorder?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <>
      <Header title={headerTitle ?? title} noBorder={noBorder} />
      <div className={styles.contentScroller} tabIndex={0} data-scroll-container="true">
        {children}
      </div>
    </>
  );
}
