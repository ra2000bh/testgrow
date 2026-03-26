"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getTelegramId } from "@/lib/client";
import { ErrorCard, ProgressBar, SpinnerLabel } from "@/components/ui";

export default function VerifyPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [wallet, setWallet] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(24 * 60 * 60);
  const [step, setStep] = useState(25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const telegramId = getTelegramId();
    if (!telegramId) return;
    fetch("/api/user?telegramId=" + telegramId)
      .then((r) => r.json())
      .then((data) => {
        if (data.verificationCode) setCode(data.verificationCode);
        if (data.memoWallet) setWallet(data.memoWallet);
        if (data.verificationExpiry) {
          const diff = Math.floor((new Date(data.verificationExpiry).getTime() - Date.now()) / 1000);
          setSecondsLeft(Math.max(diff, 0));
        }
      });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setSecondsLeft((v) => Math.max(v - 1, 0)), 1000);
    return () => clearInterval(timer);
  }, []);

  const verifyNow = async () => {
    setLoading(true);
    setError("");
    setStep(75);
    const telegramId = getTelegramId();
    const res = await fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramId }),
    });
    const data = await res.json();
    setLoading(false);
    if (!data.success) {
      setStep(50);
      setError(data.message);
      return;
    }
    setStep(100);
    router.push("/dashboard");
  };

  const copy = async (value: string) => navigator.clipboard.writeText(value);
  const expired = secondsLeft <= 0;

  return (
    <section className="space-y-4">
      <div className="card space-y-3">
        <h1 className="text-2xl font-extrabold">Wallet Verification</h1>
        <ol className="space-y-2 text-base text-[#E8E8E8]">
          <li>STEP 1: Open your Stellar wallet (e.g. Lobstr or Solar)</li>
          <li>STEP 2: Send exactly 0.01 XLM to the address below</li>
          <li>STEP 3: In the MEMO field, enter exactly the code below</li>
          <li>STEP 4: Press verify when done</li>
        </ol>
      </div>

      <div className="card space-y-3">
        <p className="text-sm text-[#A0A0B0]">Memo Wallet Address</p>
        <p className="rounded-lg bg-[#0f0f1a] p-3 font-mono text-lg font-bold">{wallet || "Set STELLAR_MEMO_WALLET_PUBLIC_KEY"}</p>
        <button className="btn-outline" onClick={() => copy(wallet)} type="button">Copy Wallet</button>
        <p className="text-sm text-[#A0A0B0]">Verification Code</p>
        <p className="rounded-lg bg-[#0f0f1a] p-3 font-mono text-2xl font-black">{code || "------"}</p>
        <button className="btn-outline" onClick={() => copy(code)} type="button">Copy Code</button>
      </div>

      <div className="card space-y-3">
        <ProgressBar label="Verification Progress" value={step} />
        <p className="text-base text-[#A0A0B0]">Code expires in: {Math.floor(secondsLeft / 3600)}h {Math.floor((secondsLeft % 3600) / 60)}m</p>
        <button className="btn-primary" onClick={verifyNow} type="button" disabled={loading || expired}>
          I&apos;ve sent the payment - Verify Now
        </button>
        {expired ? <button className="btn-outline" type="button">Resend / Generate new code</button> : null}
      </div>

      {loading ? <SpinnerLabel text="Checking Stellar network..." /> : null}
      {error ? <ErrorCard text={error} /> : null}
    </section>
  );
}
