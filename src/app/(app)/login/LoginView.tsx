"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { writeSession, type LoginMethod } from "@/lib/auth/session";
import {
  ArrowLeftGlyph,
  MailGlyph,
  PasskeyGlyph,
  ProductMark,
  ProviderGlyph,
  ShieldGlyph,
} from "./glyphs";
import styles from "./login.module.css";

/**
 * Login (MASTER_PROMPT §17.1 + research-nav-auth.md §1 — DOCUMENTED methods).
 *
 * Three states: the method list → the email form → the "Enter code" form.
 * There is no auth server in this build; every path resolves locally through
 * src/lib/auth/session.ts, which carries the backend seams.
 *
 * The three federated methods (Google, passkey, SAML) cannot be completed
 * honestly without an identity provider, so each one opens a dialog that
 * names the exact handshake it would run, then offers to continue into the
 * workspace as the seeded user. No button is dead and nothing pretends a
 * provider answered.
 */

type Stage = "methods" | "email" | "code";

const CODE_LENGTH = 6;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* ================================================================
 * Identity-provider explainer (Google / passkey / SAML)
 * ================================================================ */

interface ProviderSeam {
  method: Exclude<LoginMethod, "email">;
  title: string;
  /** The handshake, in the user's words. */
  summary: string;
  /** The request sequence a real deployment runs — shown verbatim. */
  steps: string[];
}

const PROVIDER_SEAMS: Record<Exclude<LoginMethod, "email">, ProviderSeam> = {
  google: {
    method: "google",
    title: "Connect your identity provider",
    summary:
      "Continuing with Google hands the browser to Google's consent screen and trusts the code it sends back. That exchange needs a registered OAuth client and a server that holds its secret — neither exists in this build.",
    steps: [
      "Redirect to accounts.google.com with the workspace client_id and a PKCE challenge",
      "Google returns an authorization code to /auth/google/callback",
      "The server exchanges the code for tokens and sets an httpOnly session cookie",
    ],
  },
  passkey: {
    method: "passkey",
    title: "Connect your identity provider",
    summary:
      "A passkey proves you hold a private key stored by this device. The proof is only meaningful against a challenge the server generated and remembers, so passkey sign-in cannot be completed locally.",
    steps: [
      "GET /auth/passkey/challenge for a fresh, single-use challenge",
      "navigator.credentials.get() signs it with the device passkey",
      "POST /auth/passkey/verify checks the signature against the stored credential",
    ],
  },
  saml: {
    method: "saml",
    title: "Connect your identity provider",
    summary:
      "SAML single sign-on sends you to your organisation's own identity provider and trusts the signed assertion it returns. Verifying that signature needs the IdP metadata a workspace admin uploads.",
    steps: [
      "Look the email domain up in the workspace's configured SAML connections",
      "Redirect to the IdP's SSO URL with a signed AuthnRequest",
      "The IdP POSTs a signed assertion back to /auth/saml/acs, which starts the session",
    ],
  },
};

function ProviderDialog({
  seam,
  onClose,
  onContinue,
}: {
  seam: ProviderSeam | null;
  onClose: () => void;
  onContinue: (method: Exclude<LoginMethod, "email">) => void;
}) {
  return (
    <Dialog
      open={seam !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      width={460}
      label={seam?.title ?? "Connect your identity provider"}
    >
      {seam === null ? null : (
        <div className={styles.providerDialog}>
          <h2 className={styles.providerTitle}>{seam.title}</h2>
          <p className={styles.providerBody}>{seam.summary}</p>

          <h3 className={styles.providerStepsTitle}>
            What a connected workspace would do
          </h3>
          <ol className={styles.providerSteps}>
            {seam.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>

          <p className={styles.providerNote}>
            Continue below to open the workspace as the seeded account. Your
            session is recorded locally and Settings → Security will show it as
            a {seam.method === "saml" ? "SAML SSO" : seam.method} sign-in.
          </p>

          <div className={styles.providerActions}>
            <Button size={32} onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size={32}
              onClick={() => onContinue(seam.method)}
            >
              Continue to workspace
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

/* ================================================================
 * Privacy / Terms — real content, not a dead anchor
 * ================================================================ */

const LEGAL: Record<"privacy" | "terms", { title: string; paragraphs: string[] }> = {
  privacy: {
    title: "Privacy",
    paragraphs: [
      "This is a local-first reconstruction. Every issue, project, comment and setting you create lives in this browser — IndexedDB for the workspace data, localStorage for the session and personal preferences.",
      "Nothing is transmitted anywhere. There is no analytics script, no error reporter and no auth server; the sign-in screen resolves locally and records only which method you picked and when.",
      "Clearing this site's data removes everything, permanently and immediately. Opening the app in a different browser or profile gives you a fresh copy of the seed workspace.",
    ],
  },
  terms: {
    title: "Terms",
    paragraphs: [
      "This build is a study reconstruction of an issue tracker's interface, made for evaluating layout, interaction and keyboard behaviour. It is not affiliated with, endorsed by, or connected to any company whose product it resembles.",
      "It is provided as-is, with no warranty and no availability guarantee. Because all data is stored in your browser, treat it as scratch space — do not keep anything here you cannot afford to lose.",
      "Every name, avatar and issue in the seed workspace is fictional sample content.",
    ],
  },
};

function LegalDialog({
  page,
  onClose,
}: {
  page: "privacy" | "terms" | null;
  onClose: () => void;
}) {
  const content = page === null ? null : LEGAL[page];
  return (
    <Dialog
      open={page !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      width={480}
      label={content?.title ?? "Legal"}
    >
      {content === null ? null : (
        <div className={styles.providerDialog}>
          <h2 className={styles.providerTitle}>{content.title}</h2>
          {content.paragraphs.map((paragraph) => (
            <p key={paragraph} className={styles.providerBody}>
              {paragraph}
            </p>
          ))}
          <div className={styles.providerActions}>
            <Button variant="primary" size={32} onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

export function LoginView() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("methods");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState<string[]>(() => Array<string>(CODE_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [resentAt, setResentAt] = useState<number | null>(null);
  const [provider, setProvider] = useState<ProviderSeam | null>(null);
  const [legal, setLegal] = useState<"privacy" | "terms" | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  /**
   * Every successful method lands here. Where to go next depends on what this
   * browser already has (a workspace? none at all?), which only `/app` can
   * answer — see src/app/(app)/app/AppEntryView.tsx. Nothing here may assume a
   * workspace exists.
   */
  const completeLogin = useCallback(
    (method: LoginMethod, address?: string) => {
      writeSession(method, address);
      router.push("/app");
    },
    [router],
  );

  useEffect(() => {
    if (stage === "email") emailRef.current?.focus();
    if (stage === "code") codeRefs.current[0]?.focus();
  }, [stage]);

  const submitEmail = (event: React.FormEvent) => {
    event.preventDefault();
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setError("");
    // BACKEND SEAM (session.ts §1): POST /auth/email → the server mails the
    // magic link + one-time code. Delivering mail is the only server-only
    // part of this step; everything after it is real UI below.
    setCode(Array<string>(CODE_LENGTH).fill(""));
    setStage("code");
  };

  const setDigit = (index: number, value: string) => {
    setCode((prev) => {
      const next = prev.slice();
      next[index] = value;
      return next;
    });
  };

  const onDigitChange = (index: number, raw: string) => {
    let digits = raw.replace(/\D/g, "");
    const current = code[index] ?? "";
    // Typing into a filled box appends — drop the character already stored.
    if (digits.length > 1 && current !== "" && digits.startsWith(current)) {
      digits = digits.slice(1);
    }
    if (digits === "") {
      setDigit(index, "");
      return;
    }
    // Typing or pasting: spread the characters across the remaining boxes.
    setCode((prev) => {
      const next = prev.slice();
      for (let i = 0; i < digits.length && index + i < CODE_LENGTH; i++) {
        next[index + i] = digits[i] ?? "";
      }
      return next;
    });
    setError("");
    const landed = Math.min(index + digits.length, CODE_LENGTH - 1);
    codeRefs.current[landed]?.focus();
  };

  const onDigitKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && (code[index] ?? "") === "" && index > 0) {
      event.preventDefault();
      setDigit(index - 1, "");
      codeRefs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      codeRefs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      event.preventDefault();
      codeRefs.current[index + 1]?.focus();
    }
  };

  const onCodePaste = (index: number, event: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "");
    if (pasted === "") return;
    event.preventDefault();
    onDigitChange(index, pasted);
  };

  const submitCode = (event: React.FormEvent) => {
    event.preventDefault();
    const value = code.join("");
    if (value.length !== CODE_LENGTH) {
      setError(`Enter all ${CODE_LENGTH} digits.`);
      return;
    }
    // BACKEND SEAM (session.ts §2): POST /auth/email/verify is what rejects a
    // wrong code — the code was never generated here, so there is nothing
    // local to compare against and any six digits continue (said so below).
    completeLogin("email", email.trim());
  };

  const backToMethods = () => {
    setStage("methods");
    setError("");
    setResentAt(null);
  };

  return (
    <div className={styles.ground}>
      {/* Skip-link target. `/login` renders outside AppShell, which is where
          the app's #skip-nav lives — without one here the layout's "Skip to
          content" link had nothing to jump to on this route. */}
      <div id="skip-nav" tabIndex={-1} />
      <div className={styles.column}>
        <span className={styles.mark}>
          <ProductMark size={32} />
        </span>

        {stage === "methods" ? (
          <>
            <h1 className={styles.title}>Log in to your workspace</h1>
            <div className={styles.methods}>
              <MethodButton
                glyph={<ProviderGlyph />}
                label="Continue with Google"
                onClick={() => setProvider(PROVIDER_SEAMS.google)}
              />
              <MethodButton
                glyph={<MailGlyph />}
                label="Continue with Email"
                onClick={() => setStage("email")}
              />
              <MethodButton
                glyph={<PasskeyGlyph />}
                label="Continue with passkey"
                onClick={() => setProvider(PROVIDER_SEAMS.passkey)}
              />
              <MethodButton
                glyph={<ShieldGlyph />}
                label="Continue with SAML SSO"
                onClick={() => setProvider(PROVIDER_SEAMS.saml)}
              />
            </div>
            <p className={styles.seam} style={{ marginTop: 20 }}>
              Demo build — no authentication server is connected. Every method
              explains what it would do, then opens the seeded workspace.
            </p>
          </>
        ) : null}

        {stage === "email" ? (
          <>
            <h1 className={styles.title}>Log in with email</h1>
            <form className={styles.form} onSubmit={submitEmail} noValidate>
              <label className={styles.fieldLabel} htmlFor="login-email">
                Email address
              </label>
              <Input
                id="login-email"
                ref={emailRef}
                type="email"
                name="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.currentTarget.value);
                  setError("");
                }}
              />
              <p className={styles.error} role="alert">
                {error}
              </p>
              <Button
                type="submit"
                variant="primary"
                size={44}
                className={styles.submit}
              >
                Continue
              </Button>
            </form>
            <div className={styles.actions}>
              <button type="button" className={styles.linkButton} onClick={backToMethods}>
                <ArrowLeftGlyph size={14} />
                Back
              </button>
            </div>
          </>
        ) : null}

        {stage === "code" ? (
          <>
            <h1 className={styles.title}>Enter code</h1>
            <form className={styles.form} onSubmit={submitCode}>
              <p className={styles.hint}>
                We sent a login code to{" "}
                <span className={styles.hintStrong}>{email.trim()}</span>. Paste it
                below, or open the link in the email.
              </p>
              <div
                className={styles.codeRow}
                role="group"
                aria-label={`Login code, ${CODE_LENGTH} digits`}
              >
                {code.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(el) => {
                      codeRefs.current[index] = el;
                    }}
                    className={styles.codeInput}
                    aria-label={`Digit ${index + 1} of ${CODE_LENGTH}`}
                    inputMode="numeric"
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    maxLength={1}
                    value={digit}
                    onChange={(e) => onDigitChange(index, e.currentTarget.value)}
                    onKeyDown={(e) => onDigitKeyDown(index, e)}
                    onPaste={(e) => onCodePaste(index, e)}
                    onFocus={(e) => e.currentTarget.select()}
                  />
                ))}
              </div>
              <p className={styles.error} role="alert">
                {error}
              </p>
              <Button
                type="submit"
                variant="primary"
                size={44}
                className={styles.submit}
              >
                Continue
              </Button>
            </form>
            <div className={styles.actions}>
              <button type="button" className={styles.linkButton} onClick={() => setStage("email")}>
                <ArrowLeftGlyph size={14} />
                Back
              </button>
              <span className={styles.divider} aria-hidden="true" />
              <button
                type="button"
                className={styles.linkButton}
                onClick={() => {
                  // BACKEND SEAM (session.ts §1): re-POST /auth/email. With no
                  // mail server the honest feedback is the live region below,
                  // which says a new code was requested and that any six
                  // digits continue.
                  setResentAt(Date.now());
                }}
              >
                Resend
              </button>
            </div>
            <p className={styles.seam} style={{ marginTop: 12 }} aria-live="polite">
              {resentAt === null
                ? "No mail server is connected — any 6 digits will continue."
                : "Code re-sent. Any 6 digits will continue in this demo build."}
            </p>
          </>
        ) : null}
      </div>

      <footer className={styles.footer}>
        <button
          type="button"
          className={styles.footerLink}
          onClick={() => setLegal("privacy")}
        >
          Privacy
        </button>
        <button
          type="button"
          className={styles.footerLink}
          onClick={() => setLegal("terms")}
        >
          Terms
        </button>
      </footer>

      <ProviderDialog
        seam={provider}
        onClose={() => setProvider(null)}
        onContinue={(method) => {
          setProvider(null);
          completeLogin(method);
        }}
      />
      <LegalDialog page={legal} onClose={() => setLegal(null)} />
    </div>
  );
}

function MethodButton({
  glyph,
  label,
  onClick,
}: {
  glyph: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      variant="secondary"
      size={44}
      className={styles.method}
      onClick={onClick}
      icon={<span className={styles.methodGlyph}>{glyph}</span>}
    >
      {label}
    </Button>
  );
}
