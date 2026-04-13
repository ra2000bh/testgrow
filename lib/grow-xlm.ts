/**
 * In-app GROW is not pegged to USD. UI hint: treat each GROW unit as this many XLM for display only.
 * Adjust if you later source a live GROW/XLM feed.
 */
export const GROW_TO_XLM_RATE = 0.5;

export function growBalanceToXlmDisplay(growBalance: number): string {
  return (growBalance * GROW_TO_XLM_RATE).toFixed(4);
}
