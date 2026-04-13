export type CompanyConfig = {
  id: string;
  name: string;
  country: "AU" | "US";
  industry: string;
  description: string;
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
    name: "Hola Health",
    country: "AU",
    industry: "Telehealth",
    description:
      "24/7 on-demand telehealth platform connecting Australians to a GP within 15 minutes — targeting rural & regional communities with no local doctor access.",
    dailyRate: 0.5,
    assetCode: "HOLAH",
    issuer,
    brandColorFrom: "#5eead4",
    brandColorTo: "#0d9488",
  },
  {
    id: "company-2",
    name: "Kite Therapy",
    country: "AU",
    industry: "Child development",
    description:
      "Coaches parents to deliver evidence-based therapy at home for children with autism & developmental delays — making care affordable where waitlists run years long.",
    dailyRate: 0.42,
    assetCode: "KITET",
    issuer,
    brandColorFrom: "#a78bfa",
    brandColorTo: "#5b21b6",
  },
  {
    id: "company-3",
    name: "Amber Electric",
    country: "AU",
    industry: "Energy",
    description:
      "Smart energy platform that buys and sells renewable electricity for homes at real-time wholesale prices, putting households in control of their energy bills.",
    dailyRate: 0.48,
    assetCode: "AMBR",
    issuer,
    brandColorFrom: "#fcd34d",
    brandColorTo: "#b45309",
  },
  {
    id: "company-4",
    name: "Dandelion Energy",
    country: "US",
    industry: "Geothermal",
    description:
      "Installs residential geothermal heating & cooling systems — replacing fossil fuel furnaces with clean, affordable energy for American homeowners.",
    dailyRate: 0.4,
    assetCode: "DNDL",
    issuer,
    brandColorFrom: "#86efac",
    brandColorTo: "#166534",
  },
  {
    id: "company-5",
    name: "Cityblock Health",
    country: "US",
    industry: "Community health",
    description:
      "Delivers primary care, mental health, and social services to Medicaid patients in underserved US neighbourhoods who are systematically failed by mainstream healthcare.",
    dailyRate: 0.38,
    assetCode: "CTBLK",
    issuer,
    brandColorFrom: "#93c5fd",
    brandColorTo: "#1e3a8a",
  },
  {
    id: "company-6",
    name: "Goterra",
    country: "AU",
    industry: "AgTech",
    description:
      "Robotic insect farms that convert organic food waste into sustainable animal feed — tackling both food waste and the global protein shortage simultaneously.",
    dailyRate: 0.45,
    assetCode: "GOTRA",
    issuer,
    brandColorFrom: "#fdba74",
    brandColorTo: "#9a3412",
  },
];

export function getCompanyById(companyId: string) {
  return companies.find((company) => company.id === companyId);
}
