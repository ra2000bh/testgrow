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

const fallback = (value: string | undefined, label: string) => value?.trim() || label;

export const companies: CompanyConfig[] = [
  {
    id: "company-1",
    name: "AusTech Solutions",
    country: "AU",
    industry: "Technology",
    description: "Software and digital transformation services for regional Australian SMEs.",
    dailyRate: 0.5,
    assetCode: fallback(process.env.COMPANY_1_ASSET_CODE, "AUSTECH"),
    issuer: fallback(process.env.COMPANY_1_ISSUER, "ISSUER_NOT_SET"),
  },
  {
    id: "company-2",
    name: "MedCare Australia",
    country: "AU",
    industry: "Healthcare",
    description: "Private clinic network improving telehealth for small communities.",
    dailyRate: 0.4,
    assetCode: fallback(process.env.COMPANY_2_ASSET_CODE, "MEDCARE"),
    issuer: fallback(process.env.COMPANY_2_ISSUER, "ISSUER_NOT_SET"),
  },
  {
    id: "company-3",
    name: "GreenRetail US",
    country: "US",
    industry: "Retail",
    description: "Eco-friendly retail chain modernizing local store operations.",
    dailyRate: 0.45,
    assetCode: fallback(process.env.COMPANY_3_ASSET_CODE, "GREENUS"),
    issuer: fallback(process.env.COMPANY_3_ISSUER, "ISSUER_NOT_SET"),
  },
  {
    id: "company-4",
    name: "BuildCore US",
    country: "US",
    industry: "Construction",
    description: "Modular construction supplier focused on faster housing projects.",
    dailyRate: 0.35,
    assetCode: fallback(process.env.COMPANY_4_ASSET_CODE, "BUILDUS"),
    issuer: fallback(process.env.COMPANY_4_ISSUER, "ISSUER_NOT_SET"),
  },
  {
    id: "company-5",
    name: "FinBridge AU",
    country: "AU",
    industry: "Finance",
    description: "SME lending platform improving access to growth capital.",
    dailyRate: 0.55,
    assetCode: fallback(process.env.COMPANY_5_ASSET_CODE, "FINBAU"),
    issuer: fallback(process.env.COMPANY_5_ISSUER, "ISSUER_NOT_SET"),
  },
];

export function getCompanyById(companyId: string) {
  return companies.find((company) => company.id === companyId);
}
