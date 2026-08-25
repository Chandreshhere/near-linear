import type { Metadata } from "next";
import { WelcomeMessageClient } from "./WelcomeMessageClient";

export const metadata: Metadata = { title: "Welcome" };

export default async function WelcomeMessagePage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  return <WelcomeMessageClient workspace={workspace} />;
}
