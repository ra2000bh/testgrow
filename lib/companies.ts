export type CompanyConfig = {
  id: string;
  name: string;
  country: "AU" | "US";
  industry: string;
  description: string;
  /** Reference display price in USD for dashboard/demo market views. */
  estimatedPriceUsd: number;
  dailyRate: number;
  /** On-chain asset code (same issuer for all portfolio tokens). */
  assetCode: string;
  issuer: string;
  /** UI gradient stops for allocation / avatars (hex). */
  brandColorFrom: string;
  brandColorTo: string;
};

/** App balance / allocation currency (not the same as per-company portfolio tokens). */
export const GROW_ASSET_CODE = "GROW";

/** Bonus asset: +1% reward multiplier per token held (same issuer as portfolio tokens). */
export const SEED_ASSET_CODE = "SEED";

/** Synthetic id stored in user.trustlines for the SEED bonus trustline row. */
export const SEED_TRUSTLINE_ID = "seed-bonus";

export const GROW_BRAND = {
  from: "#34d399",
  to: "#047857",
} as const;

export function companyBrandGradient(c: CompanyConfig): string {
  return `linear-gradient(135deg, ${c.brandColorFrom}, ${c.brandColorTo})`;
}

const issuer =
  process.env.NEXT_PUBLIC_STELLAR_ISSUER_ADDRESS?.trim() || "ISSUER_NOT_SET";

export const companies: CompanyConfig[] = [
  {
    id: "company-1",
    name: "Guzman y Gomez",
    country: "AU",
    industry: "Quick-service restaurant",
    description:
      "Fast-casual Mexican restaurant chain focused on fresh ingredients, digital ordering, and high-throughput store formats across core Australian urban markets.",
    estimatedPriceUsd: 1.38,
    dailyRate: 0.35,
    assetCode: "GYG",
    issuer,
    brandColorFrom: "#f59e0b",
    brandColorTo: "#d97706",
  },
  {
    id: "company-2",
    name: "Grill'd",
    country: "AU",
    industry: "Premium burger chain",
    description:
      "Australian better-burger brand with a health-forward menu, localized community positioning, and a footprint centered on high-traffic suburban and CBD locations.",
    estimatedPriceUsd: 1.21,
    dailyRate: 0.3,
    assetCode: "GRILLD",
    issuer,
    brandColorFrom: "#65a30d",
    brandColorTo: "#3f6212",
  },
  {
    id: "company-3",
    name: "Lovisa",
    country: "AU",
    industry: "Fashion accessories retail",
    description:
      "Global fast-fashion jewelry retailer operating a high-turnover product model and compact mall locations aimed at frequent trend-based purchases.",
    estimatedPriceUsd: 1.47,
    dailyRate: 0.41,
    assetCode: "LOVISA",
    issuer,
    brandColorFrom: "#ec4899",
    brandColorTo: "#be185d",
  },
  {
    id: "company-4",
    name: "JB Hi-Fi",
    country: "AU",
    industry: "Consumer electronics retail",
    description:
      "Major electronics and home entertainment retailer known for strong in-store execution, broad category coverage, and value-led promotional strategy.",
    estimatedPriceUsd: 1.56,
    dailyRate: 0.29,
    assetCode: "JBHIFI",
    issuer,
    brandColorFrom: "#eab308",
    brandColorTo: "#ca8a04",
  },
  {
    id: "company-5",
    name: "Flight Centre",
    country: "AU",
    industry: "Travel services",
    description:
      "Leisure and corporate travel agency network with omnichannel booking capability and earnings leverage to international travel demand recovery.",
    estimatedPriceUsd: 1.29,
    dailyRate: 0.33,
    assetCode: "FLIGHTC",
    issuer,
    brandColorFrom: "#38bdf8",
    brandColorTo: "#2563eb",
  },
  {
    id: "company-6",
    name: "Temple & Webster",
    country: "AU",
    industry: "Online furniture and homewares",
    description:
      "Digital-first home retailer with an asset-light marketplace model, wide assortment depth, and margin focus through scalable e-commerce operations.",
    estimatedPriceUsd: 1.18,
    dailyRate: 0.38,
    assetCode: "TMPLW",
    issuer,
    brandColorFrom: "#2dd4bf",
    brandColorTo: "#0f766e",
  },
  {
    id: "company-7",
    name: "Dutch Bros",
    country: "US",
    industry: "Beverage drive-thru chain",
    description:
      "High-growth coffee chain centered on drive-thru convenience, strong unit economics, and new store expansion across underpenetrated U.S. regions.",
    estimatedPriceUsd: 1.52,
    dailyRate: 0.47,
    assetCode: "DUTCHB",
    issuer,
    brandColorFrom: "#22d3ee",
    brandColorTo: "#0e7490",
  },
  {
    id: "company-8",
    name: "Wingstop",
    country: "US",
    industry: "Chicken QSR franchisor",
    description:
      "Asset-light franchise model specializing in chicken wings with digital ordering strength, strong same-store sales momentum, and global expansion potential.",
    estimatedPriceUsd: 1.62,
    dailyRate: 0.52,
    assetCode: "WINGSTOP",
    issuer,
    brandColorFrom: "#4ade80",
    brandColorTo: "#15803d",
  },
  {
    id: "company-9",
    name: "Shake Shack",
    country: "US",
    industry: "Premium burger restaurant",
    description:
      "Modern burger brand with premium positioning, urban and suburban footprint growth, and improving throughput from menu and kitchen optimization.",
    estimatedPriceUsd: 1.43,
    dailyRate: 0.4,
    assetCode: "SHAKESHK",
    issuer,
    brandColorFrom: "#86efac",
    brandColorTo: "#16a34a",
  },
  {
    id: "company-10",
    name: "Ulta Beauty",
    country: "US",
    industry: "Beauty specialty retail",
    description:
      "Large U.S. beauty retailer combining prestige and mass brands with loyalty-led repeat demand and omnichannel fulfillment capabilities.",
    estimatedPriceUsd: 1.58,
    dailyRate: 0.31,
    assetCode: "ULTA",
    issuer,
    brandColorFrom: "#f9a8d4",
    brandColorTo: "#db2777",
  },
  {
    id: "company-11",
    name: "Planet Fitness",
    country: "US",
    industry: "Fitness center franchisor",
    description:
      "Value-priced gym franchise focused on high member volume, recurring subscription revenue, and efficient unit rollout in broad demographics.",
    estimatedPriceUsd: 1.36,
    dailyRate: 0.36,
    assetCode: "PLNTFIT",
    issuer,
    brandColorFrom: "#a78bfa",
    brandColorTo: "#7c3aed",
  },
  {
    id: "company-12",
    name: "First Watch",
    country: "US",
    industry: "Daytime dining restaurant",
    description:
      "Breakfast and brunch restaurant concept with daytime-only operations, growing new-unit pipeline, and category demand for experience-led casual dining.",
    estimatedPriceUsd: 1.31,
    dailyRate: 0.34,
    assetCode: "FRSTWCH",
    issuer,
    brandColorFrom: "#fb923c",
    brandColorTo: "#ea580c",
  },
  {
    id: "company-13",
    name: "SEEK",
    country: "AU",
    industry: "Online employment marketplace",
    description:
      "Australia's leading jobs platform connecting employers and candidates through digital hiring tools, marketplace scale, and recurring recruitment demand.",
    estimatedPriceUsd: 1.44,
    dailyRate: 0.37,
    assetCode: "SEEK",
    issuer,
    brandColorFrom: "#0ea5e9",
    brandColorTo: "#0369a1",
  },
  {
    id: "company-14",
    name: "Costco",
    country: "US",
    industry: "Membership warehouse retail",
    description:
      "Membership-based wholesale club with high-volume retail formats, strong member renewal rates, and recurring subscription revenue from annual fees.",
    estimatedPriceUsd: 1.55,
    dailyRate: 0.42,
    assetCode: "COSTCO",
    issuer,
    brandColorFrom: "#dc2626",
    brandColorTo: "#991b1b",
  },
];

export function getCompanyById(companyId: string) {
  return companies.find((company) => company.id === companyId);
}
