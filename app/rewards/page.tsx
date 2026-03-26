"use client";

import { useEffect, useState } from "react";
import { getTelegramId } from "@/lib/client";
import { companies } from "@/lib/companies";
import { ErrorCard, ProgressBar, SpinnerLabel } from "@/components/ui";

type Investment = {
  companyId: string;
  companyName: string;
  assetCode: string;
  accumulatedReward: number;
  lastRewardAt: string;
};

export default function RewardsPage() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    fetch("/api/user?telegramId=" + getTelegramId())
      .then((r) => r.json())
      .then((data) => setInvestments((data.investments || []).filter((i: Investment) => i.accumulatedReward > 0)));
  };
  useEffect(load, []);

  const claim = async (companyId?: string) => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramId: getTelegramId(), ...(companyId ? { companyId } : { claimAll: true }) }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok || !data.success) return setError(data.message || "Claim failed.");
    load();
  };

  return (
    <section className="space-y-4">
      <div className="card">
        <h1 className="text-2xl font-extrabold">Your Rewards</h1>
        <p className="mt-2 text-sm text-[#A0A0B0]">
          Rewards accumulate daily based on your investments. Add a trustline first to receive tokens.
        </p>
      </div>
      <button className="btn-primary" onClick={() => claim()}>Claim All</button>
      {loading ? <SpinnerLabel text="Submitting reward claim..." /> : null}

      {investments.map((inv) => {
        const company = companies.find((c) => c.id === inv.companyId);
        return (
          <div className="card space-y-3" key={inv.companyId}>
            <h2 className="text-xl font-extrabold">{inv.companyName}</h2>
            <p className="text-sm text-[#A0A0B0]">Token: {inv.assetCode}</p>
            <p className="text-3xl font-black">{Number(inv.accumulatedReward).toFixed(2)}</p>
            <p className="text-sm text-[#A0A0B0]">Daily rate: {company?.dailyRate.toFixed(2)} per GROW per day</p>
            <ProgressBar label="Time since last claim" value={100} />
            <button className="min-h-[48px] w-full rounded-xl bg-[#4CAF50] font-bold text-[#0b1a0b]" onClick={() => claim(inv.companyId)}>
              Claim {Number(inv.accumulatedReward).toFixed(2)} {inv.assetCode}
            </button>
          </div>
        );
      })}
      {error ? <ErrorCard text={error} /> : null}
    </section>
  );
}
