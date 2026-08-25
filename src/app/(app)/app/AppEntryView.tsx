"use client";

/**
 * Resolves where "open the app" actually goes, in this browser, right now:
 *
 *   ?demo=1        → provision/open the demo workspace and land in it
 *   no session     → /login
 *   no workspace   → /onboarding/workspace  (genuine first run)
 *   otherwise      → /<active slug>/agent
 *
 * All four answers depend on localStorage + IndexedDB, so none of them can be
 * decided on the server — hence a client view behind a static route. The boot
 * splash from the root layout is still on screen while this runs, so the user
 * sees the normal "Loading…" frame rather than a flash of empty page.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { readSession } from "@/lib/auth/session";
import { demoRequested, provisionDemoWorkspace } from "@/lib/data/demo";
import { readActiveWorkspace } from "@/lib/workspace/active";
import styles from "./appentry.module.css";

export function AppEntryView() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const go = async (): Promise<void> => {
      // Reading location here (rather than useSearchParams) keeps this route
      // statically renderable — no Suspense boundary required.
      if (demoRequested(window.location.search)) {
        const slug = await provisionDemoWorkspace();
        if (!cancelled) router.replace(`/${slug}/agent`);
        return;
      }
      if (readSession() === null) {
        router.replace("/login");
        return;
      }
      const slug = readActiveWorkspace();
      router.replace(slug === null ? "/onboarding/workspace" : `/${slug}/agent`);
    };

    void go().catch(() => {
      if (!cancelled) setFailed(true);
    });

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className={styles.root}>
      {/* The layout's "Skip to content" link needs a target on every route. */}
      <div id="skip-nav" tabIndex={-1} />
      <p className={styles.message} role="status">
        {failed
          ? "This browser blocked local storage, so the workspace could not be opened."
          : "Opening your workspace…"}
      </p>
    </main>
  );
}
