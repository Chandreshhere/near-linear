import type { Metadata } from "next";
import { LoginView } from "./LoginView";

export const metadata: Metadata = { title: "Log in" };

/**
 * `/login` — outside the [workspace] segment, so no app shell renders here
 * (MASTER_PROMPT §17.1). Static segments win over `[workspace]` in the App
 * Router, so this route is reached before the workspace layout is considered.
 */
export default function LoginPage() {
  return <LoginView />;
}
