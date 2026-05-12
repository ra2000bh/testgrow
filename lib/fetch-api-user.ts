/**
 * Coalesce concurrent GET /api/user calls (e.g. AppShell + page mount) into one HTTP request.
 * Each caller receives an independent Response via clone() so multiple .json() reads are safe.
 */
let inFlight: Promise<Response> | null = null;

export function fetchApiUserCloned(): Promise<Response> {
  if (!inFlight) {
    inFlight = fetch("/api/user").finally(() => {
      inFlight = null;
    });
  }
  return inFlight.then((r) => r.clone());
}

/** Drop coalesced in-flight handle so the next call starts a fresh request (e.g. after session update). */
export function resetApiUserFetchDedupe(): void {
  inFlight = null;
}
