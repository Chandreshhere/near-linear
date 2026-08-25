"use client";

/**
 * Onboarding steps 2 and 3 — Profile and Newsletter (CAPTURED:
 * capture-inbox-welcome-to-linear.md §6, MASTER_PROMPT §17.3).
 *
 * Both write straight into the local-first pool through the transaction queue
 * (the same optimistic path every other edit takes): name, avatar and `title`
 * land on the `User` row, the newsletter answer on
 * `UserSettings.newsletterOptIn`. Both fields arrived with SCHEMA_VERSION 7 —
 * there is no localStorage side-channel here.
 *
 * Requires a DataProvider, which the shell mounts for the workspace created in
 * step 1.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { observer } from "mobx-react-lite";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Toggle } from "@/components/ui/Toggle";
import { PersonGlyph, UploadGlyph } from "@/app/(app)/login/glyphs";
import { useStore, useSyncClient } from "@/lib/data/DataProvider";
import { CURRENT_USER_ID } from "@/lib/issues/viewPrefs";
import { fileToAvatarDataUrl, initialsFor } from "@/lib/auth/profile";
import styles from "./onboarding.module.css";

export const ProfileStep = observer(function ProfileStep({
  step,
  onNext,
  onSkip,
}: {
  step: "profile" | "newsletter";
  onNext: () => void;
  onSkip: () => void;
}) {
  const client = useSyncClient();
  const store = useStore();
  const user = store.get("User", CURRENT_USER_ID);
  const settings = store.get("UserSettings", CURRENT_USER_ID);

  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [newsletter, setNewsletter] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  // Seed the fields once the pool has hydrated. A brand-new workspace stores
  // the login email in `name`, so only a real display name is offered back.
  useEffect(() => {
    if (hydrated || user === undefined) return;
    setHydrated(true);
    if (!user.name.includes("@")) setName(user.name);
    if (user.avatarUrl !== undefined) setAvatarUrl(user.avatarUrl);
    if (user.title !== undefined) setTitle(user.title);
    if (settings?.newsletterOptIn !== undefined) {
      setNewsletter(settings.newsletterOptIn);
    }
  }, [hydrated, user, settings]);

  const saveProfile = useCallback(() => {
    const trimmedName = name.trim();
    const trimmedTitle = title.trim();

    const fields: Record<string, unknown> = {};
    if (trimmedName !== "") {
      fields.name = trimmedName;
      fields.displayName = trimmedName;
      fields.initials = initialsFor(trimmedName);
    }
    if (avatarUrl !== undefined && avatarUrl !== user?.avatarUrl) {
      fields.avatarUrl = avatarUrl;
    }
    if (trimmedTitle !== (user?.title ?? "")) {
      // Wire `null` clears the field (JSON cannot carry undefined).
      fields.title = trimmedTitle === "" ? null : trimmedTitle;
    }
    if (Object.keys(fields).length > 0) {
      client.queue.enqueue("update", "User", CURRENT_USER_ID, fields);
    }

    // A real name is now on the row, so display names should use it.
    if (trimmedName !== "" && store.get("UserSettings", CURRENT_USER_ID) !== undefined) {
      client.queue.enqueue("update", "UserSettings", CURRENT_USER_ID, {
        displayFullNames: true,
      });
    }
  }, [avatarUrl, client, name, store, title, user?.avatarUrl, user?.title]);

  const saveNewsletter = useCallback(
    (optIn: boolean) => {
      if (store.get("UserSettings", CURRENT_USER_ID) === undefined) return;
      client.queue.enqueue("update", "UserSettings", CURRENT_USER_ID, {
        newsletterOptIn: optIn,
      });
    },
    [client, store],
  );

  const onContinue = () => {
    if (step === "profile") saveProfile();
    if (step === "newsletter") saveNewsletter(newsletter);
    onNext();
  };

  const onSkipStep = () => {
    if (step === "newsletter") saveNewsletter(false);
    onSkip();
  };

  return (
    <>
      {step === "profile" ? (
        <>
          <header className={styles.heading}>
            <h1 className={styles.title}>Set up your profile</h1>
            <span className={styles.subtitle}>Choose how you&rsquo;ll appear</span>
          </header>

          <div className={styles.form}>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="onboarding-name">
                Name &amp; picture
              </label>
              <div className={styles.nameRow}>
                <AvatarDropzone
                  value={avatarUrl}
                  onChange={(url) => {
                    setAvatarUrl(url);
                    setAvatarError("");
                  }}
                  onError={setAvatarError}
                />
                <Input
                  id="onboarding-name"
                  className={styles.nameInput}
                  autoComplete="off"
                  maxLength={48}
                  placeholder="Enter your name…"
                  value={name}
                  onChange={(e) => setName(e.currentTarget.value)}
                />
              </div>
              {avatarError !== "" ? (
                <span className={styles.optionDescription} role="alert">
                  {avatarError}
                </span>
              ) : null}
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="onboarding-title">
                Title
              </label>
              <Input
                id="onboarding-title"
                autoComplete="off"
                maxLength={128}
                placeholder="Software engineer"
                value={title}
                onChange={(e) => setTitle(e.currentTarget.value)}
              />
            </div>
          </div>
        </>
      ) : (
        <>
          <header className={styles.heading}>
            <h1 className={styles.title}>Stay in the loop</h1>
            <span className={styles.subtitle}>
              Changelog highlights and product updates, about once a month
            </span>
          </header>

          <div className={styles.form}>
            <div className={styles.field}>
              <span className={styles.fieldLabel} id="newsletter-label">
                Email updates
              </span>
              <div className={styles.optionRow}>
                <span className={styles.optionText}>
                  <span className={styles.optionLabel}>
                    Send me the product newsletter
                  </span>
                  <span className={styles.optionDescription}>
                    You can change this any time in Settings &rarr; Notifications.
                  </span>
                </span>
                <Toggle
                  checked={newsletter}
                  onChange={setNewsletter}
                  aria-label="Send me the product newsletter"
                />
              </div>
            </div>
          </div>
        </>
      )}

      <div className={styles.actions}>
        <Button variant="ghost" size={44} onClick={onSkipStep}>
          Skip
        </Button>
        <Button variant="primary" size={44} onClick={onContinue}>
          Continue
        </Button>
      </div>
    </>
  );
});

const MAX_AVATAR_BYTES = 8_000_000;

/** 44px circular dropzone (CAPTURED §6b) — click, keyboard, or drop a file. */
function AvatarDropzone({
  value,
  onChange,
  onError,
}: {
  value: string | undefined;
  onChange: (dataUrl: string) => void;
  onError: (message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const accept = useCallback(
    async (file: File | undefined) => {
      if (file === undefined) return;
      if (!file.type.startsWith("image/")) {
        onError("Choose an image file.");
        return;
      }
      if (file.size > MAX_AVATAR_BYTES) {
        onError("That image is larger than 8 MB.");
        return;
      }
      try {
        onChange(await fileToAvatarDataUrl(file));
      } catch {
        onError("That image could not be read.");
      }
    },
    [onChange, onError],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload profile photo"
      className={styles.dropzone}
      data-dragging={dragging ? "true" : undefined}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void accept(e.dataTransfer.files[0]);
      }}
    >
      {value !== undefined ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.dropzoneImage} src={value} alt="" draggable={false} />
      ) : (
        <span className={styles.dropzoneGlyph}>
          <PersonGlyph />
        </span>
      )}
      <span className={styles.dropzoneOverlay}>
        <UploadGlyph />
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        tabIndex={-1}
        aria-label="Profile photo"
        className={styles.fileInput}
        onChange={(e) => {
          void accept(e.currentTarget.files?.[0]);
          e.currentTarget.value = "";
        }}
      />
    </div>
  );
}
