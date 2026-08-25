import type { Metadata } from "next";
import { PrimitivesGallery } from "./PrimitivesGallery";

export const metadata: Metadata = {
  title: "Primitives",
};

/** Dev-only gallery: every UI primitive in realistic states on the dark ground. */
export default function PrimitivesPage() {
  return <PrimitivesGallery />;
}
