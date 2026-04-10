"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { Check, Clock, Copy, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ErrorCard } from "@/components/ErrorCard";
import { GrowLogo } from "@/components/GrowLogo";
import { Input } from "@/components/Input";
import { LoadingPulse } from "@/components/LoadingPulse";
import { getTelegramId, syncSessionCookie } from "@/lib/client";
import { initTelegramWebApp } from "@/lib/telegram";
import { formatAddress, isValidStellarPublicKey } from "@/lib/stellar";
import { animateVerificationCelebration, prefersReducedMotion } from "@/lib/animations";
import { useCopyToClipboard } from "@/lib/use-copy-to-clipboard";

const SESSION_UPDATE_EVENT = "stellargrow:session-update";

const COPY_ID_MEMO = "memo-wallet";
const COPY_ID_CODE = "verification-code";
const COPY_ID_LINKED = "linked-address";

function dispatchSessionUpdate() {
  syncSessionCookie();
  window.dispatchEvent(new Event(SESSION_UPDATE_EVENT));
}

type UserRow = {
  publicKey: string;
  isVerified: boolean;
  verificationCode: string;
  memoWallet: string;
  verificationExpiry: string;
};

export default function WalletPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserRow | null>(null);
  const [publicKey, setPublicKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [streamStatus, setStreamStatus] = useState<"listening" | "verified">("listening");
  const [streamError, setStreamError] = useState("");
  const [stepFill, setStepFill] = useState(0);
  const [checkBusy, setCheckBusy] = useState(false);
  const [checkMessage, setCheckMessage] = useState("");
  const [changeAddressMode, setChangeAddressMode] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [accountError, setAccountError] = useState("");
  const stepBarRef = useRef<HTMLDivElement>(null);
  const celebrateIconRef = useRef<HTMLDivElement>(null);
  const rippleRef = useRef<HTMLDivElement>(null);
  const prevVerifyPublicKey = useRef<string | undefined>(undefined);
  const { lastCopiedId, copy: copyWithFeedback } = useCopyToClipboard();

  const loadUser = useCallback((): Promise<void> => {
    const telegramId = getTelegramId();
    if (!telegramId) {
      setUser(null);
      setLoading(false);
      return Promise.resolve();
    }
    return fetch(`/api/user?telegramId=${encodeURIComponent(telegramId)}`)
      .then((r) => {
        if (r.status === 404) {
          setUser(null);
          setLoading(false);
          return null;
        }
        return r.json();
      })
      .then((data: UserRow | null) => {
        if (!data) return;
        setUser(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => loadUser(), 0);
    return () => window.clearTimeout(t);
  }, [loadUser]);

  useLayoutEffect(() => {
    const bar = stepBarRef.current;
    if (!bar || !user || user.isVerified) return;
    if (prefersReducedMotion()) {
      gsap.set(bar, { width: `${stepFill}%` });
      return;
    }
    gsap.to(bar, {
      width: `${stepFill}%`,
      duration: 0.45,
      ease: "power2.out",
    });
  }, [stepFill, user]);

  useEffect(() => {
    if (!user || user.isVerified) return;
    const t0 = window.setTimeout(() => setStepFill(33), 0);
    const t1 = window.setTimeout(() => setStepFill(66), 800);
    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
    };
  }, [user]);

  useEffect(() => {
    if (!user || user.isVerified) return;
    const pk = user.publicKey;
    if (prevVerifyPublicKey.current === pk) return;
    prevVerifyPublicKey.current = pk;
    setStreamStatus("listening");
    setStepFill(0);
    setStreamError("");
    setCheckMessage("");
  }, [user?.publicKey, user?.isVerified]);

  useEffect(() => {
    if (!user || user.isVerified) return;
    const es = new EventSource("/api/verify/stream");
    es.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as {
          status: string;
          message?: string;
        };
        if (msg.status === "listening") setStreamStatus("listening");
        if (msg.status === "verified") {
          setStreamStatus("verified");
          setStepFill(100);
          setCheckMessage("");
          dispatchSessionUpdate();
          window.setTimeout(() => loadUser(), 600);
          es.close();
        }
        if (msg.status === "error" && msg.message) setStreamError(msg.message);
        if (msg.status === "timeout") setStreamError("Still waiting — check your memo and try again.");
      } catch {
        /* ignore */
      }
    };
    es.onerror = () => {
      es.close();
    };
    return () => es.close();
  }, [user, loadUser]);

  useEffect(() => {
    if (streamStatus !== "verified") return;
    const id = requestAnimationFrame(() => {
      animateVerificationCelebration(celebrateIconRef.current, rippleRef.current);
    });
    return () => cancelAnimationFrame(id);
  }, [streamStatus]);

  const trimmed = publicKey.trim();
  const len = trimmed.length;
  const invalid56 = len === 56 && !isValidStellarPublicKey(trimmed);
  const valid56 = len === 56 && isValidStellarPublicKey(trimmed);

  const submitPublicKey = async () => {
    setError("");
    if (!valid56) {
      setError(len === 56 ? "Invalid public key format" : "Enter a valid 56-character public key.");
      return;
    }
    initTelegramWebApp();
    const telegramId = getTelegramId();
    if (!telegramId) {
      setError("Open this app from Telegram to continue.");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramId, publicKey: trimmed }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.message || "Could not add wallet.");
      return;
    }
    setChangeAddressMode(false);
    setPublicKey("");
    dispatchSessionUpdate();
    await loadUser();
  };

  const deleteAccount = async () => {
    setAccountError("");
    if (typeof window === "undefined") return;
    if (
      !window.confirm(
        "Remove this wallet from StellarGrow? All portfolio data will be deleted. You must add a wallet again to use the app. This cannot be undone.",
      )
    ) {
      return;
    }
    initTelegramWebApp();
    const telegramId = getTelegramId();
    if (!telegramId) {
      setAccountError("Open this app from Telegram to continue.");
      return;
    }
    setDeleteBusy(true);
    const res = await fetch("/api/account/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramId }),
    });
    setDeleteBusy(false);
    if (!res.ok) {
      const data = (await res.json()) as { message?: string };
      setAccountError(data.message || "Could not remove account.");
      return;
    }
    setUser(null);
    dispatchSessionUpdate();
    router.replace("/wallet");
    loadUser();
  };

  const checkNow = async () => {
    setCheckMessage("");
    setStreamError("");
    initTelegramWebApp();
    const telegramId = getTelegramId();
    if (!telegramId) {
      setCheckMessage("Open this app from Telegram to continue.");
      return;
    }
    setCheckBusy(true);
    const res = await fetch("/api/verify/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramId }),
    });
    const data = (await res.json()) as {
      success?: boolean;
      verified?: boolean;
      message?: string;
    };
    setCheckBusy(false);
    if (data.verified) {
      setStreamStatus("verified");
      setStepFill(100);
      dispatchSessionUpdate();
      window.setTimeout(() => loadUser(), 400);
      return;
    }
    if (!res.ok) {
      setCheckMessage(data.message || "Check failed.");
      return;
    }
    setCheckMessage(data.message || "Not found yet — try again in a few seconds.");
  };

  if (loading) {
    return <LoadingPulse label="Checking Stellar network..." />;
  }

  if (!user) {
    return (
      <section className="flex flex-col items-center px-2 py-8" data-page-child>
        <div data-page-child className="mb-8">
          <GrowLogo className="mx-auto" />
        </div>
        <Card className="w-full max-w-sm space-y-4" data-page-child>
          <div className="space-y-2">
            <label htmlFor="pk" className="sg-text-sm font-medium text-[var(--text-secondary)]">
              Your Stellar public key
            </label>
            <Input
              id="pk"
              value={publicKey}
              onChange={(e) => setPublicKey(e.target.value)}
              placeholder="G... (56 characters)"
              showValid={valid56}
              error={invalid56}
              autoComplete="off"
              spellCheck={false}
            />
            {invalid56 ? (
              <p className="sg-text-sm text-[var(--error)]">Invalid public key format</p>
            ) : null}
          </div>
          <Button block variant="primary" onClick={submitPublicKey} disabled={submitting || !valid56}>
            Add Wallet
          </Button>
          <p className="sg-text-xs text-center text-[var(--text-muted)]">
            We never ask for your secret key
          </p>
        </Card>
        {submitting ? <LoadingPulse label="Saving wallet..." /> : null}
        {error ? (
          <div className="mt-4 w-full max-w-sm" data-page-child>
            <ErrorCard text={error} />
          </div>
        ) : null}
      </section>
    );
  }

  if (user.isVerified && changeAddressMode) {
    return (
      <section className="space-y-5 pb-4" data-page-child>
        <Card className="space-y-4" data-page-child>
          <div className="space-y-1">
            <p className="sg-text-md font-semibold text-[var(--text-primary)]">New Stellar address</p>
            <p className="sg-text-sm text-[var(--text-secondary)]">
              After saving, you will verify again with 0.01 XLM to the memo wallet.
            </p>
          </div>
          <div className="space-y-2">
            <label htmlFor="pk2" className="sg-text-sm font-medium text-[var(--text-secondary)]">
              Public key
            </label>
            <Input
              id="pk2"
              value={publicKey}
              onChange={(e) => setPublicKey(e.target.value)}
              placeholder="G... (56 characters)"
              showValid={valid56}
              error={invalid56}
              autoComplete="off"
              spellCheck={false}
            />
            {invalid56 ? (
              <p className="sg-text-sm text-[var(--error)]">Invalid public key format</p>
            ) : null}
          </div>
          <Button block variant="primary" onClick={submitPublicKey} disabled={submitting || !valid56}>
            Save and start verification
          </Button>
          <Button
            block
            variant="secondary"
            type="button"
            onClick={() => {
              setChangeAddressMode(false);
              setPublicKey("");
              setError("");
            }}
          >
            Cancel
          </Button>
        </Card>
        {error ? <ErrorCard text={error} /> : null}
        {submitting ? <LoadingPulse label="Saving..." /> : null}
      </section>
    );
  }

  if (user.isVerified) {
    return (
      <section className="space-y-5 pb-4" data-page-child>
        <Card className="space-y-4" data-page-child>
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 shrink-0 text-[var(--success)]" size={22} aria-hidden />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="sg-text-md font-semibold text-[var(--text-primary)]">Wallet linked</p>
              <p className="sg-mono sg-text-sm break-all text-[var(--text-secondary)]">{user.publicKey}</p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className={
                  lastCopiedId === COPY_ID_LINKED
                    ? "border-[var(--success)] text-[var(--success)]"
                    : ""
                }
                aria-label={
                  lastCopiedId === COPY_ID_LINKED
                    ? "Address copied to clipboard"
                    : "Copy Stellar address"
                }
                onClick={() => copyWithFeedback(COPY_ID_LINKED, user.publicKey)}
              >
                {lastCopiedId === COPY_ID_LINKED ? (
                  <>
                    <Check size={16} aria-hidden />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={16} aria-hidden />
                    <span>Copy address</span>
                  </>
                )}
              </Button>
            </div>
          </div>
          <p className="sg-text-sm text-[var(--text-muted)]">
            You can link a different Stellar address any time. Doing so will require a new 0.01 XLM verification.
          </p>
          <Button type="button" variant="secondary" block onClick={() => setChangeAddressMode(true)}>
            Link a different Stellar address
          </Button>
        </Card>

        <Card className="space-y-3 border-[var(--error)] bg-[var(--background-secondary)]" data-page-child>
          <p className="sg-text-sm font-medium text-[var(--text-primary)]">Danger zone</p>
          <p className="sg-text-sm text-[var(--text-secondary)]">
            Deleting removes your Stellar link and all investments from this app. If you register again with a new
            address, you start with a clean portfolio.
          </p>
          <Button
            type="button"
            variant="destructive"
            block
            disabled={deleteBusy}
            onClick={deleteAccount}
          >
            <Trash2 size={16} aria-hidden />
            <span>{deleteBusy ? "Removing…" : "Remove wallet from app"}</span>
          </Button>
          {accountError ? <ErrorCard text={accountError} /> : null}
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-5 pb-4" data-page-child>
      <Card className="relative overflow-hidden" data-page-child>
        <div className="relative z-10 flex items-start gap-3">
          <ShieldAlert className="mt-0.5 shrink-0 text-[var(--warning)]" size={22} aria-hidden />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="sg-text-md font-semibold text-[var(--text-primary)]">Verify wallet</p>
            <p className="sg-mono sg-text-sm text-[var(--text-secondary)]">
              {formatAddress(user.publicKey)}
            </p>
          </div>
        </div>
        <div
          ref={rippleRef}
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-full)] border-2 border-[var(--accent-green)] opacity-0"
          style={{ width: 120, height: 120 }}
          aria-hidden
        />
      </Card>

      <Card className="space-y-4" data-page-child>
        <div className="space-y-2">
          <div className="h-2 w-full overflow-hidden rounded-[var(--radius-sm)] bg-[var(--border)]">
            <div
              ref={stepBarRef}
              className="h-full rounded-[var(--radius-sm)] bg-[var(--accent-green)]"
              style={{ width: "0%" }}
            />
          </div>
          <ol className="sg-text-sm list-decimal space-y-2 pl-4 text-[var(--text-secondary)]">
            <li>Open Lobstr or Solar wallet</li>
            <li>Send 0.01 XLM to the memo wallet with your memo code</li>
            <li>Verification confirms automatically, or tap “Check now” below</li>
          </ol>
        </div>

        <Button
          type="button"
          variant="secondary"
          block
          disabled={checkBusy || streamStatus === "verified"}
          onClick={checkNow}
        >
          {checkBusy ? (
            <span>Checking Horizon…</span>
          ) : (
            <span>I’ve sent 0.01 XLM — check now</span>
          )}
        </Button>
        {checkMessage ? (
          <p className="sg-text-sm text-[var(--text-secondary)]">{checkMessage}</p>
        ) : null}

        <div className="space-y-2">
          <p className="sg-text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
            Memo wallet
          </p>
          <p className="sg-mono sg-text-sm font-semibold break-all text-[var(--text-primary)]">
            {user.memoWallet || "—"}
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className={
              lastCopiedId === COPY_ID_MEMO ? "border-[var(--success)] text-[var(--success)]" : ""
            }
            aria-label={
              lastCopiedId === COPY_ID_MEMO
                ? "Memo wallet address copied"
                : "Copy memo wallet address"
            }
            onClick={() => copyWithFeedback(COPY_ID_MEMO, user.memoWallet)}
            disabled={!user.memoWallet}
          >
            {lastCopiedId === COPY_ID_MEMO ? (
              <>
                <Check size={16} aria-hidden />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy size={16} aria-hidden />
                <span>Copy address</span>
              </>
            )}
          </Button>
        </div>

        <div className="sg-divider" />

        <div className="space-y-2">
          <p className="sg-text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
            Verification code
          </p>
          <p className="sg-mono sg-text-xl font-semibold tracking-wide text-[var(--text-primary)]">
            {user.verificationCode}
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className={
              lastCopiedId === COPY_ID_CODE ? "border-[var(--success)] text-[var(--success)]" : ""
            }
            aria-label={
              lastCopiedId === COPY_ID_CODE ? "Verification code copied" : "Copy verification code"
            }
            onClick={() => copyWithFeedback(COPY_ID_CODE, user.verificationCode)}
          >
            {lastCopiedId === COPY_ID_CODE ? (
              <>
                <Check size={16} aria-hidden />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy size={16} aria-hidden />
                <span>Copy code</span>
              </>
            )}
          </Button>
        </div>
      </Card>

      <Card data-page-child>
        <div className="flex flex-col items-center gap-3 py-2">
          {streamStatus === "verified" ? (
            <div ref={celebrateIconRef} className="text-[var(--success)]">
              <ShieldCheck size={40} strokeWidth={2} aria-hidden />
            </div>
          ) : (
            <Clock className="text-[var(--text-muted)]" size={28} strokeWidth={2} aria-hidden />
          )}
          <p className="sg-text-base font-medium text-[var(--text-primary)]">
            {streamStatus === "verified" ? "Verified" : "Listening…"}
          </p>
          <p className="sg-text-sm text-[var(--text-muted)]">
            {streamStatus === "verified"
              ? "Updating your wallet status…"
              : "Waiting for your Stellar payment"}
          </p>
        </div>
      </Card>

      {streamError ? <ErrorCard text={streamError} /> : null}
    </section>
  );
}
