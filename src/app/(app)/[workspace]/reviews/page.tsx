import type { Metadata } from "next";
import { ReviewsView } from "@/components/workspace/ReviewsView";

export const metadata: Metadata = { title: "Reviews" };

export default function ReviewsPage() {
  return <ReviewsView />;
}
