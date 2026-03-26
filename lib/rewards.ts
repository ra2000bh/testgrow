import { companies } from "@/lib/companies";
import type { Investment } from "@/models/User";

const DAY_MS = 24 * 60 * 60 * 1000;

export function computeUpdatedReward(investment: Investment) {
  const company = companies.find((c) => c.id === investment.companyId);
  if (!company) return investment.accumulatedReward;

  const now = Date.now();
  const last = new Date(investment.lastRewardAt).getTime();
  const elapsedDays = Math.max(0, (now - last) / DAY_MS);
  const add = investment.tokensInvested * company.dailyRate * elapsedDays;
  return investment.accumulatedReward + add;
}
