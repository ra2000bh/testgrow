"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getTelegramId } from "@/lib/client";
import { isValidStellarPublicKey } from "@/lib/stellar";
import { ErrorCard, SpinnerLabel } from "@/components/ui";

export default function HomePage() {
  const [publicKey, setPublicKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const onSubmit = async () => {
    setError("");
    if (!isValidStellarPublicKey(publicKey.trim())) {
      setError("Please enter a valid Stellar public key (G... 56 chars).");
      return;
    }
    const telegramId = getTelegramId();
    if (!telegramId) {
      setError("Unable to read your Telegram user ID. Please reopen from Telegram.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramId, publicKey: publicKey.trim() }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) return setError(data.message || "Registration failed.");
    if (data.isVerified) router.push("/dashboard");
    else router.push("/verify");
  };

  return (
    <section className="space-y-5">
      <div className="card space-y-3 text-center">
        <h1 className="bg-gradient-to-r from-[#6A0DAD] to-[#C0C0C0] bg-clip-text text-4xl font-black text-transparent">
          StellarGrow
        </h1>
        <p className="text-base leading-relaxed text-[#E8E8E8]">
          Discover how tokenization powers the next generation of business growth.
        </p>
      </div>
      <div className="card space-y-4">
        <label className="text-base font-bold">Enter your Stellar Public Key (starts with G...)</label>
        <input
          className="w-full rounded-xl border border-[#4d4d66] bg-[#0f0f1a] px-4 py-4 text-base"
          value={publicKey}
          onChange={(e) => setPublicKey(e.target.value)}
          placeholder="G..."
        />
        <button className="btn-primary" onClick={onSubmit} type="button" disabled={loading}>
          Continue
        </button>
      </div>
      <div className="card">
        <p className="text-base text-[#A0A0B0]">
          Why do we need your public key? We use it to verify wallet ownership and track your GROW
          tokens.
        </p>
      </div>
      {loading ? <SpinnerLabel text="Checking Stellar network..." /> : null}
      {error ? <ErrorCard text={error} /> : null}
    </section>
  );
}
