export type CompanyConfig = {
  id: string;
  name: string;
  country: "AU" | "US";
  industry: string;
  description: string;
  dailyRate: number;
  assetCode: string;
  issuer: string;
};

/** GROW and all bonus payouts use this asset from a single issuer wallet. */
export const GROW_ASSET_CODE = "GROW";

const growIssuer =
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
    assetCode: GROW_ASSET_CODE,
    issuer: growIssuer,
  },
  {
    id: "company-2",
    name: "Kite Therapy",
    country: "AU",
    industry: "Child development",
    description:
      "Coaches parents to deliver evidence-based therapy at home for children with autism & developmental delays — making care affordable where waitlists run years long.",
    dailyRate: 0.42,
    assetCode: GROW_ASSET_CODE,
    issuer: growIssuer,
  },
  {
    id: "company-3",
    name: "Amber Electric",
    country: "AU",
    industry: "Energy",
    description:
      "Smart energy platform that buys and sells renewable electricity for homes at real-time wholesale prices, putting households in control of their energy bills.",
    dailyRate: 0.48,
    assetCode: GROW_ASSET_CODE,
    issuer: growIssuer,
  },
  {
    id: "company-4",
    name: "Dandelion Energy",
    country: "US",
    industry: "Geothermal",
    description:
      "Installs residential geothermal heating & cooling systems — replacing fossil fuel furnaces with clean, affordable energy for American homeowners.",
    dailyRate: 0.4,
    assetCode: GROW_ASSET_CODE,
    issuer: growIssuer,
  },
  {
    id: "company-5",
    name: "Cityblock Health",
    country: "US",
    industry: "Community health",
    description:
      "Delivers primary care, mental health, and social services to Medicaid patients in underserved US neighbourhoods who are systematically failed by mainstream healthcare.",
    dailyRate: 0.38,
    assetCode: GROW_ASSET_CODE,
    issuer: growIssuer,
  },
  {
    id: "company-6",
    name: "Goterra",
    country: "AU",
    industry: "AgTech",
    description:
      "Robotic insect farms that convert organic food waste into sustainable animal feed — tackling both food waste and the global protein shortage simultaneously.",
    dailyRate: 0.45,
    assetCode: GROW_ASSET_CODE,
    issuer: growIssuer,
  },
];

export function getCompanyById(companyId: string) {
  return companies.find((company) => company.id === companyId);
}
