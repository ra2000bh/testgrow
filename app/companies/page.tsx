"use client";

import { useEffect, useState } from "react";
import { companies } from "@/lib/companies";
import { getTelegramId } from "@/lib/client";
import { formatAddress } from "@/lib/stellar";
import { ErrorCard } from "@/components/ui";

type UserState = { growBalance: number; investments: Array<{ companyId: string; tokensInvested: number }> };

export default function CompaniesPage() {
  const [user, setUser] = useState<UserState | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [amount, setAmount] = useState(0);
  const [error, setError] = useState("");

  const reload = () => {
    fetch("/api/user?telegramId=" + getTelegramId()).then((r) => r.json()).then(setUser);
  };
  useEffect(reload, []);

  const invest = async () => {
    if (!selectedCompany || !user) return;
    const res = await fetch("/api/invest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramId: getTelegramId(), companyId: selectedCompany, amount }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) return setError(data.message || "Investment failed");
    setSelectedCompany(null);
    setAmount(0);
    reload();
  };

  return (
    <section className="space-y-4">
      <div className="card">
        <h1 className="text-2xl font-extrabold">Simulated Investment Opportunities</h1>
        <p className="mt-2 text-sm text-[#A0A0B0]">
          This is a demo platform. Companies and returns are simulated for educational purposes.
        </p>
      </div>

      {companies.map((company) => {
        const current = user?.investments.find((inv) => inv.companyId === company.id)?.tokensInvested || 0;
        return (
          <div key={company.id} className="card space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold">{company.name}</h2>
              <span className="rounded-full bg-[#272744] px-3 py-1 text-sm">{company.country}</span>
            </div>
            <p className="text-sm font-semibold text-[#C0C0C0]">{company.industry}</p>
            <p className="text-sm text-[#A0A0B0]">{company.description}</p>
            <p className="text-lg font-bold">{company.dailyRate.toFixed(2)} {company.assetCode} per GROW per day</p>
            <p className="text-sm text-[#A0A0B0]">{company.assetCode}:{formatAddress(company.issuer)}</p>
            <p className="text-lg font-bold">Your Investment: {current.toFixed(2)} GROW</p>
            <div className="grid grid-cols-2 gap-3">
              <button className="btn-primary" onClick={() => setSelectedCompany(company.id)}>Invest</button>
              <a className="btn-outline flex items-center justify-center" href={`https://lobstr.co/assets/${company.assetCode}:${company.issuer}`} target="_blank">Add Trustline</a>
            </div>
          </div>
        );
      })}

      {selectedCompany ? (
        <div className="card space-y-3 border-[#6A0DAD]">
          <h3 className="text-xl font-extrabold">Invest in {companies.find((c) => c.id === selectedCompany)?.name}</h3>
          <p className="text-sm text-[#A0A0B0]">Available GROW: {(user?.growBalance || 0).toFixed(2)}</p>
          <input type="number" min="0" className="w-full rounded-xl border border-[#4d4d66] bg-[#0f0f1a] px-4 py-4 text-base" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          <button className="btn-primary" onClick={invest}>Invest {amount.toFixed(2)} GROW</button>
          <button className="btn-outline" onClick={() => setSelectedCompany(null)}>Cancel</button>
        </div>
      ) : null}

      {error ? <ErrorCard text={error} /> : null}
    </section>
  );
}
