export function companyInitials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function countryFlagEmoji(country: string) {
  if (country === "AU") return "🇦🇺";
  if (country === "US") return "🇺🇸";
  return "";
}
