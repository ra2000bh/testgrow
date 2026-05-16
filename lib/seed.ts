import { SEED_ASSET_CODE } from "@/lib/companies";

export { SEED_ASSET_CODE };

/** Issuer public key for SEED (same as GROW and company reward tokens). */
export function getSeedIssuer(): string {
  return process.env.NEXT_PUBLIC_STELLAR_ISSUER_ADDRESS?.trim() || "ISSUER_NOT_SET";
}

/** Reward multiplier from wallet SEED balance (1 SEED = +1%). */
export function seedRewardMultiplier(seedBalance: number): number {
  const b = Math.max(0, seedBalance);
  return 1 + b * 0.01;
}

/** Display percent bonus (100 SEED → +100%). */
export function seedBonusPercent(seedBalance: number): number {
  return Math.max(0, seedBalance);
}
