"use client";

import { useEffect, useMemo, useState } from "react";
import { companies } from "@/lib/companies";
import { getTelegramId } from "@/lib/client";
import { ProgressBar } from "@/components/ui";

type TrustlineState = { companyId: string; confirmed: boolean };

export default function TrustlinesPage() {
  const [trustlines, setTrustlines] = useState<TrustlineState[]>([]);

  const load = () => {
    fetch("/api/user?telegramId=" + getTelegramId())
      .then((r) => r.json())
      .then((data) => setTrustlines(data.trustlines || []));
  };
  useEffect(load, []);

  const confirmedCount = useMemo(() => trustlines.filter((t) => t.confirmed).length, [trustlines]);

  const markDone = async (companyId: string) => {
    await fetch("/api/trustline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramId: getTelegramId(), companyId, confirmed: true }),
    });
    load();
  };

  return (
    <section className="space-y-4">
      <div className="card">
        <h1 className="text-2xl font-extrabold">Add Trustlines</h1>
        <p className="mt-2 text-sm text-[#A0A0B0]">
          To receive company reward tokens, your Stellar wallet must trust each token.
        </p>
      </div>
      <div className="card">
        <ProgressBar label={`${confirmedCount} of 5 trustlines added`} value={(confirmedCount / 5) * 100} />
      </div>
      {companies.map((company) => {
        const done = trustlines.find((t) => t.companyId === company.id)?.confirmed;
        return (
          <div className="card space-y-3" key={company.id}>
            <h2 className="text-xl font-extrabold">{company.name}</h2>
            <p className="text-sm">Token: {company.assetCode}</p>
            <p className={`text-sm font-semibold ${done ? "text-[#4CAF50]" : "text-[#FFC107]"}`}>
              {done ? "Trustline Added ✓" : "Not Added"}
            </p>
            <a className="btn-primary flex items-center justify-center" target="_blank" href={`https://lobstr.co/assets/${company.assetCode}:${company.issuer}`}>
              Add {company.assetCode} Trustline
            </a>
            <button className="btn-outline" onClick={() => markDone(company.id)}>I&apos;ve added it - Mark as Done</button>
          </div>
        );
      })}
      <div className="card text-sm text-[#A0A0B0]">
        Using Lobstr? After tapping the link, scroll to the token page and tap &quot;Add Trustline&quot;.
      </div>
    </section>
  );
}
