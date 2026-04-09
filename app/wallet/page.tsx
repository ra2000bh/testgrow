"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { Clock, Copy, ShieldAlert, ShieldCheck } from "lucide-react";
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
  const stepBarRef = useRef<HTMLDivElement>(null);
  const celebrateIconRef = useRef<HTMLDivElement>(null);
  const rippleRef = useRef<HTMLDivElement>(null);

  const loadUser = useCallback(() => {
    const telegramId = getTelegramId();
    if (!telegramId) {
      setUser(null);
      setLoading(false);
      return;
    }
    fetch(`/api/user?telegramId=${encodeURIComponent(telegramId)}`)
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
        if (data.isVerified) {
          setLoading(false);
          router.replace("/dashboard");
          return;
        }
        setUser(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [router]);

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
          window.setTimeout(() => router.replace("/dashboard"), 1500);
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
  }, [user, router]);

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

  const addWallet = async () => {
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
    syncSessionCookie();
    loadUser();
  };

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      /* ignore */
    }
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
          <Button block variant="primary" onClick={addWallet} disabled={submitting || !valid56}>
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
            <li>Verification confirms automatically</li>
          </ol>
        </div>

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
            onClick={() => copy(user.memoWallet)}
            disabled={!user.memoWallet}
          >
            <Copy size={16} aria-hidden />
            <span>Copy address</span>
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
          <Button type="button" variant="secondary" size="sm" onClick={() => copy(user.verificationCode)}>
            <Copy size={16} aria-hidden />
            <span>Copy code</span>
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
              ? "Opening dashboard…"
              : "Waiting for your Stellar payment"}
          </p>
        </div>
      </Card>

      {streamError ? <ErrorCard text={streamError} /> : null}
    </section>
  );
}
