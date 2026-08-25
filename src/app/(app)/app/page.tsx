import type { Metadata } from "next";
import { AppEntryView } from "./AppEntryView";

export const metadata: Metadata = { title: "Opening…" };

/**
 * `/app` — the one entry point into the product.
 *
 * Everything outside the workspace (the landing page's "Open app", the login
 * redirect, the desktop shortcut) links HERE rather than at a hardcoded
 * workspace slug, because which workspace this browser belongs to is only
 * knowable at runtime. The client view resolves it and forwards.
 *
 * "app" is a reserved slug (src/lib/workspace/active.ts RESERVED_SLUGS) so it
 * can never collide with a workspace of the same name.
 */
export default function AppEntryPage() {
  return <AppEntryView />;
}
