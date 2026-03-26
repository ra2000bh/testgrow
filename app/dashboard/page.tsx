"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getTelegramId } from "@/lib/client";
import { formatAddress } from "@/lib/stellar";
import { ProgressBar, SpinnerLabel } from "@/components/ui";

type UserState = {
  publicKey: string;
  growBalance: number;
  totalInvested: number;
  investments: Array<{ companyId: string; accumulatedReward: number }>;
};

export default function DashboardPage() {
  const [user, setUser] = useState<UserState | null>(null);

  useEffect(() => {
    const telegramId = getTelegramId();
    fetch("/api/user?telegramId=" + telegramId)
      .then((r) => r.json())
      .then(setUser);
  }, []);

  const totalRewards = useMemo(
    () => (user?.investments ?? []).reduce((sum, inv) => sum + Number(inv.accumulatedReward || 0), 0),
    [user],
  );
  const companiesCount = user?.investments?.length ?? 0;
  const diversification = (companiesCount / 5) * 100;

  if (!user) return <SpinnerLabel text="Loading your portfolio..." />;

  return (
    <section className="space-y-4">
      <div className="card space-y-2">
        <h1 className="text-2xl font-extrabold">Welcome to StellarGrow</h1>
        <p className="text-sm text-[#A0A0B0]">Verified wallet: {formatAddress(user.publicKey)}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="card"><p className="text-sm text-[#A0A0B0]">GROW Balance</p><p className="text-3xl font-black">{user.growBalance.toFixed(2)}</p></div>
        <div className="card"><p className="text-sm text-[#A0A0B0]">Total Invested</p><p className="text-3xl font-black">{user.totalInvested.toFixed(2)}</p></div>
        <div className="card"><p className="text-sm text-[#A0A0B0]">Companies</p><p className="text-3xl font-black">{companiesCount}</p></div>
        <div className="card"><p className="text-sm text-[#A0A0B0]">Rewards</p><p className="text-3xl font-black">{totalRewards.toFixed(2)}</p></div>
      </div>
      <div className="card">
        <ProgressBar label={`Portfolio Diversification (${companiesCount}/5)`} value={diversification} />
      </div>
      <div className="space-y-3">
        <Link href="/companies" className="btn-primary flex items-center justify-center">Browse Companies</Link>
        <Link href="/rewards" className="btn-primary flex items-center justify-center">Claim My Rewards</Link>
        <Link href="/trustlines" className="btn-primary flex items-center justify-center">Manage Trustlines</Link>
      </div>
      <div className="card text-sm text-[#A0A0B0]">
        GROW tokens are earned by purchasing them with XLM. Each token represents one unit of
        participation in the StellarGrow demo ecosystem.
      </div>
    </section>
  );
}
