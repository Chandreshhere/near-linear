"use client";

/**
 * Agent chat state — MASTER_PROMPT.md §21 (multiple open chats as toolbar
 * tabs with unread/working badges, retained history, stop/cancel).
 *
 * A MobX store, mirrored to localStorage under "agentChats" (the chat array
 * exactly as documented). Which chats are OPEN as tabs and which one is
 * active are session concepts, so they live in memory only and are re-derived
 * on load (most recent chat opens).
 *
 * SSR-safe: the constructor touches nothing browser-side; `hydrate()` runs
 * from an effect (`useAgentChats`).
 *
 * The store never imports an adapter — `sendMessage` takes one. That keeps
 * the LLM seam (engine.ts) swappable without touching chat state.
 */

import { computed, makeObservable, observable, runInAction } from "mobx";
import { useEffect, useState } from "react";
import {
  isAgentAbortError,
  type AgentAction,
  type AgentAdapter,
  type AgentContext,
} from "@/lib/agent/engine";

/* ================================================================
 * Shape (this is the localStorage row shape too)
 * ================================================================ */

export type AgentMessageRole = "user" | "agent";

export interface AgentMessage {
  id: string;
  role: AgentMessageRole;
  text: string;
  actions: AgentAction[];
  createdAt: string;
}

export type AgentChatStatus = "idle" | "working";

export interface AgentChat {
  id: string;
  title: string;
  messages: AgentMessage[];
  createdAt: string;
  updatedAt: string;
  status: AgentChatStatus;
}

const STORAGE_KEY = "agentChats";
const NEW_CHAT_TITLE = "New chat";
const MAX_TITLE_LENGTH = 48;

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** First line of the opening message, trimmed to a tab-sized label. */
function titleFromText(text: string): string {
  const line = text.trim().split("\n")[0]?.trim() ?? "";
  if (line === "") return NEW_CHAT_TITLE;
  return line.length > MAX_TITLE_LENGTH
    ? `${line.slice(0, MAX_TITLE_LENGTH - 1).trimEnd()}…`
    : line;
}

/* ---- storage (tolerant: hand-edited JSON degrades to "no chats") ---- */

function isMessage(value: unknown): value is AgentMessage {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    (row.role === "user" || row.role === "agent") &&
    typeof row.text === "string" &&
    typeof row.createdAt === "string"
  );
}

function isChat(value: unknown): value is AgentChat {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.title === "string" &&
    Array.isArray(row.messages) &&
    typeof row.createdAt === "string" &&
    typeof row.updatedAt === "string"
  );
}

function parseChats(raw: string | null): AgentChat[] {
  if (raw === null || raw === "") return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isChat).map((chat) => ({
      ...chat,
      // A chat can never be resumed mid-run across a reload.
      status: "idle" as const,
      messages: chat.messages.filter(isMessage).map((m) => ({
        ...m,
        actions: Array.isArray(m.actions) ? m.actions : [],
      })),
    }));
  } catch {
    return [];
  }
}

/* ================================================================
 * Store
 * ================================================================ */

export class AgentChatStore {
  chats: AgentChat[] = [];
  /** Chats shown as tabs in the bottom agent toolbar (session state). */
  openIds: string[] = [];
  activeId: string | null = null;
  /** Chat ids with agent output the user hasn't looked at yet. */
  unreadIds: string[] = [];
  /** True once localStorage has been read (writes are suppressed before). */
  hydrated = false;

  /** Live runs, keyed by chat id — never observable, never persisted. */
  readonly #runs = new Map<string, AbortController>();

  constructor() {
    // Explicit annotations (not makeAutoObservable): MobX actions run
    // untracked, so annotating the read helpers would silently break
    // reactivity inside observer components. Every mutation below is already
    // wrapped in runInAction.
    makeObservable(this, {
      chats: observable,
      openIds: observable,
      activeId: observable,
      unreadIds: observable,
      hydrated: observable,
      active: computed,
      openChats: computed,
    });
  }

  /* ---------------- lifecycle ---------------- */

  /** Idempotent; called from a client effect so SSR never touches storage. */
  hydrate(): void {
    if (this.hydrated || typeof window === "undefined") return;
    const stored = parseChats(window.localStorage.getItem(STORAGE_KEY));
    runInAction(() => {
      this.chats = stored;
      this.hydrated = true;
      const recent = this.byRecency()[0];
      if (recent !== undefined) {
        this.openIds = [recent.id];
        this.activeId = recent.id;
      }
    });
  }

  private persist(): void {
    if (!this.hydrated || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
          this.chats.map((chat) => ({
            id: chat.id,
            title: chat.title,
            messages: chat.messages,
            createdAt: chat.createdAt,
            updatedAt: chat.updatedAt,
            status: "idle" as const,
          })),
        ),
      );
    } catch {
      /* storage full or unavailable — chat state stays in memory */
    }
  }

  /* ---------------- reads ---------------- */

  get active(): AgentChat | null {
    return this.activeId === null ? null : this.get(this.activeId) ?? null;
  }

  get openChats(): AgentChat[] {
    return this.openIds
      .map((id) => this.get(id))
      .filter((chat): chat is AgentChat => chat !== undefined);
  }

  get(id: string): AgentChat | undefined {
    return this.chats.find((chat) => chat.id === id);
  }

  /** Chat history, newest activity first (§21 "organized by recency"). */
  byRecency(): AgentChat[] {
    return this.chats.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  isUnread(id: string): boolean {
    return this.unreadIds.includes(id);
  }

  isWorking(id: string): boolean {
    return this.get(id)?.status === "working";
  }

  /* ---------------- chat management ---------------- */

  /** Opens a fresh chat as the active tab and returns its id. */
  newChat(): string {
    const now = new Date().toISOString();
    const chat: AgentChat = {
      id: newId(),
      title: NEW_CHAT_TITLE,
      messages: [],
      createdAt: now,
      updatedAt: now,
      status: "idle",
    };
    runInAction(() => {
      this.chats.push(chat);
      this.openIds.push(chat.id);
      this.activeId = chat.id;
    });
    this.persist();
    return chat.id;
  }

  /** Focus an existing chat, adding it to the tab strip if it isn't open. */
  openChat(id: string): void {
    if (this.get(id) === undefined) return;
    runInAction(() => {
      if (!this.openIds.includes(id)) this.openIds.push(id);
      this.activeId = id;
      this.unreadIds = this.unreadIds.filter((x) => x !== id);
    });
  }

  /** Remove a tab without deleting the chat (history keeps it). */
  closeTab(id: string): void {
    runInAction(() => {
      const index = this.openIds.indexOf(id);
      if (index < 0) return;
      this.openIds.splice(index, 1);
      if (this.activeId === id) {
        this.activeId = this.openIds[Math.min(index, this.openIds.length - 1)] ?? null;
      }
    });
  }

  rename(id: string, title: string): void {
    const chat = this.get(id);
    if (chat === undefined) return;
    const next = title.trim();
    if (next === "") return;
    runInAction(() => {
      chat.title = next;
      chat.updatedAt = new Date().toISOString();
    });
    this.persist();
  }

  delete(id: string): void {
    this.cancel(id);
    runInAction(() => {
      this.chats = this.chats.filter((chat) => chat.id !== id);
      this.openIds = this.openIds.filter((x) => x !== id);
      this.unreadIds = this.unreadIds.filter((x) => x !== id);
      if (this.activeId === id) this.activeId = this.openIds[0] ?? null;
    });
    this.persist();
  }

  markRead(id: string): void {
    if (!this.unreadIds.includes(id)) return;
    runInAction(() => {
      this.unreadIds = this.unreadIds.filter((x) => x !== id);
    });
  }

  /* ---------------- the run ---------------- */

  /**
   * Optimistic user append → adapter stream → agent message.
   * The agent message is inserted empty and filled by `onDelta`, so the
   * transcript renders a real streaming cursor. Cancelling keeps whatever
   * streamed (matching "stop" semantics, §21) and any actions already applied
   * — the adapter performs its writes before it starts talking.
   */
  async sendMessage(
    chatId: string,
    text: string,
    adapter: AgentAdapter,
    context?: AgentContext,
  ): Promise<void> {
    const chat = this.get(chatId);
    const body = text.trim();
    if (chat === undefined || body === "" || chat.status === "working") return;

    const now = new Date().toISOString();
    const userMessage: AgentMessage = {
      id: newId(),
      role: "user",
      text: body,
      actions: [],
      createdAt: now,
    };
    const agentMessage: AgentMessage = {
      id: newId(),
      role: "agent",
      text: "",
      actions: [],
      createdAt: now,
    };

    // The array is a deep observable: push() stores PROXIES, so the streaming
    // writes below must target the read-back reference, not the literal.
    let live: AgentMessage = agentMessage;
    runInAction(() => {
      chat.messages.push(userMessage, agentMessage);
      live = chat.messages[chat.messages.length - 1];
      if (chat.title === NEW_CHAT_TITLE) chat.title = titleFromText(body);
      chat.status = "working";
      chat.updatedAt = now;
    });
    this.persist();

    const controller = new AbortController();
    this.#runs.set(chatId, controller);

    try {
      const result = await adapter.send(
        { text: body, context },
        (chunk) => {
          runInAction(() => {
            live.text += chunk;
          });
        },
        controller.signal,
      );
      runInAction(() => {
        // The streamed text and the result agree; assign once so a partial
        // last token can never linger.
        live.text = result.text;
        live.actions = result.actions;
      });
    } catch (error) {
      if (!isAgentAbortError(error)) {
        runInAction(() => {
          live.text =
            live.text === ""
              ? "Something went wrong while running that. Try again."
              : `${live.text}\n\n_(run failed)_`;
        });
      }
    } finally {
      this.#runs.delete(chatId);
      runInAction(() => {
        chat.status = "idle";
        chat.updatedAt = new Date().toISOString();
        if (this.activeId !== chatId && !this.unreadIds.includes(chatId)) {
          this.unreadIds.push(chatId);
        }
      });
      this.persist();
    }
  }

  /** Stop button / Escape — aborts the in-flight run for this chat. */
  cancel(chatId: string): void {
    this.#runs.get(chatId)?.abort();
  }
}

/* ================================================================
 * Singleton + hook
 * ================================================================ */

let instance: AgentChatStore | null = null;

/** Shared across the page, the toolbar tabs and the agent panel. */
export function getAgentChats(): AgentChatStore {
  if (instance === null) instance = new AgentChatStore();
  return instance;
}

export function useAgentChats(): AgentChatStore {
  const [store] = useState(getAgentChats);
  useEffect(() => {
    store.hydrate();
  }, [store]);
  return store;
}
