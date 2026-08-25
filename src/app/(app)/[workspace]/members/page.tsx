import { Suspense } from "react";
import type { Metadata } from "next";
import { MembersView } from "@/components/members/MembersView";

export const metadata: Metadata = { title: "Members" };

export default function MembersPage() {
  // MembersView reads `?member=<id>` (the command palette's focus request),
  // and useSearchParams opts its subtree out of static prerendering.
  return (
    <Suspense fallback={null}>
      <MembersView />
    </Suspense>
  );
}
